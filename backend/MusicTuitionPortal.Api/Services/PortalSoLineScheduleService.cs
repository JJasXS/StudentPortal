using FirebirdSql.Data.FirebirdClient;

namespace MusicTuitionPortal.Api.Services;

public record PortalSoLineSchedule(
    int DocKey,
    int Seq,
    DateTime ClassStartDateTime,
    DateTime? ClassEndDate);

public class PortalSoLineScheduleService
{
    private readonly SqlAccountLocalDbService _localDb;

    public PortalSoLineScheduleService(SqlAccountLocalDbService localDb)
    {
        _localDb = localDb;
    }

    public bool CanWrite => _localDb.CanWriteLocalDb;

    public async Task EnsureTableAsync(FbConnection connection, CancellationToken cancellationToken = default) =>
        await PortalFirebirdSchema.EnsurePortalSoLineScheduleTableAsync(connection, cancellationToken);

    public async Task UpsertAsync(
        int docKey,
        int seq,
        DateTime classStart,
        DateTime? classEnd,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            return;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);
        await UpsertOnConnectionAsync(connection, docKey, seq, classStart, classEnd, cancellationToken);
    }

    public async Task UpsertOnConnectionAsync(
        FbConnection connection,
        int docKey,
        int seq,
        DateTime classStart,
        DateTime? classEnd,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        const string existsSql = """
            SELECT 1 FROM PORTAL_SO_LINE_SCHEDULE
            WHERE DOCKEY = @docKey AND SEQ = @seq
            """;

        await using var existsCmd = new FbCommand(existsSql, connection);
        existsCmd.Parameters.AddWithValue("@docKey", docKey);
        existsCmd.Parameters.AddWithValue("@seq", seq);
        var exists = await existsCmd.ExecuteScalarAsync(cancellationToken);

        if (exists != null)
        {
            const string updateSql = """
                UPDATE PORTAL_SO_LINE_SCHEDULE
                SET CLASSSTARTDATETIME = @classStart,
                    CLASSENDDATE = @classEnd,
                    UPDATEDAT = @updatedAt
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
            await updateCmd.ExecuteNonQueryAsync(cancellationToken);
            await PortalFirebirdSchema.SyncSodtlUdfClassDatesAsync(
                connection, docKey, seq, classStart, classEnd, cancellationToken);
            return;
        }

        const string insertSql = """
            INSERT INTO PORTAL_SO_LINE_SCHEDULE (
                DOCKEY, SEQ, CLASSSTARTDATETIME, CLASSENDDATE, CREATEDAT, UPDATEDAT
            ) VALUES (
                @docKey, @seq, @classStart, @classEnd, @createdAt, @updatedAt
            )
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
        await insertCmd.ExecuteNonQueryAsync(cancellationToken);
        await PortalFirebirdSchema.SyncSodtlUdfClassDatesAsync(
            connection, docKey, seq, classStart, classEnd, cancellationToken);
    }

    public async Task<PortalSoLineSchedule?> GetAsync(
        int docKey,
        int seq,
        CancellationToken cancellationToken = default)
    {
        var map = await GetByLinesAsync([(docKey, seq)], cancellationToken);
        return map.TryGetValue((docKey, seq), out var schedule) ? schedule : null;
    }

    public async Task<IReadOnlyDictionary<(int DocKey, int Seq), PortalSoLineSchedule>> GetByLinesAsync(
        IEnumerable<(int DocKey, int Seq)> lines,
        CancellationToken cancellationToken = default)
    {
        var keys = lines.Distinct().ToList();
        if (!_localDb.CanReadLocalDb || keys.Count == 0)
            return new Dictionary<(int, int), PortalSoLineSchedule>();

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_SO_LINE_SCHEDULE", cancellationToken))
            return new Dictionary<(int, int), PortalSoLineSchedule>();

        var result = new Dictionary<(int, int), PortalSoLineSchedule>();
        foreach (var (docKey, seq) in keys)
        {
            const string sql = """
                SELECT CLASSSTARTDATETIME, CLASSENDDATE
                FROM PORTAL_SO_LINE_SCHEDULE
                WHERE DOCKEY = @docKey AND SEQ = @seq
                """;
            await using var command = new FbCommand(sql, connection);
            command.Parameters.AddWithValue("@docKey", docKey);
            command.Parameters.AddWithValue("@seq", seq);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                continue;

            result[(docKey, seq)] = new PortalSoLineSchedule(
                docKey,
                seq,
                ReadTimestamp(reader, "CLASSSTARTDATETIME") ?? DateTime.MinValue,
                ReadTimestamp(reader, "CLASSENDDATE"));
        }

        return result;
    }

    public async Task<int> UpdateClassStartAsync(
        int docKey,
        int seq,
        DateTime? classStart,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb || !classStart.HasValue)
            return 0;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

        var existing = await GetAsync(docKey, seq, cancellationToken);
        if (existing == null)
        {
            await UpsertOnConnectionAsync(connection, docKey, seq, classStart.Value, null, cancellationToken);
            return 1;
        }

        const string sql = """
            UPDATE PORTAL_SO_LINE_SCHEDULE
            SET CLASSSTARTDATETIME = @classStart, UPDATEDAT = @updatedAt
            WHERE DOCKEY = @docKey AND SEQ = @seq
            """;
        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@docKey", docKey);
        command.Parameters.AddWithValue("@seq", seq);
        command.Parameters.Add(new FbParameter("@classStart", FbDbType.TimeStamp) { Value = classStart.Value });
        command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
        return await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<int> UpdateClassStartByItemCodesAsync(
        IReadOnlyList<string> itemCodes,
        DateTime? classStart,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb || itemCodes.Count == 0 || !classStart.HasValue)
            return 0;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

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
        foreach (var itemCode in itemCodes.Where(c => !string.IsNullOrWhiteSpace(c)).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            await using var command = new FbCommand(sql, connection);
            command.Parameters.AddWithValue("@itemCode", itemCode.Trim());
            command.Parameters.Add(new FbParameter("@classStart", FbDbType.TimeStamp) { Value = classStart.Value });
            command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
            updated += await command.ExecuteNonQueryAsync(cancellationToken);
        }

        return updated;
    }

    public async Task<int> UpdateClassStartByScheduleMatchAsync(
        string dayOfWeek,
        string teacherName,
        DateTime? classStart,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb
            || string.IsNullOrWhiteSpace(dayOfWeek)
            || string.IsNullOrWhiteSpace(teacherName)
            || !classStart.HasValue)
        {
            return 0;
        }

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await EnsureTableAsync(connection, cancellationToken);

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
        command.Parameters.Add(new FbParameter("@classStart", FbDbType.TimeStamp) { Value = classStart.Value });
        command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
        return await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static DateTime? ReadTimestamp(FbDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            if (reader.IsDBNull(ordinal))
                return null;
            return Convert.ToDateTime(reader.GetValue(ordinal));
        }
        catch (IndexOutOfRangeException)
        {
            return null;
        }
    }
}
