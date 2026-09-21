using MusicTuitionPortal.Api.DTOs;

namespace MusicTuitionPortal.Api.Services;

public class AuthSettings
{
    public bool BypassOtp { get; set; } = true;

    /// <summary>Comma-separated student emails allowed when SQL Account API is unavailable (testing only).</summary>
    public string DevStudentEmails { get; set; } = string.Empty;

    /// <summary>Legacy alias — prefer DevStudentEmails.</summary>
    public string DevParentEmails
    {
        get => DevStudentEmails;
        set => DevStudentEmails = value;
    }

    /// <summary>Comma-separated admin emails allowed when SY_USER email lookup is unavailable (testing only).</summary>
    public string DevAdminEmails { get; set; } = string.Empty;

    /// <summary>Optional AR_CUSTOMER code for dev student emails (email=code pairs, comma-separated).</summary>
    public string DevStudentCustomerCodes { get; set; } = string.Empty;

    /// <summary>Legacy alias — prefer DevStudentCustomerCodes.</summary>
    public string DevParentCustomerCodes
    {
        get => DevStudentCustomerCodes;
        set => DevStudentCustomerCodes = value;
    }

    /// <summary>Optional sole branch name for dev student when SQL data is unavailable.</summary>
    public string DevStudentBranch { get; set; } = string.Empty;

    /// <summary>Legacy alias — comma-separated; first entry used as sole branch.</summary>
    public string DevParentBranches
    {
        get => DevStudentBranch;
        set => DevStudentBranch = value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault() ?? string.Empty;
    }

    public bool IsDevStudentEmail(string normalizedEmail)
    {
        if (string.IsNullOrWhiteSpace(DevStudentEmails))
            return false;

        return DevStudentEmails
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(e => string.Equals(e, normalizedEmail, StringComparison.OrdinalIgnoreCase));
    }

    public bool IsDevParentEmail(string normalizedEmail) => IsDevStudentEmail(normalizedEmail);

    public bool IsDevAdminEmail(string normalizedEmail)
    {
        if (string.IsNullOrWhiteSpace(DevAdminEmails))
            return false;

        return DevAdminEmails
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(e => string.Equals(e, normalizedEmail, StringComparison.OrdinalIgnoreCase));
    }

    public string? GetDevStudentCustomerCode(string normalizedEmail)
    {
        if (string.IsNullOrWhiteSpace(DevStudentCustomerCodes))
            return null;

        foreach (var pair in DevStudentCustomerCodes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
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

    public string? GetDevParentCustomerCode(string normalizedEmail) =>
        GetDevStudentCustomerCode(normalizedEmail);

    public IReadOnlyList<SqlAccountChildDto> GetDevParentBranches()
    {
        if (string.IsNullOrWhiteSpace(DevStudentBranch))
            return Array.Empty<SqlAccountChildDto>();

        return new[] { new SqlAccountChildDto(DevStudentBranch.Trim(), null, null, null) };
    }
}
