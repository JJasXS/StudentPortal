using System.Text.Json;
using System.Text.Json.Serialization;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Helpers;

namespace MusicTuitionPortal.Api.Services;

public record CreateSalesOrderLineRequest(
    string ItemCode,
    string Description,
    string ClassDay,
    decimal UdfClassTime,
    string StudentName,
    string ConductedBy,
    DateTime ClassDateTime,
    DateTime DeliveryDate,
    decimal UnitPrice = 350m);

public class SqlAccountSalesOrderService
{
    private readonly SqlAccountService _sqlAccount;
    private readonly SqlAccountLocalDbService _localDb;
    private readonly ILogger<SqlAccountSalesOrderService> _logger;

    public SqlAccountSalesOrderService(
        SqlAccountService sqlAccount,
        SqlAccountLocalDbService localDb,
        ILogger<SqlAccountSalesOrderService> logger)
    {
        _sqlAccount = sqlAccount;
        _localDb = localDb;
        _logger = logger;
    }

    public bool CanCreateViaApi => _sqlAccount.IsConfigured;

    public async Task<SqlAccountChildEnrollmentDto> CreateSalesOrderAsync(
        string customerCode,
        string companyName,
        string branchName,
        CreateSalesOrderLineRequest line,
        CancellationToken cancellationToken = default)
    {
        if (!_sqlAccount.IsConfigured)
            throw new InvalidOperationException("SQL Account API is not configured.");

        var payload = new Dictionary<string, object?>
        {
            ["docdate"] = DateTime.Today.ToString("yyyy-MM-dd"),
            ["code"] = customerCode,
            ["companyname"] = companyName,
            ["branchname"] = branchName,
            ["description"] = "Sales Order",
            ["sdsdocdetail"] = new[]
            {
                new Dictionary<string, object?>
                {
                    ["seq"] = 1000,
                    ["itemcode"] = line.ItemCode,
                    ["description"] = line.Description,
                    ["qty"] = "1",
                    ["uom"] = "UNIT",
                    ["unitprice"] = line.UnitPrice.ToString("0.00"),
                    ["amount"] = line.UnitPrice.ToString("0.00"),
                    ["deliverydate"] = line.DeliveryDate.ToString("yyyy-MM-dd"),
                    ["udf_classday"] = line.ClassDay,
                    ["udf_classtime"] = line.UdfClassTime,
                    ["udf_studentname"] = line.StudentName,
                    ["udf_conductedby"] = line.ConductedBy,
                    ["udf_classdate"] = line.ClassDateTime.ToString("yyyy-MM-dd HH:mm:ss"),
                    ["udf_classenddate"] = line.DeliveryDate.ToString("yyyy-MM-dd"),
                },
            },
        };

        var json = JsonSerializer.Serialize(payload, JsonSerializerOptions);
        var responseBody = await _sqlAccount.PostResourceAsync("salesorder", json, cancellationToken);
        return ParseCreatedSalesOrder(responseBody, line);
    }

    private static readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private SqlAccountChildEnrollmentDto ParseCreatedSalesOrder(string json, CreateSalesOrderLineRequest line)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
            root = root[0];
        else if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
            root = data;

        var docKey = ParseInt(GetString(root, "dockey"));
        var docNo = GetString(root, "docno") ?? string.Empty;
        var docDate = GetString(root, "docdate") ?? DateTime.Today.ToString("yyyy-MM-dd");

        var detailLines = GetDetailLines(root).ToList();
        var detailLine = detailLines.FirstOrDefault(d =>
            string.Equals(GetString(d, "itemcode"), line.ItemCode, StringComparison.OrdinalIgnoreCase));
        if (detailLine.ValueKind == JsonValueKind.Undefined && detailLines.Count > 0)
            detailLine = detailLines[0];

        var hasDetail = detailLine.ValueKind != JsonValueKind.Undefined;
        var seq = hasDetail ? ParseInt(GetString(detailLine, "seq")) : 1000;
        if (seq == 0)
            seq = 1000;

        return new SqlAccountChildEnrollmentDto(
            docKey,
            seq,
            docNo,
            docDate,
            line.Description,
            line.ItemCode,
            hasDetail ? GetString(detailLine, "qty") ?? "1" : "1",
            hasDetail ? GetString(detailLine, "unitprice") ?? line.UnitPrice.ToString("0.00") : line.UnitPrice.ToString("0.00"),
            hasDetail ? GetString(detailLine, "amount") ?? line.UnitPrice.ToString("0.00") : line.UnitPrice.ToString("0.00"),
            line.DeliveryDate.ToString("yyyy-MM-dd"),
            line.ClassDay,
            TimeHelper.FormatUdfClassTime(line.UdfClassTime),
            line.StudentName,
            line.ConductedBy,
            line.ClassDateTime.ToString("yyyy-MM-dd HH:mm"));
    }

    public async Task<IReadOnlyList<SqlAccountChildEnrollmentDto>> GetChildEnrollmentsAsync(
        string customerCode,
        string branchName,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(customerCode) || string.IsNullOrWhiteSpace(branchName))
            return Array.Empty<SqlAccountChildEnrollmentDto>();

        var fromApi = await TryGetFromApiAsync(customerCode, branchName, cancellationToken);
        if (fromApi.Count > 0)
            return fromApi;

        return await _localDb.GetChildEnrollmentsAsync(customerCode, branchName, cancellationToken);
    }

    private async Task<List<SqlAccountChildEnrollmentDto>> TryGetFromApiAsync(
        string customerCode,
        string branchName,
        CancellationToken cancellationToken)
    {
        if (!_sqlAccount.IsConfigured)
            return [];

        try
        {
            var documents = await _sqlAccount.GetDocumentsAsync("salesorder/*", cancellationToken);
            var filtered = documents
                .Where(order =>
                    string.Equals(GetString(order, "code"), customerCode, StringComparison.OrdinalIgnoreCase)
                    && string.Equals(GetString(order, "branchname"), branchName, StringComparison.OrdinalIgnoreCase))
                .ToList();

            return ParseSalesOrders(filtered);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SQL Account API sales order fetch failed for {Code}/{Branch}", customerCode, branchName);
            return [];
        }
    }

    private static List<SqlAccountChildEnrollmentDto> ParseSalesOrders(IReadOnlyList<JsonElement> documents)
    {
        var results = new List<SqlAccountChildEnrollmentDto>();

        foreach (var order in documents)
        {
            if (IsCancelled(order))
                continue;

            var docNo = GetString(order, "docno") ?? string.Empty;
            var docDate = GetString(order, "docdate");
            var docKey = ParseInt(GetString(order, "dockey"));

            foreach (var line in GetDetailLines(order))
            {
                var description = GetString(line, "description");
                var itemCode = GetString(line, "itemcode");
                var className = !string.IsNullOrWhiteSpace(description) ? description : itemCode ?? "Class";
                var seq = ParseInt(GetString(line, "seq"));

                results.Add(new SqlAccountChildEnrollmentDto(
                    docKey,
                    seq,
                    docNo,
                    docDate,
                    className,
                    itemCode,
                    GetString(line, "qty"),
                    GetString(line, "unitprice"),
                    GetString(line, "amount"),
                    GetString(line, "deliverydate"),
                    GetString(line, "udf_classday"),
                    TimeHelper.FormatUdfClassTime(GetRawValue(line, "udf_classtime")),
                    GetString(line, "udf_studentname"),
                    GetString(line, "udf_conductedby"),
                    FormatApiDateTime(GetString(line, "udf_classdate"))));
            }
        }

        return results;
    }

    private static bool IsCancelled(JsonElement order)
    {
        if (order.TryGetProperty("cancelled", out var cancelled))
        {
            return cancelled.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.String => string.Equals(cancelled.GetString(), "T", StringComparison.OrdinalIgnoreCase),
                _ => false
            };
        }

        var legacy = GetString(order, "CANCELLED");
        return string.Equals(legacy, "T", StringComparison.OrdinalIgnoreCase);
    }

    private static IEnumerable<JsonElement> GetDetailLines(JsonElement order)
    {
        foreach (var propertyName in new[] { "sdsdocdetail", "cdsdocdetail", "sdsDocDetail", "cdsDocDetail" })
        {
            if (!order.TryGetProperty(propertyName, out var nested) || nested.ValueKind != JsonValueKind.Array)
                continue;

            foreach (var line in nested.EnumerateArray())
                yield return line;

            yield break;
        }
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

    private static object? GetRawValue(JsonElement element, string propertyName)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (!string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                continue;

            return property.Value.ValueKind switch
            {
                JsonValueKind.Null or JsonValueKind.Undefined => null,
                JsonValueKind.String => property.Value.GetString(),
                JsonValueKind.Number => property.Value.TryGetDouble(out var d) ? d : property.Value.GetRawText(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                _ => property.Value.ToString()
            };
        }

        return null;
    }

    private static int ParseInt(string? value) =>
        int.TryParse(value, out var n) ? n : 0;

    private static string? FormatApiDateTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        if (DateTime.TryParse(value, out var dt))
            return dt.ToString("yyyy-MM-dd HH:mm");
        return value;
    }
}
