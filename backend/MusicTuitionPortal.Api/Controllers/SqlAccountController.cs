using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MusicTuitionPortal.Api.Services;

namespace MusicTuitionPortal.Api.Controllers;

[ApiController]
[Route("api/sqlaccount")]
[Authorize(Roles = "Admin")]
public class SqlAccountController : ControllerBase
{
    private readonly SqlAccountService _service;
    private readonly SqlAccountSettings _settings;

    public SqlAccountController(SqlAccountService service, SqlAccountSettings settings)
    {
        _service = service;
        _settings = settings;
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus(CancellationToken cancellationToken)
    {
        if (!_service.IsConfigured)
        {
            return Ok(new
            {
                configured = false,
                connected = false,
                databasePath = string.IsNullOrWhiteSpace(_settings.DatabasePath) ? null : _settings.DatabasePath
            });
        }

        try
        {
            var connected = await _service.TestConnectionAsync(cancellationToken);
            return Ok(new
            {
                configured = true,
                connected,
                databasePath = string.IsNullOrWhiteSpace(_settings.DatabasePath) ? null : _settings.DatabasePath
            });
        }
        catch (Exception)
        {
            return Ok(new
            {
                configured = true,
                connected = false,
                databasePath = string.IsNullOrWhiteSpace(_settings.DatabasePath) ? null : _settings.DatabasePath
            });
        }
    }

    [HttpGet("parent-children")]
    public async Task<IActionResult> GetParentChildren(CancellationToken cancellationToken)
    {
        try
        {
            var parents = await _service.GetParentChildrenAsync(cancellationToken);
            return Ok(parents);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
