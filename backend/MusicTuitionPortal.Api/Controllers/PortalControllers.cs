using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Services;

namespace MusicTuitionPortal.Api.Controllers;

[ApiController]
[Route("api/homework")]
[Authorize]
public class HomeworkController : ControllerBase
{
    private readonly PortalHomeworkService _service;
    public HomeworkController(PortalHomeworkService service) => _service = service;

    [HttpGet]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetAll([FromQuery] string? teacher, CancellationToken cancellationToken) =>
        Ok((await _service.GetForTeacherAsync(teacher, cancellationToken)).Select(MapHw).ToList());

    [HttpGet("mine")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> GetMine([FromQuery] string? branchName, CancellationToken cancellationToken)
    {
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();
        return Ok((await _service.GetForParentAsync(email, branchName, cancellationToken)).Select(MapHw).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> Submit([FromBody] CreatePortalHomeworkRequest request, CancellationToken cancellationToken)
    {
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();
        try { return Ok(MapHw(await _service.SubmitAsync(email, request, cancellationToken))); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    private static object MapHw(PortalHomeworkDto h) => new
    {
        id = h.Id, docKey = h.DocKey, seq = h.Seq, customerCode = h.CustomerCode, branchName = h.BranchName,
        className = h.ClassName, itemCode = h.ItemCode, title = h.Title, note = h.Note, fileName = h.FileName,
        submittedBy = h.SubmittedBy, createdAt = h.CreatedAt,
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
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
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
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
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
