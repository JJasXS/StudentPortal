using FirebirdSql.Data.FirebirdClient;

namespace MusicTuitionPortal.Api.Services;

/// <summary>DDL and table-existence helpers for portal extension tables in Firebird.</summary>
public static class PortalFirebirdSchema
{
    public static async Task EnsureAllTablesAsync(FbConnection connection, CancellationToken cancellationToken = default)
    {
        await EnsurePortalClassSessionsTableAsync(connection, cancellationToken);
        await EnsurePortalSoLineScheduleTableAsync(connection, cancellationToken);
        await EnsurePortalHomeworkTableAsync(connection, cancellationToken);
        await EnsurePortalLeaveRequestsTableAsync(connection, cancellationToken);
        await EnsurePortalAnnouncementsTableAsync(connection, cancellationToken);
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
                NOTE VARCHAR(2000),
                FILENAME VARCHAR(255),
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
                TARGETROLE VARCHAR(30) NOT NULL,
                CREATEDBYUSERID VARCHAR(36),
                CREATEDBYNAME VARCHAR(200),
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
}
