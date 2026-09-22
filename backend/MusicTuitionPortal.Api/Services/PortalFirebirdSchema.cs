using FirebirdSql.Data.FirebirdClient;
using MusicTuitionPortal.Api.Helpers;

namespace MusicTuitionPortal.Api.Services;

/// <summary>DDL and table-existence helpers for portal extension tables in Firebird.</summary>
public static class PortalFirebirdSchema
{
    public static async Task EnsureAllTablesAsync(FbConnection connection, CancellationToken cancellationToken = default)
    {
        await EnsurePortalClassSessionsTableAsync(connection, cancellationToken);
        await EnsurePortalSoLineScheduleTableAsync(connection, cancellationToken);
        await EnsurePortalHomeworkTableAsync(connection, cancellationToken);
        await EnsurePortalHomeworkFilePathColumnAsync(connection, cancellationToken);
        await EnsurePortalHomeworkUrlColumnAsync(connection, cancellationToken);
        await EnsurePortalLeaveRequestsTableAsync(connection, cancellationToken);
        await EnsurePortalLeaveReplOptionsColumnAsync(connection, cancellationToken);
        await EnsurePortalLeaveRequesterTypeColumnAsync(connection, cancellationToken);
        await EnsurePortalLeaveSessionStartColumnAsync(connection, cancellationToken);
        await EnsurePortalAnnouncementsTableAsync(connection, cancellationToken);
        await EnsurePortalAnnouncementNotifyColumnsAsync(connection, cancellationToken);
        await EnsurePortalAnnouncementExpiryColumnAsync(connection, cancellationToken);
        await EnsurePortalNotifyReadsTableAsync(connection, cancellationToken);
        await EnsurePortalNotifyHiddenTableAsync(connection, cancellationToken);
        await EnsurePortalHomeworkAssignmentColumnsAsync(connection, cancellationToken);
        await EnsurePortalAssignmentsTableAsync(connection, cancellationToken);
    }

    public static async Task EnsurePortalSoLineScheduleTableAsync(FbConnection connection, CancellationToken cancellationToken = default)
    {
        if (await TableExistsAsync(connection, "PORTAL_SO_LINE_SCHEDULE", cancellationToken))
            return;

        foreach (var sql in new[]
        {
            """
            CREATE TABLE PORTAL_SO_LINE_SCHEDULE (
                DOCKEY INTEGER NOT NULL,
                SEQ INTEGER NOT NULL,
                CLASSSTARTDATETIME TIMESTAMP NOT NULL,
                CLASSENDDATE TIMESTAMP,
                CREATEDAT TIMESTAMP NOT NULL,
                UPDATEDAT TIMESTAMP NOT NULL,
                PRIMARY KEY (DOCKEY, SEQ)
            )
            """,
            "CREATE INDEX IX_PORTAL_SOSCHED_DOCKEY ON PORTAL_SO_LINE_SCHEDULE (DOCKEY, SEQ)",
        })
        {
            await using var cmd = new FbCommand(sql, connection);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static async Task EnsurePortalClassSessionsTableAsync(FbConnection connection, CancellationToken ct)
    {
        if (await TableExistsAsync(connection, "PORTAL_CLASS_SESSIONS", ct))
            return;

        foreach (var sql in new[]
        {
            """
            CREATE TABLE PORTAL_CLASS_SESSIONS (
                ID VARCHAR(36) NOT NULL PRIMARY KEY,
                DOCKEY INTEGER NOT NULL,
                SEQ INTEGER NOT NULL,
                ITEMCODE VARCHAR(50),
                CUSTOMERCODE VARCHAR(30) NOT NULL,
                BRANCHNAME VARCHAR(100) NOT NULL,
                STUDENTNAME VARCHAR(200),
                CLASSNAME VARCHAR(200),
                CONDUCTEDBY VARCHAR(200),
                OCCURRENCEINDEX INTEGER NOT NULL,
                SESSIONDATE TIMESTAMP NOT NULL,
                STARTTIME VARCHAR(10),
                ENDTIME VARCHAR(10),
                STATUS VARCHAR(30) NOT NULL,
                ORIGINALDATE TIMESTAMP,
                REASON VARCHAR(500),
                CREATEDAT TIMESTAMP NOT NULL,
                UPDATEDAT TIMESTAMP NOT NULL
            )
            """,
            "CREATE INDEX IX_PORTALSESS_DOCKEY ON PORTAL_CLASS_SESSIONS (DOCKEY, SEQ)",
            "CREATE INDEX IX_PORTALSESS_DATE ON PORTAL_CLASS_SESSIONS (SESSIONDATE)",
            "CREATE INDEX IX_PORTALSESS_BRANCH ON PORTAL_CLASS_SESSIONS (CUSTOMERCODE, BRANCHNAME)",
        })
        {
            await using var cmd = new FbCommand(sql, connection);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    private static async Task EnsurePortalHomeworkTableAsync(FbConnection connection, CancellationToken ct)
    {
        if (await TableExistsAsync(connection, "PORTAL_HOMEWORK", ct))
            return;

        foreach (var sql in new[]
        {
            """
            CREATE TABLE PORTAL_HOMEWORK (
                ID VARCHAR(36) NOT NULL PRIMARY KEY,
                DOCKEY INTEGER NOT NULL,
                SEQ INTEGER NOT NULL,
                CUSTOMERCODE VARCHAR(30) NOT NULL,
                BRANCHNAME VARCHAR(100) NOT NULL,
                CLASSNAME VARCHAR(200),
                ITEMCODE VARCHAR(50),
                TITLE VARCHAR(200),
                URL VARCHAR(500),
                NOTE VARCHAR(2000),
                FILENAME VARCHAR(255),
                FILEPATH VARCHAR(500),
                ASSIGNMENTID VARCHAR(36),
                STATUS VARCHAR(20) DEFAULT 'Pending',
                SUBMITTEDBY VARCHAR(200) NOT NULL,
                CREATEDAT TIMESTAMP NOT NULL
            )
            """,
            "CREATE INDEX IX_PORTALHW_BRANCH ON PORTAL_HOMEWORK (CUSTOMERCODE, BRANCHNAME)",
            "CREATE INDEX IX_PORTALHW_DOCKEY ON PORTAL_HOMEWORK (DOCKEY, SEQ)",
        })
        {
            await using var cmd = new FbCommand(sql, connection);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    private static async Task EnsurePortalHomeworkFilePathColumnAsync(FbConnection connection, CancellationToken ct)
    {
        if (!await TableExistsAsync(connection, "PORTAL_HOMEWORK", ct))
            return;

        try
        {
            await using var cmd = new FbCommand(
                "ALTER TABLE PORTAL_HOMEWORK ADD FILEPATH VARCHAR(500)",
                connection);
            await cmd.ExecuteNonQueryAsync(ct);
        }
        catch
        {
            // Column already exists
        }
    }

    private static async Task EnsurePortalHomeworkUrlColumnAsync(FbConnection connection, CancellationToken ct)
    {
        if (!await TableExistsAsync(connection, "PORTAL_HOMEWORK", ct))
            return;

        try
        {
            await using var cmd = new FbCommand(
                "ALTER TABLE PORTAL_HOMEWORK ADD URL VARCHAR(500)",
                connection);
            await cmd.ExecuteNonQueryAsync(ct);
        }
        catch
        {
            // Column already exists
        }
    }

    private static async Task EnsurePortalLeaveRequestsTableAsync(FbConnection connection, CancellationToken ct)
    {
        if (await TableExistsAsync(connection, "PORTAL_LEAVE_REQUESTS", ct))
            return;

        foreach (var sql in new[]
        {
            """
            CREATE TABLE PORTAL_LEAVE_REQUESTS (
                ID VARCHAR(36) NOT NULL PRIMARY KEY,
                OCCURRENCEID VARCHAR(36),
                DOCKEY INTEGER NOT NULL,
                SEQ INTEGER NOT NULL,
                CUSTOMERCODE VARCHAR(30) NOT NULL,
                BRANCHNAME VARCHAR(100) NOT NULL,
                CLASSNAME VARCHAR(200),
                SESSIONDATE TIMESTAMP NOT NULL,
                REASON VARCHAR(500) NOT NULL,
                STATUS VARCHAR(50) NOT NULL,
                ADMINNOTE VARCHAR(500),
                NEEDSREPLACEMENT SMALLINT DEFAULT 0,
                REPL_DATE TIMESTAMP,
                REPL_START VARCHAR(10),
                REPL_END VARCHAR(10),
                REPL_TEACHER VARCHAR(200),
                TEACHERRESPONSE VARCHAR(50),
                COUNTER_DATE TIMESTAMP,
                COUNTER_START VARCHAR(10),
                COUNTER_END VARCHAR(10),
                COUNTER_MSG VARCHAR(500),
                REPL_OPTIONS VARCHAR(2000),
                REQUESTERTYPE VARCHAR(20) DEFAULT 'Parent',
                REQUESTEDBY VARCHAR(200),
                CREATEDAT TIMESTAMP NOT NULL,
                UPDATEDAT TIMESTAMP NOT NULL
            )
            """,
            "CREATE INDEX IX_PORTALLEAVE_STATUS ON PORTAL_LEAVE_REQUESTS (STATUS)",
            "CREATE INDEX IX_PORTALLEAVE_BRANCH ON PORTAL_LEAVE_REQUESTS (CUSTOMERCODE, BRANCHNAME)",
        })
        {
            await using var cmd = new FbCommand(sql, connection);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    private static async Task EnsurePortalLeaveReplOptionsColumnAsync(FbConnection connection, CancellationToken ct)
    {
        if (!await TableExistsAsync(connection, "PORTAL_LEAVE_REQUESTS", ct))
            return;

        try
        {
            await using var cmd = new FbCommand(
                "ALTER TABLE PORTAL_LEAVE_REQUESTS ADD REPL_OPTIONS VARCHAR(2000)",
                connection);
            await cmd.ExecuteNonQueryAsync(ct);
        }
        catch
        {
            // Column already exists
        }
    }

    private static async Task EnsurePortalLeaveRequesterTypeColumnAsync(FbConnection connection, CancellationToken ct)
    {
        if (!await TableExistsAsync(connection, "PORTAL_LEAVE_REQUESTS", ct))
            return;

        if (await ColumnExistsAsync(connection, "PORTAL_LEAVE_REQUESTS", "REQUESTERTYPE", ct))
            return;

        try
        {
            await using var cmd = new FbCommand(
                "ALTER TABLE PORTAL_LEAVE_REQUESTS ADD REQUESTERTYPE VARCHAR(20) DEFAULT 'Parent'",
                connection);
            await cmd.ExecuteNonQueryAsync(ct);
        }
        catch
        {
            // Column already exists
        }
    }

    private static async Task EnsurePortalLeaveSessionStartColumnAsync(FbConnection connection, CancellationToken ct)
    {
        if (!await TableExistsAsync(connection, "PORTAL_LEAVE_REQUESTS", ct))
            return;

        if (await ColumnExistsAsync(connection, "PORTAL_LEAVE_REQUESTS", "SESSIONSTARTTIME", ct))
            return;

        try
        {
            await using var cmd = new FbCommand(
                "ALTER TABLE PORTAL_LEAVE_REQUESTS ADD SESSIONSTARTTIME VARCHAR(10)",
                connection);
            await cmd.ExecuteNonQueryAsync(ct);
        }
        catch
        {
            // Column already exists
        }
    }

    private static async Task EnsurePortalAnnouncementNotifyColumnsAsync(FbConnection connection, CancellationToken ct)
    {
        if (!await TableExistsAsync(connection, "PORTAL_ANNOUNCEMENTS", ct))
            return;

        foreach (var (column, ddl) in new[]
        {
            ("ISSYSTEM", "ALTER TABLE PORTAL_ANNOUNCEMENTS ADD ISSYSTEM SMALLINT DEFAULT 0"),
            ("RELATEDTYPE", "ALTER TABLE PORTAL_ANNOUNCEMENTS ADD RELATEDTYPE VARCHAR(50)"),
            ("RELATEDID", "ALTER TABLE PORTAL_ANNOUNCEMENTS ADD RELATEDID VARCHAR(36)"),
        })
        {
            if (await ColumnExistsAsync(connection, "PORTAL_ANNOUNCEMENTS", column, ct))
                continue;

            try
            {
                await using var cmd = new FbCommand(ddl, connection);
                await cmd.ExecuteNonQueryAsync(ct);
            }
            catch
            {
                // Column already exists
            }
        }
    }

    private static async Task EnsurePortalAnnouncementsTableAsync(FbConnection connection, CancellationToken ct)
    {
        if (await TableExistsAsync(connection, "PORTAL_ANNOUNCEMENTS", ct))
            return;

        foreach (var sql in new[]
        {
            """
            CREATE TABLE PORTAL_ANNOUNCEMENTS (
                ID VARCHAR(36) NOT NULL PRIMARY KEY,
                TITLE VARCHAR(200) NOT NULL,
                CONTENT VARCHAR(4000) NOT NULL,
                CATEGORY VARCHAR(50) NOT NULL,
                HOLIDAYDATE DATE,
                EXPIRYDATE DATE,
                TARGETROLE VARCHAR(30) NOT NULL,
                CREATEDBYUSERID VARCHAR(36),
                CREATEDBYNAME VARCHAR(200),
                ISSYSTEM SMALLINT DEFAULT 0,
                RELATEDTYPE VARCHAR(50),
                RELATEDID VARCHAR(36),
                CREATEDAT TIMESTAMP NOT NULL,
                UPDATEDAT TIMESTAMP NOT NULL
            )
            """,
            "CREATE INDEX IX_PORTALANN_ROLE ON PORTAL_ANNOUNCEMENTS (TARGETROLE)",
            "CREATE INDEX IX_PORTALANN_CREATED ON PORTAL_ANNOUNCEMENTS (CREATEDAT)",
        })
        {
            await using var cmd = new FbCommand(sql, connection);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    private static async Task EnsurePortalNotifyReadsTableAsync(FbConnection connection, CancellationToken ct)
    {
        if (await TableExistsAsync(connection, "PORTAL_NOTIFY_READS", ct))
            return;

        foreach (var sql in new[]
        {
            """
            CREATE TABLE PORTAL_NOTIFY_READS (
                USEREMAIL VARCHAR(200) NOT NULL,
                ANNOUNCEMENTID VARCHAR(36) NOT NULL,
                READAT TIMESTAMP NOT NULL,
                PRIMARY KEY (USEREMAIL, ANNOUNCEMENTID)
            )
            """,
            "CREATE INDEX IX_PORTALNOTIFYREAD_USER ON PORTAL_NOTIFY_READS (USEREMAIL)",
        })
        {
            await using var cmd = new FbCommand(sql, connection);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    private static async Task EnsurePortalNotifyHiddenTableAsync(FbConnection connection, CancellationToken ct)
    {
        if (await TableExistsAsync(connection, "PORTAL_NOTIFY_HIDDEN", ct))
            return;

        foreach (var sql in new[]
        {
            """
            CREATE TABLE PORTAL_NOTIFY_HIDDEN (
                USEREMAIL VARCHAR(200) NOT NULL,
                ANNOUNCEMENTID VARCHAR(36) NOT NULL,
                HIDDENAT TIMESTAMP NOT NULL,
                PRIMARY KEY (USEREMAIL, ANNOUNCEMENTID)
            )
            """,
            "CREATE INDEX IX_PORTALNOTIFYHIDDEN_USER ON PORTAL_NOTIFY_HIDDEN (USEREMAIL)",
        })
        {
            await using var cmd = new FbCommand(sql, connection);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    private static async Task EnsurePortalHomeworkAssignmentColumnsAsync(FbConnection connection, CancellationToken ct)
    {
        if (!await TableExistsAsync(connection, "PORTAL_HOMEWORK", ct))
            return;

        foreach (var (column, ddl) in new[]
        {
            ("ASSIGNMENTID", "ALTER TABLE PORTAL_HOMEWORK ADD ASSIGNMENTID VARCHAR(36)"),
            ("STATUS", "ALTER TABLE PORTAL_HOMEWORK ADD STATUS VARCHAR(20) DEFAULT 'Pending'"),
        })
        {
            if (await ColumnExistsAsync(connection, "PORTAL_HOMEWORK", column, ct))
                continue;

            try
            {
                await using var cmd = new FbCommand(ddl, connection);
                await cmd.ExecuteNonQueryAsync(ct);
            }
            catch
            {
                // Column already exists
            }
        }
    }

    private static async Task EnsurePortalAssignmentsTableAsync(FbConnection connection, CancellationToken ct)
    {
        if (await TableExistsAsync(connection, "PORTAL_ASSIGNMENTS", ct))
            return;

        foreach (var sql in new[]
        {
            """
            CREATE TABLE PORTAL_ASSIGNMENTS (
                ID VARCHAR(36) NOT NULL PRIMARY KEY,
                CLASSNAME VARCHAR(200) NOT NULL,
                ITEMCODE VARCHAR(50),
                TITLE VARCHAR(200) NOT NULL,
                INSTRUCTIONS VARCHAR(4000),
                DUEDATE DATE NOT NULL,
                CREATEDBYUSERID VARCHAR(36) NOT NULL,
                CREATEDBYNAME VARCHAR(200),
                CREATEDAT TIMESTAMP NOT NULL
            )
            """,
            "CREATE INDEX IX_PORTALASSIGN_CLASS ON PORTAL_ASSIGNMENTS (CLASSNAME)",
            "CREATE INDEX IX_PORTALASSIGN_DUE ON PORTAL_ASSIGNMENTS (DUEDATE)",
        })
        {
            await using var cmd = new FbCommand(sql, connection);
            await cmd.ExecuteNonQueryAsync(ct);
        }
    }

    private static async Task EnsurePortalAnnouncementExpiryColumnAsync(FbConnection connection, CancellationToken ct)
    {
        if (!await TableExistsAsync(connection, "PORTAL_ANNOUNCEMENTS", ct))
            return;

        if (await ColumnExistsAsync(connection, "PORTAL_ANNOUNCEMENTS", "EXPIRYDATE", ct))
            return;

        try
        {
            await using var cmd = new FbCommand(
                "ALTER TABLE PORTAL_ANNOUNCEMENTS ADD EXPIRYDATE DATE",
                connection);
            await cmd.ExecuteNonQueryAsync(ct);
        }
        catch
        {
            // Column already exists
        }
    }

    public static async Task<bool> TableExistsAsync(FbConnection connection, string tableName, CancellationToken ct)
    {
        var sql = """
            SELECT 1 FROM RDB$RELATIONS
            WHERE RDB$RELATION_NAME = @name
            """;
        await using var cmd = new FbCommand(sql, connection);
        cmd.Parameters.AddWithValue("@name", tableName.ToUpperInvariant());
        var result = await cmd.ExecuteScalarAsync(ct);
        return result != null;
    }

    public static async Task<bool> ColumnExistsAsync(
        FbConnection connection,
        string tableName,
        string columnName,
        CancellationToken ct)
    {
        const string sql = """
            SELECT 1 FROM RDB$RELATION_FIELDS
            WHERE RDB$RELATION_NAME = @table AND RDB$FIELD_NAME = @column
            """;
        await using var cmd = new FbCommand(sql, connection);
        cmd.Parameters.AddWithValue("@table", tableName.ToUpperInvariant());
        cmd.Parameters.AddWithValue("@column", columnName.ToUpperInvariant());
        var result = await cmd.ExecuteScalarAsync(ct);
        return result != null;
    }

    public static async Task<bool> SodtlColumnExistsAsync(
        FbConnection connection,
        string columnName,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT 1 FROM RDB$RELATION_FIELDS
            WHERE RDB$RELATION_NAME = 'SL_SODTL' AND RDB$FIELD_NAME = @name
            """;
        await using var cmd = new FbCommand(sql, connection);
        cmd.Parameters.AddWithValue("@name", columnName.ToUpperInvariant());
        return await cmd.ExecuteScalarAsync(cancellationToken) != null;
    }

    /// <summary>
    /// SQL Account desktop expects FMTBcd (DECIMAL with scale, like UNITPRICE) — not plain BIGINT.
    /// Portal uses PORTAL_SO_LINE_SCHEDULE; these columns are kept in sync for ERP UI.
    /// </summary>
    public static async Task EnsureSodtlClassDateUdfsAsync(
        FbConnection connection,
        CancellationToken cancellationToken = default)
    {
        if (await SodtlColumnExistsAsync(connection, "UDF_CLASSDATE", cancellationToken)
            && await SodtlColumnExistsAsync(connection, "UDF_CLASSENDDATE", cancellationToken))
        {
            return;
        }

        if (!await SodtlColumnExistsAsync(connection, "UDF_CLASSDATE", cancellationToken))
        {
            await using var add = new FbCommand(
                "ALTER TABLE SL_SODTL ADD UDF_CLASSDATE DECIMAL(18,4)", connection);
            await add.ExecuteNonQueryAsync(cancellationToken);
        }

        if (!await SodtlColumnExistsAsync(connection, "UDF_CLASSENDDATE", cancellationToken))
        {
            await using var add = new FbCommand(
                "ALTER TABLE SL_SODTL ADD UDF_CLASSENDDATE DECIMAL(18,4)", connection);
            await add.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static async Task<string?> GetSodtlColumnDomainAsync(
        FbConnection connection,
        string columnName,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT TRIM(RF.RDB$FIELD_SOURCE)
            FROM RDB$RELATION_FIELDS RF
            WHERE RF.RDB$RELATION_NAME = 'SL_SODTL' AND TRIM(RF.RDB$FIELD_NAME) = @name
            """;
        await using var cmd = new FbCommand(sql, connection);
        cmd.Parameters.AddWithValue("@name", columnName.Trim());
        return (await cmd.ExecuteScalarAsync(cancellationToken))?.ToString()?.Trim();
    }

    public static async Task<bool> SodtlClassDateUdfsAreBcdAsync(
        FbConnection connection,
        CancellationToken cancellationToken = default)
    {
        var meta = await GetSodtlColumnMetaAsync(connection, "UDF_CLASSDATE", cancellationToken);
        return meta is { SubType: 2, Precision: 18, Scale: -4 };
    }

    public static async Task<(short Type, short Precision, short Scale, short SubType)?> GetSodtlColumnMetaAsync(
        FbConnection connection,
        string columnName,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT F.RDB$FIELD_TYPE, F.RDB$FIELD_PRECISION, F.RDB$FIELD_SCALE, F.RDB$FIELD_SUB_TYPE
            FROM RDB$RELATION_FIELDS RF
            JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
            WHERE RF.RDB$RELATION_NAME = 'SL_SODTL' AND TRIM(RF.RDB$FIELD_NAME) = @name
            """;
        await using var cmd = new FbCommand(sql, connection);
        cmd.Parameters.AddWithValue("@name", columnName.Trim());
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return (
            reader.GetInt16(0),
            reader.IsDBNull(1) ? (short)0 : reader.GetInt16(1),
            reader.IsDBNull(2) ? (short)0 : reader.GetInt16(2),
            reader.IsDBNull(3) ? (short)0 : reader.GetInt16(3));
    }

    public static async Task EnsureSodtlClassDateUdfsAsBcdAsync(
        FbConnection connection,
        CancellationToken cancellationToken = default)
    {
        if (!await SodtlClassDateUdfsAreBcdAsync(connection, cancellationToken))
        {
            if (await SodtlColumnExistsAsync(connection, "UDF_CLASSDATE", cancellationToken))
            {
                await using var drop = new FbCommand("ALTER TABLE SL_SODTL DROP UDF_CLASSDATE", connection);
                await drop.ExecuteNonQueryAsync(cancellationToken);
            }

            if (await SodtlColumnExistsAsync(connection, "UDF_CLASSENDDATE", cancellationToken))
            {
                await using var drop = new FbCommand("ALTER TABLE SL_SODTL DROP UDF_CLASSENDDATE", connection);
                await drop.ExecuteNonQueryAsync(cancellationToken);
            }
        }

        await EnsureSodtlClassDateUdfsAsync(connection, cancellationToken);
    }

    public static async Task SyncSodtlUdfClassDatesAsync(
        FbConnection connection,
        int docKey,
        int seq,
        DateTime classStart,
        DateTime? classEnd,
        CancellationToken cancellationToken = default)
    {
        await EnsureSodtlClassDateUdfsAsBcdAsync(connection, cancellationToken);
        if (!await SodtlColumnExistsAsync(connection, "UDF_CLASSDATE", cancellationToken))
            return;

        var classDateBcd = SqlAccountUdfClassDateHelper.ToClassDateBcdDecimal(classStart);
        object? classEndBcd = classEnd.HasValue
            ? SqlAccountUdfClassDateHelper.ToClassEndDateBcdDecimal(classEnd.Value)
            : DBNull.Value;

        const string sql = """
            UPDATE SL_SODTL
            SET UDF_CLASSDATE = @classStart,
                UDF_CLASSENDDATE = @classEnd
            WHERE DOCKEY = @docKey AND SEQ = @seq
            """;

        await using var cmd = new FbCommand(sql, connection);
        cmd.Parameters.AddWithValue("@docKey", docKey);
        cmd.Parameters.AddWithValue("@seq", seq);
        cmd.Parameters.Add(new FbParameter("@classStart", FbDbType.Decimal) { Value = classDateBcd });
        cmd.Parameters.Add(new FbParameter("@classEnd", FbDbType.Decimal)
        {
            Value = classEndBcd
        });
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }
}
