using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MusicTuitionPortal.Api.Data;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Models;

namespace MusicTuitionPortal.Api.Services;

public class AuditLogService
{
    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditLogService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogAsync(
        string action,
        string entityType,
        string? entityId = null,
        string? entityLabel = null,
        string? details = null,
        Guid? actorUserId = null,
        string? actorName = null,
        string? actorRole = null)
    {
        var user = _httpContextAccessor.HttpContext?.User;
        if (actorUserId == null && user?.Identity?.IsAuthenticated == true)
        {
            var idClaim = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(idClaim, out var parsedId))
                actorUserId = parsedId;
            actorName ??= user.FindFirstValue(ClaimTypes.Name) ?? user.FindFirstValue(ClaimTypes.Email);
            actorRole ??= user.FindFirstValue(ClaimTypes.Role);
        }

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = actorUserId,
            ActorName = actorName,
            ActorRole = actorRole,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            EntityLabel = entityLabel,
            Details = details,
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
    }

    public async Task<List<AuditLogDto>> GetAllAsync(
        string? search = null,
        string? action = null,
        string? entityType = null,
        DateTime? from = null,
        DateTime? to = null,
        int limit = 500)
    {
        var query = _context.AuditLogs.AsNoTracking().OrderByDescending(a => a.CreatedAt).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(a =>
                a.Action.ToLower().Contains(term) ||
                a.EntityType.ToLower().Contains(term) ||
                (a.EntityLabel != null && a.EntityLabel.ToLower().Contains(term)) ||
                (a.ActorName != null && a.ActorName.ToLower().Contains(term)) ||
                (a.Details != null && a.Details.ToLower().Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(a => a.Action == action);

        if (!string.IsNullOrWhiteSpace(entityType))
            query = query.Where(a => a.EntityType == entityType);

        if (from.HasValue)
            query = query.Where(a => a.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(a => a.CreatedAt <= to.Value);

        return await query.Take(limit).Select(a => Map(a)).ToListAsync();
    }

    private static AuditLogDto Map(AuditLog a) =>
        new(a.Id, a.ActorUserId, a.ActorName, a.ActorRole, a.Action, a.EntityType,
            a.EntityId, a.EntityLabel, a.Details, a.CreatedAt);
}
