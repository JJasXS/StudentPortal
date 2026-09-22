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

public record SqlAccountStaffUserMatch(string UserId, string UserName, string Email, bool IsAdmin, string? Mobile = null);

public class SqlAccountService
{
    private const string CustomerResource = "customer/*";
    private const string CustomerInvoiceResource = "customerinvoice/*";
    private const string UserResource = "user/*";

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

    public async Task<SqlAccountStaffUserMatch?> FindStaffByEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
            return null;

        var normalized = email.Trim();

        var local = await _localDb.FindStaffByEmailAsync(normalized, cancellationToken);
        if (local != null)
            return local;

        // Local PORTAL.FDB is authoritative. Don't wait on the cloud user API for every login.
        if (_localDb.CanReadLocalDb || !IsConfigured)
            return null;

        try
        {
            var rows = await GetDocumentsAsync(UserResource, cancellationToken);
            return rows
                .Select(MapStaffUser)
                .FirstOrDefault(a => EmailMatches(a.Email, normalized));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SQL Account user email lookup failed for {Email}", normalized);
            return null;
        }
    }

    public async Task<IReadOnlyList<SqlAccountStaffUserMatch>> GetStaffTeachersAsync(
        CancellationToken cancellationToken = default)
    {
        var local = await _localDb.GetStaffTeachersAsync(cancellationToken);
        if (local.Count > 0)
            return local;

        if (!IsConfigured)
            return Array.Empty<SqlAccountStaffUserMatch>();

        try
        {
            var rows = await GetDocumentsAsync(UserResource, cancellationToken);
            return rows
                .Select(MapStaffUser)
                .Where(s => !s.IsAdmin)
                .OrderBy(s => s.UserName, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SQL Account user teacher list failed");
            return Array.Empty<SqlAccountStaffUserMatch>();
        }
    }

    public async Task<SqlAccountCustomerMatch?> FindCustomerByUdfEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
            return null;

        var normalized = email.Trim();

        // PORTAL.FDB branch email is the login address. Do not match AR_CUSTOMER UDF email.
        var local = await _localDb.FindCustomerByUdfEmailAsync(normalized, cancellationToken);
        if (local != null)
            return local;

        if (!IsConfigured)
            return null;

        try
        {
            return await MatchFromAllCustomersAsync(normalized, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SQL Account branch email lookup failed for {Email}", normalized);
            return null;
        }
    }

    /// <summary>Student logins from local AR_CUSTOMERBRANCH.EMAIL (non-billing branch).</summary>
    public async Task<IReadOnlyList<DevLoginOptionDto>> ListLocalStudentLoginsAsync(
        CancellationToken cancellationToken = default)
    {
        var parents = await _localDb.GetParentChildrenAsync(cancellationToken);
        return parents
            .Where(p => !string.IsNullOrWhiteSpace(p.ParentEmail))
            .GroupBy(p => p.ParentEmail!.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(g => new DevLoginOptionDto(g.First().ParentName, g.Key))
            .OrderBy(p => p.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    /// <summary>Admin and teacher logins from local SY_USER.EMAIL.</summary>
    public async Task<IReadOnlyList<DevLoginOptionDto>> ListLocalStaffLoginsAsync(
        bool admins,
        CancellationToken cancellationToken = default)
    {
        var staff = await _localDb.GetStaffUsersAsync(cancellationToken);
        return staff
            .Where(s => s.IsAdmin == admins && !string.IsNullOrWhiteSpace(s.Email))
            .GroupBy(s => s.Email.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(g =>
            {
                var first = g.First();
                var label = !admins && !string.IsNullOrWhiteSpace(first.UserId)
                    ? $"{first.UserName} ({first.UserId})"
                    : first.UserName;
                return new DevLoginOptionDto(label, g.Key);
            })
            .OrderBy(p => p.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private async Task<SqlAccountCustomerMatch?> MatchFromAllCustomersAsync(
        string normalized,
        CancellationToken cancellationToken)
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
        var page = await GetDocumentsAsync(CustomerResource, cancellationToken);
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

                var customers = await GetDocumentsAsync(CustomerResource, cancellationToken);
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

    public async Task<IReadOnlyList<SqlAccountOutstandingInvoiceDto>> GetCustomerInvoicesForCodeAsync(
        string customerCode,
        CancellationToken cancellationToken = default)
    {
        var bundle = await GetCustomerInvoiceBundleForCodeAsync(customerCode, cancellationToken);
        return bundle.Due;
    }

    public async Task<SqlAccountStudentInvoicesDto> GetCustomerInvoiceBundleForCodeAsync(
        string customerCode,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(customerCode))
            return new SqlAccountStudentInvoicesDto([], []);

        var normalizedCode = customerCode.Trim();

        var local = await _localDb.GetCustomerInvoiceBundleForCodeAsync(normalizedCode, cancellationToken);
        if (local.Due.Count > 0 || local.History.Count > 0)
            return local;

        if (!IsConfigured)
            return new SqlAccountStudentInvoicesDto([], []);

        try
        {
            var documents = await GetDocumentsAsync(CustomerInvoiceResource, cancellationToken);
            var mapped = documents
                .Where(row =>
                {
                    var code = GetString(row, "code");
                    return !string.IsNullOrWhiteSpace(code)
                        && string.Equals(code.Trim(), normalizedCode, StringComparison.OrdinalIgnoreCase);
                })
                .Select(MapCustomerInvoiceRow)
                .Where(invoice => invoice != null)
                .Select(invoice => invoice!)
                .ToList();

            var due = mapped
                .Where(i => i.Outstanding > 0)
                .OrderByDescending(i => i.DocDate, StringComparer.OrdinalIgnoreCase)
                .ThenByDescending(i => i.DocNo, StringComparer.OrdinalIgnoreCase)
                .ToList();
            var history = mapped
                .Where(i => i.Outstanding <= 0 && i.PaymentAmt > 0)
                .OrderByDescending(i => i.DocDate, StringComparer.OrdinalIgnoreCase)
                .ThenByDescending(i => i.DocNo, StringComparer.OrdinalIgnoreCase)
                .ToList();

            return new SqlAccountStudentInvoicesDto(due, history);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SQL Account customer invoice lookup failed for {Code}", normalizedCode);
            return new SqlAccountStudentInvoicesDto([], []);
        }
    }

    public async Task<List<JsonElement>> GetDocumentsAsync(
        string resource,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            return [];

        EnsureConfigured();
        var responseBody = await GetResourceAsync(resource, cancellationToken);
        return ParseDocumentElements(responseBody);
    }

    private void EnsureConfigured()
    {
        if (!_settings.IsConfigured)
            throw new InvalidOperationException(
                "SQL Account is not configured. Set SqlAccount__AccessKey and SqlAccount__SecretKey in .env.");
    }

    private async Task<string> GetResourceAsync(
        string resource,
        CancellationToken cancellationToken)
    {
        var baseUrl = _settings.ApiBaseUrl.TrimEnd('/');
        var path = resource.TrimStart('/');
        var requestUri = new Uri($"{baseUrl}/{path}");
        var payload = Array.Empty<byte>();

        var client = _httpClientFactory.CreateClient("SqlAccount");
        var attempts = new (string Region, string Service)[]
        {
            (_settings.Region, _settings.Service),
            ("ap-southeast-1", "execute-api"),
            ("ap-southeast-5", "sqlaccount"),
        };

        string? lastBody = null;
        System.Net.HttpStatusCode lastStatus = 0;

        foreach (var (region, service) in attempts.Distinct())
        {
            using var response = await SendSignedRequestAsync(
                client, HttpMethod.Get, requestUri, payload,
                _settings.AccessKey, _settings.SecretKey, region, service,
                cancellationToken);

            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            if (response.IsSuccessStatusCode)
                return responseBody;

            lastBody = responseBody;
            lastStatus = response.StatusCode;

            if ((int)response.StatusCode is not (401 or 403 or 500))
                break;
        }

        LogApiFailure("GET", resource, lastStatus, lastBody ?? string.Empty);
        throw new InvalidOperationException(BuildApiErrorMessage(lastStatus));
    }

    public async Task<string> PostResourceAsync(
        string resource,
        string jsonPayload,
        CancellationToken cancellationToken = default)
    {
        EnsureConfigured();
        var baseUrl = _settings.ApiBaseUrl.TrimEnd('/');
        var path = resource.TrimStart('/');
        var requestUri = new Uri($"{baseUrl}/{path}");
        var payload = Encoding.UTF8.GetBytes(jsonPayload);

        var client = _httpClientFactory.CreateClient("SqlAccount");
        var attempts = new (string Region, string Service)[]
        {
            (_settings.Region, _settings.Service),
            ("ap-southeast-1", "execute-api"),
            ("ap-southeast-5", "sqlaccount"),
        };

        string? lastBody = null;
        System.Net.HttpStatusCode lastStatus = 0;

        foreach (var (region, service) in attempts.Distinct())
        {
            using var response = await SendSignedRequestAsync(
                client, HttpMethod.Post, requestUri, payload,
                _settings.AccessKey, _settings.SecretKey, region, service,
                cancellationToken);

            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            if (response.IsSuccessStatusCode)
                return responseBody;

            lastBody = responseBody;
            lastStatus = response.StatusCode;

            if ((int)response.StatusCode is not (401 or 403 or 500))
                break;
        }

        LogApiFailure("POST", resource, lastStatus, lastBody ?? string.Empty);
        throw new InvalidOperationException(BuildApiErrorMessage(lastStatus));
    }

    private void LogApiFailure(string method, string resource, System.Net.HttpStatusCode statusCode, string responseBody)
    {
        var status = (int)statusCode;
        var snippet = Truncate(responseBody, 500);

        if (status is 401 or 403)
        {
            _logger.LogWarning(
                "SQL Account {Method} {Resource} auth failed ({Status}): check AccessKey and SecretKey in .env. Body: {Body}",
                method,
                resource,
                status,
                snippet);
            return;
        }

        if (status >= 500)
        {
            _logger.LogWarning(
                "SQL Account {Method} {Resource} server error ({Status}): endpoint may be wrong or cloud service unavailable. Body: {Body}",
                method,
                resource,
                status,
                snippet);
            return;
        }

        _logger.LogWarning(
            "SQL Account {Method} {Resource} failed ({Status}): {Body}",
            method,
            resource,
            status,
            snippet);
    }

    private static string BuildApiErrorMessage(System.Net.HttpStatusCode statusCode) =>
        (int)statusCode switch
        {
            401 or 403 =>
                $"SQL Account API returned {(int)statusCode} (authentication failed). Check AccessKey and SecretKey in .env.",
            >= 500 =>
                $"SQL Account API returned {(int)statusCode} (server error). Verify the endpoint path and API credentials in .env.",
            _ =>
                $"SQL Account API returned {(int)statusCode}. Check AccessKey, SecretKey, Service, and Region in .env."
        };

    private static async Task<HttpResponseMessage> SendSignedRequestAsync(
        HttpClient client,
        HttpMethod method,
        Uri requestUri,
        byte[] payload,
        string accessKey,
        string secretKey,
        string region,
        string service,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, requestUri);
        if (payload.Length > 0)
        {
            request.Content = new ByteArrayContent(payload);
            request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        }

        AwsSigV4Signer.Sign(request, accessKey, secretKey, region, service, payload);

        return await client.SendAsync(request, cancellationToken);
    }

    private static List<JsonElement> ParseDocumentElements(string json)
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

    private static SqlAccountOutstandingInvoiceDto? MapCustomerInvoiceRow(JsonElement invoice)
    {
        if (ParseBool(invoice, "cancelled"))
            return null;

        var docAmt = ParseDecimal(GetString(invoice, "docamt"));
        var paymentAmt = ParseDecimal(GetString(invoice, "paymentamt"));
        var outstanding = ParseDecimal(GetString(invoice, "outstanding"));
        if (GetString(invoice, "outstanding") is null)
            outstanding = docAmt - paymentAmt;
        if (outstanding < 0)
            outstanding = 0;

        var docKeyText = GetString(invoice, "dockey");
        if (!int.TryParse(docKeyText, out var docKey))
            return null;

        int? status = null;
        var statusText = GetString(invoice, "status");
        if (int.TryParse(statusText, out var parsedStatus))
            status = parsedStatus;

        return new SqlAccountOutstandingInvoiceDto(
            docKey,
            GetString(invoice, "docno") ?? string.Empty,
            GetString(invoice, "docdate"),
            GetString(invoice, "duedate"),
            docAmt,
            paymentAmt,
            outstanding,
            GetString(invoice, "description"),
            status);
    }

    private static SqlAccountOutstandingInvoiceDto? MapCustomerInvoice(JsonElement invoice)
    {
        var mapped = MapCustomerInvoiceRow(invoice);
        return mapped is { Outstanding: > 0 } ? mapped : null;
    }

    private static decimal ParseDecimal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return 0m;

        return decimal.TryParse(value, System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : 0m;
    }

    private static bool ParseBool(JsonElement element, string propertyName)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (!string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                continue;

            return property.Value.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Number => property.Value.TryGetInt32(out var n) && n != 0,
                JsonValueKind.String => IsTruthy(property.Value.GetString()),
                _ => false
            };
        }

        return false;
    }

    private static SqlAccountParentDto MapCustomer(JsonElement customer)
    {
        var code = GetString(customer, "code") ?? string.Empty;
        var parentName = GetString(customer, "companyname") ?? string.Empty;
        var children = ParseBranches(customer);
        var parentEmail = children
            .Select(c => c.Email)
            .FirstOrDefault(e => !string.IsNullOrWhiteSpace(e));

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

    private static SqlAccountStaffUserMatch MapStaffUser(JsonElement row)
    {
        var email = GetString(row, "email") ?? string.Empty;
        var userId = GetString(row, "code") ?? GetString(row, "userid") ?? string.Empty;
        var userName = GetString(row, "name") ?? GetString(row, "username") ?? email;
        var isAdmin = ParseIsAdmin(row);
        var mobile = GetString(row, "mobile") ?? GetString(row, "phone") ?? GetString(row, "phone1");
        return new SqlAccountStaffUserMatch(userId, userName, email, isAdmin, mobile);
    }

    private static bool ParseIsAdmin(JsonElement row)
    {
        foreach (var property in row.EnumerateObject())
        {
            if (!string.Equals(property.Name, "udf_isadmin", StringComparison.OrdinalIgnoreCase))
                continue;

            return property.Value.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Number => property.Value.TryGetInt32(out var n) && n != 0,
                JsonValueKind.String => IsTruthy(property.Value.GetString()),
                _ => false
            };
        }

        return false;
    }

    private static bool IsTruthy(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var normalized = value.Trim();
        return normalized.Equals("T", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("Y", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("1", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("TRUE", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("YES", StringComparison.OrdinalIgnoreCase);
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
