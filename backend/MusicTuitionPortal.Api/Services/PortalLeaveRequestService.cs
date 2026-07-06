using FirebirdSql.Data.FirebirdClient;
using MusicTuitionPortal.Api.DTOs;

namespace MusicTuitionPortal.Api.Services;

public class PortalLeaveRequestService
{
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

    public async Task<List<PortalLeaveRequestDto>> GetForTeacherAsync(
        string teacherName,
        CancellationToken cancellationToken = default)
    {
        await EnsureTableAsync(cancellationToken);
        var all = await QueryAsync(null, null, cancellationToken);
        return all
            .Where(r =>
                (r.Status is "AwaitingTeacher" or "TeacherCountered" or "Confirmed")
                && string.Equals(r.ReplTeacher, teacherName, StringComparison.OrdinalIgnoreCase))
            .ToList();
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

        var className = await GetClassNameAsync(request.DocKey, request.Seq, cancellationToken);

        var id = Guid.NewGuid().ToString();
        var now = DateTime.UtcNow;
        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            INSERT INTO PORTAL_LEAVE_REQUESTS (
                ID, OCCURRENCEID, DOCKEY, SEQ, CUSTOMERCODE, BRANCHNAME, CLASSNAME,
                SESSIONDATE, REASON, STATUS, NEEDSREPLACEMENT, REQUESTEDBY, CREATEDAT, UPDATEDAT
            ) VALUES (
                @id, @occurrenceId, @docKey, @seq, @customerCode, @branchName, @className,
                @sessionDate, @reason, 'Pending', 0, @requestedBy, @createdAt, @updatedAt
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
        command.Parameters.AddWithValue("@requestedBy", email.Trim());
        command.Parameters.AddWithValue("@createdAt", now);
        command.Parameters.AddWithValue("@updatedAt", now);
        await command.ExecuteNonQueryAsync(cancellationToken);

        return (await GetByIdAsync(id, cancellationToken))!;
    }

    public async Task<PortalLeaveRequestDto?> AdminReviewAsync(
        string id,
        AdminLeaveReviewRequest request,
        CancellationToken cancellationToken = default)
    {
        var existing = await GetByIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException("Leave request not found.");

        var status = request.Approve
            ? (request.NeedsReplacement ? "ReplacementNeeded" : "Approved")
            : "Rejected";

        await UpdateStatusAsync(id, status, request.AdminNote, request.NeedsReplacement, cancellationToken);

        if (request.Approve && !request.NeedsReplacement)
        {
            if (!string.IsNullOrWhiteSpace(existing.OccurrenceId))
            {
                await _sessions.CancelOccurrenceAsync(
                    existing.OccurrenceId,
                    $"Leave approved: {request.AdminNote ?? existing.Reason}",
                    cancellationToken);
            }
            else
            {
                var occs = await _sessions.GetOccurrencesAsync(
                    branchName: existing.BranchName,
                    cancellationToken: cancellationToken);
                var match = occs.FirstOrDefault(o =>
                    o.DocKey == existing.DocKey && o.Seq == existing.Seq
                    && o.SessionDate == existing.SessionDate);
                if (match != null)
                {
                    await _sessions.CancelOccurrenceAsync(
                        match.Id,
                        $"Leave approved: {request.AdminNote ?? existing.Reason}",
                        cancellationToken);
                }
            }
        }

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<PortalLeaveRequestDto?> ProposeReplacementAsync(
        string id,
        AdminLeaveReplacementRequest request,
        CancellationToken cancellationToken = default)
    {
        var existing = await GetByIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException("Leave request not found.");

        if (!DateTime.TryParse(request.ReplDate, out var replDate))
            throw new InvalidOperationException("Invalid replacement date.");

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            UPDATE PORTAL_LEAVE_REQUESTS
            SET STATUS = 'AwaitingTeacher', NEEDSREPLACEMENT = 1,
                REPL_DATE = @replDate, REPL_START = @replStart, REPL_END = @replEnd,
                REPL_TEACHER = @replTeacher, TEACHERRESPONSE = 'Pending',
                UPDATEDAT = @updatedAt
            WHERE ID = @id
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@replDate", replDate);
        command.Parameters.AddWithValue("@replStart", request.ReplStart.Trim());
        command.Parameters.AddWithValue("@replEnd", request.ReplEnd.Trim());
        command.Parameters.AddWithValue("@replTeacher", request.ReplTeacher.Trim());
        command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
        await command.ExecuteNonQueryAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<PortalLeaveRequestDto?> TeacherAcceptAsync(
        string id,
        CancellationToken cancellationToken = default)
    {
        var existing = await GetByIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException("Leave request not found.");

        if (string.IsNullOrWhiteSpace(existing.ReplDate))
            throw new InvalidOperationException("No replacement date proposed.");

        await UpdateFieldAsync(id, "STATUS", "Confirmed", cancellationToken);
        await UpdateFieldAsync(id, "TEACHERRESPONSE", "Accepted", cancellationToken);

        if (!string.IsNullOrWhiteSpace(existing.OccurrenceId))
        {
            await _sessions.RescheduleOccurrenceAsync(
                existing.OccurrenceId,
                existing.ReplDate!,
                existing.ReplStart ?? "10:00",
                existing.ReplEnd ?? "11:00",
                "Teacher accepted replacement",
                cancellationToken);
        }

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<PortalLeaveRequestDto?> TeacherCounterAsync(
        string id,
        TeacherLeaveCounterRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!DateTime.TryParse(request.CounterDate, out var counterDate))
            throw new InvalidOperationException("Invalid counter date.");

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            UPDATE PORTAL_LEAVE_REQUESTS
            SET STATUS = 'TeacherCountered', TEACHERRESPONSE = 'Countered',
                COUNTER_DATE = @counterDate, COUNTER_START = @counterStart,
                COUNTER_END = @counterEnd, COUNTER_MSG = @counterMsg, UPDATEDAT = @updatedAt
            WHERE ID = @id
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@counterDate", counterDate);
        command.Parameters.AddWithValue("@counterStart", request.CounterStart.Trim());
        command.Parameters.AddWithValue("@counterEnd", request.CounterEnd.Trim());
        command.Parameters.AddWithValue("@counterMsg", (object?)request.CounterMsg ?? DBNull.Value);
        command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
        await command.ExecuteNonQueryAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<PortalLeaveRequestDto?> AdminConfirmReplacementAsync(
        string id,
        CancellationToken cancellationToken = default)
    {
        var existing = await GetByIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException("Leave request not found.");

        var replDate = existing.Status == "TeacherCountered" ? existing.CounterDate : existing.ReplDate;
        var replStart = existing.Status == "TeacherCountered" ? existing.CounterStart : existing.ReplStart;
        var replEnd = existing.Status == "TeacherCountered" ? existing.CounterEnd : existing.ReplEnd;

        if (string.IsNullOrWhiteSpace(replDate))
            throw new InvalidOperationException("No replacement slot to confirm.");

        await UpdateFieldAsync(id, "STATUS", "Confirmed", cancellationToken);

        if (!string.IsNullOrWhiteSpace(existing.OccurrenceId))
        {
            await _sessions.RescheduleOccurrenceAsync(
                existing.OccurrenceId,
                replDate,
                replStart ?? "10:00",
                replEnd ?? "11:00",
                "Replacement confirmed",
                cancellationToken);
        }

        return await GetByIdAsync(id, cancellationToken);
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

    private async Task UpdateFieldAsync(string id, string field, string value, CancellationToken cancellationToken)
    {
        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        var sql = $"UPDATE PORTAL_LEAVE_REQUESTS SET {field} = @value, UPDATEDAT = @updatedAt WHERE ID = @id";
        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@value", value);
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

    private static string FormatDate(object? value)
    {
        if (value is DBNull or null)
            return string.Empty;
        return Convert.ToDateTime(value).ToString("yyyy-MM-dd");
    }
}
