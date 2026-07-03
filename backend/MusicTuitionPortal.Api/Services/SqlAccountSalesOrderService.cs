using System.Text.Json;
using MusicTuitionPortal.Api.DTOs;

namespace MusicTuitionPortal.Api.Services;

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
        try
        {
            var escapedCode = customerCode.Replace("'", "''", StringComparison.Ordinal);
            var escapedBranch = branchName.Replace("'", "''", StringComparison.Ordinal);
            var sql = $"""
                SELECT * FROM SL_SO
                WHERE CODE = '{escapedCode}'
                  AND BRANCHNAME = '{escapedBranch}'
                  AND (CANCELLED IS NULL OR CANCELLED = FALSE)
                ORDER BY DOCDATE DESC
                """;

            var documents = await _sqlAccount.QueryBizObjectsAsync(sql, cancellationToken);
            return ParseSalesOrders(documents);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SQL Account API sales order query failed for {Code}/{Branch}", customerCode, branchName);
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

            foreach (var line in GetDetailLines(order))
            {
                var description = GetString(line, "description");
                var itemCode = GetString(line, "itemcode");
                var className = !string.IsNullOrWhiteSpace(description) ? description : itemCode ?? "Class";

                results.Add(new SqlAccountChildEnrollmentDto(
                    docNo,
                    docDate,
                    className,
                    itemCode,
                    GetString(line, "qty"),
                    GetString(line, "unitprice"),
                    GetString(line, "amount"),
                    GetString(line, "deliverydate")));
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
}
