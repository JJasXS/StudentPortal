using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Services;
using System.Security.Claims;

namespace MusicTuitionPortal.Api.Controllers;

[ApiController]
[Route("api/homework")]
[Authorize]
public class HomeworkController : ControllerBase
{
    private readonly PortalHomeworkService _service;
    private readonly HomeworkFileStorageService _files;

    public HomeworkController(PortalHomeworkService service, HomeworkFileStorageService files)
    {
        _service = service;
        _files = files;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetAll([FromQuery] string? teacher, CancellationToken cancellationToken) =>
        Ok((await _service.GetForTeacherAsync(teacher, cancellationToken)).Select(MapHw).ToList());

    [HttpGet("mine")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> GetMine([FromQuery] string? branchName, CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();
        return Ok((await _service.GetForParentAsync(email, branchName, cancellationToken)).Select(MapHw).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "Parent")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(HomeworkFileStorageService.MaxBytes)]
    public async Task<IActionResult> Submit(
        [FromForm] int docKey,
        [FromForm] int seq,
        [FromForm] string branchName,
        [FromForm] string? url,
        [FromForm] string? note,
        [FromForm] string? assignmentId,
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var request = new CreatePortalHomeworkRequest(docKey, seq, branchName, url, note, assignmentId);
        try
        {
            return Ok(MapHw(await _service.SubmitAsync(email, request, file, cancellationToken)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> SetStatus(
        string id,
        [FromBody] UpdateHomeworkStatusRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _service.SetStatusAsync(id, request.Status, cancellationToken);
            if (updated == null)
                return NotFound();
            return Ok(MapHw(updated));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("pending-count")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> GetPendingCount(
        PortalAssignmentService assignments,
        CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();
        var counts = await assignments.GetPendingCountsForParentAsync(email, cancellationToken);
        return Ok(new
        {
            total = counts.Sum(c => c.PendingCount),
            byBranch = counts.Select(c => new { branchName = c.BranchName, pendingCount = c.PendingCount }),
        });
    }

    [HttpGet("{id}/file")]
    public async Task<IActionResult> DownloadFile(string id, CancellationToken cancellationToken)
    {
        var homework = await _service.GetByIdAsync(id, cancellationToken);
        if (homework == null || string.IsNullOrWhiteSpace(homework.FilePath))
            return NotFound();

        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (string.IsNullOrWhiteSpace(role))
            return Unauthorized();

        var allowed = role switch
        {
            "Admin" => true,
            "Parent" when !string.IsNullOrWhiteSpace(email) =>
                await _service.CanParentAccessAsync(email, homework, cancellationToken),
            "Teacher" => await _service.CanTeacherAccessAsync(
                User.Identity?.Name ?? string.Empty,
                homework,
                cancellationToken),
            _ => false,
        };

        if (!allowed)
            return Forbid();

        if (!_files.TryOpenRead(homework.FilePath, out var stream) || stream == null)
            return NotFound();

        var downloadName = string.IsNullOrWhiteSpace(homework.FileName) ? "homework" : homework.FileName;
        return File(stream, "application/octet-stream", downloadName);
    }

    private static object MapHw(PortalHomeworkDto h) => new
    {
        id = h.Id,
        docKey = h.DocKey,
        seq = h.Seq,
        customerCode = h.CustomerCode,
        branchName = h.BranchName,
        className = h.ClassName,
        itemCode = h.ItemCode,
        url = h.Url,
        note = h.Note,
        fileName = h.FileName,
        filePath = h.FilePath,
        hasFile = !string.IsNullOrWhiteSpace(h.FilePath),
        submittedBy = h.SubmittedBy,
        createdAt = h.CreatedAt,
        assignmentId = h.AssignmentId,
        status = h.Status,
    };
}

[ApiController]
[Route("api/assignments")]
[Authorize]
public class AssignmentsController : ControllerBase
{
    private readonly PortalAssignmentService _service;

    public AssignmentsController(PortalAssignmentService service) => _service = service;

    [HttpGet]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetForClass(
        [FromQuery] string className,
        CancellationToken cancellationToken) =>
        Ok((await _service.GetForClassAsync(className, cancellationToken)).Select(MapAssignment).ToList());

    [HttpGet("mine")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> GetMine(
        [FromQuery] string? branchName,
        CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();
        return Ok((await _service.GetForParentAsync(email, branchName, cancellationToken)).Select(MapAssignment).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Create(
        [FromBody] CreatePortalAssignmentRequest request,
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var name = User.Identity?.Name ?? User.FindFirst(ClaimTypes.Email)?.Value ?? "Teacher";
        try
        {
            return Ok(MapAssignment(await _service.CreateAsync(userId, name, request, cancellationToken)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        if (!await _service.DeleteAsync(id, cancellationToken))
            return NotFound();
        return NoContent();
    }

    private static object MapAssignment(PortalAssignmentDto a) => new
    {
        id = a.Id,
        className = a.ClassName,
        itemCode = a.ItemCode,
        title = a.Title,
        instructions = a.Instructions,
        dueDate = a.DueDate.ToString("yyyy-MM-dd"),
        createdByUserId = a.CreatedByUserId.ToString(),
        createdByName = a.CreatedByName,
        createdAt = a.CreatedAt,
        hasSubmission = a.HasSubmission,
        submissionId = a.SubmissionId,
        submissionStatus = a.SubmissionStatus,
    };
}

[ApiController]
[Route("api/leave")]
[Authorize]
public class LeaveController : ControllerBase
{
    private readonly PortalLeaveRequestService _service;
    public LeaveController(PortalLeaveRequestService service) => _service = service;

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken) =>
        Ok((await _service.GetAllAsync(cancellationToken)).Select(MapLeave).ToList());

    [HttpGet("mine")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();
        return Ok((await _service.GetForParentAsync(email, cancellationToken)).Select(MapLeave).ToList());
    }

    [HttpGet("teacher/mine")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> GetTeacherMine(CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();
        return Ok((await _service.GetForTeacherAsync(email, cancellationToken)).Select(MapLeave).ToList());
    }

    [HttpPost("teacher")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> SubmitTeacher([FromBody] CreatePortalLeaveRequest request, CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();
        var teacherName = User.FindFirst(ClaimTypes.Name)?.Value;
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? teacherUserId = Guid.TryParse(userIdClaim, out var uid) ? uid : null;
        try
        {
            return Ok(MapLeave(await _service.SubmitTeacherAsync(email, teacherName, teacherUserId, request, cancellationToken)));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> Submit([FromBody] CreatePortalLeaveRequest request, CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();
        try { return Ok(MapLeave(await _service.SubmitAsync(email, request, cancellationToken))); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id}/decide")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Decide(string id, [FromBody] AdminLeaveDecisionRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(MapLeave(await _service.AdminDecideAsync(id, request, cancellationToken))); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    private static object MapLeave(PortalLeaveRequestDto r) => new
    {
        id = r.Id, occurrenceId = r.OccurrenceId, docKey = r.DocKey, seq = r.Seq,
        customerCode = r.CustomerCode, branchName = r.BranchName, className = r.ClassName,
        sessionDate = r.SessionDate, reason = r.Reason, status = r.Status, adminNote = r.AdminNote,
        needsReplacement = r.NeedsReplacement,
        replOptions = r.ReplOptions.Select(o => new { date = o.Date, time = o.Time }).ToList(),
        replDate = r.ReplDate, replStart = r.ReplStart,
        replEnd = r.ReplEnd, replTeacher = r.ReplTeacher, teacherResponse = r.TeacherResponse,
        counterDate = r.CounterDate, counterStart = r.CounterStart, counterEnd = r.CounterEnd,
        counterMsg = r.CounterMsg, requestedBy = r.RequestedBy, requesterType = r.RequesterType,
        createdAt = r.CreatedAt, updatedAt = r.UpdatedAt,
    };
}

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly PortalDashboardNotifyService _notify;

    public DashboardController(PortalDashboardNotifyService notify) => _notify = notify;

    [HttpGet("notify")]
    public async Task<IActionResult> GetNotify([FromQuery] int limit = 5, CancellationToken cancellationToken = default)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Student";
        var email = User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;
        var feed = await _notify.GetFeedForUserAsync(email, role, limit, cancellationToken);
        return Ok(feed.Select(MapNotify).ToList());
    }

    [HttpGet("notify/unread-count")]
    public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken = default)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Student";
        var email = User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized();
        var count = await _notify.GetUnreadCountAsync(email, role, cancellationToken);
        return Ok(new { count });
    }

    [HttpPost("notify/{id}/read")]
    public async Task<IActionResult> MarkRead(string id, CancellationToken cancellationToken = default)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized();
        await _notify.MarkReadAsync(email, id, cancellationToken);
        return NoContent();
    }

    [HttpPost("notify/read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken = default)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Student";
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized();
        await _notify.MarkAllReadAsync(email, role, cancellationToken);
        return NoContent();
    }

    [HttpPost("notify/{id}/hide")]
    public async Task<IActionResult> Hide(string id, CancellationToken cancellationToken = default)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized();
        await _notify.HideAsync(email, id, cancellationToken);
        return NoContent();
    }

    private static object MapNotify(AnnouncementDto a) => new
    {
        id = a.Id.ToString(),
        title = a.Title,
        content = a.Content,
        category = a.Category,
        holidayDate = a.HolidayDate?.ToString("yyyy-MM-dd"),
        expiryDate = a.ExpiryDate?.ToString("yyyy-MM-dd"),
        targetRole = a.TargetRole,
        createdByUserId = a.CreatedByUserId.ToString(),
        createdByName = a.CreatedByName,
        isSystem = a.IsSystem,
        relatedType = a.RelatedType,
        relatedId = a.RelatedId,
        isRead = a.IsRead,
        createdAt = a.CreatedAt,
    };
}
