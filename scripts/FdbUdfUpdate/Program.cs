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
    || args.Contains("--migrate-portal-schedule")
    || args.Contains("--restore-so-udf-dates")
    || args.Contains("--migrate-udf-classdate-to-bcd")
    || args.Contains("--sync-parent-email-to-branches")
    || args.Contains("--sync-billing-to-student")
    || args.Contains("--normalize-customer-as-student")
    || args.Contains("--rename-customers-as-students")
    || args.Contains("--rename-teachers-as-music")
    || args.Contains("--set-teacher-mobiles")
    || args.Contains("--seed-student-fee-invoices")
    || args.Contains("--rename-stock-as-music")
    || args.Contains("--probe-domain")
    || args.Contains("--probe-sodtl-values"))
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

    if (args.Contains("--restore-so-udf-dates") || args.Contains("--migrate-udf-classdate-to-bcd"))
    {
        return await MigrateUdfClassDatesToBcdAsync(assignConnection);
    }

    if (args.Contains("--rename-customers-as-students"))
    {
        return await RenameCustomersAsStudentsAsync(assignConnection);
    }

    if (args.Contains("--rename-teachers-as-music"))
    {
        return await RenameTeachersAsMusicAsync(assignConnection);
    }

    if (args.Contains("--set-teacher-mobiles"))
    {
        return await SetMusicTeacherMobilesAsync(assignConnection);
    }

    if (args.Contains("--seed-student-fee-invoices"))
    {
        return await SeedStudentFeeInvoicesAsync(assignConnection);
    }

    if (args.Contains("--rename-stock-as-music"))
    {
        return await RenameStockAsMusicAsync(assignConnection);
    }

    if (args.Contains("--normalize-customer-as-student"))
    {
        var dryRun = args.Contains("--dry-run");
        return await NormalizeCustomerAsStudentAsync(assignConnection, dryRun);
    }

    if (args.Contains("--sync-parent-email-to-branches"))
    {
        return await SyncParentEmailToBranchesAsync(assignConnection);
    }

    if (args.Contains("--sync-billing-to-student"))
    {
        return await SyncBillingToStudentAsync(assignConnection);
    }

    if (args.Contains("--migrate-classenddate"))
    {
        await MigrateClassEndDateColumnAsync(assignConnection);
        return 0;
    }

    if (args.Contains("--probe-sodtl-values"))
    {
        await ProbeSodtlUdfValuesAsync(assignConnection);
        return 0;
    }

    if (args.Contains("--probe-domain"))
    {
        if (args.Contains("--list-classdate-domains"))
        {
            await ListClassDateDomainsAsync(assignConnection);
            return 0;
        }

        var domain = GetArgValue(args, "--domain") ?? "RDB$4828";
        await ProbeDomainAsync(assignConnection, domain);
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

static async Task MigrateClassDateColumnAsync(FbConnection connection) =>
    await MigrateUdfClassDatesToBcdAsync(connection);

static long ToClassDateBcd(DateTime value) =>
    value.Year * 100000000L + value.Month * 1000000L + value.Day * 10000L + value.Hour * 100L + value.Minute;

static long ToClassEndDateBcd(DateTime value) =>
    value.Year * 10000L + value.Month * 100L + value.Day;

static async Task ProbeSodtlUdfValuesAsync(FbConnection connection)
{
    const string tablesSql = """
        SELECT TRIM(RDB$RELATION_NAME) FROM RDB$RELATIONS
        WHERE RDB$SYSTEM_FLAG = 0 AND (TRIM(RDB$RELATION_NAME) CONTAINING 'UDF' OR TRIM(RDB$RELATION_NAME) LIKE 'SY%')
        ORDER BY 1
        """;
    await using (var tablesCmd = new FbCommand(tablesSql, connection))
    await using (var tr = await tablesCmd.ExecuteReaderAsync())
    {
        Console.WriteLine("=== Tables SY%/UDF ===");
        while (await tr.ReadAsync())
            Console.WriteLine(tr.GetString(0));
    }

    const string sql = """
        SELECT FIRST 5 B.DOCKEY, B.SEQ, B.UNITPRICE, B.UDF_CLASSTIME, B.UDF_CLASSDATE, B.UDF_CLASSENDDATE
        FROM SL_SODTL B
        WHERE B.UDF_CLASSDATE IS NOT NULL
        ORDER BY B.DOCKEY DESC
        """;
    await using var cmd = new FbCommand(sql, connection);
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        for (var i = 0; i < reader.FieldCount; i++)
        {
            var v = reader.GetValue(i);
            Console.WriteLine($"{reader.GetName(i)}={v} ({v?.GetType().Name})");
        }
        Console.WriteLine("---");
    }
}

static async Task ListClassDateDomainsAsync(FbConnection connection)
{
    const string sql = """
        SELECT TRIM(RF.RDB$RELATION_NAME), TRIM(RF.RDB$FIELD_NAME), TRIM(RF.RDB$FIELD_SOURCE),
               F.RDB$FIELD_PRECISION, F.RDB$FIELD_SCALE, F.RDB$FIELD_SUB_TYPE
        FROM RDB$RELATION_FIELDS RF
        JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
        WHERE TRIM(RF.RDB$FIELD_NAME) CONTAINING 'CLASSDATE'
           OR TRIM(RF.RDB$FIELD_NAME) CONTAINING 'CLASSEND'
        ORDER BY 1, 2
        """;
    await using var cmd = new FbCommand(sql, connection);
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        Console.WriteLine($"{reader.GetString(0)}.{reader.GetString(1)} domain={reader.GetString(2)} prec={reader[3]} scale={reader[4]} sub={reader[5]}");
    }
}

static async Task ProbeDomainAsync(FbConnection connection, string domain)
{
    const string sql = """
        SELECT F.RDB$FIELD_NAME, F.RDB$FIELD_TYPE, F.RDB$FIELD_PRECISION, F.RDB$FIELD_SCALE, F.RDB$FIELD_SUB_TYPE
        FROM RDB$FIELDS F
        WHERE TRIM(F.RDB$FIELD_NAME) = @domain
        """;
    await using var cmd = new FbCommand(sql, connection);
    cmd.Parameters.AddWithValue("@domain", domain.Trim());
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        Console.WriteLine($"domain={reader.GetString(0).Trim()} type={reader.GetInt16(1)} prec={reader[2]} scale={reader[3]} sub={reader[4]}");
    }

    const string usedSql = """
        SELECT TRIM(RF.RDB$RELATION_NAME), TRIM(RF.RDB$FIELD_NAME)
        FROM RDB$RELATION_FIELDS RF
        WHERE TRIM(RF.RDB$FIELD_SOURCE) = @domain
        ORDER BY 1, 2
        """;
    await using var usedCmd = new FbCommand(usedSql, connection);
    usedCmd.Parameters.AddWithValue("@domain", domain.Trim());
    await using var usedReader = await usedCmd.ExecuteReaderAsync();
    Console.WriteLine("Used by:");
    while (await usedReader.ReadAsync())
        Console.WriteLine($"  {usedReader.GetString(0)}.{usedReader.GetString(1)}");
}

static async Task<(short Precision, short Scale, short SubType)?> GetSodtlColumnMetaAsync(
    FbConnection connection, string fieldName)
{
    const string sql = """
        SELECT F.RDB$FIELD_PRECISION, F.RDB$FIELD_SCALE, F.RDB$FIELD_SUB_TYPE
        FROM RDB$RELATION_FIELDS RF
        JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
        WHERE RF.RDB$RELATION_NAME = 'SL_SODTL' AND TRIM(RF.RDB$FIELD_NAME) = @name
        """;
    await using var cmd = new FbCommand(sql, connection);
    cmd.Parameters.AddWithValue("@name", fieldName.Trim());
    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync())
        return null;
    return (
        reader.IsDBNull(0) ? (short)0 : reader.GetInt16(0),
        reader.IsDBNull(1) ? (short)0 : reader.GetInt16(1),
        reader.IsDBNull(2) ? (short)0 : reader.GetInt16(2));
}

static async Task<string?> GetSodtlColumnDomainAsync(FbConnection connection, string fieldName)
{
    const string sql = """
        SELECT TRIM(RF.RDB$FIELD_SOURCE)
        FROM RDB$RELATION_FIELDS RF
        WHERE RF.RDB$RELATION_NAME = 'SL_SODTL' AND TRIM(RF.RDB$FIELD_NAME) = @name
        """;
    await using var cmd = new FbCommand(sql, connection);
    cmd.Parameters.AddWithValue("@name", fieldName.Trim());
    return (await cmd.ExecuteScalarAsync())?.ToString()?.Trim();
}

static async Task<int> MigrateUdfClassDatesToBcdAsync(FbConnection connection)
{
    await EnsurePortalSoLineScheduleTableAsync(connection);

    var meta = await GetSodtlColumnMetaAsync(connection, "UDF_CLASSDATE");
    if (meta is { SubType: 2, Precision: 18, Scale: -4 })
    {
        Console.WriteLine("UDF_CLASSDATE already DECIMAL(18,4) FMTBcd — backfilling.");
        return await BackfillSodtlUdfDatesFromPortalAsync(connection);
    }

    if (await SodtlColumnExistsAsync(connection, "UDF_CLASSDATE"))
    {
        Console.WriteLine($"Converting UDF_CLASSDATE (scale={meta?.Scale ?? 0}) to DECIMAL(18,4) FMTBcd...");
        await using var drop = new FbCommand("ALTER TABLE SL_SODTL DROP UDF_CLASSDATE", connection);
        await drop.ExecuteNonQueryAsync();
    }

    if (await SodtlColumnExistsAsync(connection, "UDF_CLASSENDDATE"))
    {
        await using var drop = new FbCommand("ALTER TABLE SL_SODTL DROP UDF_CLASSENDDATE", connection);
        await drop.ExecuteNonQueryAsync();
    }

    var unitPriceDomain = await GetSodtlColumnDomainAsync(connection, "UNITPRICE");
    Console.WriteLine("Adding SL_SODTL.UDF_CLASSDATE DECIMAL(18,4) (FMTBcd, scale -4)...");
    await using (var add = new FbCommand("ALTER TABLE SL_SODTL ADD UDF_CLASSDATE DECIMAL(18,4)", connection))
        await add.ExecuteNonQueryAsync();
    Console.WriteLine("Adding SL_SODTL.UDF_CLASSENDDATE DECIMAL(18,4)...");
    await using (var add = new FbCommand("ALTER TABLE SL_SODTL ADD UDF_CLASSENDDATE DECIMAL(18,4)", connection))
        await add.ExecuteNonQueryAsync();
    if (!string.IsNullOrWhiteSpace(unitPriceDomain))
        Console.WriteLine($"(UNITPRICE domain {unitPriceDomain} not used — datetime values overflow its scale.)");

    return await BackfillSodtlUdfDatesFromPortalAsync(connection);
}

static async Task<int> BackfillSodtlUdfDatesFromPortalAsync(FbConnection connection)
{
    const string selectSql = """
        SELECT DOCKEY, SEQ, CLASSSTARTDATETIME, CLASSENDDATE
        FROM PORTAL_SO_LINE_SCHEDULE
        """;

    var rows = new List<(int DocKey, int Seq, DateTime ClassStart, DateTime? ClassEnd)>();
    await using (var select = new FbCommand(selectSql, connection))
    await using (var reader = await select.ExecuteReaderAsync())
    {
        while (await reader.ReadAsync())
        {
            rows.Add((
                Convert.ToInt32(reader["DOCKEY"]),
                Convert.ToInt32(reader["SEQ"]),
                Convert.ToDateTime(reader["CLASSSTARTDATETIME"]),
                reader["CLASSENDDATE"] is DBNull ? null : Convert.ToDateTime(reader["CLASSENDDATE"])));
        }
    }

    const string updateSql = """
        UPDATE SL_SODTL
        SET UDF_CLASSDATE = @classStart, UDF_CLASSENDDATE = @classEnd
        WHERE DOCKEY = @docKey AND SEQ = @seq
        """;

    var updated = 0;
    foreach (var (docKey, seq, classStart, classEnd) in rows)
    {
        await using var update = new FbCommand(updateSql, connection);
        update.Parameters.AddWithValue("@docKey", docKey);
        update.Parameters.AddWithValue("@seq", seq);
        update.Parameters.Add(new FbParameter("@classStart", FbDbType.Decimal) { Value = ToClassDateBcd(classStart) });
        update.Parameters.Add(new FbParameter("@classEnd", FbDbType.Decimal)
        {
            Value = classEnd.HasValue ? ToClassEndDateBcd(classEnd.Value) : DBNull.Value
        });
        updated += await update.ExecuteNonQueryAsync();
    }

    Console.WriteLine($"Backfilled UDF_CLASSDATE/UDF_CLASSENDDATE (BCD) on {updated} SL_SODTL row(s).");
    Console.WriteLine("Close and reopen SQL Account desktop, then open the sales order again.");
    return 0;
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
        SELECT TRIM(RF.RDB$FIELD_NAME), TRIM(RF.RDB$FIELD_SOURCE), F.RDB$FIELD_TYPE, F.RDB$FIELD_PRECISION, F.RDB$FIELD_SCALE, F.RDB$FIELD_SUB_TYPE
        FROM RDB$RELATION_FIELDS RF
        JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
        WHERE RF.RDB$RELATION_NAME = 'SL_SODTL'
          AND (TRIM(RF.RDB$FIELD_NAME) CONTAINING 'UDF'
               OR TRIM(RF.RDB$FIELD_NAME) IN ('UNITPRICE', 'AMOUNT', 'QTY'))
        ORDER BY 1
        """;

    await using var cmd = new FbCommand(sql, connection);
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        var name = reader.GetString(0).Trim();
        var domain = reader.GetString(1).Trim();
        var type = reader.GetInt16(2);
        var prec = reader.IsDBNull(3) ? "null" : reader.GetInt16(3).ToString();
        var scale = reader.IsDBNull(4) ? "null" : reader.GetInt16(4).ToString();
        var sub = reader.IsDBNull(5) ? "null" : reader.GetInt16(5).ToString();
        Console.WriteLine($"{name} domain={domain} type={type} ({DescribeFieldType(type)}) prec={prec} scale={scale} sub={sub}");
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

/// <summary>
/// Seed music-class fee invoices for Aiden Lim (300-A0001):
/// rewrite IV-00004 as unpaid piano fees, add one more unpaid reminder,
/// and one paid control invoice (STATUS=0 on all — outstanding is amount-based).
/// </summary>
static async Task<int> SeedStudentFeeInvoicesAsync(FbConnection connection)
{
    const string customerCode = "300-A0001";
    const string account = "500-500";

    await using var existsCmd = new FbCommand(
        "SELECT COUNT(*) FROM AR_CUSTOMER WHERE TRIM(CODE) = @code",
        connection);
    existsCmd.Parameters.AddWithValue("@code", customerCode);
    var exists = Convert.ToInt32(await existsCmd.ExecuteScalarAsync());
    if (exists == 0)
    {
        Console.WriteLine($"Customer {customerCode} not found.");
        return 1;
    }

    // Rewrite existing unpaid IV-00004 as music fees.
    await using var updHeader = new FbCommand(
        """
        UPDATE AR_IV
        SET DESCRIPTION = @description,
            DOCDATE = @docDate,
            POSTDATE = @docDate,
            TAXDATE = @docDate,
            DUEDATE = @dueDate,
            DOCAMT = @docAmt,
            LOCALDOCAMT = @docAmt,
            PAYMENTAMT = 0,
            STATUS = 0,
            CANCELLED = FALSE,
            LASTMODIFIED = @lastModified
        WHERE DOCKEY = 15 AND TRIM(CODE) = @code
        """,
        connection);
    var overdueDoc = new DateTime(2026, 8, 1);
    var overdueDue = new DateTime(2026, 8, 31);
    updHeader.Parameters.AddWithValue("@description", "Music tuition fees — Aug 2026");
    updHeader.Parameters.AddWithValue("@docDate", overdueDoc);
    updHeader.Parameters.AddWithValue("@dueDate", overdueDue);
    updHeader.Parameters.AddWithValue("@docAmt", 480m);
    updHeader.Parameters.AddWithValue("@lastModified", DateTimeOffset.UtcNow.ToUnixTimeSeconds());
    updHeader.Parameters.AddWithValue("@code", customerCode);
    var updated = await updHeader.ExecuteNonQueryAsync();
    Console.WriteLine(updated > 0
        ? "Updated IV-00004 → unpaid music fees RM 480 (due 2026-08-31)."
        : "WARN: IV-00004 / dockey 15 not found for 300-A0001.");

    await using var delDtl = new FbCommand("DELETE FROM AR_IVDTL WHERE DOCKEY = 15", connection);
    await delDtl.ExecuteNonQueryAsync();

    await using var maxDtlCmd = new FbCommand("SELECT COALESCE(MAX(DTLKEY), 0) FROM AR_IVDTL", connection);
    var nextDtl = Convert.ToInt32(await maxDtlCmd.ExecuteScalarAsync()) + 1;

    await InsertIvDetailAsync(connection, nextDtl++, 15, 1000, account, "Piano lessons — Aug 2026 (4 weeks)", 280m);
    await InsertIvDetailAsync(connection, nextDtl++, 15, 2000, account, "Theory class — Aug 2026", 200m);
    Console.WriteLine("Replaced IV-00004 detail lines with music fees.");

    await using var maxDocCmd = new FbCommand("SELECT COALESCE(MAX(DOCKEY), 0) FROM AR_IV", connection);
    var nextDoc = Convert.ToInt32(await maxDocCmd.ExecuteScalarAsync()) + 1;

    // Unpaid current-month reminder.
    var unpaidDocNo = await NextIvDocNoAsync(connection);
    var unpaidDocDate = new DateTime(2026, 9, 1);
    var unpaidDue = new DateTime(2026, 9, 30);
    const decimal unpaidAmt = 520m;
    await InsertIvHeaderAsync(
        connection,
        nextDoc,
        unpaidDocNo,
        customerCode,
        unpaidDocDate,
        unpaidDue,
        unpaidAmt,
        paymentAmt: 0m,
        "Music tuition fees — Sep 2026 (payment reminder)");
    await InsertIvDetailAsync(connection, nextDtl++, nextDoc, 1000, account, "Piano lessons — Sep 2026", 320m);
    await InsertIvDetailAsync(connection, nextDtl++, nextDoc, 2000, account, "Practice room fee — Sep 2026", 200m);
    Console.WriteLine($"Inserted unpaid {unpaidDocNo} dockey={nextDoc} RM {unpaidAmt:0.00} (due {unpaidDue:yyyy-MM-dd}).");
    nextDoc++;

    // Paid control (STATUS still 0 — should NOT show as reminder).
    var paidDocNo = await NextIvDocNoAsync(connection);
    var paidDocDate = new DateTime(2026, 7, 1);
    var paidDue = new DateTime(2026, 7, 31);
    const decimal paidAmt = 450m;
    await InsertIvHeaderAsync(
        connection,
        nextDoc,
        paidDocNo,
        customerCode,
        paidDocDate,
        paidDue,
        paidAmt,
        paymentAmt: paidAmt,
        "Music tuition fees — Jul 2026 (paid)");
    await InsertIvDetailAsync(connection, nextDtl++, nextDoc, 1000, account, "Piano lessons — Jul 2026", 450m);
    Console.WriteLine($"Inserted paid {paidDocNo} dockey={nextDoc} RM {paidAmt:0.00} (PAYMENTAMT=DOCAMT, STATUS=0).");

    Console.WriteLine("Student fee invoice seed complete for 300-A0001.");
    return 0;
}

static async Task<string> NextIvDocNoAsync(FbConnection connection)
{
    await using var cmd = new FbCommand(
        """
        SELECT MAX(CAST(SUBSTRING(DOCNO FROM 4) AS INTEGER))
        FROM AR_IV
        WHERE DOCNO STARTING WITH 'IV-'
        """,
        connection);
    var maxObj = await cmd.ExecuteScalarAsync();
    var next = maxObj is null or DBNull ? 1 : Convert.ToInt32(maxObj) + 1;
    return $"IV-{next:D5}";
}

static async Task InsertIvHeaderAsync(
    FbConnection connection,
    int docKey,
    string docNo,
    string customerCode,
    DateTime docDate,
    DateTime dueDate,
    decimal docAmt,
    decimal paymentAmt,
    string description)
{
    await using var cmd = new FbCommand(
        """
        INSERT INTO AR_IV (
            DOCKEY, DOCNO, CODE, JOURNAL, DOCDATE, POSTDATE, TAXDATE, TERMS, DUEDATE,
            DESCRIPTION, AREA, AGENT, PROJECT, CURRENCYCODE, CURRENCYRATE,
            DOCAMT, LOCALDOCAMT, PAYMENTAMT, FROMDOCTYPE, CANCELLED, STATUS, UPDATECOUNT, LASTMODIFIED
        ) VALUES (
            @docKey, @docNo, @code, 'SALES', @docDate, @docDate, @docDate, '30 Days', @dueDate,
            @description, 'KL', 'Yuki', '----', '----', 1,
            @docAmt, @docAmt, @paymentAmt, 'IV', FALSE, 0, 1, @lastModified
        )
        """,
        connection);
    cmd.Parameters.AddWithValue("@docKey", docKey);
    cmd.Parameters.AddWithValue("@docNo", docNo);
    cmd.Parameters.AddWithValue("@code", customerCode);
    cmd.Parameters.AddWithValue("@docDate", docDate);
    cmd.Parameters.AddWithValue("@dueDate", dueDate);
    cmd.Parameters.AddWithValue("@description", description);
    cmd.Parameters.AddWithValue("@docAmt", docAmt);
    cmd.Parameters.AddWithValue("@paymentAmt", paymentAmt);
    cmd.Parameters.AddWithValue("@lastModified", DateTimeOffset.UtcNow.ToUnixTimeSeconds());
    await cmd.ExecuteNonQueryAsync();
}

static async Task InsertIvDetailAsync(
    FbConnection connection,
    int dtlKey,
    int docKey,
    int seq,
    string account,
    string description,
    decimal amount)
{
    await using var cmd = new FbCommand(
        """
        INSERT INTO AR_IVDTL (
            DTLKEY, DOCKEY, SEQ, PROJECT, ACCOUNT, DESCRIPTION,
            AMOUNT, LOCALAMOUNT, TAXABLEAMT, TAXINCLUSIVE
        ) VALUES (
            @dtlKey, @docKey, @seq, '----', @account, @description,
            @amount, @amount, @amount, FALSE
        )
        """,
        connection);
    cmd.Parameters.AddWithValue("@dtlKey", dtlKey);
    cmd.Parameters.AddWithValue("@docKey", docKey);
    cmd.Parameters.AddWithValue("@seq", seq);
    cmd.Parameters.AddWithValue("@account", account);
    cmd.Parameters.AddWithValue("@description", description);
    cmd.Parameters.AddWithValue("@amount", amount);
    await cmd.ExecuteNonQueryAsync();
}

/// <summary>
/// Replace non-admin SY_USER rows with music teachers:
/// CODE = instrument/subject, NAME = person, EMAIL = login, MOBILE = mock MY number.
/// Inserts until 10 teachers exist; remaps SL_SODTL.UDF_CONDUCTEDBY from old NAME to new NAME.
/// </summary>
static async Task<int> RenameTeachersAsMusicAsync(FbConnection connection)
{
    var roster = MusicTeacherRoster();

    var existing = await LoadNonAdminSyUsersAsync(connection);
    existing = OrderSyUsersForMusicRename(existing);

    Console.WriteLine($"Found {existing.Count} non-admin SY_USER row(s). Target roster: {roster.Length}.");
    foreach (var row in existing)
        Console.WriteLine($"  BEFORE {row.Code} | {row.Name} | {row.Email} | autokey={row.AutoKey}");

    var oldNameToNewName = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    var updateCount = Math.Min(existing.Count, roster.Length);

    // Stage 1: move existing codes to temporary values to avoid unique conflicts.
    for (var i = 0; i < updateCount; i++)
    {
        var row = existing[i];
        var tempCode = $"TMP-T{i + 1}";
        await using var stage = new FbCommand(
            """
            UPDATE SY_USER
            SET CODE = @code
            WHERE AUTOKEY = @autokey
            """,
            connection);
        stage.Parameters.AddWithValue("@code", tempCode);
        stage.Parameters.AddWithValue("@autokey", row.AutoKey);
        await stage.ExecuteNonQueryAsync();
    }

    // Stage 2: apply final CODE / NAME / EMAIL / MOBILE.
    for (var i = 0; i < updateCount; i++)
    {
        var row = existing[i];
        var (code, name, email, mobile) = roster[i];
        if (!string.IsNullOrWhiteSpace(row.Name))
            oldNameToNewName[row.Name.Trim()] = name;

        await using var upd = new FbCommand(
            """
            UPDATE SY_USER
            SET CODE = @code, NAME = @name, EMAIL = @email, MOBILE = @mobile, UDF_ISADMIN = FALSE
            WHERE AUTOKEY = @autokey
            """,
            connection);
        upd.Parameters.AddWithValue("@code", code);
        upd.Parameters.AddWithValue("@name", name);
        upd.Parameters.AddWithValue("@email", email);
        upd.Parameters.AddWithValue("@mobile", mobile);
        upd.Parameters.AddWithValue("@autokey", row.AutoKey);
        await upd.ExecuteNonQueryAsync();
        Console.WriteLine($"  UPDATE autokey={row.AutoKey}: {row.Code}/{row.Name} → {code}/{name} <{email}> mobile={mobile}");
    }

    // Stage 3: insert remaining roster entries.
    if (existing.Count < roster.Length)
    {
        await using var maxCmd = new FbCommand("SELECT COALESCE(MAX(AUTOKEY), 0) FROM SY_USER", connection);
        var maxObj = await maxCmd.ExecuteScalarAsync();
        var nextKey = Convert.ToInt64(maxObj) + 1;

        for (var i = existing.Count; i < roster.Length; i++)
        {
            var (code, name, email, mobile) = roster[i];
            await using var insert = new FbCommand(
                """
                INSERT INTO SY_USER (AUTOKEY, CODE, NAME, EMAIL, MOBILE, UDF_ISADMIN, ISACTIVE)
                VALUES (@autokey, @code, @name, @email, @mobile, FALSE, TRUE)
                """,
                connection);
            insert.Parameters.AddWithValue("@autokey", nextKey);
            insert.Parameters.AddWithValue("@code", code);
            insert.Parameters.AddWithValue("@name", name);
            insert.Parameters.AddWithValue("@email", email);
            insert.Parameters.AddWithValue("@mobile", mobile);
            await insert.ExecuteNonQueryAsync();
            Console.WriteLine($"  INSERT autokey={nextKey}: {code}/{name} <{email}> mobile={mobile}");
            nextKey++;
        }
    }

    // Remap conducted-by from old department NAME to new teacher NAME.
    var remapped = 0;
    foreach (var (oldName, newName) in oldNameToNewName)
    {
        if (string.Equals(oldName, newName, StringComparison.OrdinalIgnoreCase))
            continue;
        await using var remap = new FbCommand(
            """
            UPDATE SL_SODTL
            SET UDF_CONDUCTEDBY = @newName
            WHERE TRIM(UDF_CONDUCTEDBY) = @oldName
            """,
            connection);
        remap.Parameters.AddWithValue("@newName", newName);
        remap.Parameters.AddWithValue("@oldName", oldName);
        remapped += await remap.ExecuteNonQueryAsync();
    }
    Console.WriteLine($"Remapped UDF_CONDUCTEDBY on {remapped} sales-order line(s).");

    await SetMusicTeacherMobilesAsync(connection);

    var after = await LoadNonAdminSyUsersAsync(connection);
    Console.WriteLine("AFTER:");
    foreach (var row in after.OrderBy(r => r.Name, StringComparer.OrdinalIgnoreCase))
        Console.WriteLine($"  {row.Code} | {row.Name} | {row.Email}");

    if (after.Count < roster.Length)
    {
        Console.WriteLine($"Expected {roster.Length} teachers, found {after.Count}.");
        return 1;
    }

    Console.WriteLine("Teacher rename complete.");
    return 0;
}

static (string Code, string Name, string Email, string Mobile)[] MusicTeacherRoster() =>
[
    ("Piano", "Sarah Chen", "sarahchen@gmail.com", "+60198765401"),
    ("Guitar", "David Wong", "davidwong@gmail.com", "+60198765402"),
    ("Violin", "Michelle Yap", "michelleyap@gmail.com", "+60198765403"),
    ("Drums", "Kevin Lim", "kevinlim@gmail.com", "+60198765404"),
    ("Voice", "Amira Hassan", "amirahassan@gmail.com", "+60198765405"),
    ("Cello", "Jason Ooi", "jasonooi@gmail.com", "+60198765406"),
    ("Flute", "Lily Chan", "lilychan@gmail.com", "+60198765407"),
    ("Saxophone", "Marcus Lee", "marcuslee@gmail.com", "+60198765408"),
    ("Theory", "Nadia Ibrahim", "nadiaibrahim@gmail.com", "+60198765409"),
    ("Keyboard", "Oliver Tan", "olivertan@gmail.com", "+60198765410"),
];

/// <summary>Set mock MOBILE on music teachers by email (safe to re-run).</summary>
static async Task<int> SetMusicTeacherMobilesAsync(FbConnection connection)
{
    var updated = 0;
    foreach (var (_, name, email, mobile) in MusicTeacherRoster())
    {
        await using var upd = new FbCommand(
            """
            UPDATE SY_USER
            SET MOBILE = @mobile
            WHERE LOWER(TRIM(EMAIL)) = LOWER(@email)
            """,
            connection);
        upd.Parameters.AddWithValue("@mobile", mobile);
        upd.Parameters.AddWithValue("@email", email);
        var n = await upd.ExecuteNonQueryAsync();
        updated += n;
        Console.WriteLine($"{(n > 0 ? "OK" : "MISS")} {name} <{email}> mobile={mobile}");
    }

    Console.WriteLine($"Updated MOBILE on {updated} SY_USER row(s).");
    return updated > 0 ? 0 : 1;
}

static async Task<List<SyUserRow>> LoadNonAdminSyUsersAsync(FbConnection connection)
{
    const string sql = """
        SELECT AUTOKEY, CODE, NAME, EMAIL
        FROM SY_USER
        WHERE EMAIL IS NOT NULL
          AND TRIM(EMAIL) <> ''
          AND (UDF_ISADMIN IS NULL OR UDF_ISADMIN = FALSE)
        ORDER BY NAME
        """;

    var rows = new List<SyUserRow>();
    await using var cmd = new FbCommand(sql, connection);
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        var code = reader["CODE"]?.ToString()?.Trim() ?? string.Empty;
        var name = reader["NAME"]?.ToString()?.Trim() ?? string.Empty;
        var email = reader["EMAIL"]?.ToString()?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email))
            continue;
        rows.Add(new SyUserRow(Convert.ToInt64(reader["AUTOKEY"]), code, name, email));
    }
    return rows;
}

static List<SyUserRow> OrderSyUsersForMusicRename(List<SyUserRow> all)
{
    if (all.Count == 0)
        return all;

    var ordered = new List<SyUserRow>();
    var used = new HashSet<long>();
    var slotMatchers = new Func<SyUserRow, bool>[]
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
        var match = all.FirstOrDefault(t => !used.Contains(t.AutoKey) && matches(t));
        if (match.AutoKey == 0 && string.IsNullOrEmpty(match.Email))
            continue;
        ordered.Add(match);
        used.Add(match.AutoKey);
    }

    foreach (var teacher in all.Where(t => !used.Contains(t.AutoKey)))
        ordered.Add(teacher);

    return ordered;
}

/// <summary>
/// Rename every AR_CUSTOMER to a student display name and set email to {firstname}@gmail.com.
/// Also syncs sole non-billing branch name/email (creates branch if missing).
/// </summary>
static async Task<int> RenameCustomersAsStudentsAsync(FbConnection connection)
{
    var emailColumn = await ResolveCustomerEmailColumnAsync(connection);
    if (emailColumn == null)
    {
        Console.WriteLine("AR_CUSTOMER has no UDF_EMAIL / UDF_EMAILL — cannot set student emails.");
        return 1;
    }

    // CODE → (StudentName, email local-part)
    var map = new Dictionary<string, (string Name, string EmailLocal)>(StringComparer.OrdinalIgnoreCase)
    {
        ["300-A0001"] = ("Aiden Lim", "aidenlim"),
        ["300-B0001"] = ("Bob Tan", "bobtan"),
        ["300-C0001"] = ("Chloe Tan", "chloetan"),
        ["300-C0002"] = ("Casey Ng", "caseyng"),
        ["300-D0001"] = ("Dylan Ong", "dylanong"),
        ["300-E0001"] = ("Ethan Koh", "ethankoh"),
        ["300-G0001"] = ("Goh Jun Wei", "gohjunwei"),
        ["300-G0002"] = ("Grace Teo", "graceteo"),
        ["300-G0003"] = ("Giselle Ho", "giselleho"),
        ["300-H0001"] = ("Yara Soh", "yarasoh"),
        ["300-J0001"] = ("Jason Lee", "jasonlee"),
        ["300-P0001"] = ("Mia Wong", "miawong"),
        ["300-P0002"] = ("Noah Tan", "noahtan"),
        ["300-P0003"] = ("Sofia Lim", "sofialim"),
        ["300-P0004"] = ("Alex Park", "alexpark"),
        ["300-T0001"] = ("Tina Nguyen", "tinanguyen"),
        ["300-W0001"] = ("Woody Tan", "woodytan"),
        ["300-W0002"] = ("Wendy Chong", "wendychong"),
    };

    foreach (var (code, (name, emailLocal)) in map)
    {
        var email = $"{emailLocal}@gmail.com";
        var branches = await LoadChildBranchesAsync(connection, code);
        var oldBranch = branches.FirstOrDefault().BranchName;

        Console.WriteLine($"--- {code}: → {name} <{email}>");

        await using (var upd = new FbCommand(
            $"""
            UPDATE AR_CUSTOMER
            SET COMPANYNAME = @name, {emailColumn} = @email
            WHERE CODE = @code
            """,
            connection))
        {
            upd.Parameters.AddWithValue("@name", name);
            upd.Parameters.AddWithValue("@email", email);
            upd.Parameters.AddWithValue("@code", code);
            var n = await upd.ExecuteNonQueryAsync();
            if (n == 0)
            {
                Console.WriteLine("  SKIP (customer not found)");
                continue;
            }
        }

        if (string.IsNullOrWhiteSpace(oldBranch))
        {
            await EnsureStudentBranchAsync(connection, code, name, email);
            Console.WriteLine($"  created branch '{name}'");
        }
        else if (!string.Equals(oldBranch, name, StringComparison.OrdinalIgnoreCase))
        {
            await RemapBranchNameAsync(connection, code, oldBranch, name);
            await RenameChildBranchAsync(connection, code, oldBranch, name);
            Console.WriteLine($"  renamed branch '{oldBranch}' → '{name}'");
        }

        await using (var syncBranch = new FbCommand(
            """
            UPDATE AR_CUSTOMERBRANCH
            SET EMAIL = @email, ATTENTION = @name
            WHERE CODE = @code
              AND BRANCHTYPE <> 'B'
              AND TRIM(BRANCHNAME) <> 'BILLING'
            """,
            connection))
        {
            syncBranch.Parameters.AddWithValue("@email", email);
            syncBranch.Parameters.AddWithValue("@name", name);
            syncBranch.Parameters.AddWithValue("@code", code);
            await syncBranch.ExecuteNonQueryAsync();
        }
    }

    Console.WriteLine("Rename complete.");
    return 0;
}

static async Task EnsureStudentBranchAsync(
    FbConnection connection,
    string customerCode,
    string branchName,
    string email)
{
    // Already have a child branch?
    var existing = await LoadChildBranchesAsync(connection, customerCode);
    if (existing.Count > 0)
        return;

    await using var maxCmd = new FbCommand("SELECT COALESCE(MAX(DTLKEY), 0) FROM AR_CUSTOMERBRANCH", connection);
    var maxObj = await maxCmd.ExecuteScalarAsync();
    var nextKey = Convert.ToInt32(maxObj) + 1;

    await using var insert = new FbCommand(
        """
        INSERT INTO AR_CUSTOMERBRANCH (DTLKEY, CODE, BRANCHTYPE, BRANCHNAME, ATTENTION, EMAIL)
        VALUES (@dtlKey, @code, 'D', @branch, @attention, @email)
        """,
        connection);
    insert.Parameters.AddWithValue("@dtlKey", nextKey);
    insert.Parameters.AddWithValue("@code", customerCode);
    insert.Parameters.AddWithValue("@branch", branchName);
    insert.Parameters.AddWithValue("@attention", branchName);
    insert.Parameters.AddWithValue("@email", email);
    await insert.ExecuteNonQueryAsync();
}

/// <summary>
/// One customer = one student: keep a single non-billing branch per customer,
/// remap SO/PORTAL_* BRANCHNAME from extras, ensure AR_CUSTOMER email is set.
/// Pass --dry-run to report without writing.
/// </summary>
static async Task<int> NormalizeCustomerAsStudentAsync(FbConnection connection, bool dryRun)
{
    var emailColumn = await ResolveCustomerEmailColumnAsync(connection);
    Console.WriteLine(dryRun
        ? "DRY RUN — no changes will be written."
        : "APPLY — writing normalize changes.");
    Console.WriteLine(emailColumn == null
        ? "AR_CUSTOMER has no UDF_EMAIL / UDF_EMAILL — customer email backfill skipped."
        : $"Using AR_CUSTOMER.{emailColumn} for customer email.");

    const string customersSql = """
        SELECT CODE, COMPANYNAME
        FROM AR_CUSTOMER
        ORDER BY CODE
        """;

    var customers = new List<(string Code, string CompanyName)>();
    await using (var cmd = new FbCommand(customersSql, connection))
    await using (var reader = await cmd.ExecuteReaderAsync())
    {
        while (await reader.ReadAsync())
        {
            var code = reader["CODE"]?.ToString()?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(code)) continue;
            customers.Add((code, reader["COMPANYNAME"]?.ToString()?.Trim() ?? code));
        }
    }

    var changed = 0;
    foreach (var (code, companyName) in customers)
    {
        var branches = await LoadChildBranchesAsync(connection, code);
        if (branches.Count == 0)
        {
            Console.WriteLine($"SKIP {code} ({companyName}): no non-billing branches");
            continue;
        }

        string? customerEmail = null;
        if (emailColumn != null)
            customerEmail = await ReadCustomerEmailAsync(connection, code, emailColumn);

        var canonical = PickCanonicalBranch(branches, customerEmail);
        var targetName = string.IsNullOrWhiteSpace(companyName) ? canonical.BranchName : companyName;
        // Firebird BRANCHNAME length is typically 40–100; keep within 100.
        if (targetName.Length > 100) targetName = targetName[..100];

        var extras = branches
            .Where(b => !string.Equals(b.BranchName, canonical.BranchName, StringComparison.OrdinalIgnoreCase))
            .ToList();

        Console.WriteLine($"--- {code} | {companyName}");
        Console.WriteLine($"  branches: {string.Join(", ", branches.Select(b => b.BranchName))}");
        Console.WriteLine($"  canonical: {canonical.BranchName} → target BRANCHNAME '{targetName}'");
        if (extras.Count > 0)
            Console.WriteLine($"  merge/delete: {string.Join(", ", extras.Select(b => b.BranchName))}");

        if (dryRun)
        {
            changed++;
            continue;
        }

        // Ensure customer email from branch if empty
        if (emailColumn != null && string.IsNullOrWhiteSpace(customerEmail))
        {
            var sourceEmail = branches
                .Select(b => b.Email)
                .FirstOrDefault(e => !string.IsNullOrWhiteSpace(e));
            if (!string.IsNullOrWhiteSpace(sourceEmail))
            {
                await using var setEmail = new FbCommand(
                    $"UPDATE AR_CUSTOMER SET {emailColumn} = @email WHERE CODE = @code",
                    connection);
                setEmail.Parameters.AddWithValue("@email", sourceEmail.Trim());
                setEmail.Parameters.AddWithValue("@code", code);
                await setEmail.ExecuteNonQueryAsync();
                customerEmail = sourceEmail.Trim();
                Console.WriteLine($"  set customer email ← {customerEmail}");
            }
        }

        // Remap extras → canonical name first (before rename), then rename canonical → target
        foreach (var extra in extras)
        {
            await RemapBranchNameAsync(connection, code, extra.BranchName, canonical.BranchName);
            await DeleteChildBranchAsync(connection, code, extra.BranchName);
            Console.WriteLine($"  remapped+deleted branch '{extra.BranchName}' → '{canonical.BranchName}'");
        }

        if (!string.Equals(canonical.BranchName, targetName, StringComparison.OrdinalIgnoreCase))
        {
            // If target name already exists as another row (shouldn't after extras deleted), skip rename
            await RemapBranchNameAsync(connection, code, canonical.BranchName, targetName);
            await RenameChildBranchAsync(connection, code, canonical.BranchName, targetName);
            Console.WriteLine($"  renamed branch '{canonical.BranchName}' → '{targetName}'");
        }

        // Sync branch email from customer email
        if (!string.IsNullOrWhiteSpace(customerEmail))
        {
            await using var syncBranchEmail = new FbCommand(
                """
                UPDATE AR_CUSTOMERBRANCH
                SET EMAIL = @email
                WHERE CODE = @code
                  AND BRANCHTYPE <> 'B'
                  AND TRIM(BRANCHNAME) <> 'BILLING'
                """,
                connection);
            syncBranchEmail.Parameters.AddWithValue("@email", customerEmail.Trim());
            syncBranchEmail.Parameters.AddWithValue("@code", code);
            await syncBranchEmail.ExecuteNonQueryAsync();
        }

        changed++;
    }

    Console.WriteLine(dryRun
        ? $"Dry run complete. {changed} customer(s) would be normalized."
        : $"Normalize complete. {changed} customer(s) processed.");
    return 0;
}

static async Task<List<(string BranchName, string? Email)>> LoadChildBranchesAsync(
    FbConnection connection,
    string customerCode)
{
    const string sql = """
        SELECT BRANCHNAME, EMAIL, BRANCHTYPE
        FROM AR_CUSTOMERBRANCH
        WHERE CODE = @code
        ORDER BY BRANCHNAME
        """;
    var list = new List<(string BranchName, string? Email)>();
    await using var cmd = new FbCommand(sql, connection);
    cmd.Parameters.AddWithValue("@code", customerCode);
    await using var reader = await cmd.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        var type = reader["BRANCHTYPE"]?.ToString()?.Trim();
        var name = reader["BRANCHNAME"]?.ToString()?.Trim() ?? string.Empty;
        if (string.Equals(type, "B", StringComparison.OrdinalIgnoreCase)) continue;
        if (string.Equals(name, "BILLING", StringComparison.OrdinalIgnoreCase)) continue;
        if (string.IsNullOrWhiteSpace(name)) continue;
        list.Add((name, reader["EMAIL"]?.ToString()?.Trim()));
    }

    return list;
}

static (string BranchName, string? Email) PickCanonicalBranch(
    List<(string BranchName, string? Email)> branches,
    string? customerEmail)
{
    if (!string.IsNullOrWhiteSpace(customerEmail))
    {
        var match = branches.FirstOrDefault(b =>
            string.Equals(b.Email, customerEmail.Trim(), StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(match.BranchName))
            return match;
    }

    return branches
        .OrderBy(b => b.BranchName, StringComparer.OrdinalIgnoreCase)
        .First();
}

static async Task<string?> ReadCustomerEmailAsync(FbConnection connection, string code, string emailColumn)
{
    await using var cmd = new FbCommand(
        $"SELECT TRIM({emailColumn}) FROM AR_CUSTOMER WHERE CODE = @code",
        connection);
    cmd.Parameters.AddWithValue("@code", code);
    var value = await cmd.ExecuteScalarAsync();
    var email = value?.ToString()?.Trim();
    return string.IsNullOrWhiteSpace(email) ? null : email;
}

static async Task RemapBranchNameAsync(
    FbConnection connection,
    string customerCode,
    string fromBranch,
    string toBranch)
{
    if (string.Equals(fromBranch, toBranch, StringComparison.OrdinalIgnoreCase))
        return;

    // SL_SO
    await ExecUpdateAsync(connection,
        "UPDATE SL_SO SET BRANCHNAME = @to WHERE CODE = @code AND BRANCHNAME = @from",
        customerCode, fromBranch, toBranch);

    foreach (var table in new[]
             {
                 "PORTAL_HOMEWORK",
                 "PORTAL_LEAVE_REQUESTS",
                 "PORTAL_CLASS_SESSIONS",
             })
    {
        if (!await RelationExistsAsync(connection, table))
            continue;

        await ExecUpdateAsync(connection,
            $"UPDATE {table} SET BRANCHNAME = @to WHERE CUSTOMERCODE = @code AND BRANCHNAME = @from",
            customerCode, fromBranch, toBranch);
    }
}

static async Task ExecUpdateAsync(
    FbConnection connection,
    string sql,
    string customerCode,
    string fromBranch,
    string toBranch)
{
    await using var cmd = new FbCommand(sql, connection);
    cmd.Parameters.AddWithValue("@to", toBranch);
    cmd.Parameters.AddWithValue("@code", customerCode);
    cmd.Parameters.AddWithValue("@from", fromBranch);
    var n = await cmd.ExecuteNonQueryAsync();
    if (n > 0)
        Console.WriteLine($"    {n} row(s): {sql.Split('\n')[0].Trim()}…");
}

static async Task RenameChildBranchAsync(
    FbConnection connection,
    string customerCode,
    string fromBranch,
    string toBranch)
{
    if (string.Equals(fromBranch, toBranch, StringComparison.OrdinalIgnoreCase))
        return;

    await using var cmd = new FbCommand(
        """
        UPDATE AR_CUSTOMERBRANCH
        SET BRANCHNAME = @to
        WHERE CODE = @code AND BRANCHNAME = @from
          AND BRANCHTYPE <> 'B'
        """,
        connection);
    cmd.Parameters.AddWithValue("@to", toBranch);
    cmd.Parameters.AddWithValue("@code", customerCode);
    cmd.Parameters.AddWithValue("@from", fromBranch);
    await cmd.ExecuteNonQueryAsync();
}

static async Task DeleteChildBranchAsync(
    FbConnection connection,
    string customerCode,
    string branchName)
{
    await using var cmd = new FbCommand(
        """
        DELETE FROM AR_CUSTOMERBRANCH
        WHERE CODE = @code AND BRANCHNAME = @branch
          AND BRANCHTYPE <> 'B'
          AND TRIM(BRANCHNAME) <> 'BILLING'
        """,
        connection);
    cmd.Parameters.AddWithValue("@code", customerCode);
    cmd.Parameters.AddWithValue("@branch", branchName);
    await cmd.ExecuteNonQueryAsync();
}

static async Task<bool> RelationExistsAsync(FbConnection connection, string relationName)
{
    const string sql = """
        SELECT 1 FROM RDB$RELATIONS
        WHERE TRIM(RDB$RELATION_NAME) = @name
        """;
    await using var cmd = new FbCommand(sql, connection);
    cmd.Parameters.AddWithValue("@name", relationName.ToUpperInvariant());
    return await cmd.ExecuteScalarAsync() != null;
}

static async Task<int> SyncParentEmailToBranchesAsync(FbConnection connection)
{
    var emailColumn = await ResolveCustomerEmailColumnAsync(connection);
    if (emailColumn == null)
    {
        Console.WriteLine("AR_CUSTOMER has no UDF_EMAIL / UDF_EMAILL column — nothing to copy.");
        return 1;
    }

    Console.WriteLine($"Using AR_CUSTOMER.{emailColumn} as parent login email source.");

    var updateSql = $"""
        UPDATE AR_CUSTOMERBRANCH B
        SET EMAIL = (
            SELECT TRIM(A.{emailColumn})
            FROM AR_CUSTOMER A
            WHERE A.CODE = B.CODE
        )
        WHERE EXISTS (
            SELECT 1
            FROM AR_CUSTOMER A
            WHERE A.CODE = B.CODE
              AND A.{emailColumn} IS NOT NULL
              AND TRIM(A.{emailColumn}) <> ''
        )
          AND B.BRANCHTYPE <> 'B'
          AND TRIM(B.BRANCHNAME) <> 'BILLING'
        """;

    await using var update = new FbCommand(updateSql, connection);
    var updated = await update.ExecuteNonQueryAsync();
    Console.WriteLine($"Copied AR_CUSTOMER.{emailColumn} to AR_CUSTOMERBRANCH.EMAIL on {updated} child branch row(s).");

    var verifySql = $"""
        SELECT A.CODE, A.COMPANYNAME, TRIM(A.{emailColumn}) AS PARENT_EMAIL, B.BRANCHNAME, TRIM(B.EMAIL) AS BRANCH_EMAIL
        FROM AR_CUSTOMER A
        INNER JOIN AR_CUSTOMERBRANCH B ON A.CODE = B.CODE
        WHERE A.{emailColumn} IS NOT NULL
          AND TRIM(A.{emailColumn}) <> ''
          AND B.BRANCHTYPE <> 'B'
          AND TRIM(B.BRANCHNAME) <> 'BILLING'
        ORDER BY A.CODE, B.BRANCHNAME
        """;

    await using var verify = new FbCommand(verifySql, connection);
    await using var reader = await verify.ExecuteReaderAsync();
    while (await reader.ReadAsync())
    {
        var code = reader["CODE"]?.ToString()?.Trim();
        var udf = reader["PARENT_EMAIL"]?.ToString()?.Trim();
        var branch = reader["BRANCHNAME"]?.ToString()?.Trim();
        var email = reader["BRANCH_EMAIL"]?.ToString()?.Trim();
        var match = string.Equals(udf, email, StringComparison.OrdinalIgnoreCase) ? "OK" : "MISMATCH";
        Console.WriteLine($"{match} {code} / {branch}: PARENT={udf} BRANCH={email}");
    }

    return 0;
}

/// <summary>
/// Customer = student: copy student name + login email onto billing branch contact fields.
/// Leaves BRANCHNAME as BILLING; does not change address/phone.
/// </summary>
static async Task<int> SyncBillingToStudentAsync(FbConnection connection)
{
    var emailColumn = await ResolveCustomerEmailColumnAsync(connection);
    if (emailColumn == null)
    {
        Console.WriteLine("AR_CUSTOMER has no UDF_EMAIL / UDF_EMAILL column — nothing to copy.");
        return 1;
    }

    Console.WriteLine($"Using AR_CUSTOMER.COMPANYNAME + {emailColumn} for billing ATTENTION/EMAIL.");

    var updateSql = $"""
        UPDATE AR_CUSTOMERBRANCH B
        SET
            ATTENTION = (
                SELECT TRIM(A.COMPANYNAME)
                FROM AR_CUSTOMER A
                WHERE A.CODE = B.CODE
            ),
            EMAIL = (
                SELECT TRIM(A.{emailColumn})
                FROM AR_CUSTOMER A
                WHERE A.CODE = B.CODE
            )
        WHERE EXISTS (
            SELECT 1
            FROM AR_CUSTOMER A
            WHERE A.CODE = B.CODE
              AND A.{emailColumn} IS NOT NULL
              AND TRIM(A.{emailColumn}) <> ''
        )
          AND (
              B.BRANCHTYPE = 'B'
              OR UPPER(TRIM(B.BRANCHNAME)) = 'BILLING'
          )
        """;

    await using var update = new FbCommand(updateSql, connection);
    var updated = await update.ExecuteNonQueryAsync();
    Console.WriteLine($"Updated ATTENTION/EMAIL on {updated} billing branch row(s).");

    var verifySql = $"""
        SELECT A.CODE,
               TRIM(A.COMPANYNAME) AS STUDENT_NAME,
               TRIM(A.{emailColumn}) AS STUDENT_EMAIL,
               TRIM(B.BRANCHNAME) AS BRANCH,
               TRIM(B.ATTENTION) AS ATTENTION,
               TRIM(B.EMAIL) AS BRANCH_EMAIL
        FROM AR_CUSTOMER A
        INNER JOIN AR_CUSTOMERBRANCH B ON A.CODE = B.CODE
        WHERE A.{emailColumn} IS NOT NULL
          AND TRIM(A.{emailColumn}) <> ''
          AND (
              B.BRANCHTYPE = 'B'
              OR UPPER(TRIM(B.BRANCHNAME)) = 'BILLING'
          )
        ORDER BY A.CODE
        """;

    await using var verify = new FbCommand(verifySql, connection);
    await using var reader = await verify.ExecuteReaderAsync();
    var mismatches = 0;
    while (await reader.ReadAsync())
    {
        var code = reader["CODE"]?.ToString()?.Trim();
        var name = reader["STUDENT_NAME"]?.ToString()?.Trim();
        var email = reader["STUDENT_EMAIL"]?.ToString()?.Trim();
        var attn = reader["ATTENTION"]?.ToString()?.Trim();
        var branchEmail = reader["BRANCH_EMAIL"]?.ToString()?.Trim();
        var ok = string.Equals(name, attn, StringComparison.OrdinalIgnoreCase)
                 && string.Equals(email, branchEmail, StringComparison.OrdinalIgnoreCase);
        if (!ok) mismatches++;
        Console.WriteLine($"{(ok ? "OK" : "MISMATCH")} {code}: student={name} <{email}> billing attn={attn} email={branchEmail}");
    }

    if (mismatches > 0)
    {
        Console.WriteLine($"{mismatches} billing row(s) still mismatched.");
        return 1;
    }

    Console.WriteLine("All billing contacts match student name/email.");
    return 0;
}

static async Task<string?> ResolveCustomerEmailColumnAsync(FbConnection connection)
{
    if (await CustomerColumnExistsAsync(connection, "UDF_EMAIL"))
        return "UDF_EMAIL";
    if (await CustomerColumnExistsAsync(connection, "UDF_EMAILL"))
        return "UDF_EMAILL";
    return null;
}

static async Task<bool> CustomerColumnExistsAsync(FbConnection connection, string columnName)
{
    const string sql = """
        SELECT 1
        FROM RDB$RELATION_FIELDS
        WHERE RDB$RELATION_NAME = 'AR_CUSTOMER'
          AND TRIM(RDB$FIELD_NAME) = @name
        """;
    await using var cmd = new FbCommand(sql, connection);
    cmd.Parameters.AddWithValue("@name", columnName.Trim());
    return await cmd.ExecuteScalarAsync() != null;
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
    }
    else
    {
        Console.WriteLine("SL_SODTL.UDF_CLASSDATE not found — portal copy skipped.");
    }

    Console.WriteLine("Portal schedule migration complete (SL_SODTL date UDFs kept for SQL Account desktop).");
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
        await SyncSodtlUdfClassDatesAsync(connection, docKey, seq, classStart, classEnd);
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
    await SyncSodtlUdfClassDatesAsync(connection, docKey, seq, classStart, classEnd);
}

static async Task SyncSodtlUdfClassDatesAsync(
    FbConnection connection,
    int docKey,
    int seq,
    DateTime classStart,
    DateTime? classEnd)
{
    if (!await SodtlColumnExistsAsync(connection, "UDF_CLASSDATE"))
        return;

    const string sql = """
        UPDATE SL_SODTL
        SET UDF_CLASSDATE = @classStart, UDF_CLASSENDDATE = @classEnd
        WHERE DOCKEY = @docKey AND SEQ = @seq
        """;
    await using var cmd = new FbCommand(sql, connection);
    cmd.Parameters.AddWithValue("@docKey", docKey);
    cmd.Parameters.AddWithValue("@seq", seq);
    cmd.Parameters.Add(new FbParameter("@classStart", FbDbType.Decimal) { Value = ToClassDateBcd(classStart) });
    cmd.Parameters.Add(new FbParameter("@classEnd", FbDbType.Decimal)
    {
        Value = classEnd.HasValue ? ToClassEndDateBcd(classEnd.Value) : DBNull.Value
    });
    await cmd.ExecuteNonQueryAsync();
}

readonly record struct SyTeacher(string Name, string Email);
readonly record struct SyUserRow(long AutoKey, string Code, string Name, string Email);
readonly record struct ClassSchedule(string ItemCode, string TeacherName, string DayOfWeek, decimal UdfClassTime);
