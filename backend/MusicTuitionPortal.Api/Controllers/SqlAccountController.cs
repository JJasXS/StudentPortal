using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MusicTuitionPortal.Api.Data;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Helpers;
using MusicTuitionPortal.Api.Services;

namespace MusicTuitionPortal.Api.Controllers;

[ApiController]
[Route("api/sqlaccount")]
[Authorize(Roles = "Admin")]
public class SqlAccountController : ControllerBase
{
    private readonly SqlAccountService _service;
    private readonly SqlAccountSettings _settings;
    private readonly ItemCodeClassLinkService _itemCodeLinks;
    private readonly SqlAccountSalesOrderService _salesOrders;
    private readonly SqlAccountChildEnrollmentWriteService _enrollmentWriter;
    private readonly AppDbContext _context;
    private readonly SqlAccountLocalDbService _localDb;

    public SqlAccountController(
        SqlAccountService service,
        SqlAccountSettings settings,
        ItemCodeClassLinkService itemCodeLinks,
        SqlAccountSalesOrderService salesOrders,
        SqlAccountChildEnrollmentWriteService enrollmentWriter,
        AppDbContext context,
        SqlAccountLocalDbService localDb)
    {
        _service = service;
        _settings = settings;
        _itemCodeLinks = itemCodeLinks;
        _salesOrders = salesOrders;
        _enrollmentWriter = enrollmentWriter;
        _context = context;
        _localDb = localDb;
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

    [HttpGet("item-code-links")]
    public async Task<IActionResult> GetItemCodeLinks()
    {
        var links = await _itemCodeLinks.GetAllAsync();
        return Ok(links);
    }

    [HttpPost("item-code-links")]
    public async Task<IActionResult> CreateItemCodeLink([FromBody] CreateItemCodeClassLinkRequest request)
    {
        try
        {
            var link = await _itemCodeLinks.CreateAsync(request);
            return Ok(link);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("item-code-links/{id:guid}")]
    public async Task<IActionResult> DeleteItemCodeLink(Guid id)
    {
        var deleted = await _itemCodeLinks.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("course-options")]
    public async Task<IActionResult> GetCourseOptions(CancellationToken cancellationToken)
    {
        var stItems = await _localDb.GetStItemOptionsAsync(cancellationToken);
        var linksByCode = await _context.ItemCodeClassLinks
            .Include(l => l.PortalClass)
            .AsNoTracking()
            .ToDictionaryAsync(l => l.ItemCode, l => l, StringComparer.OrdinalIgnoreCase, cancellationToken);

        return Ok(stItems.Select(item =>
        {
            linksByCode.TryGetValue(item.Code, out var link);
            var portalClass = link?.PortalClass;

            return new SqlAccountCourseOptionDto(
                item.Code,
                item.Description,
                portalClass?.DayOfWeek,
                portalClass != null ? TimeHelper.FormatTime(portalClass.StartTime) : null,
                portalClass != null ? TimeHelper.FormatTime(portalClass.EndTime) : null,
                null);
        }).ToList());
    }

    [HttpGet("parents/{customerCode}/children/{branchName}/enrollments")]
    public async Task<IActionResult> GetChildEnrollments(
        string customerCode,
        string branchName,
        CancellationToken cancellationToken)
    {
        var enrollments = await _salesOrders.GetChildEnrollmentsAsync(
            customerCode.Trim(),
            branchName.Trim(),
            cancellationToken);

        return Ok(new
        {
            customerCode = customerCode.Trim(),
            branchName = branchName.Trim(),
            enrollments = enrollments.Select(e => new
            {
                docKey = e.DocKey,
                seq = e.Seq,
                docNo = e.DocNo,
                className = e.ClassName,
                itemCode = e.ItemCode,
                classDay = e.ClassDay,
                classTime = e.ClassTime,
                classDate = e.ClassDate,
                studentName = e.StudentName,
                conductedBy = e.ConductedBy,
                deliveryDate = e.DeliveryDate,
            }),
        });
    }

    [HttpPost("child-enrollments")]
    public async Task<IActionResult> AssignChildEnrollment(
        [FromBody] CreateSqlAccountChildEnrollmentRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _enrollmentWriter.AssignCourseAsync(request, cancellationToken);
            return Ok(new
            {
                docKey = created.DocKey,
                seq = created.Seq,
                docNo = created.DocNo,
                className = created.ClassName,
                itemCode = created.ItemCode,
                classDay = created.ClassDay,
                classTime = created.ClassTime,
                classDate = created.ClassDate,
                studentName = created.StudentName,
                conductedBy = created.ConductedBy,
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
