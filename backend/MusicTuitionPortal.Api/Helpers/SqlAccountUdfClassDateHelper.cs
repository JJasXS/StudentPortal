namespace MusicTuitionPortal.Api.Helpers;

/// <summary>
/// SQL Account stores Class Date / Class End Date as BCD INT64 (e.g. 202607091400 = 2026-07-09 14:00).
/// Portal uses TIMESTAMP in PORTAL_SO_LINE_SCHEDULE; these helpers convert at the SL_SODTL boundary.
/// </summary>
public static class SqlAccountUdfClassDateHelper
{
    public static long ToClassDateBcd(DateTime value) =>
        value.Year * 100000000L
        + value.Month * 1000000L
        + value.Day * 10000L
        + value.Hour * 100L
        + value.Minute;

    public static long ToClassEndDateBcd(DateTime value) =>
        value.Year * 10000L + value.Month * 100L + value.Day;

    public static decimal ToClassDateBcdDecimal(DateTime value) => ToClassDateBcd(value);

    public static decimal ToClassEndDateBcdDecimal(DateTime value) => ToClassEndDateBcd(value);

    public static DateTime? ParseClassDateBcd(object? raw)
    {
        if (raw is null or DBNull)
            return null;

        if (raw is DateTime dt)
            return dt;

        if (!TryReadBcdLong(raw, out var bcd) || bcd <= 0)
            return null;

        var digits = bcd.ToString();
        if (digits.Length >= 12)
        {
            if (int.TryParse(digits[..4], out var y)
                && int.TryParse(digits.Substring(4, 2), out var m)
                && int.TryParse(digits.Substring(6, 2), out var d)
                && int.TryParse(digits.Substring(8, 2), out var h)
                && int.TryParse(digits.Substring(10, 2), out var min))
            {
                return new DateTime(y, m, d, h, min, 0);
            }
        }

        if (digits.Length >= 8)
        {
            if (int.TryParse(digits[..4], out var y)
                && int.TryParse(digits.Substring(4, 2), out var m)
                && int.TryParse(digits.Substring(6, 2), out var d))
            {
                return new DateTime(y, m, d);
            }
        }

        return null;
    }

    public static string? FormatStoredValue(object? raw)
    {
        var parsed = ParseClassDateBcd(raw);
        return parsed?.ToString("yyyy-MM-dd HH:mm");
    }

    private static bool TryReadBcdLong(object raw, out long value)
    {
        switch (raw)
        {
            case long l:
                value = l;
                return true;
            case int i:
                value = i;
                return true;
            case decimal d:
                value = (long)d;
                return true;
            case double dbl:
                value = (long)dbl;
                return true;
            default:
                return long.TryParse(raw.ToString()?.Trim(), out value);
        }
    }
}
