using System.Text.Json;
using FirebirdSql.Data.FirebirdClient;
using MusicTuitionPortal.Api.DTOs;

namespace MusicTuitionPortal.Api.Services;

public class PortalLeaveRequestService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private readonly SqlAccountLocalDbService _localDb;
    private readonly ParentService _parents;
    private readonly PortalClassSessionService _sessions;

    public PortalLeaveRequestService(
        SqlAccountLocalDbService localDb,
        ParentService parents,
        PortalClassSessionService sessions)
    {
        _localDb = localDb;
        _parents = parents;
        _sessions = sessions;
    }

    public async Task<List<PortalLeaveRequestDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await EnsureTableAsync(cancellationToken);
        return await QueryAsync(null, null, cancellationToken);
    }

    public async Task<List<PortalLeaveRequestDto>> GetForParentAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        await EnsureTableAsync(cancellationToken);
        return await QueryAsync(email.Trim(), null, cancellationToken);
    }

    public async Task<PortalLeaveRequestDto> SubmitAsync(
        string email,
        CreatePortalLeaveRequest request,
        CancellationToken cancellationToken = default)
    {
        await EnsureTableAsync(cancellationToken);

        var children = await _parents.GetSqlAccountChildrenForEmailAsync(email, cancellationToken);
        var branch = request.BranchName.Trim();
        if (!children.Children.Any(c => string.Equals(c.BranchName, branch, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("Child branch not found.");

        var customerCode = await _parents.GetCustomerCodeForEmailAsync(email, cancellationToken)
            ?? throw new InvalidOperationException("Customer code not found.");

        if (!DateTime.TryParse(request.SessionDate, out var sessionDate))
            throw new InvalidOperationException("Invalid session date.");

        ValidateSessionWindow(sessionDate, request.StartTime);

        var replacementOptions = NormalizeReplacementOptions(request.ReplacementOptions);
        var needsReplacement = replacementOptions.Count > 0;
        var replOptionsJson = needsReplacement
            ? JsonSerializer.Serialize(replacementOptions, JsonOptions)
            : null;

        var className = await GetClassNameAsync(request.DocKey, request.Seq, cancellationToken);

        var id = Guid.NewGuid().ToString();
        var now = DateTime.UtcNow;
        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            INSERT INTO PORTAL_LEAVE_REQUESTS (
                ID, OCCURRENCEID, DOCKEY, SEQ, CUSTOMERCODE, BRANCHNAME, CLASSNAME,
                SESSIONDATE, REASON, STATUS, NEEDSREPLACEMENT, REPL_OPTIONS,
                REQUESTEDBY, CREATEDAT, UPDATEDAT
            ) VALUES (
                @id, @occurrenceId, @docKey, @seq, @customerCode, @branchName, @className,
                @sessionDate, @reason, 'Pending', @needsReplacement, @replOptions,
                @requestedBy, @createdAt, @updatedAt
            )
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@occurrenceId", (object?)request.OccurrenceId ?? DBNull.Value);
        command.Parameters.AddWithValue("@docKey", request.DocKey);
        command.Parameters.AddWithValue("@seq", request.Seq);
        command.Parameters.AddWithValue("@customerCode", customerCode);
        command.Parameters.AddWithValue("@branchName", branch);
        command.Parameters.AddWithValue("@className", (object?)className ?? DBNull.Value);
        command.Parameters.AddWithValue("@sessionDate", sessionDate);
        command.Parameters.AddWithValue("@reason", request.Reason.Trim());
        command.Parameters.AddWithValue("@needsReplacement", needsReplacement ? 1 : 0);
        command.Parameters.AddWithValue("@replOptions", (object?)replOptionsJson ?? DBNull.Value);
        command.Parameters.AddWithValue("@requestedBy", email.Trim());
        command.Parameters.AddWithValue("@createdAt", now);
        command.Parameters.AddWithValue("@updatedAt", now);
        await command.ExecuteNonQueryAsync(cancellationToken);

        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<PortalLeaveRequestDto?> AdminDecideAsync(
        string id,
        AdminLeaveDecisionRequest request,
        CancellationToken cancellationToken = default)
    {
        var existing = await GetByIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException("Leave request not found.");

        if (!request.Approve)
        {
            await UpdateStatusAsync(id, "Rejected", request.AdminNote, existing.NeedsReplacement, cancellationToken);
            return await GetByIdAsync(id, cancellationToken);
        }

        var hasChosenSlot = !string.IsNullOrWhiteSpace(request.ChosenDate)
            && !string.IsNullOrWhiteSpace(request.ChosenTime);

        if (hasChosenSlot)
        {
            var chosenDate = request.ChosenDate!.Trim();
            var chosenTime = request.ChosenTime!.Trim();
            if (!existing.ReplOptions.Any(o =>
                    string.Equals(o.Date, chosenDate, StringComparison.OrdinalIgnoreCase)
                    && string.Equals(o.Time, chosenTime, StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException("Chosen replacement slot was not proposed by the parent.");
            }

            if (!DateTime.TryParse(chosenDate, out var replDate))
                throw new InvalidOperationException("Invalid replacement date.");

            var replEnd = await ComputeReplacementEndAsync(existing, chosenTime, cancellationToken);

            await using var connection = _localDb.OpenConnection();
            await connection.OpenAsync(cancellationToken);

            const string sql = """
                UPDATE PORTAL_LEAVE_REQUESTS
                SET STATUS = 'Confirmed', ADMINNOTE = @adminNote, NEEDSREPLACEMENT = 1,
                    REPL_DATE = @replDate, REPL_START = @replStart, REPL_END = @replEnd,
                    UPDATEDAT = @updatedAt
                WHERE ID = @id
                """;

            await using var command = new FbCommand(sql, connection);
            command.Parameters.AddWithValue("@id", id);
            command.Parameters.AddWithValue("@adminNote", (object?)request.AdminNote ?? DBNull.Value);
            command.Parameters.AddWithValue("@replDate", replDate);
            command.Parameters.AddWithValue("@replStart", chosenTime);
            command.Parameters.AddWithValue("@replEnd", replEnd);
            command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
            await command.ExecuteNonQueryAsync(cancellationToken);

            await RescheduleLeaveOccurrenceAsync(existing, chosenDate, chosenTime, replEnd, cancellationToken);
            return await GetByIdAsync(id, cancellationToken);
        }

        await UpdateStatusAsync(id, "Approved", request.AdminNote, false, cancellationToken);
        await CancelLeaveOccurrenceAsync(existing, request.AdminNote, cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    private async Task CancelLeaveOccurrenceAsync(
        PortalLeaveRequestDto existing,
        string? adminNote,
        CancellationToken cancellationToken)
    {
        var reason = $"Leave approved: {adminNote ?? existing.Reason}";
        if (!string.IsNullOrWhiteSpace(existing.OccurrenceId))
        {
            await _sessions.CancelOccurrenceAsync(existing.OccurrenceId, reason, cancellationToken);
            return;
        }

        var occs = await _sessions.GetOccurrencesAsync(branchName: existing.BranchName, cancellationToken: cancellationToken);
        var match = occs.FirstOrDefault(o =>
            o.DocKey == existing.DocKey && o.Seq == existing.Seq
            && o.SessionDate == existing.SessionDate);
        if (match != null)
            await _sessions.CancelOccurrenceAsync(match.Id, reason, cancellationToken);
    }

    private async Task RescheduleLeaveOccurrenceAsync(
        PortalLeaveRequestDto existing,
        string replDate,
        string replStart,
        string replEnd,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(existing.OccurrenceId))
        {
            await _sessions.RescheduleOccurrenceAsync(
                existing.OccurrenceId,
                replDate,
                replStart,
                replEnd,
                "Replacement confirmed by admin",
                cancellationToken);
            return;
        }

        var occs = await _sessions.GetOccurrencesAsync(branchName: existing.BranchName, cancellationToken: cancellationToken);
        var match = occs.FirstOrDefault(o =>
            o.DocKey == existing.DocKey && o.Seq == existing.Seq
            && o.SessionDate == existing.SessionDate);
        if (match != null)
        {
            await _sessions.RescheduleOccurrenceAsync(
                match.Id,
                replDate,
                replStart,
                replEnd,
                "Replacement confirmed by admin",
                cancellationToken);
        }
    }

    private async Task<string> ComputeReplacementEndAsync(
        PortalLeaveRequestDto existing,
        string chosenStart,
        CancellationToken cancellationToken)
    {
        PortalClassSessionDto? occurrence = null;
        if (!string.IsNullOrWhiteSpace(existing.OccurrenceId))
            occurrence = await _sessions.GetOccurrenceByIdAsync(existing.OccurrenceId, cancellationToken);

        if (occurrence == null)
        {
            var occs = await _sessions.GetOccurrencesAsync(branchName: existing.BranchName, cancellationToken: cancellationToken);
            occurrence = occs.FirstOrDefault(o =>
                o.DocKey == existing.DocKey && o.Seq == existing.Seq
                && o.SessionDate == existing.SessionDate);
        }

        if (occurrence == null || !TryParseTime(occurrence.StartTime, out var start)
            || !TryParseTime(occurrence.EndTime, out var end))
        {
            return AddHourToTime(chosenStart);
        }

        var duration = end - start;
        if (duration <= TimeSpan.Zero)
            duration = TimeSpan.FromHours(1);

        if (!TryParseTime(chosenStart, out var chosen))
            return AddHourToTime(chosenStart);

        return chosen.Add(duration).ToString(@"hh\:mm");
    }

    private async Task<PortalLeaveRequestDto?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var list = await QueryAsync(null, id, cancellationToken);
        return list.FirstOrDefault();
    }

    private async Task<List<PortalLeaveRequestDto>> QueryAsync(
        string? requestedBy,
        string? id,
        CancellationToken cancellationToken)
    {
        if (!_localDb.CanReadLocalDb)
            return [];

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_LEAVE_REQUESTS", cancellationToken))
            return [];

        var sql = "SELECT * FROM PORTAL_LEAVE_REQUESTS WHERE 1=1";
        if (!string.IsNullOrWhiteSpace(requestedBy))
            sql += " AND REQUESTEDBY = @requestedBy";
        if (!string.IsNullOrWhiteSpace(id))
            sql += " AND ID = @id";
        sql += " ORDER BY CREATEDAT DESC";

        await using var command = new FbCommand(sql, connection);
        if (!string.IsNullOrWhiteSpace(requestedBy))
            command.Parameters.AddWithValue("@requestedBy", requestedBy);
        if (!string.IsNullOrWhiteSpace(id))
            command.Parameters.AddWithValue("@id", id);

        var results = new List<PortalLeaveRequestDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(MapLeave(reader));
        }

        return results;
    }

    private async Task EnsureTableAsync(CancellationToken cancellationToken)
    {
        if (!_localDb.CanWriteLocalDb)
            return;
        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);
    }

    private async Task UpdateStatusAsync(
        string id,
        string status,
        string? adminNote,
        bool needsReplacement,
        CancellationToken cancellationToken)
    {
        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        const string sql = """
            UPDATE PORTAL_LEAVE_REQUESTS
            SET STATUS = @status, ADMINNOTE = @adminNote, NEEDSREPLACEMENT = @needsReplacement, UPDATEDAT = @updatedAt
            WHERE ID = @id
            """;
        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@status", status);
        command.Parameters.AddWithValue("@adminNote", (object?)adminNote ?? DBNull.Value);
        command.Parameters.AddWithValue("@needsReplacement", needsReplacement ? 1 : 0);
        command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task<string?> GetClassNameAsync(int docKey, int seq, CancellationToken cancellationToken)
    {
        if (!_localDb.CanReadLocalDb)
            return null;
        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        const string sql = "SELECT DESCRIPTION, ITEMCODE FROM SL_SODTL WHERE DOCKEY = @docKey AND SEQ = @seq";
        await using var cmd = new FbCommand(sql, connection);
        cmd.Parameters.AddWithValue("@docKey", docKey);
        cmd.Parameters.AddWithValue("@seq", seq);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;
        var desc = reader["DESCRIPTION"]?.ToString();
        return !string.IsNullOrWhiteSpace(desc) ? desc : reader["ITEMCODE"]?.ToString();
    }

    private static void ValidateSessionWindow(DateTime sessionDate, string? startTime)
    {
        var sessionStart = sessionDate.Date;
        if (!string.IsNullOrWhiteSpace(startTime) && TryParseTime(startTime, out var time))
            sessionStart = sessionDate.Date.Add(time);

        var now = DateTime.Now;
        if (sessionStart <= now.AddHours(24))
            throw new InvalidOperationException("Leave must be requested at least 24 hours before the session.");

        if (sessionStart > now.AddMonths(1))
            throw new InvalidOperationException("Leave can only be requested up to one month in advance.");
    }

    private static List<ReplacementOptionDto> NormalizeReplacementOptions(
        IReadOnlyList<ReplacementOptionDto>? options)
    {
        if (options == null || options.Count == 0)
            return [];

        return options
            .Where(o => !string.IsNullOrWhiteSpace(o.Date) && !string.IsNullOrWhiteSpace(o.Time))
            .Select(o => new ReplacementOptionDto(o.Date.Trim(), o.Time.Trim()))
            .DistinctBy(o => $"{o.Date}|{o.Time}", StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static PortalLeaveRequestDto MapLeave(FbDataReader reader) =>
        new(
            reader["ID"]?.ToString() ?? string.Empty,
            reader["OCCURRENCEID"]?.ToString(),
            Convert.ToInt32(reader["DOCKEY"]),
            Convert.ToInt32(reader["SEQ"]),
            reader["CUSTOMERCODE"]?.ToString() ?? string.Empty,
            reader["BRANCHNAME"]?.ToString() ?? string.Empty,
            reader["CLASSNAME"]?.ToString(),
            FormatDate(reader["SESSIONDATE"]),
            reader["REASON"]?.ToString() ?? string.Empty,
            reader["STATUS"]?.ToString() ?? "Pending",
            reader["ADMINNOTE"]?.ToString(),
            Convert.ToInt32(reader["NEEDSREPLACEMENT"]) != 0,
            ParseReplOptions(ReadOptionalString(reader, "REPL_OPTIONS")),
            FormatDate(reader["REPL_DATE"]),
            reader["REPL_START"]?.ToString(),
            reader["REPL_END"]?.ToString(),
            reader["REPL_TEACHER"]?.ToString(),
            reader["TEACHERRESPONSE"]?.ToString(),
            FormatDate(reader["COUNTER_DATE"]),
            reader["COUNTER_START"]?.ToString(),
            reader["COUNTER_END"]?.ToString(),
            reader["COUNTER_MSG"]?.ToString(),
            reader["REQUESTEDBY"]?.ToString(),
            Convert.ToDateTime(reader["CREATEDAT"]),
            Convert.ToDateTime(reader["UPDATEDAT"]));

    private static IReadOnlyList<ReplacementOptionDto> ParseReplOptions(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<ReplacementOptionDto>>(json, JsonOptions) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static string? ReadOptionalString(FbDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }
        catch (IndexOutOfRangeException)
        {
            return null;
        }
    }

    private static string FormatDate(object? value)
    {
        if (value is DBNull or null)
            return string.Empty;
        return Convert.ToDateTime(value).ToString("yyyy-MM-dd");
    }

    private static bool TryParseTime(string? value, out TimeSpan time)
    {
        time = default;
        if (string.IsNullOrWhiteSpace(value))
            return false;
        return TimeSpan.TryParse(value.Trim(), out time);
    }

    private static string AddHourToTime(string start)
    {
        if (!TryParseTime(start, out var time))
            return "11:00";
        return time.Add(TimeSpan.FromHours(1)).ToString(@"hh\:mm");
    }
}
