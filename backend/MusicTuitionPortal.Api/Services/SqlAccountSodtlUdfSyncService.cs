using Microsoft.EntityFrameworkCore;
using MusicTuitionPortal.Api.Data;

namespace MusicTuitionPortal.Api.Services;

/// <summary>
/// Writes SL_SODTL.UDF_CLASSDATE (SQL Account DateTime / Firebird TIMESTAMP) from portal class sessions.
/// </summary>
public class SqlAccountSodtlUdfSyncService
{
    private readonly AppDbContext _context;
    private readonly SqlAccountLocalDbService _localDb;
    private readonly ILogger<SqlAccountSodtlUdfSyncService> _logger;

    public SqlAccountSodtlUdfSyncService(
        AppDbContext context,
        SqlAccountLocalDbService localDb,
        ILogger<SqlAccountSodtlUdfSyncService> logger)
    {
        _context = context;
        _localDb = localDb;
        _logger = logger;
    }

    public async Task SyncNextSessionClassDateAsync(Guid classId, CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
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
                updated += await _localDb.UpdateClassDateByItemCodesAsync(
                    itemCodes,
                    classDateTime,
                    cancellationToken);
            }

            if (!string.IsNullOrWhiteSpace(cls.DayOfWeek) && !string.IsNullOrWhiteSpace(cls.TeacherUser?.FullName))
            {
                updated += await _localDb.UpdateClassDateByScheduleMatchAsync(
                    cls.DayOfWeek,
                    cls.TeacherUser.FullName,
                    classDateTime,
                    cancellationToken);
            }

            if (updated > 0)
            {
                _logger.LogInformation(
                    "Synced UDF_CLASSDATE for class {ClassId} ({ClassName}): {Count} SL_SODTL line(s) → {Date}",
                    classId,
                    cls.ClassName,
                    updated,
                    classDateTime?.ToString("yyyy-MM-dd HH:mm") ?? "(cleared)");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to sync UDF_CLASSDATE for class {ClassId}", classId);
        }
    }
}
