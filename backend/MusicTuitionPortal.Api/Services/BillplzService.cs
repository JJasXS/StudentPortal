using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MusicTuitionPortal.Api.Services;

public class BillplzSettings
{
    public string ApiKey { get; set; } = string.Empty;
    public string CollectionId { get; set; } = string.Empty;
    public string XSignatureKey { get; set; } = string.Empty;
    public bool Sandbox { get; set; } = true;
    public string CallbackUrl { get; set; } = string.Empty;
    public string RedirectUrl { get; set; } = string.Empty;
    public string FrontendReturnUrl { get; set; } = "http://localhost:5173/parent/invoices";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ApiKey) && !string.IsNullOrWhiteSpace(CollectionId);

    public string ApiBase =>
        Sandbox ? "https://www.billplz-sandbox.com/api/v3" : "https://www.billplz.com/api/v3";
}

public record BillplzBillResult(string Id, string Url);

public record FpxBankOption(string Code, bool Active);

public class BillplzService
{
    private readonly BillplzSettings _settings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<BillplzService> _logger;

    public BillplzService(
        BillplzSettings settings,
        IHttpClientFactory httpClientFactory,
        ILogger<BillplzService> logger)
    {
        _settings = settings;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public bool IsConfigured => _settings.IsConfigured;

    public async Task<IReadOnlyList<FpxBankOption>> GetFpxBanksAsync()
    {
        EnsureConfigured();
        var client = CreateClient();
        using var response = await client.GetAsync($"{_settings.ApiBase}/fpx_banks");
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        var payload = JsonSerializer.Deserialize<FpxBanksResponse>(json, JsonOptions)
            ?? throw new InvalidOperationException("Invalid FPX banks response.");
        return payload.Banks
            .Select(b => new FpxBankOption(b.Name, b.Active))
            .ToList();
    }

    public async Task<BillplzBillResult> CreateBillAsync(
        string email,
        string name,
        string description,
        int amountSen,
        string invoiceId,
        string? fpxBankCode = null,
        string? mobile = null)
    {
        EnsureConfigured();

        var fields = new List<KeyValuePair<string, string>>
        {
            new("collection_id", _settings.CollectionId),
            new("email", email),
            new("name", name),
            new("amount", amountSen.ToString()),
            new("description", description),
            new("callback_url", _settings.CallbackUrl),
            new("redirect_url", _settings.RedirectUrl),
            new("reference_2_label", "InvoiceId"),
            new("reference_2", invoiceId),
        };

        if (!string.IsNullOrWhiteSpace(mobile))
            fields.Add(new KeyValuePair<string, string>("mobile", mobile));

        if (!string.IsNullOrWhiteSpace(fpxBankCode))
        {
            fields.Add(new KeyValuePair<string, string>("reference_1_label", "Bank Code"));
            fields.Add(new KeyValuePair<string, string>("reference_1", fpxBankCode));
        }

        var client = CreateClient();
        using var response = await client.PostAsync(
            $"{_settings.ApiBase}/bills",
            new FormUrlEncodedContent(fields));
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Billplz create bill failed ({Status}): {Body}", response.StatusCode, body);
            throw new InvalidOperationException("Billplz could not create a payment bill.");
        }

        var bill = JsonSerializer.Deserialize<BillplzBillResponse>(body, JsonOptions)
            ?? throw new InvalidOperationException("Invalid Billplz bill response.");
        if (string.IsNullOrWhiteSpace(bill.Id) || string.IsNullOrWhiteSpace(bill.Url))
            throw new InvalidOperationException("Billplz returned an incomplete bill.");

        var paymentUrl = bill.Url;
        if (!string.IsNullOrWhiteSpace(fpxBankCode))
            paymentUrl += paymentUrl.Contains('?') ? "&auto_submit=true" : "?auto_submit=true";

        return new BillplzBillResult(bill.Id, paymentUrl);
    }

    public bool VerifySignature(IReadOnlyDictionary<string, string> data, string? signature)
    {
        if (string.IsNullOrWhiteSpace(_settings.XSignatureKey))
            return true;

        if (string.IsNullOrWhiteSpace(signature))
            return false;

        var source = BuildSignatureSource(data);
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_settings.XSignatureKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(source));
        var computed = Convert.ToHexString(hash).ToLowerInvariant();
        return string.Equals(computed, signature, StringComparison.OrdinalIgnoreCase);
    }

    public static string BuildSignatureSource(IReadOnlyDictionary<string, string> data)
    {
        var elements = data
            .Where(kv => !string.Equals(kv.Key, "x_signature", StringComparison.OrdinalIgnoreCase))
            .Select(kv => $"{kv.Key}{kv.Value ?? string.Empty}")
            .OrderBy(s => s, StringComparer.OrdinalIgnoreCase);
        return string.Join('|', elements);
    }

    private HttpClient CreateClient()
    {
        var client = _httpClientFactory.CreateClient("Billplz");
        var token = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_settings.ApiKey}:"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", token);
        return client;
    }

    private void EnsureConfigured()
    {
        if (!_settings.IsConfigured)
            throw new InvalidOperationException("Billplz is not configured.");
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    private sealed class FpxBanksResponse
    {
        public List<FpxBankItem> Banks { get; set; } = [];
    }

    private sealed class FpxBankItem
    {
        public string Name { get; set; } = string.Empty;
        public bool Active { get; set; }
    }

    private sealed class BillplzBillResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("reference_1")]
        public string? Reference1 { get; set; }
    }
}
