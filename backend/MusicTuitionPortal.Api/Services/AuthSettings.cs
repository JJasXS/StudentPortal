using MusicTuitionPortal.Api.DTOs;

namespace MusicTuitionPortal.Api.Services;

public class AuthSettings
{
    public bool BypassOtp { get; set; } = true;

    /// <summary>Comma-separated parent emails allowed when SQL Account API is unavailable (testing only).</summary>
    public string DevParentEmails { get; set; } = string.Empty;

    /// <summary>Comma-separated admin emails allowed when SY_USER email lookup is unavailable (testing only).</summary>
    public string DevAdminEmails { get; set; } = string.Empty;

    /// <summary>Optional AR_CUSTOMER code for dev parent emails (email=code pairs, comma-separated).</summary>
    public string DevParentCustomerCodes { get; set; } = string.Empty;

    /// <summary>Optional branch names for dev parent emails when SQL data is unavailable (comma-separated).</summary>
    public string DevParentBranches { get; set; } = string.Empty;

    public bool IsDevParentEmail(string normalizedEmail)
    {
        if (string.IsNullOrWhiteSpace(DevParentEmails))
            return false;

        return DevParentEmails
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(e => string.Equals(e, normalizedEmail, StringComparison.OrdinalIgnoreCase));
    }

    public bool IsDevAdminEmail(string normalizedEmail)
    {
        if (string.IsNullOrWhiteSpace(DevAdminEmails))
            return false;

        return DevAdminEmails
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(e => string.Equals(e, normalizedEmail, StringComparison.OrdinalIgnoreCase));
    }

    public string? GetDevParentCustomerCode(string normalizedEmail)
    {
        if (string.IsNullOrWhiteSpace(DevParentCustomerCodes))
            return null;

        foreach (var pair in DevParentCustomerCodes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var parts = pair.Split('=', 2, StringSplitOptions.TrimEntries);
            if (parts.Length == 2 &&
                string.Equals(parts[0], normalizedEmail, StringComparison.OrdinalIgnoreCase))
            {
                return parts[1];
            }
        }

        return null;
    }

    public IReadOnlyList<SqlAccountChildDto> GetDevParentBranches()
    {
        if (string.IsNullOrWhiteSpace(DevParentBranches))
            return Array.Empty<SqlAccountChildDto>();

        return DevParentBranches
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(name => new SqlAccountChildDto(name, null, null, null))
            .ToList();
    }
}
