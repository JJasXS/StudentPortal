using FirebirdSql.Data.FirebirdClient;
using MusicTuitionPortal.Api.DTOs;

namespace MusicTuitionPortal.Api.Services;

/// <summary>
/// Read-only fallback: load AR_CUSTOMER + AR_CUSTOMERBRANCH directly from the local .FDB
/// when the cloud SQL Account API is unavailable.
/// </summary>
public class SqlAccountLocalDbService
{
    private readonly SqlAccountSettings _settings;
    private readonly ILogger<SqlAccountLocalDbService> _logger;

    public SqlAccountLocalDbService(SqlAccountSettings settings, ILogger<SqlAccountLocalDbService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public bool CanReadLocalDb =>
        !string.IsNullOrWhiteSpace(_settings.DatabasePath) && File.Exists(_settings.DatabasePath);

    public async Task<SqlAccountCustomerMatch?> FindCustomerByUdfEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb)
            return null;

        var normalized = email.Trim();
        var parents = await GetParentChildrenAsync(cancellationToken);
        var match = parents.FirstOrDefault(p => EmailMatches(p.ParentEmail, normalized));
        return match == null ? null : ToMatch(match);
    }

    public async Task<SqlAccountCustomerMatch?> FindCustomerByCodeAsync(
        string customerCode,
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb || string.IsNullOrWhiteSpace(customerCode))
            return null;

        var parents = await GetParentChildrenAsync(cancellationToken);
        var match = parents.FirstOrDefault(p =>
            string.Equals(p.CustomerCode, customerCode.Trim(), StringComparison.OrdinalIgnoreCase));
        return match == null ? null : ToMatch(match);
    }

    public async Task<SqlAccountAdminUserMatch?> FindAdminByUdfEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb || string.IsNullOrWhiteSpace(email))
            return null;

        try
        {
            await using var connection = OpenConnection();
            await connection.OpenAsync(cancellationToken);

            const string sql = """
                SELECT CODE, NAME, UDF_EMAIL
                FROM SY_USER
                WHERE UDF_EMAIL IS NOT NULL
                  AND TRIM(UDF_EMAIL) <> ''
                  AND LOWER(TRIM(UDF_EMAIL)) = LOWER(@email)
                """;

            await using var command = new FbCommand(sql, connection);
            command.Parameters.AddWithValue("@email", email.Trim());

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                return null;

            var udfEmail = ReadString(reader, "UDF_EMAIL") ?? email.Trim();
            return new SqlAccountAdminUserMatch(
                ReadString(reader, "CODE") ?? string.Empty,
                ReadString(reader, "NAME") ?? udfEmail,
                udfEmail);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Local SQL Account SY_USER read failed for {Email}", email);
            return null;
        }
    }

    public async Task<IReadOnlyList<SqlAccountParentDto>> GetParentChildrenAsync(
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb)
            return Array.Empty<SqlAccountParentDto>();

        try
        {
            await using var connection = OpenConnection();
            await connection.OpenAsync(cancellationToken);
            return await QueryParentsAsync(connection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Local SQL Account DB parent list read failed from {Path}", _settings.DatabasePath);
            return Array.Empty<SqlAccountParentDto>();
        }
    }

    public async Task<IReadOnlyList<SqlAccountChildEnrollmentDto>> GetChildEnrollmentsAsync(
        string customerCode,
        string branchName,
        CancellationToken cancellationToken = default)
    {
        if (!CanReadLocalDb || string.IsNullOrWhiteSpace(customerCode) || string.IsNullOrWhiteSpace(branchName))
            return Array.Empty<SqlAccountChildEnrollmentDto>();

        try
        {
            await using var connection = OpenConnection();
            await connection.OpenAsync(cancellationToken);

            const string sql = """
                SELECT A.DOCNO, A.DOCDATE,
                       B.ITEMCODE, B.DESCRIPTION, B.QTY, B.UNITPRICE, B.AMOUNT, B.DELIVERYDATE
                FROM SL_SO A
                INNER JOIN SL_SODTL B ON A.DOCKEY = B.DOCKEY
                WHERE A.CODE = @code
                  AND A.BRANCHNAME = @branch
                  AND (A.CANCELLED IS NULL OR A.CANCELLED = FALSE)
                ORDER BY A.DOCDATE DESC, B.SEQ
                """;

            await using var command = new FbCommand(sql, connection);
            command.Parameters.AddWithValue("@code", customerCode.Trim());
            command.Parameters.AddWithValue("@branch", branchName.Trim());

            var results = new List<SqlAccountChildEnrollmentDto>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var description = ReadString(reader, "DESCRIPTION");
                var itemCode = ReadString(reader, "ITEMCODE");
                var className = !string.IsNullOrWhiteSpace(description) ? description : itemCode ?? "Class";

                results.Add(new SqlAccountChildEnrollmentDto(
                    ReadString(reader, "DOCNO") ?? string.Empty,
                    FormatDate(ReadValue(reader, "DOCDATE")),
                    className,
                    itemCode,
                    ReadString(reader, "QTY"),
                    ReadString(reader, "UNITPRICE"),
                    ReadString(reader, "AMOUNT"),
                    FormatDate(ReadValue(reader, "DELIVERYDATE"))));
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Local SQL Account sales order read failed for {Code} / {Branch}",
                customerCode,
                branchName);
            return Array.Empty<SqlAccountChildEnrollmentDto>();
        }
    }

    private static string? ReadValue(FbDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            if (reader.IsDBNull(ordinal))
                return null;
            return reader.GetValue(ordinal)?.ToString()?.Trim();
        }
        catch (IndexOutOfRangeException)
        {
            return null;
        }
    }

    private static string? FormatDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        if (DateTime.TryParse(value, out var dt))
            return dt.ToString("yyyy-MM-dd");
        return value;
    }

    private FbConnection OpenConnection()
    {
        var user = Environment.GetEnvironmentVariable("SqlAccount__DbUser") ?? "SYSDBA";
        var password = Environment.GetEnvironmentVariable("SqlAccount__DbPassword") ?? "masterkey";
        var builder = new FbConnectionStringBuilder
        {
            DataSource = "localhost",
            Database = _settings.DatabasePath,
            UserID = user,
            Password = password,
            Charset = "NONE",
        };
        return new FbConnection(builder.ToString());
    }

    private static async Task<List<SqlAccountParentDto>> QueryParentsAsync(
        FbConnection connection,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                A.CODE,
                A.COMPANYNAME,
                B.BRANCHTYPE,
                B.BRANCHNAME,
                B.ATTENTION,
                B.EMAIL,
                B.PHONE1
            FROM AR_CUSTOMER A
            INNER JOIN AR_CUSTOMERBRANCH B ON A.CODE = B.CODE
            WHERE B.BRANCHTYPE <> 'B'
            ORDER BY A.COMPANYNAME, B.BRANCHNAME
            """;

        await using var command = new FbCommand(sql, connection);

        var grouped = new Dictionary<string, (SqlAccountParentDto Parent, List<SqlAccountChildDto> Children)>(
            StringComparer.OrdinalIgnoreCase);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var code = ReadString(reader, "CODE") ?? string.Empty;
            if (string.IsNullOrWhiteSpace(code))
                continue;

            if (!grouped.TryGetValue(code, out var entry))
            {
                entry = (
                    new SqlAccountParentDto(
                        code,
                        ReadString(reader, "COMPANYNAME") ?? string.Empty,
                        null,
                        Array.Empty<SqlAccountChildDto>()),
                    new List<SqlAccountChildDto>());
                grouped[code] = entry;
            }

            var branchType = ReadString(reader, "BRANCHTYPE");
            var branchName = ReadString(reader, "BRANCHNAME");
            if (!SqlAccountBranchRules.IsChildBranch(branchType, branchName))
                continue;

            if (entry.Children.Any(c => string.Equals(c.BranchName, branchName, StringComparison.OrdinalIgnoreCase)))
                continue;

            entry.Children.Add(new SqlAccountChildDto(
                branchName,
                ReadString(reader, "ATTENTION"),
                ReadString(reader, "EMAIL"),
                ReadString(reader, "PHONE1")));
        }

        return grouped.Values
            .Select(pair => pair.Parent with { Children = pair.Children })
            .Where(p => p.Children.Count > 0)
            .OrderBy(p => p.ParentName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string? ReadString(FbDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal).Trim();
        }
        catch (IndexOutOfRangeException)
        {
            return null;
        }
    }

    private static bool EmailMatches(string? candidate, string normalized) =>
        !string.IsNullOrWhiteSpace(candidate) &&
        string.Equals(candidate.Trim(), normalized, StringComparison.OrdinalIgnoreCase);

    private static SqlAccountCustomerMatch ToMatch(SqlAccountParentDto parent) =>
        new(parent.CustomerCode, parent.ParentName, parent.ParentEmail, parent.Children);
}
