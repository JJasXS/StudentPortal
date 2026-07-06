namespace MusicTuitionPortal.Api.Helpers;

public static class SqlAccountUdfClassDateHelper
{
    public static string? FormatStoredValue(object? raw)
    {
        if (raw is null)
            return null;

        if (raw is DateTime dt)
            return dt.ToString("yyyy-MM-dd HH:mm");

        var text = raw.ToString()?.Trim();
        if (string.IsNullOrWhiteSpace(text))
            return null;

        if (DateTime.TryParse(text, out var parsed))
            return parsed.ToString("yyyy-MM-dd HH:mm");

        return text;
    }
}
