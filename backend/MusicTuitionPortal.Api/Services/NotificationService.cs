using Microsoft.EntityFrameworkCore;
using MusicTuitionPortal.Api.Data;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Models;

namespace MusicTuitionPortal.Api.Services;

public class NotificationService
{
    private readonly AppDbContext _context;

    public NotificationService(AppDbContext context) => _context = context;

    public async Task<List<NotificationDto>> GetForUserAsync(Guid userId, bool? unreadOnly = null)
    {
        var query = _context.Notifications.Where(n => n.UserId == userId);
        if (unreadOnly == true) query = query.Where(n => !n.IsRead);
        return await query
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => Map(n))
            .ToListAsync();
    }

    public async Task<int> GetUnreadCountAsync(Guid userId) =>
        await _context.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

    public async Task<NotificationDto?> MarkReadAsync(Guid id, Guid userId)
    {
        var notification = await _context.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (notification == null) return null;
        notification.IsRead = true;
        await _context.SaveChangesAsync();
        return Map(notification);
    }

    public async Task MarkAllReadAsync(Guid userId)
    {
        var unread = await _context.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync();
        foreach (var n in unread) n.IsRead = true;
        if (unread.Count > 0) await _context.SaveChangesAsync();
    }

    public async Task<NotificationDto> CreateAsync(
        Guid userId, string title, string message, string category, string? linkPath = null)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = title,
            Message = message,
            Category = category,
            LinkPath = linkPath,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();
        return Map(notification);
    }

    public async Task NotifyParentsOfStudentAsync(
        Guid studentUserId, string title, string message, string category, string? linkPath = null)
    {
        var parentIds = await _context.ParentStudents
            .Where(ps => ps.StudentUserId == studentUserId)
            .Select(ps => ps.ParentUserId)
            .Distinct()
            .ToListAsync();

        foreach (var parentId in parentIds)
            await CreateAsync(parentId, title, message, category, linkPath);
    }

    public async Task NotifyUsersByRoleAsync(
        string role, string title, string message, string category, string? linkPath = null)
    {
        var userIds = await _context.Users
            .Where(u => u.Role == role && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync();

        foreach (var userId in userIds)
            await CreateAsync(userId, title, message, category, linkPath);
    }

    public async Task NotifyAnnouncementAsync(Announcement announcement)
    {
        if (announcement.TargetRole == "All")
        {
            await NotifyUsersByRoleAsync(
                Roles.Parent,
                announcement.Title,
                Truncate(announcement.Content, 160),
                "Announcement",
                "/parent/announcements");
            return;
        }

        if (announcement.TargetRole == Roles.Parent)
        {
            await NotifyUsersByRoleAsync(
                Roles.Parent,
                announcement.Title,
                Truncate(announcement.Content, 160),
                "Announcement",
                "/parent/announcements");
        }
    }

    private static NotificationDto Map(Notification n) =>
        new(n.Id, n.UserId, n.Title, n.Message, n.Category, n.LinkPath, n.IsRead, n.CreatedAt);

    private static string Truncate(string value, int max)
    {
        if (string.IsNullOrEmpty(value) || value.Length <= max) return value;
        return value[..(max - 1)] + "…";
    }
}
