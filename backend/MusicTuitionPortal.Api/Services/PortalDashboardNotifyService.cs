using FirebirdSql.Data.FirebirdClient;
using MusicTuitionPortal.Api.DTOs;

namespace MusicTuitionPortal.Api.Services;

public class PortalDashboardNotifyService
{
    private readonly SqlAccountLocalDbService _localDb;

    public PortalDashboardNotifyService(SqlAccountLocalDbService localDb)
    {
        _localDb = localDb;
    }

    public async Task<AnnouncementDto> CreateSystemNoticeAsync(
        string title,
        string content,
        string category,
        string targetRole = "All",
        string? relatedType = null,
        string? relatedId = null,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            throw new InvalidOperationException("Firebird database is not available.");

        await EnsureTableAsync(cancellationToken);
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            INSERT INTO PORTAL_ANNOUNCEMENTS (
                ID, TITLE, CONTENT, CATEGORY, HOLIDAYDATE, TARGETROLE,
                CREATEDBYUSERID, CREATEDBYNAME, ISSYSTEM, RELATEDTYPE, RELATEDID,
                CREATEDAT, UPDATEDAT
            ) VALUES (
                @id, @title, @content, @category, NULL, @targetRole,
                @createdByUserId, @createdByName, 1, @relatedType, @relatedId,
                @createdAt, @updatedAt
            )
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id.ToString());
        command.Parameters.AddWithValue("@title", title.Trim());
        command.Parameters.AddWithValue("@content", content.Trim());
        command.Parameters.AddWithValue("@category", category.Trim());
        command.Parameters.AddWithValue("@targetRole", targetRole.Trim());
        command.Parameters.AddWithValue("@createdByUserId", Guid.Empty.ToString());
        command.Parameters.AddWithValue("@createdByName", "System");
        command.Parameters.AddWithValue("@relatedType", (object?)relatedType ?? DBNull.Value);
        command.Parameters.AddWithValue("@relatedId", (object?)relatedId ?? DBNull.Value);
        command.Parameters.AddWithValue("@createdAt", now);
        command.Parameters.AddWithValue("@updatedAt", now);
        await command.ExecuteNonQueryAsync(cancellationToken);

        return new AnnouncementDto(
            id, title.Trim(), content.Trim(), category.Trim(), null, targetRole.Trim(),
            Guid.Empty, "System", now, true, relatedType, relatedId);
    }

    public async Task<List<AnnouncementDto>> GetFeedForRoleAsync(
        string role,
        int limit = 5,
        CancellationToken cancellationToken = default)
    {
        await EnsureTableAsync(cancellationToken);
        if (!_localDb.CanReadLocalDb)
            return [];

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_ANNOUNCEMENTS", cancellationToken))
            return [];

        const string sql = """
            SELECT FIRST @limit
                ID, TITLE, CONTENT, CATEGORY, HOLIDAYDATE, TARGETROLE,
                CREATEDBYUSERID, CREATEDBYNAME, ISSYSTEM, RELATEDTYPE, RELATEDID, CREATEDAT
            FROM PORTAL_ANNOUNCEMENTS
            WHERE TARGETROLE = 'All'
               OR TARGETROLE = @role
               OR (@role = 'Parent' AND TARGETROLE = 'Student')
            ORDER BY CREATEDAT DESC
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@limit", Math.Clamp(limit, 1, 50));
        command.Parameters.AddWithValue("@role", role.Trim());

        var results = new List<AnnouncementDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(Map(reader));
        }

        return results;
    }

    public Task NotifyLeaveSubmittedAsync(PortalLeaveRequestDto request, CancellationToken cancellationToken = default)
    {
        var isTeacher = string.Equals(request.RequesterType, "Teacher", StringComparison.OrdinalIgnoreCase);
        var who = isTeacher ? request.RequestedBy ?? "Teacher" : request.BranchName;
        var prefix = isTeacher ? "Teacher leave request" : "Leave request submitted";
        var title = $"{prefix} — {request.ClassName ?? "Class"}";
        var content = isTeacher
            ? $"{who}: {request.ClassName} ({request.BranchName}) on {FormatSession(request.SessionDate, null)}. Reason: {request.Reason}. Awaiting admin approval."
            : $"{who}: {request.ClassName} on {FormatSession(request.SessionDate, null)}. Reason: {request.Reason}. Awaiting admin review.";

        return CreateSystemNoticeAsync(title, content, "Leave", "All", "LeaveRequest", request.Id, cancellationToken);
    }

    public Task NotifyLeaveDecidedAsync(PortalLeaveRequestDto request, CancellationToken cancellationToken = default)
    {
        var isTeacher = string.Equals(request.RequesterType, "Teacher", StringComparison.OrdinalIgnoreCase);
        var who = isTeacher ? request.RequestedBy ?? "Teacher" : request.BranchName;

        return request.Status switch
        {
            "Rejected" => CreateSystemNoticeAsync(
                $"Leave request declined — {request.ClassName ?? "Class"}",
                $"{who}: {request.ClassName} on {FormatSession(request.SessionDate, null)} was not approved."
                    + (string.IsNullOrWhiteSpace(request.AdminNote) ? "" : $" Note: {request.AdminNote}"),
                "Leave", "All", "LeaveRequest", request.Id, cancellationToken),
            "Approved" => CreateSystemNoticeAsync(
                $"Class cancelled — leave approved",
                $"{who}: {request.ClassName} on {FormatSession(request.SessionDate, null)} has been cancelled."
                    + (string.IsNullOrWhiteSpace(request.AdminNote) ? "" : $" {request.AdminNote}"),
                "Leave", "All", "LeaveRequest", request.Id, cancellationToken),
            "Confirmed" => CreateSystemNoticeAsync(
                $"Replacement scheduled — {request.ClassName ?? "Class"}",
                $"{who}: {request.ClassName} moved from {FormatSession(request.SessionDate, null)}"
                    + $" to {FormatSession(request.ReplDate, request.ReplStart, request.ReplEnd)}.",
                "Replacement", "All", "LeaveRequest", request.Id, cancellationToken),
            _ => Task.CompletedTask
        };
    }

    public Task NotifySessionCancelledAsync(
        PortalClassSessionDto session,
        string? reason,
        CancellationToken cancellationToken = default)
    {
        var title = $"Session cancelled — {session.ClassName}";
        var content = $"{session.StudentName ?? session.BranchName}: {session.ClassName} on "
            + $"{FormatSession(session.SessionDate, session.StartTime, session.EndTime)} cancelled."
            + (string.IsNullOrWhiteSpace(reason) ? "" : $" {reason}");

        return CreateSystemNoticeAsync(title, content, "SessionChange", "All", "SessionChange", session.Id, cancellationToken);
    }

    public Task NotifySessionRescheduledAsync(
        PortalClassSessionDto before,
        string newDate,
        string newStart,
        string newEnd,
        string? reason,
        CancellationToken cancellationToken = default)
    {
        var title = $"Session rescheduled — {before.ClassName}";
        var content = $"{before.StudentName ?? before.BranchName}: {before.ClassName} moved from "
            + $"{FormatSession(before.SessionDate, before.StartTime, before.EndTime)} to "
            + $"{FormatSession(newDate, newStart, newEnd)}."
            + (string.IsNullOrWhiteSpace(reason) ? "" : $" {reason}");

        return CreateSystemNoticeAsync(title, content, "Replacement", "All", "SessionChange", before.Id, cancellationToken);
    }

    public Task NotifyPortalSessionCancelledAsync(
        string className,
        string? studentName,
        DateTime sessionDate,
        TimeSpan startTime,
        TimeSpan endTime,
        string? reason,
        CancellationToken cancellationToken = default)
    {
        var title = $"Session cancelled — {className}";
        var content = $"{studentName ?? "Student"}: {className} on "
            + $"{sessionDate:dd/MM/yyyy} {startTime:hh\\:mm}–{endTime:hh\\:mm} cancelled."
            + (string.IsNullOrWhiteSpace(reason) ? "" : $" {reason}");

        return CreateSystemNoticeAsync(title, content, "SessionChange", "All", null, null, cancellationToken);
    }

    public Task NotifyPortalSessionReplacedAsync(
        string className,
        string? studentName,
        DateTime oldDate,
        TimeSpan oldStart,
        TimeSpan oldEnd,
        DateTime newDate,
        TimeSpan newStart,
        TimeSpan newEnd,
        string? reason,
        CancellationToken cancellationToken = default)
    {
        var title = $"Session rescheduled — {className}";
        var content = $"{studentName ?? "Student"}: {className} moved from "
            + $"{oldDate:dd/MM/yyyy} {oldStart:hh\\:mm}–{oldEnd:hh\\:mm} to "
            + $"{newDate:dd/MM/yyyy} {newStart:hh\\:mm}–{newEnd:hh\\:mm}."
            + (string.IsNullOrWhiteSpace(reason) ? "" : $" {reason}");

        return CreateSystemNoticeAsync(title, content, "Replacement", "All", null, null, cancellationToken);
    }

    private async Task EnsureTableAsync(CancellationToken cancellationToken)
    {
        if (!_localDb.CanWriteLocalDb)
            return;
        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);
    }

    private static string FormatSession(string? date, string? start, string? end = null)
    {
        if (string.IsNullOrWhiteSpace(date))
            return "—";
        if (!DateTime.TryParse(date, out var dt))
            return date;
        var formatted = dt.ToString("dd/MM/yyyy");
        if (!string.IsNullOrWhiteSpace(start))
            formatted += end != null ? $" {start}–{end}" : $" {start}";
        return formatted;
    }

    private static AnnouncementDto Map(FbDataReader reader)
    {
        var holiday = reader["HOLIDAYDATE"];
        DateTime? holidayDate = holiday is DBNull or null ? null : Convert.ToDateTime(holiday);
        var createdById = Guid.TryParse(reader["CREATEDBYUSERID"]?.ToString(), out var uid) ? uid : Guid.Empty;
        var isSystem = reader["ISSYSTEM"] is not DBNull and not null && Convert.ToInt32(reader["ISSYSTEM"]) != 0;

        return new AnnouncementDto(
            Guid.Parse(reader["ID"]?.ToString() ?? Guid.Empty.ToString()),
            reader["TITLE"]?.ToString() ?? string.Empty,
            reader["CONTENT"]?.ToString() ?? string.Empty,
            reader["CATEGORY"]?.ToString() ?? "General",
            holidayDate,
            reader["TARGETROLE"]?.ToString() ?? "All",
            createdById,
            reader["CREATEDBYNAME"]?.ToString(),
            Convert.ToDateTime(reader["CREATEDAT"]),
            isSystem,
            reader["RELATEDTYPE"]?.ToString(),
            reader["RELATEDID"]?.ToString());
    }
}
