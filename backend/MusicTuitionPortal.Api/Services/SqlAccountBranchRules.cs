namespace MusicTuitionPortal.Api.Services;

internal static class SqlAccountBranchRules
{
    public const string BillingBranchType = "B";
    public const string ChildBranchType = "D";

    public static bool IsChildBranch(string? branchType, string? branchName)
    {
        if (string.Equals(branchType, BillingBranchType, StringComparison.OrdinalIgnoreCase))
            return false;

        if (string.Equals(branchName, "BILLING", StringComparison.OrdinalIgnoreCase))
            return false;

        return !string.IsNullOrWhiteSpace(branchName);
    }
}
