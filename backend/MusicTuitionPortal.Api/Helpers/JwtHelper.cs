using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using MusicTuitionPortal.Api.Models;

namespace MusicTuitionPortal.Api.Helpers;

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpiryHours { get; set; } = 24;
}

public static class JwtHelper
{
    public static string GenerateToken(User user, JwtSettings settings)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: settings.Issuer,
            audience: settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(settings.ExpiryHours),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public static class PasswordHelper
{
    public static string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password);
    public static bool Verify(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);
}

public static class TimeHelper
{
    public static string FormatTime(TimeSpan time) => time.ToString(@"hh\:mm");

    /// <summary>Format SQL Account UDF_CLASSTIME: 14.5 → 14:30, 1430 → 14:30, else raw.</summary>
    public static string? FormatUdfClassTime(object? value)
    {
        if (value is null)
            return null;

        var raw = value.ToString()?.Trim();
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        if (!double.TryParse(raw, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var num))
        {
            return raw;
        }

        if (num >= 100 && num <= 2359 && Math.Abs(num - Math.Floor(num)) < 0.0001)
        {
            var intVal = (int)num;
            var hours = intVal / 100;
            var mins = intVal % 100;
            if (hours is >= 0 and < 24 && mins is >= 0 and < 60)
                return $"{hours:D2}:{mins:D2}";
        }

        if (num is >= 0 and < 24)
        {
            var hours = (int)Math.Floor(num);
            var mins = (int)Math.Round((num - hours) * 60);
            if (mins >= 60)
            {
                hours++;
                mins = 0;
            }

            if (hours < 24)
                return $"{hours:D2}:{mins:D2}";
        }

        return raw;
    }

    public static TimeSpan? ParseUdfClassTimeToTimeSpan(object? value)
    {
        if (value is null)
            return null;

        var raw = value.ToString()?.Trim();
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        if (!double.TryParse(raw, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var num))
        {
            return TimeSpan.TryParse(raw, out var parsed) ? parsed : null;
        }

        if (num >= 100 && num <= 2359 && Math.Abs(num - Math.Floor(num)) < 0.0001)
        {
            var intVal = (int)num;
            var hours = intVal / 100;
            var mins = intVal % 100;
            if (hours is >= 0 and < 24 && mins is >= 0 and < 60)
                return new TimeSpan(hours, mins, 0);
        }

        if (num is >= 0 and < 24)
        {
            var hours = (int)Math.Floor(num);
            var mins = (int)Math.Round((num - hours) * 60);
            if (mins >= 60)
            {
                hours++;
                mins = 0;
            }

            if (hours < 24)
                return new TimeSpan(hours, mins, 0);
        }

        return null;
    }
}
