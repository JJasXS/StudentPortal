using System.Security.Claims;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Helpers;
using MusicTuitionPortal.Api.Models;

namespace MusicTuitionPortal.Api.Services;

public class ClassAssignmentChangeLogService
{
    private readonly SqlAccountLocalDbService _localDb;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<ClassAssignmentChangeLogService> _logger;

    public ClassAssignmentChangeLogService(
        SqlAccountLocalDbService localDb,
        IHttpContextAccessor httpContextAccessor,
        ILogger<ClassAssignmentChangeLogService> logger)
    {
        _localDb = localDb;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task RecordEnrollmentCreatedAsync(
        Enrollment enrollment,
        string className,
        string studentName)
    {
        await AddAsync(new ClassAssignmentChangeLog
        {
            ClassId = enrollment.ClassId,
            ClassName = className,
            EntityType = ClassAssignmentEntityTypes.Enrollment,
            Operation = ClassAssignmentOperations.Create,
            EntityId = enrollment.Id,
            StudentUserId = enrollment.StudentUserId,
            StudentName = studentName,
            NewStatus = enrollment.Status,
        });
    }

    public async Task RecordEnrollmentUpdatedAsync(
        Enrollment before,
        string className,
        string studentName,
        string newStatus)
    {
        await AddAsync(new ClassAssignmentChangeLog
        {
            ClassId = before.ClassId,
            ClassName = className,
            EntityType = ClassAssignmentEntityTypes.Enrollment,
            Operation = ClassAssignmentOperations.Update,
            EntityId = before.Id,
            StudentUserId = before.StudentUserId,
            StudentName = studentName,
            PreviousStatus = before.Status,
            NewStatus = newStatus,
        });
    }

    public async Task RecordEnrollmentCancelledAsync(
        Enrollment enrollment,
        string className,
        string studentName)
    {
        await AddAsync(new ClassAssignmentChangeLog
        {
            ClassId = enrollment.ClassId,
            ClassName = className,
            EntityType = ClassAssignmentEntityTypes.Enrollment,
            Operation = ClassAssignmentOperations.Delete,
            EntityId = enrollment.Id,
            StudentUserId = enrollment.StudentUserId,
            StudentName = studentName,
            PreviousStatus = enrollment.Status,
            NewStatus = "Cancelled",
        });
    }

    public async Task RecordClassTeacherChangedAsync(
        MusicClass cls,
        Guid previousTeacherUserId,
        string? previousTeacherName,
        Guid newTeacherUserId,
        string? newTeacherName,
        string? reason = null)
    {
        await AddAsync(new ClassAssignmentChangeLog
        {
            ClassId = cls.Id,
            ClassName = cls.ClassName,
            EntityType = ClassAssignmentEntityTypes.Class,
            Operation = ClassAssignmentOperations.Update,
            EntityId = cls.Id,
            PreviousTeacherUserId = previousTeacherUserId,
            PreviousTeacherName = previousTeacherName,
            NewTeacherUserId = newTeacherUserId,
            NewTeacherName = newTeacherName,
            Reason = reason,
        });
    }

    public async Task RecordClassScheduleChangedAsync(
        MusicClass before,
        MusicClass after,
        string? reason = null)
    {
        await AddAsync(new ClassAssignmentChangeLog
        {
            ClassId = after.Id,
            ClassName = after.ClassName,
            EntityType = ClassAssignmentEntityTypes.Class,
            Operation = ClassAssignmentOperations.Update,
            EntityId = after.Id,
            PreviousDayOfWeek = before.DayOfWeek,
            NewDayOfWeek = after.DayOfWeek,
            PreviousClassStartTime = before.StartTime,
            NewClassStartTime = after.StartTime,
            PreviousClassEndTime = before.EndTime,
            NewClassEndTime = after.EndTime,
            Reason = reason,
        });
    }

    public async Task RecordSessionCreatedAsync(ClassSession session, string? className)
    {
        await AddAsync(new ClassAssignmentChangeLog
        {
            ClassId = session.ClassId,
            ClassName = className,
            EntityType = ClassAssignmentEntityTypes.ClassSession,
            Operation = ClassAssignmentOperations.Create,
            EntityId = session.Id,
            NewSessionDate = session.SessionDate.Date,
            NewSessionStartTime = session.StartTime,
            NewSessionEndTime = session.EndTime,
            NewStatus = session.Status,
        });
    }

    public async Task RecordSessionUpdatedAsync(
        ClassSession before,
        ClassSession after,
        string? className,
        string? reason = null)
    {
        await AddAsync(new ClassAssignmentChangeLog
        {
            ClassId = before.ClassId,
            ClassName = className,
            EntityType = ClassAssignmentEntityTypes.ClassSession,
            Operation = ClassAssignmentOperations.Update,
            EntityId = before.Id,
            PreviousSessionDate = before.SessionDate.Date,
            PreviousSessionStartTime = before.StartTime,
            PreviousSessionEndTime = before.EndTime,
            PreviousStatus = before.Status,
            NewSessionDate = after.SessionDate.Date,
            NewSessionStartTime = after.StartTime,
            NewSessionEndTime = after.EndTime,
            NewStatus = after.Status,
            Reason = reason,
        });
    }

    public async Task RecordSessionCancelledAsync(
        ClassSession before,
        string? className,
        string? reason = null)
    {
        await AddAsync(new ClassAssignmentChangeLog
        {
            ClassId = before.ClassId,
            ClassName = className,
            EntityType = ClassAssignmentEntityTypes.ClassSession,
            Operation = ClassAssignmentOperations.Delete,
            EntityId = before.Id,
            PreviousSessionDate = before.SessionDate.Date,
            PreviousSessionStartTime = before.StartTime,
            PreviousSessionEndTime = before.EndTime,
            PreviousStatus = before.Status,
            NewStatus = "Cancelled",
            Reason = reason,
        });
    }

    public async Task RecordSessionReplacedAsync(
        ClassSession before,
        ClassSession replacement,
        string? className,
        string? reason = null)
    {
        await AddAsync(new ClassAssignmentChangeLog
        {
            ClassId = before.ClassId,
            ClassName = className,
            EntityType = ClassAssignmentEntityTypes.ClassSession,
            Operation = ClassAssignmentOperations.Update,
            EntityId = before.Id,
            PreviousSessionDate = before.SessionDate.Date,
            PreviousSessionStartTime = before.StartTime,
            PreviousSessionEndTime = before.EndTime,
            PreviousStatus = before.Status,
            NewSessionDate = replacement.SessionDate.Date,
            NewSessionStartTime = replacement.StartTime,
            NewSessionEndTime = replacement.EndTime,
            NewStatus = replacement.Status,
            Reason = reason,
        });
    }

    public async Task RecordCalendarEventChangedAsync(
        Guid? classId,
        string? className,
        string? studentName,
        string? itemCode,
        string? branchName,
        string operation,
        DateTime? previousDateTime,
        TimeSpan? previousStartTime,
        TimeSpan? previousEndTime,
        DateTime? newDateTime,
        TimeSpan? newStartTime,
        TimeSpan? newEndTime,
        string? reason,
        CancellationToken cancellationToken = default)
    {
        var displayName = className
            ?? (!string.IsNullOrWhiteSpace(itemCode) ? itemCode : branchName ?? "ERP class");

        await AddAsync(new ClassAssignmentChangeLog
        {
            ClassId = classId ?? Guid.Empty,
            ClassName = displayName,
            EntityType = ClassAssignmentEntityTypes.ClassSession,
            Operation = operation,
            StudentName = studentName ?? branchName,
            PreviousSessionDate = previousDateTime?.Date,
            PreviousSessionStartTime = previousStartTime ?? previousDateTime?.TimeOfDay,
            PreviousSessionEndTime = previousEndTime,
            PreviousStatus = previousDateTime.HasValue ? "Scheduled" : null,
            NewSessionDate = newDateTime?.Date,
            NewSessionStartTime = newStartTime ?? newDateTime?.TimeOfDay,
            NewSessionEndTime = newEndTime,
            NewStatus = operation == ClassAssignmentOperations.Delete ? "Cancelled" : "Scheduled",
            Reason = reason,
        });
    }

    public async Task<List<ClassAssignmentChangeLogDto>> GetAsync(
        Guid? classId = null,
        int limit = 200,
        CancellationToken cancellationToken = default)
    {
        var rows = await _localDb.GetClassAssignmentChangeLogsAsync(classId, limit, cancellationToken);
        return rows.Select(Map).ToList();
    }

    private async Task AddAsync(ClassAssignmentChangeLog entry)
    {
        if (!_localDb.CanWriteLocalDb)
        {
            _logger.LogWarning("ClassAssignmentChangeLog skipped — Firebird database not available");
            return;
        }

        var (actorUserId, actorName) = ResolveActor();
        entry.Id = Guid.NewGuid();
        entry.ActorUserId = actorUserId;
        entry.ActorName = actorName;
        entry.CreatedAt = DateTime.UtcNow;

        try
        {
            await _localDb.InsertClassAssignmentChangeLogAsync(entry);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to write ClassAssignmentChangeLog to Firebird");
        }
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

    private static ClassAssignmentChangeLogDto Map(ClassAssignmentChangeLog l) =>
        new(
            l.Id,
            l.ClassId,
            l.ClassName,
            l.EntityType,
            l.Operation,
            l.EntityId,
            l.StudentUserId,
            l.StudentName,
            l.PreviousTeacherUserId,
            l.PreviousTeacherName,
            l.NewTeacherUserId,
            l.NewTeacherName,
            l.PreviousDayOfWeek,
            l.NewDayOfWeek,
            l.PreviousClassStartTime.HasValue ? TimeHelper.FormatTime(l.PreviousClassStartTime.Value) : null,
            l.NewClassStartTime.HasValue ? TimeHelper.FormatTime(l.NewClassStartTime.Value) : null,
            l.PreviousClassEndTime.HasValue ? TimeHelper.FormatTime(l.PreviousClassEndTime.Value) : null,
            l.NewClassEndTime.HasValue ? TimeHelper.FormatTime(l.NewClassEndTime.Value) : null,
            l.PreviousSessionDate?.ToString("yyyy-MM-dd"),
            l.NewSessionDate?.ToString("yyyy-MM-dd"),
            l.PreviousSessionStartTime.HasValue ? TimeHelper.FormatTime(l.PreviousSessionStartTime.Value) : null,
            l.NewSessionStartTime.HasValue ? TimeHelper.FormatTime(l.NewSessionStartTime.Value) : null,
            l.PreviousSessionEndTime.HasValue ? TimeHelper.FormatTime(l.PreviousSessionEndTime.Value) : null,
            l.NewSessionEndTime.HasValue ? TimeHelper.FormatTime(l.NewSessionEndTime.Value) : null,
            l.PreviousStatus,
            l.NewStatus,
            l.ActorUserId,
            l.ActorName,
            l.Reason,
            l.CreatedAt);
}
