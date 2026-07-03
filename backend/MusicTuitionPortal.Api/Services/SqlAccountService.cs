using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using MusicTuitionPortal.Api.DTOs;

namespace MusicTuitionPortal.Api.Services;

public class SqlAccountSettings
{
    public string DatabasePath { get; set; } = string.Empty;
    public string ApiBaseUrl { get; set; } = "https://api.sql.my";
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string Service { get; set; } = "execute-api";
    public string Region { get; set; } = "ap-southeast-1";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(AccessKey) && !string.IsNullOrWhiteSpace(SecretKey);
}

public record SqlAccountCustomerMatch(
    string CustomerCode,
    string ParentName,
    string? ParentEmail,
    IReadOnlyList<SqlAccountChildDto> Children);

public record SqlAccountAdminUserMatch(string UserId, string UserName, string Email);

public class SqlAccountService
{
    private const string CustomersSql = """
        SELECT * FROM AR_CUSTOMER ORDER BY COMPANYNAME
        """;

    private const int PageSize = 500;
    private const int MaxCustomers = 5000;

    private readonly SqlAccountSettings _settings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly SqlAccountLocalDbService _localDb;
    private readonly ILogger<SqlAccountService> _logger;

    public SqlAccountService(
        SqlAccountSettings settings,
        IHttpClientFactory httpClientFactory,
        SqlAccountLocalDbService localDb,
        ILogger<SqlAccountService> logger)
    {
        _settings = settings;
        _httpClientFactory = httpClientFactory;
        _localDb = localDb;
        _logger = logger;
    }

    public bool IsConfigured => _settings.IsConfigured;

    public async Task<SqlAccountAdminUserMatch?> FindAdminByUdfEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
            return null;

        var normalized = email.Trim();

        if (IsConfigured)
        {
            try
            {
                var escaped = normalized.Replace("'", "''", StringComparison.Ordinal);
                var sql = $"""
                    SELECT * FROM SY_USER
                    WHERE udf_email = '{escaped}' OR udf_emaill = '{escaped}'
                    """;
                var rows = await QueryBizObjectsAsync(sql, cancellationToken);
                var match = rows
                    .Select(MapAdminUser)
                    .FirstOrDefault(a => EmailMatches(a.Email, normalized));
                if (match != null)
                    return match;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SQL Account SY_USER udf_email lookup failed for {Email}", normalized);
            }
        }

        return await _localDb.FindAdminByUdfEmailAsync(normalized, cancellationToken);
    }

    public async Task<SqlAccountCustomerMatch?> FindCustomerByUdfEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email) || !IsConfigured)
            return null;

        var normalized = email.Trim();

        try
        {
            var escaped = normalized.Replace("'", "''", StringComparison.Ordinal);
            var sql = $"""
                SELECT * FROM AR_CUSTOMER
                WHERE udf_email = '{escaped}' OR udf_emaill = '{escaped}'
                """;
            var match = await MatchFromQueryAsync(sql, normalized, cancellationToken);
            if (match != null)
                return match;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SQL Account udf_email WHERE lookup failed for {Email}", normalized);
        }

        var fromScan = await MatchFromAllCustomersAsync(normalized, cancellationToken);
        if (fromScan != null)
            return fromScan;

        return await _localDb.FindCustomerByUdfEmailAsync(normalized, cancellationToken);
    }

    private async Task<SqlAccountCustomerMatch?> MatchFromQueryAsync(
        string sql,
        string normalized,
        CancellationToken cancellationToken)
    {
        var customers = await QueryCustomersAsync(sql, offset: 0, limit: 10, cancellationToken);
        return customers
            .Select(MapCustomer)
            .Where(c => EmailMatches(c.ParentEmail, normalized))
            .Select(ToMatch)
            .FirstOrDefault();
    }

    private async Task<SqlAccountCustomerMatch?> MatchFromAllCustomersAsync(
        string normalized,
        CancellationToken cancellationToken)
    {
        try
        {
            var parents = await GetParentChildrenAsync(cancellationToken);
            var match = parents.FirstOrDefault(p => EmailMatches(p.ParentEmail, normalized));
            return match == null
                ? null
                : new SqlAccountCustomerMatch(
                    match.CustomerCode,
                    match.ParentName,
                    match.ParentEmail,
                    match.Children);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SQL Account udf_email scan failed for {Email}", normalized);
            return null;
        }
    }

    public async Task<SqlAccountCustomerMatch?> FindCustomerByCodeAsync(
        string customerCode,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(customerCode))
            return null;

        try
        {
            var parents = await GetParentChildrenAsync(cancellationToken);
            var match = parents.FirstOrDefault(p =>
                string.Equals(p.CustomerCode, customerCode.Trim(), StringComparison.OrdinalIgnoreCase));
            if (match != null)
                return ToMatch(match);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SQL Account customer code lookup failed for {Code}", customerCode);
        }

        return await _localDb.FindCustomerByCodeAsync(customerCode, cancellationToken);
    }

    private static bool EmailMatches(string? candidate, string normalized) =>
        !string.IsNullOrWhiteSpace(candidate) &&
        string.Equals(candidate.Trim(), normalized, StringComparison.OrdinalIgnoreCase);

    private static SqlAccountCustomerMatch ToMatch(SqlAccountParentDto c) =>
        new(c.CustomerCode, c.ParentName, c.ParentEmail, c.Children);

    public async Task<bool> TestConnectionAsync(CancellationToken cancellationToken = default)
    {
        EnsureConfigured();
        var page = await QueryCustomersAsync(offset: 0, limit: 1, cancellationToken);
        return page.Count >= 0;
    }

    public async Task<IReadOnlyList<SqlAccountParentDto>> GetParentChildrenAsync(
        CancellationToken cancellationToken = default)
    {
        if (IsConfigured)
        {
            try
            {
                EnsureConfigured();

                var customers = new List<JsonElement>();
                var offset = 0;

                while (customers.Count < MaxCustomers)
                {
                    var limit = Math.Min(PageSize, MaxCustomers - customers.Count);
                    var page = await QueryCustomersAsync(offset, limit, cancellationToken);
                    if (page.Count == 0)
                        break;

                    customers.AddRange(page);
                    if (page.Count < limit)
                        break;

                    offset += page.Count;
                }

                var fromApi = customers
                    .Select(MapCustomer)
                    .Where(p => !string.IsNullOrWhiteSpace(p.ParentName) || !string.IsNullOrWhiteSpace(p.CustomerCode))
                    .OrderBy(p => p.ParentName, StringComparer.OrdinalIgnoreCase)
                    .ToList();

                if (fromApi.Count > 0)
                    return fromApi;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SQL Account API parent list failed; trying local database");
            }
        }

        return await _localDb.GetParentChildrenAsync(cancellationToken);
    }

    public async Task<List<JsonElement>> QueryBizObjectsAsync(
        string sql,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            return [];

        try
        {
            return await QueryCustomersAsync(sql, offset: 0, limit: 500, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SQL Account biz-objects query failed");
            return [];
        }
    }

    private void EnsureConfigured()
    {
        if (!_settings.IsConfigured)
            throw new InvalidOperationException(
                "SQL Account is not configured. Set SqlAccount__AccessKey and SqlAccount__SecretKey in .env.");
    }

    private async Task<List<JsonElement>> QueryCustomersAsync(
        int offset,
        int limit,
        CancellationToken cancellationToken) =>
        await QueryCustomersAsync(CustomersSql, offset, limit, cancellationToken);

    private async Task<List<JsonElement>> QueryCustomersAsync(
        string sql,
        int offset,
        int limit,
        CancellationToken cancellationToken)
    {
        var responseBody = await PostQueryAsync(sql, offset, limit, cancellationToken);
        return ParseCustomerElements(responseBody);
    }

    private async Task<string> PostQueryAsync(
        string sql,
        int offset,
        int limit,
        CancellationToken cancellationToken)
    {
        var baseUrl = _settings.ApiBaseUrl.TrimEnd('/');
        var requestUri = new Uri($"{baseUrl}/api/biz-objects/query");
        var body = JsonSerializer.Serialize(new { sql, offset, limit });
        var payload = Encoding.UTF8.GetBytes(body);

        var client = _httpClientFactory.CreateClient("SqlAccount");
        using var response = await SendSignedQueryAsync(
            client, requestUri, payload,
            _settings.AccessKey, _settings.SecretKey, _settings.Region, _settings.Service,
            cancellationToken);

        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode &&
            (!_settings.Service.Equals("execute-api", StringComparison.OrdinalIgnoreCase) ||
             !_settings.Region.Equals("ap-southeast-1", StringComparison.OrdinalIgnoreCase)))
        {
            _logger.LogWarning(
                "SQL Account query failed ({Status}), retrying with execute-api / ap-southeast-1",
                (int)response.StatusCode);

            using var retryResponse = await SendSignedQueryAsync(
                client, requestUri, payload,
                _settings.AccessKey, _settings.SecretKey, "ap-southeast-1", "execute-api",
                cancellationToken);

            responseBody = await retryResponse.Content.ReadAsStringAsync(cancellationToken);
            if (!retryResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "SQL Account query failed ({Status}): {Body}",
                    (int)retryResponse.StatusCode,
                    Truncate(responseBody, 500));
                throw new InvalidOperationException(
                    $"SQL Account API returned {(int)retryResponse.StatusCode}. Check AccessKey, SecretKey, Service, and Region in .env.");
            }

            return responseBody;
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "SQL Account query failed ({Status}): {Body}",
                (int)response.StatusCode,
                Truncate(responseBody, 500));
            throw new InvalidOperationException(
                $"SQL Account API returned {(int)response.StatusCode}. Check AccessKey, SecretKey, Service, and Region in .env.");
        }

        return responseBody;
    }

    private static async Task<HttpResponseMessage> SendSignedQueryAsync(
        HttpClient client,
        Uri requestUri,
        byte[] payload,
        string accessKey,
        string secretKey,
        string region,
        string service,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, requestUri);
        request.Content = new ByteArrayContent(payload);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

        AwsSigV4Signer.Sign(request, accessKey, secretKey, region, service, payload);

        return await client.SendAsync(request, cancellationToken);
    }

    private static List<JsonElement> ParseCustomerElements(string json)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        if (root.ValueKind == JsonValueKind.Array)
            return root.EnumerateArray().ToList();

        foreach (var propertyName in new[] { "data", "result", "rows", "items" })
        {
            if (root.TryGetProperty(propertyName, out var nested) && nested.ValueKind == JsonValueKind.Array)
                return nested.EnumerateArray().ToList();
        }

        if (root.ValueKind == JsonValueKind.Object)
            return [root.Clone()];

        return [];
    }

    private static SqlAccountParentDto MapCustomer(JsonElement customer)
    {
        var code = GetString(customer, "code") ?? string.Empty;
        var parentName = GetString(customer, "companyname") ?? string.Empty;
        var parentEmail = GetString(customer, "udf_email") ?? GetString(customer, "udf_emaill");
        var children = ParseBranches(customer);

        return new SqlAccountParentDto(code, parentName, parentEmail, children);
    }

    private static List<SqlAccountChildDto> ParseBranches(JsonElement customer)
    {
        foreach (var branchProperty in new[] { "sdsbranch", "cdsbranch", "sdsBranch", "cdsBranch" })
        {
            if (!customer.TryGetProperty(branchProperty, out var branches))
                continue;

            if (branches.ValueKind != JsonValueKind.Array)
                continue;

            return branches.EnumerateArray()
                .Where(b => SqlAccountBranchRules.IsChildBranch(
                    GetString(b, "branchtype"),
                    GetString(b, "branchname")))
                .Select(MapBranch)
                .ToList();
        }

        return [];
    }

    private static SqlAccountChildDto MapBranch(JsonElement branch)
    {
        return new SqlAccountChildDto(
            GetString(branch, "branchname") ?? string.Empty,
            GetString(branch, "attention"),
            GetString(branch, "email"),
            GetString(branch, "phone1") ?? GetString(branch, "mobile"));
    }

    private static SqlAccountAdminUserMatch MapAdminUser(JsonElement row)
    {
        var email = GetString(row, "udf_email") ?? GetString(row, "udf_emaill") ?? string.Empty;
        var userId = GetString(row, "code") ?? GetString(row, "userid") ?? string.Empty;
        var userName = GetString(row, "name") ?? GetString(row, "username") ?? email;
        return new SqlAccountAdminUserMatch(userId, userName, email);
    }

    private static string? GetString(JsonElement element, string propertyName)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (!string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                continue;

            return property.Value.ValueKind switch
            {
                JsonValueKind.Null or JsonValueKind.Undefined => null,
                JsonValueKind.String => property.Value.GetString(),
                JsonValueKind.Number => property.Value.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                _ => property.Value.ToString()
            };
        }

        return null;
    }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength] + "...";
}
