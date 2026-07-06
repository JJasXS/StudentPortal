using FirebirdSql.Data.FirebirdClient;

namespace MusicTuitionPortal.Api.Helpers;

public static class FirebirdDbConfig
{
    public const string ProviderName = "Firebird";

    public static string BuildConnectionString(IConfiguration configuration)
    {
        var explicitConnection = configuration.GetConnectionString("FirebirdConnection");
        if (!string.IsNullOrWhiteSpace(explicitConnection))
            return explicitConnection.Trim();

        var databasePath = configuration["SqlAccount:DatabasePath"]
            ?? configuration["SqlAccount__DatabasePath"];
        if (string.IsNullOrWhiteSpace(databasePath))
            throw new InvalidOperationException(
                "Firebird database path is required. Set SqlAccount__DatabasePath or ConnectionStrings__FirebirdConnection in .env.");

        var user = configuration["SqlAccount:DbUser"]
            ?? Environment.GetEnvironmentVariable("SqlAccount__DbUser")
            ?? "SYSDBA";
        var password = configuration["SqlAccount:DbPassword"]
            ?? Environment.GetEnvironmentVariable("SqlAccount__DbPassword")
            ?? "masterkey";

        var builder = new FbConnectionStringBuilder
        {
            DataSource = "localhost",
            Database = databasePath.Trim(),
            UserID = user.Trim(),
            Password = password,
            Charset = "UTF8",
        };
        return builder.ConnectionString;
    }

    public static bool IsFirebirdProvider(IConfiguration configuration) =>
        string.Equals(
            configuration["DatabaseProvider"] ?? ProviderName,
            ProviderName,
            StringComparison.OrdinalIgnoreCase);
}
