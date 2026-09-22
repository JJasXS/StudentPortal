using FirebirdSql.Data.FirebirdClient;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Helpers;
using MusicTuitionPortal.Api.Models;

namespace MusicTuitionPortal.Api.Services;

/// <summary>
/// Read-only fallback: load AR_CUSTOMER + AR_CUSTOMERBRANCH directly from the local .FDB
/// when the cloud SQL Account API is unavailable.
/// </summary>
public class SqlAccountLocalDbService
{
    private readonly SqlAccountSettings _settings;
    private readonly ILogger<SqlAccountLocalDbService> _logger;

    public SqlAccountLocalDbService(SqlAccountSettings settings, ILogger<SqlAccountLocalDbService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public bool CanReadLocalDb =>
        !string.IsNullOrWhiteSpace(_settings.DatabasePath) && File.Exists(_settings.DatabasePath);

    public bool CanWriteLocalDb => CanReadLocalDb;

    public async Task<SqlAccountCustomerMatch?> FindCustomerByUdfEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb)
            return null;

        var normalized = email.Trim();
        var parents = await GetParentChildrenAsync(cancellationToken);
        var match = parents.FirstOrDefault(p => EmailMatches(p.ParentEmail, normalized));
        return match == null ? null : ToMatch(match);
    }

    public async Task<SqlAccountCustomerMatch?> FindCustomerByCodeAsync(
        string customerCode,
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb || string.IsNullOrWhiteSpace(customerCode))
            return null;

        var parents = await GetParentChildrenAsync(cancellationToken);
        var match = parents.FirstOrDefault(p =>
            string.Equals(p.CustomerCode, customerCode.Trim(), StringComparison.OrdinalIgnoreCase));
        return match == null ? null : ToMatch(match);
    }

    public async Task<SqlAccountStaffUserMatch?> FindStaffByEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb || string.IsNullOrWhiteSpace(email))
            return null;

        try
        {
            await using var connection = OpenConnection();
            await connection.OpenAsync(cancellationToken);

            const string sql = """
                SELECT CODE, NAME, EMAIL, MOBILE, PHONE, UDF_ISADMIN
                FROM SY_USER
                WHERE EMAIL IS NOT NULL
                  AND TRIM(EMAIL) <> ''
                  AND LOWER(TRIM(EMAIL)) = LOWER(@email)
                """;

            await using var command = new FbCommand(sql, connection);
            command.Parameters.AddWithValue("@email", email.Trim());

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                return null;

            var matchedEmail = ReadString(reader, "EMAIL") ?? email.Trim();
            var mobile = ReadString(reader, "MOBILE") ?? ReadString(reader, "PHONE");
            return new SqlAccountStaffUserMatch(
                ReadString(reader, "CODE") ?? string.Empty,
                ReadString(reader, "NAME") ?? matchedEmail,
                matchedEmail,
                ReadBool(reader, "UDF_ISADMIN"),
                string.IsNullOrWhiteSpace(mobile) ? null : mobile.Trim());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Local SQL Account SY_USER read failed for {Email}", email);
            return null;
        }
    }

    public async Task<IReadOnlyList<SqlAccountOutstandingInvoiceDto>> GetCustomerInvoicesForCodeAsync(
        string customerCode,
        CancellationToken cancellationToken = default)
    {
        var bundle = await GetCustomerInvoiceBundleForCodeAsync(customerCode, cancellationToken);
        return bundle.Due;
    }

    public async Task<SqlAccountStudentInvoicesDto> GetCustomerInvoiceBundleForCodeAsync(
        string customerCode,
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb || string.IsNullOrWhiteSpace(customerCode))
            return new SqlAccountStudentInvoicesDto([], []);

        try
        {
            await using var connection = OpenConnection();
            await connection.OpenAsync(cancellationToken);

            const string sql = """
                SELECT DOCKEY, DOCNO, DOCDATE, DUEDATE, DOCAMT, PAYMENTAMT, DESCRIPTION, STATUS, CANCELLED
                FROM AR_IV
                WHERE TRIM(CODE) = @code
                  AND (CANCELLED IS NULL OR CANCELLED = FALSE)
                ORDER BY DOCDATE DESC, DOCNO DESC
                """;

            var due = new List<SqlAccountOutstandingInvoiceDto>();
            var history = new List<SqlAccountOutstandingInvoiceDto>();
            await using var command = new FbCommand(sql, connection);
            command.Parameters.AddWithValue("@code", customerCode.Trim());
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var docAmt = ReadDecimal(reader, "DOCAMT");
                var paymentAmt = ReadDecimal(reader, "PAYMENTAMT");
                var outstanding = docAmt - paymentAmt;
                var dto = new SqlAccountOutstandingInvoiceDto(
                    Convert.ToInt32(reader["DOCKEY"]),
                    ReadString(reader, "DOCNO") ?? string.Empty,
                    FormatDate(ReadValue(reader, "DOCDATE")),
                    FormatDate(ReadValue(reader, "DUEDATE")),
                    docAmt,
                    paymentAmt,
                    outstanding < 0 ? 0 : outstanding,
                    ReadString(reader, "DESCRIPTION"),
                    ReadNullableInt(reader, "STATUS"));

                if (outstanding > 0)
                    due.Add(dto);
                else if (paymentAmt > 0)
                    history.Add(dto);
            }

            return new SqlAccountStudentInvoicesDto(due, history);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Local SQL Account AR_IV read failed for {Code}", customerCode);
            return new SqlAccountStudentInvoicesDto([], []);
        }
    }

    public async Task<IReadOnlyList<SqlAccountParentDto>> GetParentChildrenAsync(
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb)
            return Array.Empty<SqlAccountParentDto>();

        try
        {
            await using var connection = OpenConnection();
            await connection.OpenAsync(cancellationToken);
            return await QueryParentsAsync(connection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Local SQL Account DB parent list read failed from {Path}", _settings.DatabasePath);
            return Array.Empty<SqlAccountParentDto>();
        }
    }

    public async Task<IReadOnlyList<SqlAccountChildEnrollmentDto>> GetChildEnrollmentsAsync(
        string customerCode,
        string branchName,
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb || string.IsNullOrWhiteSpace(customerCode) || string.IsNullOrWhiteSpace(branchName))
            return Array.Empty<SqlAccountChildEnrollmentDto>();

        try
        {
            await using var connection = OpenConnection();
            await connection.OpenAsync(cancellationToken);

            var hasSchedule = await PortalFirebirdSchema.TableExistsAsync(
                connection, "PORTAL_SO_LINE_SCHEDULE", cancellationToken);
            var scheduleJoin = hasSchedule
                ? "LEFT JOIN PORTAL_SO_LINE_SCHEDULE S ON S.DOCKEY = B.DOCKEY AND S.SEQ = B.SEQ"
                : string.Empty;
            var scheduleCols = hasSchedule
                ? "S.CLASSSTARTDATETIME, S.CLASSENDDATE"
                : "CAST(NULL AS TIMESTAMP) AS CLASSSTARTDATETIME, CAST(NULL AS TIMESTAMP) AS CLASSENDDATE";

            var sql = $"""
                SELECT A.DOCKEY, B.SEQ, A.DOCNO, A.DOCDATE,
                       B.ITEMCODE, B.DESCRIPTION, B.QTY, B.UNITPRICE, B.AMOUNT, B.DELIVERYDATE,
                       B.UDF_CLASSDAY, B.UDF_CLASSTIME, B.UDF_STUDENTNAME, B.UDF_CONDUCTEDBY,
                       {scheduleCols}
                FROM SL_SO A
                INNER JOIN SL_SODTL B ON A.DOCKEY = B.DOCKEY
                {scheduleJoin}
                WHERE A.CODE = @code
                  AND A.BRANCHNAME = @branch
                  AND (A.CANCELLED IS NULL OR A.CANCELLED = FALSE)
                ORDER BY A.DOCDATE DESC, B.SEQ
                """;

            await using var command = new FbCommand(sql, connection);
            command.Parameters.AddWithValue("@code", customerCode.Trim());
            command.Parameters.AddWithValue("@branch", branchName.Trim());

            var results = new List<SqlAccountChildEnrollmentDto>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var description = ReadString(reader, "DESCRIPTION");
                var itemCode = ReadString(reader, "ITEMCODE");
                var className = !string.IsNullOrWhiteSpace(description) ? description : itemCode ?? "Class";

                var deliveryDate = FormatDate(ReadValue(reader, "DELIVERYDATE"));
                var classEnd = ReadClassDateTime(reader, "CLASSENDDATE");
                if (classEnd.HasValue)
                    deliveryDate = classEnd.Value.ToString("yyyy-MM-dd");

                results.Add(new SqlAccountChildEnrollmentDto(
                    Convert.ToInt32(reader["DOCKEY"]),
                    Convert.ToInt32(reader["SEQ"]),
                    ReadString(reader, "DOCNO") ?? string.Empty,
                    FormatDate(ReadValue(reader, "DOCDATE")),
                    className,
                    itemCode,
                    ReadString(reader, "QTY"),
                    ReadString(reader, "UNITPRICE"),
                    ReadString(reader, "AMOUNT"),
                    deliveryDate,
                    ReadString(reader, "UDF_CLASSDAY"),
                    TimeHelper.FormatUdfClassTime(ReadValue(reader, "UDF_CLASSTIME")),
                    ReadString(reader, "UDF_STUDENTNAME"),
                    ReadString(reader, "UDF_CONDUCTEDBY"),
                    ClassDate: SqlAccountUdfClassDateHelper.FormatStoredValue(
                        ReadValue(reader, "CLASSSTARTDATETIME"))));
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Local SQL Account sales order read failed for {Code} / {Branch}",
                customerCode,
                branchName);
            return Array.Empty<SqlAccountChildEnrollmentDto>();
        }
    }

    public async Task<IReadOnlyList<SqlAccountStaffUserMatch>> GetStaffTeachersAsync(
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb)
            return Array.Empty<SqlAccountStaffUserMatch>();

        try
        {
            await using var connection = OpenConnection();
            await connection.OpenAsync(cancellationToken);

            const string sql = """
                SELECT CODE, NAME, EMAIL, MOBILE, PHONE, UDF_ISADMIN
                FROM SY_USER
                WHERE (UDF_ISADMIN IS NULL OR UDF_ISADMIN = FALSE)
                ORDER BY NAME
                """;

            var results = new List<SqlAccountStaffUserMatch>();
            await using var command = new FbCommand(sql, connection);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var email = ReadString(reader, "EMAIL")?.Trim() ?? string.Empty;
                var code = ReadString(reader, "CODE") ?? string.Empty;
                var name = ReadString(reader, "NAME");
                var mobile = ReadString(reader, "MOBILE") ?? ReadString(reader, "PHONE");
                results.Add(new SqlAccountStaffUserMatch(
                    code,
                    string.IsNullOrWhiteSpace(name) ? (string.IsNullOrWhiteSpace(email) ? code : email) : name.Trim(),
                    email,
                    ReadBool(reader, "UDF_ISADMIN"),
                    string.IsNullOrWhiteSpace(mobile) ? null : mobile.Trim()));
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Local SQL Account SY_USER teacher list read failed");
            return Array.Empty<SqlAccountStaffUserMatch>();
        }
    }

    public async Task<IReadOnlyList<SqlAccountStaffUserMatch>> GetStaffUsersAsync(
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb)
            return Array.Empty<SqlAccountStaffUserMatch>();

        try
        {
            await using var connection = OpenConnection();
            await connection.OpenAsync(cancellationToken);

            const string sql = """
                SELECT CODE, NAME, EMAIL, MOBILE, PHONE, UDF_ISADMIN
                FROM SY_USER
                WHERE EMAIL IS NOT NULL
                  AND TRIM(EMAIL) <> ''
                ORDER BY NAME
                """;

            var results = new List<SqlAccountStaffUserMatch>();
            await using var command = new FbCommand(sql, connection);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var email = ReadString(reader, "EMAIL")?.Trim() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(email))
                    continue;

                var code = ReadString(reader, "CODE") ?? string.Empty;
                var name = ReadString(reader, "NAME");
                var mobile = ReadString(reader, "MOBILE") ?? ReadString(reader, "PHONE");
                results.Add(new SqlAccountStaffUserMatch(
                    code,
                    string.IsNullOrWhiteSpace(name) ? email : name.Trim(),
                    email,
                    ReadBool(reader, "UDF_ISADMIN"),
                    string.IsNullOrWhiteSpace(mobile) ? null : mobile.Trim()));
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Local SQL Account SY_USER list read failed");
            return Array.Empty<SqlAccountStaffUserMatch>();
        }
    }

    public async Task<int> UpdateClassDateByItemCodesAsync(
        IReadOnlyList<string> itemCodes,
        DateTime? classDateTime,
        CancellationToken cancellationToken = default)
    {
        if (!CanWriteLocalDb || itemCodes.Count == 0 || !classDateTime.HasValue)
            return 0;

        await using var connection = OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsurePortalSoLineScheduleTableAsync(connection, cancellationToken);

        const string sql = """
            UPDATE PORTAL_SO_LINE_SCHEDULE S
            SET S.CLASSSTARTDATETIME = @classStart, S.UPDATEDAT = @updatedAt
            WHERE EXISTS (
                SELECT 1 FROM SL_SODTL B
                INNER JOIN SL_SO A ON A.DOCKEY = B.DOCKEY
                WHERE B.DOCKEY = S.DOCKEY AND B.SEQ = S.SEQ
                  AND TRIM(B.ITEMCODE) = @itemCode
                  AND (A.CANCELLED IS NULL OR A.CANCELLED = FALSE)
            )
            """;

        var updated = 0;
        var now = DateTime.UtcNow;
        foreach (var itemCode in itemCodes.Where(c => !string.IsNullOrWhiteSpace(c)).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            await using var command = new FbCommand(sql, connection);
            command.Parameters.AddWithValue("@itemCode", itemCode.Trim());
            command.Parameters.Add(new FbParameter("@classStart", FbDbType.TimeStamp) { Value = classDateTime.Value });
            command.Parameters.AddWithValue("@updatedAt", now);
            updated += await command.ExecuteNonQueryAsync(cancellationToken);
        }

        return updated;
    }

    public async Task<int> UpdateClassDateByScheduleMatchAsync(
        string dayOfWeek,
        string teacherName,
        DateTime? classDateTime,
        CancellationToken cancellationToken = default)
    {
        if (!CanWriteLocalDb
            || string.IsNullOrWhiteSpace(dayOfWeek)
            || string.IsNullOrWhiteSpace(teacherName)
            || !classDateTime.HasValue)
        {
            return 0;
        }

        await using var connection = OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsurePortalSoLineScheduleTableAsync(connection, cancellationToken);

        const string sql = """
            UPDATE PORTAL_SO_LINE_SCHEDULE S
            SET S.CLASSSTARTDATETIME = @classStart, S.UPDATEDAT = @updatedAt
            WHERE EXISTS (
                SELECT 1 FROM SL_SODTL B
                INNER JOIN SL_SO A ON A.DOCKEY = B.DOCKEY
                WHERE B.DOCKEY = S.DOCKEY AND B.SEQ = S.SEQ
                  AND (A.CANCELLED IS NULL OR A.CANCELLED = FALSE)
                  AND TRIM(B.UDF_CLASSDAY) = @day
                  AND TRIM(B.UDF_CONDUCTEDBY) = @teacher
            )
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@day", dayOfWeek.Trim());
        command.Parameters.AddWithValue("@teacher", teacherName.Trim());
        command.Parameters.Add(new FbParameter("@classStart", FbDbType.TimeStamp) { Value = classDateTime.Value });
        command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);

        return await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SqlAccountErpCalendarLineDto>> GetErpCalendarLinesAsync(
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb)
            return Array.Empty<SqlAccountErpCalendarLineDto>();

        try
        {
            await using var connection = OpenConnection();
            await connection.OpenAsync(cancellationToken);

            var hasSchedule = await PortalFirebirdSchema.TableExistsAsync(
                connection, "PORTAL_SO_LINE_SCHEDULE", cancellationToken);
            if (!hasSchedule)
                return Array.Empty<SqlAccountErpCalendarLineDto>();

            const string sql = """
                SELECT A.CODE, A.BRANCHNAME, B.DOCKEY, B.SEQ, B.ITEMCODE, B.DESCRIPTION,
                       S.CLASSSTARTDATETIME, B.UDF_CLASSDAY, B.UDF_CLASSTIME,
                       B.UDF_STUDENTNAME, B.UDF_CONDUCTEDBY
                FROM SL_SO A
                INNER JOIN SL_SODTL B ON A.DOCKEY = B.DOCKEY
                INNER JOIN PORTAL_SO_LINE_SCHEDULE S ON S.DOCKEY = B.DOCKEY AND S.SEQ = B.SEQ
                WHERE (A.CANCELLED IS NULL OR A.CANCELLED = FALSE)
                  AND S.CLASSSTARTDATETIME IS NOT NULL
                ORDER BY S.CLASSSTARTDATETIME, A.CODE, A.BRANCHNAME, B.SEQ
                """;

            var results = new List<SqlAccountErpCalendarLineDto>();
            await using var command = new FbCommand(sql, connection);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                results.Add(new SqlAccountErpCalendarLineDto(
                    Convert.ToInt32(reader["DOCKEY"]),
                    Convert.ToInt32(reader["SEQ"]),
                    ReadString(reader, "CODE") ?? string.Empty,
                    ReadString(reader, "BRANCHNAME") ?? string.Empty,
                    ReadString(reader, "ITEMCODE"),
                    ReadString(reader, "DESCRIPTION"),
                    ReadClassDateTime(reader, "CLASSSTARTDATETIME"),
                    ReadString(reader, "UDF_CLASSDAY"),
                    TimeHelper.FormatUdfClassTime(ReadValue(reader, "UDF_CLASSTIME")),
                    ReadString(reader, "UDF_STUDENTNAME"),
                    ReadString(reader, "UDF_CONDUCTEDBY")));
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Local SQL Account ERP calendar read failed");
            return Array.Empty<SqlAccountErpCalendarLineDto>();
        }
    }

    public async Task<SqlAccountErpCalendarLineDto?> GetErpCalendarLineByKeyAsync(
        int docKey,
        int seq,
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb)
            return null;

        try
        {
            await using var connection = OpenConnection();
            await connection.OpenAsync(cancellationToken);

            const string sql = """
                SELECT A.CODE, A.BRANCHNAME, B.DOCKEY, B.SEQ, B.ITEMCODE, B.DESCRIPTION,
                       S.CLASSSTARTDATETIME, B.UDF_CLASSDAY, B.UDF_CLASSTIME,
                       B.UDF_STUDENTNAME, B.UDF_CONDUCTEDBY
                FROM SL_SO A
                INNER JOIN SL_SODTL B ON A.DOCKEY = B.DOCKEY
                LEFT JOIN PORTAL_SO_LINE_SCHEDULE S ON S.DOCKEY = B.DOCKEY AND S.SEQ = B.SEQ
                WHERE (A.CANCELLED IS NULL OR A.CANCELLED = FALSE)
                  AND B.DOCKEY = @docKey
                  AND B.SEQ = @seq
                """;

            await using var command = new FbCommand(sql, connection);
            command.Parameters.AddWithValue("@docKey", docKey);
            command.Parameters.AddWithValue("@seq", seq);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                return null;

            return new SqlAccountErpCalendarLineDto(
                Convert.ToInt32(reader["DOCKEY"]),
                Convert.ToInt32(reader["SEQ"]),
                ReadString(reader, "CODE") ?? string.Empty,
                ReadString(reader, "BRANCHNAME") ?? string.Empty,
                ReadString(reader, "ITEMCODE"),
                ReadString(reader, "DESCRIPTION"),
                ReadClassDateTime(reader, "CLASSSTARTDATETIME"),
                ReadString(reader, "UDF_CLASSDAY"),
                TimeHelper.FormatUdfClassTime(ReadValue(reader, "UDF_CLASSTIME")),
                ReadString(reader, "UDF_STUDENTNAME"),
                ReadString(reader, "UDF_CONDUCTEDBY"));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Local SQL Account ERP calendar line read failed for {DocKey}/{Seq}", docKey, seq);
            return null;
        }
    }

    public async Task<int> UpdateSingleSodtlClassDateAsync(
        int docKey,
        int seq,
        DateTime? classDateTime,
        CancellationToken cancellationToken = default)
    {
        if (!CanWriteLocalDb || !classDateTime.HasValue)
            return 0;

        await using var connection = OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsurePortalSoLineScheduleTableAsync(connection, cancellationToken);

        const string existsSql = """
            SELECT 1 FROM PORTAL_SO_LINE_SCHEDULE
            WHERE DOCKEY = @docKey AND SEQ = @seq
            """;
        await using var existsCmd = new FbCommand(existsSql, connection);
        existsCmd.Parameters.AddWithValue("@docKey", docKey);
        existsCmd.Parameters.AddWithValue("@seq", seq);
        var exists = await existsCmd.ExecuteScalarAsync(cancellationToken);
        var now = DateTime.UtcNow;

        if (exists != null)
        {
            const string updateSql = """
                UPDATE PORTAL_SO_LINE_SCHEDULE
                SET CLASSSTARTDATETIME = @classStart, UPDATEDAT = @updatedAt
                WHERE DOCKEY = @docKey AND SEQ = @seq
                """;
            await using var updateCmd = new FbCommand(updateSql, connection);
            updateCmd.Parameters.AddWithValue("@docKey", docKey);
            updateCmd.Parameters.AddWithValue("@seq", seq);
            updateCmd.Parameters.Add(new FbParameter("@classStart", FbDbType.TimeStamp) { Value = classDateTime.Value });
            updateCmd.Parameters.AddWithValue("@updatedAt", now);
            return await updateCmd.ExecuteNonQueryAsync(cancellationToken);
        }

        const string insertSql = """
            INSERT INTO PORTAL_SO_LINE_SCHEDULE (
                DOCKEY, SEQ, CLASSSTARTDATETIME, CLASSENDDATE, CREATEDAT, UPDATEDAT
            ) VALUES (
                @docKey, @seq, @classStart, NULL, @createdAt, @updatedAt
            )
            """;
        await using var insertCmd = new FbCommand(insertSql, connection);
        insertCmd.Parameters.AddWithValue("@docKey", docKey);
        insertCmd.Parameters.AddWithValue("@seq", seq);
        insertCmd.Parameters.Add(new FbParameter("@classStart", FbDbType.TimeStamp) { Value = classDateTime.Value });
        insertCmd.Parameters.AddWithValue("@createdAt", now);
        insertCmd.Parameters.AddWithValue("@updatedAt", now);
        return await insertCmd.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task EnsureClassAssignmentChangeLogsTableAsync(CancellationToken cancellationToken = default)
    {
        if (!CanWriteLocalDb)
            return;

        await using var connection = OpenConnection();
        await connection.OpenAsync(cancellationToken);

        if (await AssignmentChangeLogsTableExistsAsync(connection, cancellationToken))
            return;

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
            await using var command = new FbCommand(statement, connection);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    public async Task InsertClassAssignmentChangeLogAsync(
        ClassAssignmentChangeLog entry,
        CancellationToken cancellationToken = default)
    {
        if (!CanWriteLocalDb)
            return;

        await EnsureClassAssignmentChangeLogsTableAsync(cancellationToken);

        await using var connection = OpenConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
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
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", entry.Id.ToString());
        command.Parameters.AddWithValue("@classId", entry.ClassId.ToString());
        command.Parameters.AddWithValue("@className", (object?)entry.ClassName ?? DBNull.Value);
        command.Parameters.AddWithValue("@entityType", entry.EntityType);
        command.Parameters.AddWithValue("@operation", entry.Operation);
        command.Parameters.AddWithValue("@entityId", (object?)entry.EntityId?.ToString() ?? DBNull.Value);
        command.Parameters.AddWithValue("@studentUserId", (object?)entry.StudentUserId?.ToString() ?? DBNull.Value);
        command.Parameters.AddWithValue("@studentName", (object?)entry.StudentName ?? DBNull.Value);
        command.Parameters.AddWithValue("@prevTeacherUserId", (object?)entry.PreviousTeacherUserId?.ToString() ?? DBNull.Value);
        command.Parameters.AddWithValue("@prevTeacherName", (object?)entry.PreviousTeacherName ?? DBNull.Value);
        command.Parameters.AddWithValue("@newTeacherUserId", (object?)entry.NewTeacherUserId?.ToString() ?? DBNull.Value);
        command.Parameters.AddWithValue("@newTeacherName", (object?)entry.NewTeacherName ?? DBNull.Value);
        command.Parameters.AddWithValue("@prevDay", (object?)entry.PreviousDayOfWeek ?? DBNull.Value);
        command.Parameters.AddWithValue("@newDay", (object?)entry.NewDayOfWeek ?? DBNull.Value);
        command.Parameters.AddWithValue("@prevClassStart", FormatNullableTime(entry.PreviousClassStartTime));
        command.Parameters.AddWithValue("@newClassStart", FormatNullableTime(entry.NewClassStartTime));
        command.Parameters.AddWithValue("@prevClassEnd", FormatNullableTime(entry.PreviousClassEndTime));
        command.Parameters.AddWithValue("@newClassEnd", FormatNullableTime(entry.NewClassEndTime));
        command.Parameters.AddWithValue("@prevSessionDate", (object?)entry.PreviousSessionDate?.Date ?? DBNull.Value);
        command.Parameters.AddWithValue("@newSessionDate", (object?)entry.NewSessionDate?.Date ?? DBNull.Value);
        command.Parameters.AddWithValue("@prevSessionStart", FormatNullableTime(entry.PreviousSessionStartTime));
        command.Parameters.AddWithValue("@newSessionStart", FormatNullableTime(entry.NewSessionStartTime));
        command.Parameters.AddWithValue("@prevSessionEnd", FormatNullableTime(entry.PreviousSessionEndTime));
        command.Parameters.AddWithValue("@newSessionEnd", FormatNullableTime(entry.NewSessionEndTime));
        command.Parameters.AddWithValue("@prevStatus", (object?)entry.PreviousStatus ?? DBNull.Value);
        command.Parameters.AddWithValue("@newStatus", (object?)entry.NewStatus ?? DBNull.Value);
        command.Parameters.AddWithValue("@actorUserId", (object?)entry.ActorUserId?.ToString() ?? DBNull.Value);
        command.Parameters.AddWithValue("@actorName", (object?)entry.ActorName ?? DBNull.Value);
        command.Parameters.AddWithValue("@reason", (object?)entry.Reason ?? DBNull.Value);
        command.Parameters.AddWithValue("@createdAt", entry.CreatedAt);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ClassAssignmentChangeLog>> GetClassAssignmentChangeLogsAsync(
        Guid? classId = null,
        int limit = 200,
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb)
            return Array.Empty<ClassAssignmentChangeLog>();

        try
        {
            await using var connection = OpenConnection();
            await connection.OpenAsync(cancellationToken);

            if (!await AssignmentChangeLogsTableExistsAsync(connection, cancellationToken))
                return Array.Empty<ClassAssignmentChangeLog>();

            var sql = $"""
                SELECT FIRST {Math.Clamp(limit, 1, 1000)}
                    ID, CLASSID, CLASSNAME, ENTITYTYPE, OPERATION, ENTITYID, STUDENTUSERID, STUDENTNAME,
                    PREVIOUSTEACHERUSERID, PREVIOUSTEACHERNAME, NEWTEACHERUSERID, NEWTEACHERNAME,
                    PREVIOUSDAYOFWEEK, NEWDAYOFWEEK, PREVIOUSCLASSSTARTTIME, NEWCLASSSTARTTIME,
                    PREVIOUSCLASSENDTIME, NEWCLASSENDTIME, PREVIOUSSESSIONDATE, NEWSESSIONDATE,
                    PREVIOUSSESSIONSTARTTIME, NEWSESSIONSTARTTIME, PREVIOUSSESSIONENDTIME, NEWSESSIONENDTIME,
                    PREVIOUSSTATUS, NEWSTATUS, ACTORUSERID, ACTORNAME, REASON, CREATEDAT
                FROM ClassAssignmentChangeLogs
                """;

            if (classId.HasValue)
            {
                sql += " WHERE CLASSID = @classId";
            }

            sql += " ORDER BY CREATEDAT DESC";

            await using var command = new FbCommand(sql, connection);
            if (classId.HasValue)
            {
                command.Parameters.AddWithValue("@classId", classId.Value.ToString());
            }

            var results = new List<ClassAssignmentChangeLog>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                results.Add(MapClassAssignmentChangeLog(reader));
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Local SQL Account ClassAssignmentChangeLogs read failed");
            return Array.Empty<ClassAssignmentChangeLog>();
        }
    }

    private static async Task<bool> AssignmentChangeLogsTableExistsAsync(
        FbConnection connection,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT 1 FROM RDB$RELATIONS
            WHERE RDB$RELATION_NAME = 'CLASSASSIGNMENTCHANGELOGS'
            """;
        await using var command = new FbCommand(sql, connection);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result != null;
    }

    private static ClassAssignmentChangeLog MapClassAssignmentChangeLog(FbDataReader reader) =>
        new()
        {
            Id = ParseGuid(ReadString(reader, "ID")) ?? Guid.Empty,
            ClassId = ParseGuid(ReadString(reader, "CLASSID")) ?? Guid.Empty,
            ClassName = ReadString(reader, "CLASSNAME"),
            EntityType = ReadString(reader, "ENTITYTYPE") ?? ClassAssignmentEntityTypes.Class,
            Operation = ReadString(reader, "OPERATION") ?? ClassAssignmentOperations.Update,
            EntityId = ParseGuid(ReadString(reader, "ENTITYID")),
            StudentUserId = ParseGuid(ReadString(reader, "STUDENTUSERID")),
            StudentName = ReadString(reader, "STUDENTNAME"),
            PreviousTeacherUserId = ParseGuid(ReadString(reader, "PREVIOUSTEACHERUSERID")),
            PreviousTeacherName = ReadString(reader, "PREVIOUSTEACHERNAME"),
            NewTeacherUserId = ParseGuid(ReadString(reader, "NEWTEACHERUSERID")),
            NewTeacherName = ReadString(reader, "NEWTEACHERNAME"),
            PreviousDayOfWeek = ReadString(reader, "PREVIOUSDAYOFWEEK"),
            NewDayOfWeek = ReadString(reader, "NEWDAYOFWEEK"),
            PreviousClassStartTime = ParseNullableTime(ReadString(reader, "PREVIOUSCLASSSTARTTIME")),
            NewClassStartTime = ParseNullableTime(ReadString(reader, "NEWCLASSSTARTTIME")),
            PreviousClassEndTime = ParseNullableTime(ReadString(reader, "PREVIOUSCLASSENDTIME")),
            NewClassEndTime = ParseNullableTime(ReadString(reader, "NEWCLASSENDTIME")),
            PreviousSessionDate = ReadNullableDate(reader, "PREVIOUSSESSIONDATE"),
            NewSessionDate = ReadNullableDate(reader, "NEWSESSIONDATE"),
            PreviousSessionStartTime = ParseNullableTime(ReadString(reader, "PREVIOUSSESSIONSTARTTIME")),
            NewSessionStartTime = ParseNullableTime(ReadString(reader, "NEWSESSIONSTARTTIME")),
            PreviousSessionEndTime = ParseNullableTime(ReadString(reader, "PREVIOUSSESSIONENDTIME")),
            NewSessionEndTime = ParseNullableTime(ReadString(reader, "NEWSESSIONENDTIME")),
            PreviousStatus = ReadString(reader, "PREVIOUSSTATUS"),
            NewStatus = ReadString(reader, "NEWSTATUS"),
            ActorUserId = ParseGuid(ReadString(reader, "ACTORUSERID")),
            ActorName = ReadString(reader, "ACTORNAME"),
            Reason = ReadString(reader, "REASON"),
            CreatedAt = ReadDateTime(reader, "CREATEDAT") ?? DateTime.UtcNow,
        };

    private static Guid? ParseGuid(string? value) =>
        Guid.TryParse(value, out var id) ? id : null;

    private static object FormatNullableTime(TimeSpan? value) =>
        value.HasValue ? TimeHelper.FormatTime(value.Value) : DBNull.Value;

    private static TimeSpan? ParseNullableTime(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : TimeSpan.TryParse(value, out var parsed) ? parsed : null;

    private static DateTime? ReadNullableDate(FbDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            if (reader.IsDBNull(ordinal))
                return null;
            return reader.GetDateTime(ordinal);
        }
        catch (IndexOutOfRangeException)
        {
            return null;
        }
    }

    private static DateTime? ReadDateTime(FbDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            if (reader.IsDBNull(ordinal))
                return null;
            return reader.GetDateTime(ordinal);
        }
        catch (IndexOutOfRangeException)
        {
            return null;
        }
    }

    private static DateTime? ReadClassDateTime(FbDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            if (reader.IsDBNull(ordinal))
                return null;

            var value = reader.GetValue(ordinal);
            return value switch
            {
                DateTime dt => dt,
                _ when DateTime.TryParse(value.ToString(), out var parsed) => parsed,
                _ => null
            };
        }
        catch (IndexOutOfRangeException)
        {
            return null;
        }
    }

    private static string? ReadValue(FbDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            if (reader.IsDBNull(ordinal))
                return null;
            return reader.GetValue(ordinal)?.ToString()?.Trim();
        }
        catch (IndexOutOfRangeException)
        {
            return null;
        }
    }

    private static string? FormatDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        if (DateTime.TryParse(value, out var dt))
            return dt.ToString("yyyy-MM-dd");
        return value;
    }

    public async Task<IReadOnlyDictionary<string, string>> GetItemDescriptionsByCodeAsync(
        IEnumerable<string> itemCodes,
        CancellationToken cancellationToken = default)
    {
        var codes = itemCodes
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (!CanReadLocalDb || codes.Count == 0)
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        await using var connection = OpenConnection();
        await connection.OpenAsync(cancellationToken);

        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var code in codes)
        {
            await using var command = new FbCommand(
                "SELECT DESCRIPTION FROM ST_ITEM WHERE CODE = @code",
                connection);
            command.Parameters.AddWithValue("@code", code);
            var description = (await command.ExecuteScalarAsync(cancellationToken))?.ToString()?.Trim();
            if (!string.IsNullOrWhiteSpace(description))
                result[code] = description;
        }

        return result;
    }

    public async Task<IReadOnlyList<(string Code, string Description)>> GetStItemOptionsAsync(
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb)
            return Array.Empty<(string, string)>();

        await using var connection = OpenConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT CODE, DESCRIPTION
            FROM ST_ITEM
            WHERE DESCRIPTION IS NOT NULL
              AND TRIM(DESCRIPTION) <> ''
              AND (ISACTIVE IS NULL OR ISACTIVE = TRUE)
            ORDER BY DESCRIPTION
            """;

        var results = new List<(string Code, string Description)>();
        await using var command = new FbCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var code = reader["CODE"]?.ToString()?.Trim();
            var description = reader["DESCRIPTION"]?.ToString()?.Trim();
            if (!string.IsNullOrWhiteSpace(code) && !string.IsNullOrWhiteSpace(description))
                results.Add((code, description));
        }

        return results;
    }

    public FbConnection OpenConnection()
    {
        var user = Environment.GetEnvironmentVariable("SqlAccount__DbUser") ?? "SYSDBA";
        var password = Environment.GetEnvironmentVariable("SqlAccount__DbPassword") ?? "masterkey";
        var builder = new FbConnectionStringBuilder
        {
            DataSource = "localhost",
            Database = _settings.DatabasePath,
            UserID = user,
            Password = password,
            Charset = "UTF8",
        };
        return new FbConnection(builder.ToString());
    }

    private static async Task<List<SqlAccountParentDto>> QueryParentsAsync(
        FbConnection connection,
        CancellationToken cancellationToken)
    {
        var emailColumn = await ResolveCustomerEmailColumnAsync(connection, cancellationToken);
        var emailSelect = emailColumn != null
            ? $"TRIM(A.{emailColumn}) AS CUSTOMER_EMAIL"
            : "CAST(NULL AS VARCHAR(200)) AS CUSTOMER_EMAIL";

        var sql = $"""
            SELECT
                A.CODE,
                A.COMPANYNAME,
                {emailSelect},
                B.BRANCHTYPE,
                B.BRANCHNAME,
                B.ATTENTION,
                B.EMAIL,
                B.PHONE1
            FROM AR_CUSTOMER A
            INNER JOIN AR_CUSTOMERBRANCH B ON A.CODE = B.CODE
            WHERE B.BRANCHTYPE <> 'B'
            ORDER BY A.COMPANYNAME, B.BRANCHNAME
            """;

        await using var command = new FbCommand(sql, connection);

        var grouped = new Dictionary<string, (SqlAccountParentDto Parent, List<SqlAccountChildDto> Children, string? CustomerEmail)>(
            StringComparer.OrdinalIgnoreCase);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var code = ReadString(reader, "CODE") ?? string.Empty;
            if (string.IsNullOrWhiteSpace(code))
                continue;

            if (!grouped.TryGetValue(code, out var entry))
            {
                entry = (
                    new SqlAccountParentDto(
                        code,
                        ReadString(reader, "COMPANYNAME") ?? string.Empty,
                        null,
                        Array.Empty<SqlAccountChildDto>()),
                    new List<SqlAccountChildDto>(),
                    ReadString(reader, "CUSTOMER_EMAIL"));
                grouped[code] = entry;
            }
            else if (string.IsNullOrWhiteSpace(entry.CustomerEmail))
            {
                entry = entry with { CustomerEmail = ReadString(reader, "CUSTOMER_EMAIL") };
                grouped[code] = entry;
            }

            var branchType = ReadString(reader, "BRANCHTYPE");
            var branchName = ReadString(reader, "BRANCHNAME");
            if (!SqlAccountBranchRules.IsChildBranch(branchType, branchName))
                continue;

            if (entry.Children.Any(c => string.Equals(c.BranchName, branchName, StringComparison.OrdinalIgnoreCase)))
                continue;

            entry.Children.Add(new SqlAccountChildDto(
                branchName!,
                ReadString(reader, "ATTENTION"),
                ReadString(reader, "EMAIL"),
                ReadString(reader, "PHONE1")));
        }

        return grouped.Values
            .Select(pair =>
            {
                // Login email is the student branch email (AR_CUSTOMERBRANCH.EMAIL), not AR_CUSTOMER UDF.
                var email = pair.Children
                    .Select(c => c.Email)
                    .FirstOrDefault(e => !string.IsNullOrWhiteSpace(e));

                // After normalize: at most one child branch; keep first if multiple remain.
                var children = pair.Children
                    .OrderBy(c => c.BranchName, StringComparer.OrdinalIgnoreCase)
                    .Take(1)
                    .ToList();

                return pair.Parent with
                {
                    ParentEmail = string.IsNullOrWhiteSpace(email) ? null : email.Trim(),
                    Children = children,
                };
            })
            .Where(p => p.Children.Count > 0)
            .OrderBy(p => p.ParentName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static async Task<string?> ResolveCustomerEmailColumnAsync(
        FbConnection connection,
        CancellationToken cancellationToken)
    {
        if (await ColumnExistsAsync(connection, "AR_CUSTOMER", "UDF_EMAIL", cancellationToken))
            return "UDF_EMAIL";
        if (await ColumnExistsAsync(connection, "AR_CUSTOMER", "UDF_EMAILL", cancellationToken))
            return "UDF_EMAILL";
        return null;
    }

    private static async Task<bool> ColumnExistsAsync(
        FbConnection connection,
        string relation,
        string column,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT 1
            FROM RDB$RELATION_FIELDS
            WHERE TRIM(RDB$RELATION_NAME) = @relation
              AND TRIM(RDB$FIELD_NAME) = @column
            """;
        await using var cmd = new FbCommand(sql, connection);
        cmd.Parameters.AddWithValue("@relation", relation.ToUpperInvariant());
        cmd.Parameters.AddWithValue("@column", column.ToUpperInvariant());
        return await cmd.ExecuteScalarAsync(cancellationToken) != null;
    }

    private static bool ReadBool(FbDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            if (reader.IsDBNull(ordinal))
                return false;

            return reader.GetValue(ordinal) switch
            {
                bool value => value,
                int value => value != 0,
                short value => value != 0,
                long value => value != 0,
                string value => IsTruthy(value),
                _ => false
            };
        }
        catch (IndexOutOfRangeException)
        {
            return false;
        }
    }

    private static bool IsTruthy(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var normalized = value.Trim();
        return normalized.Equals("T", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("Y", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("1", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("TRUE", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("YES", StringComparison.OrdinalIgnoreCase);
    }

    private static string? ReadString(FbDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal).Trim();
        }
        catch (IndexOutOfRangeException)
        {
            return null;
        }
    }

    private static decimal ReadDecimal(FbDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            if (reader.IsDBNull(ordinal))
                return 0m;

            return reader.GetValue(ordinal) switch
            {
                decimal value => value,
                double value => (decimal)value,
                float value => (decimal)value,
                int value => value,
                long value => value,
                string value when decimal.TryParse(
                    value,
                    System.Globalization.NumberStyles.Number,
                    System.Globalization.CultureInfo.InvariantCulture,
                    out var parsed) => parsed,
                _ => 0m
            };
        }
        catch (IndexOutOfRangeException)
        {
            return 0m;
        }
    }

    private static int? ReadNullableInt(FbDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            if (reader.IsDBNull(ordinal))
                return null;

            return reader.GetValue(ordinal) switch
            {
                int value => value,
                short value => value,
                long value => (int)value,
                string value when int.TryParse(value, out var parsed) => parsed,
                _ => null
            };
        }
        catch (IndexOutOfRangeException)
        {
            return null;
        }
    }

    private static bool EmailMatches(string? candidate, string normalized) =>
        !string.IsNullOrWhiteSpace(candidate) &&
        string.Equals(candidate.Trim(), normalized, StringComparison.OrdinalIgnoreCase);

    private static SqlAccountCustomerMatch ToMatch(SqlAccountParentDto parent) =>
        new(parent.CustomerCode, parent.ParentName, parent.ParentEmail, parent.Children);
}
