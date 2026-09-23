using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MusicTuitionPortal.Api.Services;

namespace MusicTuitionPortal.Api.Controllers;

[ApiController]
[Route("api/class-materials")]
[Authorize]
public class ClassMaterialsController : ControllerBase
{
    private readonly PortalClassMaterialService _service;
    private readonly ClassMaterialFileStorageService _files;

    public ClassMaterialsController(
        PortalClassMaterialService service,
        ClassMaterialFileStorageService files)
    {
        _service = service;
        _files = files;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetForClass(
        [FromQuery] string className,
        CancellationToken cancellationToken) =>
        Ok((await _service.GetForClassAsync(className, cancellationToken)).Select(Map).ToList());

    [HttpGet("mine")]
    [Authorize(Roles = "Student,Parent")]
    public async Task<IActionResult> GetMine(
        [FromQuery] string? branchName,
        CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized();
        return Ok((await _service.GetForParentAsync(email, branchName, cancellationToken)).Select(Map).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ClassMaterialFileStorageService.MaxBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = ClassMaterialFileStorageService.MaxBytes)]
    public async Task<IActionResult> Upload(
        [FromForm] string className,
        [FromForm] string title,
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var name = User.Identity?.Name ?? User.FindFirst(ClaimTypes.Email)?.Value ?? "Teacher";
        try
        {
            if (file == null)
                return BadRequest(new { message = "A video file is required." });
            return Ok(Map(await _service.UploadAsync(userId, name, className, title, file, cancellationToken)));
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

    [HttpGet("{id}/file")]
    public async Task<IActionResult> GetFile(
        string id,
        [FromQuery] bool download = false,
        CancellationToken cancellationToken = default)
    {
        var info = await _service.GetFileInfoAsync(id, cancellationToken);
        if (info == null)
            return NotFound();

        var (material, filePath) = info.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (string.IsNullOrWhiteSpace(role))
            return Unauthorized();

        var allowed = role switch
        {
            "Admin" or "Teacher" => true,
            "Student" or "Parent" when !string.IsNullOrWhiteSpace(email) =>
                await _service.CanParentAccessAsync(email, material, cancellationToken),
            _ => false,
        };

        if (!allowed)
            return Forbid();

        if (!_files.TryOpenRead(filePath, out var stream) || stream == null)
            return NotFound();

        var contentType = string.IsNullOrWhiteSpace(material.ContentType)
            ? "application/octet-stream"
            : material.ContentType;
        var fileName = string.IsNullOrWhiteSpace(material.FileName) ? "lesson-video" : material.FileName;

        if (download)
            return File(stream, contentType, fileName);

        return File(stream, contentType, enableRangeProcessing: true);
    }

    private static object Map(DTOs.PortalClassMaterialDto m) => new
    {
        id = m.Id,
        className = m.ClassName,
        title = m.Title,
        fileName = m.FileName,
        contentType = m.ContentType,
        uploadedByUserId = m.UploadedByUserId.ToString(),
        uploadedByName = m.UploadedByName,
        createdAt = m.CreatedAt,
        hasFile = m.HasFile,
    };
}
