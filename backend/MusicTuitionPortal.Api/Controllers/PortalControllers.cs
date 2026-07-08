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
        [FromForm] string? title,
        [FromForm] string? note,
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();

        var request = new CreatePortalHomeworkRequest(docKey, seq, branchName, title, note);
        try
        {
            return Ok(MapHw(await _service.SubmitAsync(email, request, file, cancellationToken)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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
        title = h.Title,
        note = h.Note,
        fileName = h.FileName,
        filePath = h.FilePath,
        hasFile = !string.IsNullOrWhiteSpace(h.FilePath),
        submittedBy = h.SubmittedBy,
        createdAt = h.CreatedAt,
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

    [HttpGet("teacher")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> GetForTeacher(CancellationToken cancellationToken)
    {
        var name = User.Identity?.Name ?? string.Empty;
        return Ok((await _service.GetForTeacherAsync(name, cancellationToken)).Select(MapLeave).ToList());
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

    [HttpPost("{id}/review")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Review(string id, [FromBody] AdminLeaveReviewRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(MapLeave(await _service.AdminReviewAsync(id, request, cancellationToken))); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id}/propose-replacement")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ProposeReplacement(string id, [FromBody] AdminLeaveReplacementRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(MapLeave(await _service.ProposeReplacementAsync(id, request, cancellationToken))); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id}/accept")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> Accept(string id, CancellationToken cancellationToken)
    {
        try { return Ok(MapLeave(await _service.TeacherAcceptAsync(id, cancellationToken))); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id}/counter")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> Counter(string id, [FromBody] TeacherLeaveCounterRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(MapLeave(await _service.TeacherCounterAsync(id, request, cancellationToken))); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{id}/confirm")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Confirm(string id, CancellationToken cancellationToken)
    {
        try { return Ok(MapLeave(await _service.AdminConfirmReplacementAsync(id, cancellationToken))); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    private static object MapLeave(PortalLeaveRequestDto r) => new
    {
        id = r.Id, occurrenceId = r.OccurrenceId, docKey = r.DocKey, seq = r.Seq,
        customerCode = r.CustomerCode, branchName = r.BranchName, className = r.ClassName,
        sessionDate = r.SessionDate, reason = r.Reason, status = r.Status, adminNote = r.AdminNote,
        needsReplacement = r.NeedsReplacement, replDate = r.ReplDate, replStart = r.ReplStart,
        replEnd = r.ReplEnd, replTeacher = r.ReplTeacher, teacherResponse = r.TeacherResponse,
        counterDate = r.CounterDate, counterStart = r.CounterStart, counterEnd = r.CounterEnd,
        counterMsg = r.CounterMsg, requestedBy = r.RequestedBy, createdAt = r.CreatedAt, updatedAt = r.UpdatedAt,
    };
}
