namespace MusicTuitionPortal.Api.Helpers;

public static class CentreBrandingDefaults
{
    public static string CentreName(IConfiguration configuration) =>
        configuration["CentreName"]
        ?? configuration["VITE_CENTRE_NAME"]
        ?? configuration["VITE_APP_NAME"]
        ?? "Music Tuition Portal";

    public static string ApiTitle(IConfiguration configuration) =>
        configuration["VITE_APP_NAME"] ?? CentreName(configuration);
}
