using Microsoft.EntityFrameworkCore;
using MusicTuitionPortal.Api.Data;

namespace MusicTuitionPortal.Api.Services;

/// <summary>
/// Writes PORTAL_SO_LINE_SCHEDULE.CLASSSTARTDATETIME from portal class sessions.
/// </summary>
public class SqlAccountSodtlUdfSyncService
{
    private readonly AppDbContext _context;
    private readonly PortalSoLineScheduleService _schedules;
    private readonly ILogger<SqlAccountSodtlUdfSyncService> _logger;

    public SqlAccountSodtlUdfSyncService(
        AppDbContext context,
        PortalSoLineScheduleService schedules,
        ILogger<SqlAccountSodtlUdfSyncService> logger)
    {
        _context = context;
        _schedules = schedules;
        _logger = logger;
    }

    public async Task SyncNextSessionClassDateAsync(Guid classId, CancellationToken cancellationToken = default)
    {
        if (!_schedules.CanWrite)
            return;

        var cls = await _context.Classes
            .AsNoTracking()
            .Include(c => c.TeacherUser)
            .FirstOrDefaultAsync(c => c.Id == classId, cancellationToken);

        if (cls == null)
            return;

        var today = DateTime.UtcNow.Date;
        var next = await _context.ClassSessions
            .AsNoTracking()
            .Where(s => s.ClassId == classId
                && s.SessionDate >= today
                && s.Status != "Cancelled")
            .OrderBy(s => s.SessionDate)
            .ThenBy(s => s.StartTime)
            .FirstOrDefaultAsync(cancellationToken);

        DateTime? classDateTime = next == null
            ? null
            : next.SessionDate.Date.Add(next.StartTime);

        var itemCodes = await _context.ItemCodeClassLinks
            .AsNoTracking()
            .Where(l => l.PortalClassId == classId)
            .Select(l => l.ItemCode)
            .ToListAsync(cancellationToken);

        try
        {
            var updated = 0;
            if (itemCodes.Count > 0)
            {
                updated += await _schedules.UpdateClassStartByItemCodesAsync(
                    itemCodes,
                    classDateTime,
                    cancellationToken);
            }

            if (!string.IsNullOrWhiteSpace(cls.DayOfWeek) && !string.IsNullOrWhiteSpace(cls.TeacherUser?.FullName))
            {
                updated += await _schedules.UpdateClassStartByScheduleMatchAsync(
                    cls.DayOfWeek,
                    cls.TeacherUser.FullName,
                    classDateTime,
                    cancellationToken);
            }

            if (updated > 0)
            {
                _logger.LogInformation(
                    "Synced portal SO schedule for class {ClassId} ({ClassName}): {Count} line(s) → {Date}",
                    classId,
                    cls.ClassName,
                    updated,
                    classDateTime?.ToString("yyyy-MM-dd HH:mm") ?? "(cleared)");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to sync portal SO schedule for class {ClassId}", classId);
        }
    }
}
