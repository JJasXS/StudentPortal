using MusicTuitionPortal.Api.DTOs;

namespace MusicTuitionPortal.Api.Services;

public class AdminCalendarService
{
    private readonly PortalClassSessionService _portalSessions;

    public AdminCalendarService(PortalClassSessionService portalSessions)
    {
        _portalSessions = portalSessions;
    }

    public Task<List<ErpCalendarEventDto>> GetEventsAsync(CancellationToken cancellationToken = default) =>
        _portalSessions.GetCalendarEventsAsync(cancellationToken);

    public async Task<ErpCalendarEventDto?> GetEventByIdAsync(string eventId, CancellationToken cancellationToken = default)
    {
        if (TryParseOccurrenceId(eventId, out var occurrenceId))
        {
            var occ = await _portalSessions.GetOccurrenceByIdAsync(occurrenceId, cancellationToken);
            if (occ == null)
                return null;
            var events = await _portalSessions.GetCalendarEventsAsync(cancellationToken);
            return events.FirstOrDefault(e => string.Equals(e.Id, eventId, StringComparison.OrdinalIgnoreCase));
        }

        return null;
    }

    public async Task<ErpCalendarEventDto?> CancelEventAsync(
        int docKey,
        int seq,
        string reason,
        CancellationToken cancellationToken = default)
    {
        // Legacy erp- path: find occurrence by dockey/seq and first scheduled
        var occurrences = await _portalSessions.GetOccurrencesAsync(cancelled: false, cancellationToken: cancellationToken);
        var match = occurrences.FirstOrDefault(o => o.DocKey == docKey && o.Seq == seq);
        if (match == null)
            throw new InvalidOperationException("Calendar event not found.");

        await _portalSessions.CancelOccurrenceAsync(match.Id, reason, cancellationToken);
        return null;
    }

    public async Task CancelOccurrenceByIdAsync(string occurrenceId, string reason, CancellationToken cancellationToken = default)
    {
        await _portalSessions.CancelOccurrenceAsync(occurrenceId, reason, cancellationToken);
    }

    public async Task<ErpCalendarEventDto?> ReplaceEventAsync(
        int docKey,
        int seq,
        string sessionDate,
        string startTime,
        string endTime,
        string reason,
        string? notes,
        CancellationToken cancellationToken = default)
    {
        var occurrences = await _portalSessions.GetOccurrencesAsync(cancelled: false, cancellationToken: cancellationToken);
        var match = occurrences.FirstOrDefault(o => o.DocKey == docKey && o.Seq == seq);
        if (match == null)
            throw new InvalidOperationException("Calendar event not found.");

        var fullReason = string.IsNullOrWhiteSpace(notes) ? reason.Trim() : $"{reason.Trim()} — {notes.Trim()}";
        var updated = await _portalSessions.RescheduleOccurrenceAsync(
            match.Id, sessionDate, startTime, endTime, fullReason, cancellationToken);

        if (updated == null)
            return null;

        var events = await _portalSessions.GetCalendarEventsAsync(cancellationToken);
        return events.FirstOrDefault(e => e.Id == $"occ-{updated.Id}");
    }

    public async Task<ErpCalendarEventDto?> ReplaceOccurrenceByIdAsync(
        string occurrenceId,
        string sessionDate,
        string startTime,
        string endTime,
        string reason,
        string? notes,
        CancellationToken cancellationToken = default)
    {
        var fullReason = string.IsNullOrWhiteSpace(notes) ? reason.Trim() : $"{reason.Trim()} — {notes.Trim()}";
        var updated = await _portalSessions.RescheduleOccurrenceAsync(
            occurrenceId, sessionDate, startTime, endTime, fullReason, cancellationToken);

        if (updated == null)
            return null;

        var events = await _portalSessions.GetCalendarEventsAsync(cancellationToken);
        return events.FirstOrDefault(e => e.Id == $"occ-{updated.Id}");
    }

    public static bool TryParseEventId(string eventId, out int docKey, out int seq)
    {
        docKey = 0;
        seq = 0;

        if (TryParseOccurrenceId(eventId, out _))
            return false;

        if (string.IsNullOrWhiteSpace(eventId) || !eventId.StartsWith("erp-", StringComparison.OrdinalIgnoreCase))
            return false;

        var parts = eventId.Split('-');
        if (parts.Length < 3)
            return false;

        return int.TryParse(parts[^2], out docKey) && int.TryParse(parts[^1], out seq);
    }

    public static bool TryParseOccurrenceId(string eventId, out string occurrenceId)
    {
        occurrenceId = string.Empty;
        if (string.IsNullOrWhiteSpace(eventId) || !eventId.StartsWith("occ-", StringComparison.OrdinalIgnoreCase))
            return false;

        occurrenceId = eventId["occ-".Length..];
        return !string.IsNullOrWhiteSpace(occurrenceId);
    }
}
