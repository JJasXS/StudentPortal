using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MusicTuitionPortal.Api.Data;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Helpers;
using MusicTuitionPortal.Api.Models;

namespace MusicTuitionPortal.Api.Services;

public class ClassSessionChangeHistoryService
{
    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ClassSessionChangeHistoryService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task RecordAsync(
        ClassSession before,
        string changeType,
        string? reason,
        DateTime? newSessionDate = null,
        TimeSpan? newStartTime = null,
        TimeSpan? newEndTime = null,
        string? newStatus = null,
        Guid? replacementClassSessionId = null)
    {
        var (actorUserId, actorName) = ResolveActor();

        _context.ClassSessionChangeHistories.Add(new ClassSessionChangeHistory
        {
            Id = Guid.NewGuid(),
            ClassSessionId = before.Id,
            ClassId = before.ClassId,
            ChangeType = changeType,
            ActorUserId = actorUserId,
            ActorName = actorName,
            Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim(),
            PreviousSessionDate = before.SessionDate.Date,
            PreviousStartTime = before.StartTime,
            PreviousEndTime = before.EndTime,
            PreviousStatus = before.Status,
            NewSessionDate = newSessionDate?.Date,
            NewStartTime = newStartTime,
            NewEndTime = newEndTime,
            NewStatus = newStatus,
            ReplacementClassSessionId = replacementClassSessionId,
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
    }

    public async Task<List<ClassSessionChangeHistoryDto>> GetAsync(
        Guid? classId = null,
        Guid? classSessionId = null,
        int limit = 200,
        CancellationToken cancellationToken = default)
    {
        var query = _context.ClassSessionChangeHistories
            .AsNoTracking()
            .Include(h => h.Class)
            .OrderByDescending(h => h.CreatedAt)
            .AsQueryable();

        if (classId.HasValue)
            query = query.Where(h => h.ClassId == classId.Value);

        if (classSessionId.HasValue)
            query = query.Where(h => h.ClassSessionId == classSessionId.Value);

        var rows = await query.Take(limit).ToListAsync(cancellationToken);
        return rows.Select(Map).ToList();
    }

    public static string? DetermineChangeType(ClassSession before, ClassSessionDto after)
    {
        var newStart = TimeSpan.Parse(after.StartTime);
        var newEnd = TimeSpan.Parse(after.EndTime);
        var scheduleChanged = before.SessionDate.Date != after.SessionDate.Date
            || before.StartTime != newStart
            || before.EndTime != newEnd;

        if (string.Equals(after.Status, "Cancelled", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(before.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            return ClassSessionChangeTypes.Cancellation;
        }

        if (scheduleChanged
            || string.Equals(after.Status, "Rescheduled", StringComparison.OrdinalIgnoreCase))
        {
            return ClassSessionChangeTypes.Replacement;
        }

        return null;
    }

    private (Guid? ActorUserId, string? ActorName) ResolveActor()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true)
            return (null, null);

        Guid? actorUserId = null;
        var idClaim = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(idClaim, out var parsedId))
            actorUserId = parsedId;

        var actorName = user.FindFirstValue(ClaimTypes.Name) ?? user.FindFirstValue(ClaimTypes.Email);
        return (actorUserId, actorName);
    }

    private static ClassSessionChangeHistoryDto Map(ClassSessionChangeHistory h) =>
        new(
            h.Id,
            h.ClassSessionId,
            h.ClassId,
            h.Class?.ClassName,
            h.ChangeType,
            h.ActorUserId,
            h.ActorName,
            h.Reason,
            h.PreviousSessionDate.ToString("yyyy-MM-dd"),
            TimeHelper.FormatTime(h.PreviousStartTime),
            TimeHelper.FormatTime(h.PreviousEndTime),
            h.PreviousStatus,
            h.NewSessionDate?.ToString("yyyy-MM-dd"),
            h.NewStartTime.HasValue ? TimeHelper.FormatTime(h.NewStartTime.Value) : null,
            h.NewEndTime.HasValue ? TimeHelper.FormatTime(h.NewEndTime.Value) : null,
            h.NewStatus,
            h.ReplacementClassSessionId,
            h.CreatedAt);
}
