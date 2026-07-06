using FirebirdSql.Data.FirebirdClient;
using Microsoft.Data.Sqlite;

var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".."));
LoadDotEnv(Path.Combine(root, ".env"));

if (args.Length > 0 && args[0] == "--probe-fields")
{
    return await ProbeUdfFieldsAsync();
}

var dbPath = Environment.GetEnvironmentVariable("SqlAccount__DatabasePath");
if (string.IsNullOrWhiteSpace(dbPath))
{
    Console.Error.WriteLine("SqlAccount__DatabasePath not set in .env");
    return 1;
}

var user = Environment.GetEnvironmentVariable("SqlAccount__DbUser") ?? "SYSDBA";
var password = Environment.GetEnvironmentVariable("SqlAccount__DbPassword") ?? "masterkey";

var builder = new FbConnectionStringBuilder
{
    DataSource = "localhost",
    Database = dbPath,
    UserID = user,
    Password = password,
    Charset = "NONE",
};

if (args.Contains("--probe-so"))
{
    return await ProbeSalesOrderSampleAsync(builder);
}

if (args.Contains("--create-assign-log")
    || args.Contains("--view-assign-log")
    || args.Contains("--migrate-assign-log-from-sqlite")
    || args.Contains("--create-portal-tables")
    || args.Contains("--migrate-classenddate")
    || args.Contains("--migrate-portal-schedule"))
{
    await using var assignConnection = new FbConnection(builder.ToString());
    await assignConnection.OpenAsync();

    if (args.Contains("--create-portal-tables"))
    {
        await EnsurePortalTablesAsync(assignConnection, verbose: true);
        return 0;
    }

    if (args.Contains("--migrate-portal-schedule"))
    {
        return await MigratePortalScheduleAsync(assignConnection);
    }

    if (args.Contains("--migrate-classenddate"))
    {
        await MigrateClassEndDateColumnAsync(assignConnection);
        return 0;
    }

    if (args.Contains("--create-assign-log"))
    {
        await EnsureClassAssignmentChangeLogsTableAsync(assignConnection, verbose: true);
        return 0;
    }

    if (args.Contains("--migrate-assign-log-from-sqlite"))
    {
        var repoRoot = Path.GetFullPath(Path.Combine(root, ".."));
        var sqlitePath = Path.Combine(repoRoot, "backend", "MusicTuitionPortal.Api", "music_tuition_portal.db");
        return await MigrateAssignmentLogsFromSqliteAsync(assignConnection, sqlitePath);
    }

    var classId = GetArgValue(args, "--class-id");
    var limit = int.TryParse(GetArgValue(args, "--limit"), out var n) ? n : 50;
    return await ViewAssignmentChangeLogsAsync(assignConnection, classId, limit);
}

var migrateClassDate = args.Contains("--migrate-classdate");

var branches = new (string Branch, string StudentName)[]
{
    ("dawg", "Dawg"),
    ("son", "Son"),
    ("wacc", "Wacc"),
};

var days = new[] { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday" };

await using var connection = new FbConnection(builder.ToString());
await connection.OpenAsync();

if (migrateClassDate)
{
    await MigrateClassDateColumnAsync(connection);
}

return await RunUdfUpdateAsync(connection, root, dbPath, branches, days);

static async Task<int> RunUdfUpdateAsync(
    FbConnection connection,
    string root,
    string dbPath,
    (string Branch, string StudentName)[] branches,
    string[] days)
{
    var syTeachers = LoadTeachersFromSyUser(connection);
    Console.WriteLine($"Loaded {syTeachers.Count} teacher(s) from SY_USER.");
    foreach (var t in syTeachers)
        Console.WriteLine($"  {t.Name} <{t.Email}>");

    var scheduleByItem = LoadClassSchedulesFromPortalDb(root, syTeachers);
    var demoSchedules = scheduleByItem.Values
        .OrderBy(s => Array.IndexOf(days, s.DayOfWeek))
        .ThenBy(s => s.UdfClassTime)
        .ToList();
    if (demoSchedules.Count == 0)
    {
        demoSchedules =
        [
            new ClassSchedule("TEST-T1", "SALES", "Monday", 10m),
            new ClassSchedule("TEST-T2", "PURCHASING", "Tuesday", 11m),
            new ClassSchedule("TEST-T3", "API", "Wednesday", 12m),
            new ClassSchedule("TEST-T4", "PROGRAMMING", "Thursday", 14m),
            new ClassSchedule("TEST-T5", "MARKETING", "Friday", 15m),
        ];
    }

    Console.WriteLine($"Loaded {scheduleByItem.Count} item code → class schedule mapping(s).");
    foreach (var s in scheduleByItem.Values.OrderBy(x => x.DayOfWeek))
        Console.WriteLine($"  {s.DayOfWeek} @ {FormatUdfClassTime(s.UdfClassTime)} → {s.TeacherName}");

    Console.WriteLine($"Updating SL_SODTL UDF fields in {dbPath} for parent 300-P0001");

    const string selectSql = """
        SELECT B.DOCKEY, B.SEQ, B.ITEMCODE
        FROM SL_SO A
        INNER JOIN SL_SODTL B ON A.DOCKEY = B.DOCKEY
        WHERE A.CODE = '300-P0001'
          AND A.BRANCHNAME = @branch
          AND (A.CANCELLED IS NULL OR A.CANCELLED = FALSE)
        ORDER BY A.DOCDATE DESC, B.SEQ
        """;

    var teacherIndex = 0;
    foreach (var (branch, studentName) in branches)
    {
        var lines = new List<(int DocKey, int Seq, string ItemCode)>();
        await using (var select = new FbCommand(selectSql, connection))
        {
            select.Parameters.AddWithValue("@branch", branch);
            await using var reader = await select.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                lines.Add((
                    Convert.ToInt32(reader["DOCKEY"]),
                    Convert.ToInt32(reader["SEQ"]),
                    reader["ITEMCODE"]?.ToString()?.Trim() ?? ""));
            }
        }

        Console.WriteLine($"Branch '{branch}' ({studentName}): {lines.Count} line(s)");

        for (var i = 0; i < lines.Count; i++)
        {
            var (docKey, seq, itemCode) = lines[i];
            var schedule = ResolveSchedule(itemCode, scheduleByItem, demoSchedules, ref teacherIndex);
            var time = schedule.UdfClassTime;
            var classDateTime = BuildClassDateTime(schedule.DayOfWeek, time);

            const string updateSql = """
                UPDATE SL_SODTL SET
                  UDF_STUDENTNAME = @student,
                  UDF_CLASSDAY    = @day,
                  UDF_CLASSTIME   = @time,
                  UDF_CONDUCTEDBY = @teacher
                WHERE DOCKEY = @docKey AND SEQ = @seq
                """;

            await using var cmd = new FbCommand(updateSql, connection);
            cmd.Parameters.AddWithValue("@student", studentName);
            cmd.Parameters.AddWithValue("@day", schedule.DayOfWeek);
            cmd.Parameters.AddWithValue("@time", time);
            cmd.Parameters.AddWithValue("@teacher", schedule.TeacherName);
            cmd.Parameters.AddWithValue("@docKey", docKey);
            cmd.Parameters.AddWithValue("@seq", seq);
            await cmd.ExecuteNonQueryAsync();

            await UpsertPortalScheduleAsync(connection, docKey, seq, classDateTime, classDateTime.AddDays(84));
            Console.WriteLine(
                $"  {itemCode} -> {studentName}, {schedule.DayOfWeek} @ {FormatUdfClassTime(time)} on {classDateTime:yyyy-MM-dd HH:mm}, teacher={schedule.TeacherName}");
        }
    }

    Console.WriteLine();
    Console.WriteLine("Verify all branches:");
    const string verifySql = """
        SELECT A.BRANCHNAME, A.DOCNO, B.ITEMCODE, B.UDF_STUDENTNAME, B.UDF_CLASSDAY, B.UDF_CLASSTIME, B.UDF_CONDUCTEDBY,
               S.CLASSSTARTDATETIME, S.CLASSENDDATE
        FROM SL_SO A
        INNER JOIN SL_SODTL B ON A.DOCKEY = B.DOCKEY
        LEFT JOIN PORTAL_SO_LINE_SCHEDULE S ON S.DOCKEY = B.DOCKEY AND S.SEQ = B.SEQ
        WHERE A.CODE = '300-P0001'
          AND (A.CANCELLED IS NULL OR A.CANCELLED = FALSE)
        ORDER BY A.BRANCHNAME, A.DOCNO, B.SEQ
        """;

    await using (var verify = new FbCommand(verifySql, connection))
    await using (var reader = await verify.ExecuteReaderAsync())
    {
        while (await reader.ReadAsync())
        {
            Console.WriteLine(
                $"  {reader["BRANCHNAME"]} | {reader["ITEMCODE"]} | student={reader["UDF_STUDENTNAME"]} | {reader["UDF_CLASSDAY"]} @ {FormatUdfClassTime(reader["UDF_CLASSTIME"])} | start={reader["CLASSSTARTDATETIME"]} | teacher={reader["UDF_CONDUCTEDBY"]}");
        }
    }

    Console.WriteLine("Done.");
    return 0;
}

static async Task MigrateClassDateColumnAsync(FbConnection connection)
{
    var type = await GetUdfFieldTypeAsync(connection, "UDF_CLASSDATE");
    if (type == 35)
    {
        Console.WriteLine("UDF_CLASSDATE is already TIMESTAMP — skipping migration.");
        return;
    }

    if (type >= 0)
    {
        Console.WriteLine($"Dropping UDF_CLASSDATE (was type {type}, {DescribeFieldType(type)})...");
        await using var drop = new FbCommand("ALTER TABLE SL_SODTL DROP UDF_CLASSDATE", connection);
        await drop.ExecuteNonQueryAsync();
    }
    else
    {
        Console.WriteLine("UDF_CLASSDATE not found — creating new column.");
    }

    Console.WriteLine("Adding UDF_CLASSDATE as TIMESTAMP...");
    await using var add = new FbCommand("ALTER TABLE SL_SODTL ADD UDF_CLASSDATE TIMESTAMP", connection);
    await add.ExecuteNonQueryAsync();
    Console.WriteLine("Migration complete.");
}

static DateTime BuildClassDateTime(string dayOfWeek, decimal udfClassTime)
{
    var date = NextDateForDayOfWeek(dayOfWeek, DateTime.Today);
    var hours = (int)Math.Floor(udfClassTime);
    var mins = (int)Math.Round((udfClassTime - hours) * 60);
    if (mins >= 60)
    {
        hours++;
        mins = 0;
    }

    return date.AddHours(hours).AddMinutes(mins);
}

static DateTime NextDateForDayOfWeek(string dayOfWeek, DateTime from)
{
    if (!Enum.TryParse<DayOfWeek>(dayOfWeek.Trim(), true, out var target))
        return from.Date;

    var date = from.Date;
    for (var i = 0; i < 7; i++)
    {
        if (date.AddDays(i).DayOfWeek == target)
            return date.AddDays(i);
    }

    return from.Date;
}

static ClassSchedule ResolveSchedule(
    string itemCode,
    Dictionary<string, ClassSchedule> scheduleByItem,
    IReadOnlyList<ClassSchedule> demoSchedules,
    ref int rotateIndex)
{
    if (scheduleByItem.TryGetValue(itemCode, out var linked))
        return linked;

    if (demoSchedules.Count == 0)
        return new ClassSchedule(itemCode, string.Empty, "Monday", 10m);

    return demoSchedules[rotateIndex++ % demoSchedules.Count];
}

static string FormatUdfClassTime(object? value)
{
    if (value is null)
        return "—";

    var raw = value.ToString()?.Trim();
    if (string.IsNullOrWhiteSpace(raw))
        return "—";

    if (!decimal.TryParse(raw, System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var num))
        return raw;

    if (num is >= 0 and < 24)
    {
        var hours = (int)Math.Floor(num);
        var mins = (int)Math.Round((num - hours) * 60);
        if (mins >= 60)
        {
            hours++;
            mins = 0;
        }

        return $"{hours:D2}:{mins:D2}";
    }

    return raw;
}

static decimal ToUdfClassTime(string? startTime)
{
    if (string.IsNullOrWhiteSpace(startTime))
        return 0m;

    if (TimeSpan.TryParse(startTime, out var time))
        return time.Hours + time.Minutes / 60m + time.Seconds / 3600m;

    if (startTime.Contains(':'))
    {
        var parts = startTime.Split(':');
        if (parts.Length >= 2
            && int.TryParse(parts[0], out var hours)
            && int.TryParse(parts[1], out var mins))
        {
            return hours + mins / 60m;
        }
    }

    return 0m;
}

static List<SyTeacher> LoadTeachersFromSyUser(FbConnection connection)
{
    const string sql = """
        SELECT CODE, NAME, EMAIL
        FROM SY_USER
        WHERE EMAIL IS NOT NULL
          AND TRIM(EMAIL) <> ''
          AND (UDF_ISADMIN IS NULL OR UDF_ISADMIN = FALSE)
        ORDER BY NAME
        """;

    var teachers = new List<SyTeacher>();
    using var cmd = new FbCommand(sql, connection);
    using var reader = cmd.ExecuteReader();
    while (reader.Read())
    {
        var name = reader["NAME"]?.ToString()?.Trim();
        var email = reader["EMAIL"]?.ToString()?.Trim();
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(email))
            continue;
        teachers.Add(new SyTeacher(name, email));
    }

    return OrderDemoTeachers(teachers);
}

static List<SyTeacher> OrderDemoTeachers(List<SyTeacher> all)
{
    if (all.Count == 0)
        return all;

    var ordered = new List<SyTeacher>();
    var used = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    var slotMatchers = new Func<SyTeacher, bool>[]
    {
        t => t.Email.StartsWith("test1@", StringComparison.OrdinalIgnoreCase),
        t => t.Email.StartsWith("test2@", StringComparison.OrdinalIgnoreCase),
        t => t.Email.StartsWith("test3@", StringComparison.OrdinalIgnoreCase),
        t => t.Email.StartsWith("test4@", StringComparison.OrdinalIgnoreCase)
             || t.Email.StartsWith("tes4@", StringComparison.OrdinalIgnoreCase),
        t => t.Email.StartsWith("test5@", StringComparison.OrdinalIgnoreCase),
    };

    foreach (var matches in slotMatchers)
    {
        var match = all.FirstOrDefault(t => !used.Contains(t.Email) && matches(t));
        if (match == null)
            continue;
        ordered.Add(match);
        used.Add(match.Email);
    }

    foreach (var teacher in all.Where(t => !used.Contains(t.Email)))
        ordered.Add(teacher);

    return ordered;
}

static Dictionary<string, ClassSchedule> LoadClassSchedulesFromPortalDb(
    string root,
    IReadOnlyList<SyTeacher> syTeachers)
{
    var map = new Dictionary<string, ClassSchedule>(StringComparer.OrdinalIgnoreCase);
    var itemCodes = new[] { "TEST-T1", "TEST-T2", "TEST-T3", "TEST-T4", "TEST-T5" };
    var defaultDays = new[] { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday" };
    var defaultTimes = new[] { 10m, 11m, 12m, 14m, 15m };
    for (var i = 0; i < itemCodes.Length; i++)
    {
        var teacher = i < syTeachers.Count ? syTeachers[i].Name : string.Empty;
        map[itemCodes[i]] = new ClassSchedule(itemCodes[i], teacher, defaultDays[i], defaultTimes[i]);
    }

    var portalDb = Path.Combine(root, "backend", "MusicTuitionPortal.Api", "music_tuition_portal.db");
    if (!File.Exists(portalDb))
        return map;

    try
    {
        using var sqlite = new SqliteConnection($"Data Source={portalDb}");
        sqlite.Open();
        using var cmd = sqlite.CreateCommand();
        cmd.CommandText = """
            SELECT l.ItemCode, c.DayOfWeek, c.StartTime, u.FullName
            FROM ItemCodeClassLinks l
            INNER JOIN Classes c ON l.PortalClassId = c.Id
            INNER JOIN Users u ON c.TeacherUserId = u.Id
            """;
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            var itemCode = reader.GetString(0)?.Trim();
            var day = reader.GetString(1)?.Trim();
            var startTime = reader.GetValue(2)?.ToString();
            var teacher = reader.GetString(3)?.Trim();
            if (string.IsNullOrWhiteSpace(itemCode) || string.IsNullOrWhiteSpace(day))
                continue;

            map[itemCode] = new ClassSchedule(
                itemCode,
                teacher ?? string.Empty,
                day,
                ToUdfClassTime(startTime));
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Warning: could not read portal DB for class schedules: {ex.Message}");
    }

    return map;
}

static void LoadDotEnv(string path)
{
    if (!File.Exists(path)) return;

    foreach (var line in File.ReadAllLines(path))
    {
        var trimmed = line.Trim();
        if (trimmed.Length == 0 || trimmed.StartsWith('#')) continue;
        var eq = trimmed.IndexOf('=');
        if (eq < 1) continue;
        var name = trimmed[..eq].Trim();
        var value = trimmed[(eq + 1)..].Trim();
        if ((value.StartsWith('"') && value.EndsWith('"')) || (value.StartsWith('\'') && value.EndsWith('\'')))
            value = value[1..^1];
        Environment.SetEnvironmentVariable(name, value);
    }
}

static async Task<short> GetUdfFieldTypeAsync(FbConnection connection, string fieldName)
{
    const string sql = """
        SELECT F.RDB$FIELD_TYPE
        FROM RDB$RELATION_FIELDS RF
        JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
        WHERE RF.RDB$RELATION_NAME = 'SL_SODTL' AND TRIM(RF.RDB$FIELD_NAME) = @name
        """;

    await using var cmd = new FbCommand(sql, connection);
    cmd.Parameters.AddWithValue("@name", fieldName.Trim());
    var result = await cmd.ExecuteScalarAsync();
    return result is short type ? type : (short)-1;
}

static async Task<int> ProbeUdfFieldsAsync()
{
    var dbPath = Environment.GetEnvironmentVariable("SqlAccount__DatabasePath");
    if (string.IsNullOrWhiteSpace(dbPath))
    {
        Console.Error.WriteLine("SqlAccount__DatabasePath not set in .env");
        return 1;
    }

    var user = Environment.GetEnvironmentVariable("SqlAccount__DbUser") ?? "SYSDBA";
    var password = Environment.GetEnvironmentVariable("SqlAccount__DbPassword") ?? "masterkey";
    var builder = new FbConnectionStringBuilder
    {
        DataSource = "localhost",
        Database = dbPath,
        UserID = user,
        Password = password,
        Charset = "NONE",
    };

    await using var connection = new FbConnection(builder.ToString());
    await connection.OpenAsync();

    const string sql = """
        SELECT TRIM(RF.RDB$FIELD_NAME), F.RDB$FIELD_TYPE
        FROM RDB$RELATION_FIELDS RF
        JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
        WHERE RF.RDB$RELATION_NAME = 'SL_SODTL' AND RF.RDB$FIELD_NAME CONTAINING 'UDF'
        ORDER BY 1
        """;

    await using var cmd = new FbCommand(sql, connection);
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        var name = reader.GetString(0).Trim();
        var type = reader.GetInt16(1);
        Console.WriteLine($"{name} Firebird type={type} ({DescribeFieldType(type)})");
    }

    return 0;
}

static string DescribeFieldType(short type) => type switch
{
    7 => "SMALLINT",
    8 => "INTEGER",
    10 => "FLOAT",
    12 => "DATE",
    13 => "TIME",
    35 => "TIMESTAMP/DATETIME",
    16 => "INT64 (change to DateTime in SQL Account UDF setup)",
    14 => "CHAR",
    37 => "VARCHAR",
    _ => "other"
};

static string? GetArgValue(string[] args, string name)
{
    var index = Array.FindIndex(args, a => string.Equals(a, name, StringComparison.OrdinalIgnoreCase));
    return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
}

static async Task<bool> AssignmentChangeLogsTableExistsAsync(FbConnection connection)
{
    const string sql = """
        SELECT 1 FROM RDB$RELATIONS
        WHERE RDB$RELATION_NAME = 'CLASSASSIGNMENTCHANGELOGS'
        """;
    await using var cmd = new FbCommand(sql, connection);
    var result = await cmd.ExecuteScalarAsync();
    return result != null;
}

static async Task EnsureClassAssignmentChangeLogsTableAsync(FbConnection connection, bool verbose)
{
    if (await AssignmentChangeLogsTableExistsAsync(connection))
    {
        if (verbose)
        {
            Console.WriteLine("Table ClassAssignmentChangeLogs already exists.");
        }

        return;
    }

    var statements = new[]
    {
        """
        CREATE TABLE ClassAssignmentChangeLogs (
            ID VARCHAR(36) NOT NULL PRIMARY KEY,
            CLASSID VARCHAR(36) NOT NULL,
            CLASSNAME VARCHAR(200),
            ENTITYTYPE VARCHAR(50) NOT NULL,
            OPERATION VARCHAR(20) NOT NULL,
            ENTITYID VARCHAR(36),
            STUDENTUSERID VARCHAR(36),
            STUDENTNAME VARCHAR(200),
            PREVIOUSTEACHERUSERID VARCHAR(36),
            PREVIOUSTEACHERNAME VARCHAR(200),
            NEWTEACHERUSERID VARCHAR(36),
            NEWTEACHERNAME VARCHAR(200),
            PREVIOUSDAYOFWEEK VARCHAR(20),
            NEWDAYOFWEEK VARCHAR(20),
            PREVIOUSCLASSSTARTTIME VARCHAR(10),
            NEWCLASSSTARTTIME VARCHAR(10),
            PREVIOUSCLASSENDTIME VARCHAR(10),
            NEWCLASSENDTIME VARCHAR(10),
            PREVIOUSSESSIONDATE DATE,
            NEWSESSIONDATE DATE,
            PREVIOUSSESSIONSTARTTIME VARCHAR(10),
            NEWSESSIONSTARTTIME VARCHAR(10),
            PREVIOUSSESSIONENDTIME VARCHAR(10),
            NEWSESSIONENDTIME VARCHAR(10),
            PREVIOUSSTATUS VARCHAR(50),
            NEWSTATUS VARCHAR(50),
            ACTORUSERID VARCHAR(36),
            ACTORNAME VARCHAR(200),
            REASON VARCHAR(500),
            CREATEDAT TIMESTAMP NOT NULL
        )
        """,
        "CREATE INDEX IX_CLASSASSIGNLOG_CLASSID ON ClassAssignmentChangeLogs (CLASSID)",
        "CREATE INDEX IX_CLASSASSIGNLOG_CREATEDAT ON ClassAssignmentChangeLogs (CREATEDAT)",
    };

    foreach (var statement in statements)
    {
        await using var cmd = new FbCommand(statement, connection);
        await cmd.ExecuteNonQueryAsync();
    }

    if (verbose)
    {
        Console.WriteLine("Created table ClassAssignmentChangeLogs in Firebird.");
    }
}

static async Task<int> ViewAssignmentChangeLogsAsync(FbConnection connection, string? classId, int limit)
{
    if (!await AssignmentChangeLogsTableExistsAsync(connection))
    {
        Console.WriteLine("Table ClassAssignmentChangeLogs does not exist.");
        Console.WriteLine("Run: dotnet run --project scripts/FdbUdfUpdate/FdbUdfUpdate.csproj -- --create-assign-log");
        return 1;
    }

    var safeLimit = Math.Clamp(limit, 1, 1000);
    var sql = $"""
        SELECT FIRST {safeLimit}
            CREATEDAT, OPERATION, ENTITYTYPE, CLASSNAME, STUDENTNAME, ACTORNAME,
            PREVIOUSDAYOFWEEK, NEWDAYOFWEEK, PREVIOUSSESSIONDATE, NEWSESSIONDATE, REASON
        FROM ClassAssignmentChangeLogs
        """;

    if (!string.IsNullOrWhiteSpace(classId))
    {
        sql += " WHERE CLASSID = @classId";
    }

    sql += " ORDER BY CREATEDAT DESC";

    await using var cmd = new FbCommand(sql, connection);
    if (!string.IsNullOrWhiteSpace(classId))
    {
        cmd.Parameters.AddWithValue("@classId", classId.Trim());
    }

    await using var reader = await cmd.ExecuteReaderAsync();
    Console.WriteLine("Table: ClassAssignmentChangeLogs (Firebird)");
    Console.WriteLine(new string('-', 120));
    while (await reader.ReadAsync())
    {
        Console.WriteLine(
            $"{ReadString(reader, 0)} | {ReadString(reader, 1)} | {ReadString(reader, 2)} | {ReadString(reader, 3)} | {ReadString(reader, 4)} | {ReadString(reader, 5)}");
    }

    return 0;
}

static async Task<int> MigrateAssignmentLogsFromSqliteAsync(FbConnection connection, string sqlitePath)
{
    if (!File.Exists(sqlitePath))
    {
        Console.WriteLine($"SQLite database not found: {sqlitePath}");
        return 1;
    }

    await EnsureClassAssignmentChangeLogsTableAsync(connection, verbose: true);

    await using var sqlite = new SqliteConnection($"Data Source={sqlitePath}");
    await sqlite.OpenAsync();

    const string sql = "SELECT * FROM ClassAssignmentChangeLogs ORDER BY CreatedAt";
    await using var cmd = new SqliteCommand(sql, sqlite);
    await using var reader = await cmd.ExecuteReaderAsync();

    var migrated = 0;
    while (await reader.ReadAsync())
    {
        var id = reader["Id"]?.ToString();
        if (string.IsNullOrWhiteSpace(id))
        {
            continue;
        }

        await using var exists = new FbCommand("SELECT 1 FROM ClassAssignmentChangeLogs WHERE ID = @id", connection);
        exists.Parameters.AddWithValue("@id", id);
        if (await exists.ExecuteScalarAsync() != null)
        {
            continue;
        }

        await using var insert = new FbCommand("""
            INSERT INTO ClassAssignmentChangeLogs (
                ID, CLASSID, CLASSNAME, ENTITYTYPE, OPERATION, ENTITYID, STUDENTUSERID, STUDENTNAME,
                PREVIOUSTEACHERUSERID, PREVIOUSTEACHERNAME, NEWTEACHERUSERID, NEWTEACHERNAME,
                PREVIOUSDAYOFWEEK, NEWDAYOFWEEK, PREVIOUSCLASSSTARTTIME, NEWCLASSSTARTTIME,
                PREVIOUSCLASSENDTIME, NEWCLASSENDTIME, PREVIOUSSESSIONDATE, NEWSESSIONDATE,
                PREVIOUSSESSIONSTARTTIME, NEWSESSIONSTARTTIME, PREVIOUSSESSIONENDTIME, NEWSESSIONENDTIME,
                PREVIOUSSTATUS, NEWSTATUS, ACTORUSERID, ACTORNAME, REASON, CREATEDAT
            ) VALUES (
                @id, @classId, @className, @entityType, @operation, @entityId, @studentUserId, @studentName,
                @prevTeacherUserId, @prevTeacherName, @newTeacherUserId, @newTeacherName,
                @prevDay, @newDay, @prevClassStart, @newClassStart, @prevClassEnd, @newClassEnd,
                @prevSessionDate, @newSessionDate, @prevSessionStart, @newSessionStart, @prevSessionEnd, @newSessionEnd,
                @prevStatus, @newStatus, @actorUserId, @actorName, @reason, @createdAt
            )
            """, connection);

        insert.Parameters.AddWithValue("@id", id);
        insert.Parameters.AddWithValue("@classId", reader["ClassId"]?.ToString() ?? "");
        insert.Parameters.AddWithValue("@className", (object?)reader["ClassName"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@entityType", reader["EntityType"]?.ToString() ?? "");
        insert.Parameters.AddWithValue("@operation", reader["Operation"]?.ToString() ?? "");
        insert.Parameters.AddWithValue("@entityId", (object?)reader["EntityId"]?.ToString() ?? DBNull.Value);
        insert.Parameters.AddWithValue("@studentUserId", (object?)reader["StudentUserId"]?.ToString() ?? DBNull.Value);
        insert.Parameters.AddWithValue("@studentName", (object?)reader["StudentName"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@prevTeacherUserId", (object?)reader["PreviousTeacherUserId"]?.ToString() ?? DBNull.Value);
        insert.Parameters.AddWithValue("@prevTeacherName", (object?)reader["PreviousTeacherName"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@newTeacherUserId", (object?)reader["NewTeacherUserId"]?.ToString() ?? DBNull.Value);
        insert.Parameters.AddWithValue("@newTeacherName", (object?)reader["NewTeacherName"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@prevDay", (object?)reader["PreviousDayOfWeek"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@newDay", (object?)reader["NewDayOfWeek"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@prevClassStart", (object?)reader["PreviousClassStartTime"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@newClassStart", (object?)reader["NewClassStartTime"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@prevClassEnd", (object?)reader["PreviousClassEndTime"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@newClassEnd", (object?)reader["NewClassEndTime"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@prevSessionDate", ParseNullableDate(reader["PreviousSessionDate"]));
        insert.Parameters.AddWithValue("@newSessionDate", ParseNullableDate(reader["NewSessionDate"]));
        insert.Parameters.AddWithValue("@prevSessionStart", (object?)reader["PreviousSessionStartTime"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@newSessionStart", (object?)reader["NewSessionStartTime"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@prevSessionEnd", (object?)reader["PreviousSessionEndTime"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@newSessionEnd", (object?)reader["NewSessionEndTime"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@prevStatus", (object?)reader["PreviousStatus"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@newStatus", (object?)reader["NewStatus"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@actorUserId", (object?)reader["ActorUserId"]?.ToString() ?? DBNull.Value);
        insert.Parameters.AddWithValue("@actorName", (object?)reader["ActorName"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@reason", (object?)reader["Reason"] ?? DBNull.Value);
        insert.Parameters.AddWithValue("@createdAt", DateTime.Parse(reader["CreatedAt"]?.ToString() ?? DateTime.UtcNow.ToString("O")));

        await insert.ExecuteNonQueryAsync();
        migrated++;
    }

    Console.WriteLine($"Migrated {migrated} row(s) from SQLite to Firebird ClassAssignmentChangeLogs.");
    return 0;
}

static object ParseNullableDate(object? value)
{
    if (value == null || value is DBNull)
    {
        return DBNull.Value;
    }

    return DateTime.TryParse(value.ToString(), out var dt) ? dt.Date : DBNull.Value;
}

static string ReadString(FbDataReader reader, int ordinal) =>
    reader.IsDBNull(ordinal) ? "" : reader.GetValue(ordinal)?.ToString()?.Trim() ?? "";

static async Task EnsurePortalTablesAsync(FbConnection connection, bool verbose)
{
    await EnsureClassAssignmentChangeLogsTableAsync(connection, verbose: false);

    async Task<bool> Exists(string name)
    {
        await using var cmd = new FbCommand(
            "SELECT 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = @name", connection);
        cmd.Parameters.AddWithValue("@name", name.ToUpperInvariant());
        return await cmd.ExecuteScalarAsync() != null;
    }

    var tables = new (string Name, string[] Statements)[]
    {
        ("PORTAL_CLASS_SESSIONS", new[]
        {
            """CREATE TABLE PORTAL_CLASS_SESSIONS (ID VARCHAR(36) NOT NULL PRIMARY KEY, DOCKEY INTEGER NOT NULL, SEQ INTEGER NOT NULL, ITEMCODE VARCHAR(50), CUSTOMERCODE VARCHAR(30) NOT NULL, BRANCHNAME VARCHAR(100) NOT NULL, STUDENTNAME VARCHAR(200), CLASSNAME VARCHAR(200), CONDUCTEDBY VARCHAR(200), OCCURRENCEINDEX INTEGER NOT NULL, SESSIONDATE TIMESTAMP NOT NULL, STARTTIME VARCHAR(10), ENDTIME VARCHAR(10), STATUS VARCHAR(30) NOT NULL, ORIGINALDATE TIMESTAMP, REASON VARCHAR(500), CREATEDAT TIMESTAMP NOT NULL, UPDATEDAT TIMESTAMP NOT NULL)""",
            "CREATE INDEX IX_PORTALSESS_DOCKEY ON PORTAL_CLASS_SESSIONS (DOCKEY, SEQ)",
            "CREATE INDEX IX_PORTALSESS_DATE ON PORTAL_CLASS_SESSIONS (SESSIONDATE)",
        }),
        ("PORTAL_HOMEWORK", new[]
        {
            """CREATE TABLE PORTAL_HOMEWORK (ID VARCHAR(36) NOT NULL PRIMARY KEY, DOCKEY INTEGER NOT NULL, SEQ INTEGER NOT NULL, CUSTOMERCODE VARCHAR(30) NOT NULL, BRANCHNAME VARCHAR(100) NOT NULL, CLASSNAME VARCHAR(200), ITEMCODE VARCHAR(50), TITLE VARCHAR(200), NOTE VARCHAR(2000), FILENAME VARCHAR(255), SUBMITTEDBY VARCHAR(200) NOT NULL, CREATEDAT TIMESTAMP NOT NULL)""",
            "CREATE INDEX IX_PORTALHW_BRANCH ON PORTAL_HOMEWORK (CUSTOMERCODE, BRANCHNAME)",
        }),
        ("PORTAL_LEAVE_REQUESTS", new[]
        {
            """CREATE TABLE PORTAL_LEAVE_REQUESTS (ID VARCHAR(36) NOT NULL PRIMARY KEY, OCCURRENCEID VARCHAR(36), DOCKEY INTEGER NOT NULL, SEQ INTEGER NOT NULL, CUSTOMERCODE VARCHAR(30) NOT NULL, BRANCHNAME VARCHAR(100) NOT NULL, CLASSNAME VARCHAR(200), SESSIONDATE TIMESTAMP NOT NULL, REASON VARCHAR(500) NOT NULL, STATUS VARCHAR(50) NOT NULL, ADMINNOTE VARCHAR(500), NEEDSREPLACEMENT SMALLINT DEFAULT 0, REPL_DATE TIMESTAMP, REPL_START VARCHAR(10), REPL_END VARCHAR(10), REPL_TEACHER VARCHAR(200), TEACHERRESPONSE VARCHAR(50), COUNTER_DATE TIMESTAMP, COUNTER_START VARCHAR(10), COUNTER_END VARCHAR(10), COUNTER_MSG VARCHAR(500), REQUESTEDBY VARCHAR(200), CREATEDAT TIMESTAMP NOT NULL, UPDATEDAT TIMESTAMP NOT NULL)""",
            "CREATE INDEX IX_PORTALLEAVE_STATUS ON PORTAL_LEAVE_REQUESTS (STATUS)",
        }),
        ("PORTAL_ANNOUNCEMENTS", new[]
        {
            """CREATE TABLE PORTAL_ANNOUNCEMENTS (ID VARCHAR(36) NOT NULL PRIMARY KEY, TITLE VARCHAR(200) NOT NULL, CONTENT VARCHAR(4000) NOT NULL, CATEGORY VARCHAR(50) NOT NULL, HOLIDAYDATE DATE, TARGETROLE VARCHAR(30) NOT NULL, CREATEDBYUSERID VARCHAR(36), CREATEDBYNAME VARCHAR(200), CREATEDAT TIMESTAMP NOT NULL, UPDATEDAT TIMESTAMP NOT NULL)""",
            "CREATE INDEX IX_PORTALANN_ROLE ON PORTAL_ANNOUNCEMENTS (TARGETROLE)",
        }),
        ("PORTAL_SO_LINE_SCHEDULE", new[]
        {
            """CREATE TABLE PORTAL_SO_LINE_SCHEDULE (DOCKEY INTEGER NOT NULL, SEQ INTEGER NOT NULL, CLASSSTARTDATETIME TIMESTAMP NOT NULL, CLASSENDDATE TIMESTAMP, CREATEDAT TIMESTAMP NOT NULL, UPDATEDAT TIMESTAMP NOT NULL, PRIMARY KEY (DOCKEY, SEQ))""",
            "CREATE INDEX IX_PORTAL_SOSCHED_DOCKEY ON PORTAL_SO_LINE_SCHEDULE (DOCKEY, SEQ)",
        }),
    };

    foreach (var (name, statements) in tables)
    {
        if (await Exists(name))
        {
            if (verbose) Console.WriteLine($"Table {name} already exists.");
            continue;
        }
        foreach (var sql in statements)
        {
            await using var cmd = new FbCommand(sql, connection);
            await cmd.ExecuteNonQueryAsync();
        }
        if (verbose) Console.WriteLine($"Created table {name}.");
    }
}

static async Task<int> ProbeSalesOrderSampleAsync(FbConnectionStringBuilder builder)
{
    await using var c = new FbConnection(builder.ToString());
    await c.OpenAsync();

    await using (var cmd = new FbCommand("SELECT MAX(DOCKEY) FROM SL_SO", c))
        Console.WriteLine($"MAX DOCKEY: {await cmd.ExecuteScalarAsync()}");

    await using (var cmd = new FbCommand("SELECT MAX(DTLKEY) FROM SL_SODTL", c))
        Console.WriteLine($"MAX DTLKEY: {await cmd.ExecuteScalarAsync()}");

    try
    {
        await using var cmd = new FbCommand("SELECT CODE, DESCRIPTION FROM ST_ITEM WHERE CODE STARTING 'TEST'", c);
        await using var r = await cmd.ExecuteReaderAsync();
        Console.WriteLine("=== TEST items (ST_ITEM) ===");
        while (await r.ReadAsync())
            Console.WriteLine($"{r["CODE"]} | {r["DESCRIPTION"]}");
    }
    catch (Exception ex) { Console.WriteLine($"ST_ITEM: {ex.Message}"); }

    try
    {
        await using var cmd = new FbCommand("SELECT CODE, COMPANYNAME FROM AR_CUSTOMER WHERE CODE = '300-P0001'", c);
        await using var r = await cmd.ExecuteReaderAsync();
        if (await r.ReadAsync())
            Console.WriteLine($"Customer: {r["CODE"]} | {r["COMPANYNAME"]}");
    }
    catch (Exception ex) { Console.WriteLine($"AR_CUSTOMER: {ex.Message}"); }

    const string soSql = "SELECT FIRST 1 * FROM SL_SO WHERE CODE = '300-P0001' ORDER BY DOCKEY DESC";
    await using (var cmd = new FbCommand(soSql, c))
    await using (var r = await cmd.ExecuteReaderAsync())
    {
        if (await r.ReadAsync())
        {
            Console.WriteLine("=== SL_SO sample ===");
            for (var i = 0; i < r.FieldCount; i++)
                Console.WriteLine($"{r.GetName(i)} = {r.GetValue(i)}");
        }
    }

    const string dtlSql = """
        SELECT FIRST 1 B.*
        FROM SL_SODTL B
        INNER JOIN SL_SO A ON A.DOCKEY = B.DOCKEY
        WHERE A.CODE = '300-P0001'
        ORDER BY A.DOCKEY DESC, B.SEQ
        """;
    await using (var cmd = new FbCommand(dtlSql, c))
    await using (var r = await cmd.ExecuteReaderAsync())
    {
        if (await r.ReadAsync())
        {
            Console.WriteLine("=== SL_SODTL sample ===");
            for (var i = 0; i < r.FieldCount; i++)
                Console.WriteLine($"{r.GetName(i)} = {r.GetValue(i)}");
        }
    }

    return 0;
}

static async Task MigrateClassEndDateColumnAsync(FbConnection connection)
{
    const string checkSql = """
        SELECT 1 FROM RDB$RELATION_FIELDS
        WHERE RDB$RELATION_NAME = 'SL_SODTL' AND RDB$FIELD_NAME = 'UDF_CLASSENDDATE'
        """;
    await using var check = new FbCommand(checkSql, connection);
    if (await check.ExecuteScalarAsync() != null)
    {
        Console.WriteLine("UDF_CLASSENDDATE already exists.");
        return;
    }
    await using var add = new FbCommand("ALTER TABLE SL_SODTL ADD UDF_CLASSENDDATE TIMESTAMP", connection);
    await add.ExecuteNonQueryAsync();
    Console.WriteLine("Added UDF_CLASSENDDATE to SL_SODTL.");
}

static async Task<int> MigratePortalScheduleAsync(FbConnection connection)
{
    await EnsurePortalSoLineScheduleTableAsync(connection);

    if (await SodtlColumnExistsAsync(connection, "UDF_CLASSDATE"))
    {
        const string copySql = """
            INSERT INTO PORTAL_SO_LINE_SCHEDULE (DOCKEY, SEQ, CLASSSTARTDATETIME, CLASSENDDATE, CREATEDAT, UPDATEDAT)
            SELECT B.DOCKEY, B.SEQ, B.UDF_CLASSDATE, B.UDF_CLASSENDDATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM SL_SODTL B
            WHERE B.UDF_CLASSDATE IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM PORTAL_SO_LINE_SCHEDULE S
                WHERE S.DOCKEY = B.DOCKEY AND S.SEQ = B.SEQ
              )
            """;
        await using var copy = new FbCommand(copySql, connection);
        var copied = await copy.ExecuteNonQueryAsync();
        Console.WriteLine($"Copied {copied} row(s) from SL_SODTL UDF date fields to PORTAL_SO_LINE_SCHEDULE.");

        Console.WriteLine("Dropping SL_SODTL.UDF_CLASSDATE...");
        await using var dropStart = new FbCommand("ALTER TABLE SL_SODTL DROP UDF_CLASSDATE", connection);
        await dropStart.ExecuteNonQueryAsync();
    }
    else
    {
        Console.WriteLine("SL_SODTL.UDF_CLASSDATE not found — skip copy/drop.");
    }

    if (await SodtlColumnExistsAsync(connection, "UDF_CLASSENDDATE"))
    {
        Console.WriteLine("Dropping SL_SODTL.UDF_CLASSENDDATE...");
        await using var dropEnd = new FbCommand("ALTER TABLE SL_SODTL DROP UDF_CLASSENDDATE", connection);
        await dropEnd.ExecuteNonQueryAsync();
    }
    else
    {
        Console.WriteLine("SL_SODTL.UDF_CLASSENDDATE not found — skip drop.");
    }

    Console.WriteLine("Portal schedule migration complete.");
    return 0;
}

static async Task EnsurePortalSoLineScheduleTableAsync(FbConnection connection)
{
    const string checkSql = "SELECT 1 FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'PORTAL_SO_LINE_SCHEDULE'";
    await using var check = new FbCommand(checkSql, connection);
    if (await check.ExecuteScalarAsync() != null)
    {
        Console.WriteLine("PORTAL_SO_LINE_SCHEDULE already exists.");
        return;
    }

    foreach (var sql in new[]
    {
        """CREATE TABLE PORTAL_SO_LINE_SCHEDULE (DOCKEY INTEGER NOT NULL, SEQ INTEGER NOT NULL, CLASSSTARTDATETIME TIMESTAMP NOT NULL, CLASSENDDATE TIMESTAMP, CREATEDAT TIMESTAMP NOT NULL, UPDATEDAT TIMESTAMP NOT NULL, PRIMARY KEY (DOCKEY, SEQ))""",
        "CREATE INDEX IX_PORTAL_SOSCHED_DOCKEY ON PORTAL_SO_LINE_SCHEDULE (DOCKEY, SEQ)",
    })
    {
        await using var cmd = new FbCommand(sql, connection);
        await cmd.ExecuteNonQueryAsync();
    }

    Console.WriteLine("Created PORTAL_SO_LINE_SCHEDULE.");
}

static async Task<bool> SodtlColumnExistsAsync(FbConnection connection, string fieldName)
{
    const string sql = """
        SELECT 1 FROM RDB$RELATION_FIELDS
        WHERE RDB$RELATION_NAME = 'SL_SODTL' AND RDB$FIELD_NAME = @name
        """;
    await using var cmd = new FbCommand(sql, connection);
    cmd.Parameters.AddWithValue("@name", fieldName.ToUpperInvariant());
    return await cmd.ExecuteScalarAsync() != null;
}

static async Task UpsertPortalScheduleAsync(
    FbConnection connection,
    int docKey,
    int seq,
    DateTime classStart,
    DateTime? classEnd)
{
    await EnsurePortalSoLineScheduleTableAsync(connection);

    const string existsSql = "SELECT 1 FROM PORTAL_SO_LINE_SCHEDULE WHERE DOCKEY = @docKey AND SEQ = @seq";
    await using var existsCmd = new FbCommand(existsSql, connection);
    existsCmd.Parameters.AddWithValue("@docKey", docKey);
    existsCmd.Parameters.AddWithValue("@seq", seq);
    var exists = await existsCmd.ExecuteScalarAsync();

    var now = DateTime.UtcNow;
    if (exists != null)
    {
        const string updateSql = """
            UPDATE PORTAL_SO_LINE_SCHEDULE
            SET CLASSSTARTDATETIME = @classStart, CLASSENDDATE = @classEnd, UPDATEDAT = @updatedAt
            WHERE DOCKEY = @docKey AND SEQ = @seq
            """;
        await using var updateCmd = new FbCommand(updateSql, connection);
        updateCmd.Parameters.AddWithValue("@docKey", docKey);
        updateCmd.Parameters.AddWithValue("@seq", seq);
        updateCmd.Parameters.Add(new FbParameter("@classStart", FbDbType.TimeStamp) { Value = classStart });
        updateCmd.Parameters.Add(new FbParameter("@classEnd", FbDbType.TimeStamp)
        {
            Value = classEnd.HasValue ? classEnd.Value : DBNull.Value
        });
        updateCmd.Parameters.AddWithValue("@updatedAt", now);
        await updateCmd.ExecuteNonQueryAsync();
        return;
    }

    const string insertSql = """
        INSERT INTO PORTAL_SO_LINE_SCHEDULE (DOCKEY, SEQ, CLASSSTARTDATETIME, CLASSENDDATE, CREATEDAT, UPDATEDAT)
        VALUES (@docKey, @seq, @classStart, @classEnd, @createdAt, @updatedAt)
        """;
    await using var insertCmd = new FbCommand(insertSql, connection);
    insertCmd.Parameters.AddWithValue("@docKey", docKey);
    insertCmd.Parameters.AddWithValue("@seq", seq);
    insertCmd.Parameters.Add(new FbParameter("@classStart", FbDbType.TimeStamp) { Value = classStart });
    insertCmd.Parameters.Add(new FbParameter("@classEnd", FbDbType.TimeStamp)
    {
        Value = classEnd.HasValue ? classEnd.Value : DBNull.Value
    });
    insertCmd.Parameters.AddWithValue("@createdAt", now);
    insertCmd.Parameters.AddWithValue("@updatedAt", now);
    await insertCmd.ExecuteNonQueryAsync();
}

readonly record struct SyTeacher(string Name, string Email);
readonly record struct ClassSchedule(string ItemCode, string TeacherName, string DayOfWeek, decimal UdfClassTime);
