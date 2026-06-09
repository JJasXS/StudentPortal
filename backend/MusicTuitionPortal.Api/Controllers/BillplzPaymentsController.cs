using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Services;

namespace MusicTuitionPortal.Api.Controllers;

[ApiController]
[Route("api/payments/billplz")]
public class BillplzPaymentsController : ControllerBase
{
    private readonly BillplzService _billplz;
    private readonly BillplzSettings _settings;
    private readonly InvoiceService _invoices;

    public BillplzPaymentsController(
        BillplzService billplz,
        BillplzSettings settings,
        InvoiceService invoices)
    {
        _billplz = billplz;
        _settings = settings;
        _invoices = invoices;
    }

    [HttpGet("status")]
    [Authorize(Roles = "Parent,Admin")]
    public IActionResult Status() =>
        Ok(new
        {
            enabled = _billplz.IsConfigured,
            sandbox = _settings.Sandbox,
        });

    [HttpGet("fpx-banks")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> FpxBanks()
    {
        if (!_billplz.IsConfigured)
            return Ok(Array.Empty<object>());

        var banks = await _billplz.GetFpxBanksAsync();
        return Ok(banks.Select(b => new { code = b.Code, active = b.Active }));
    }

    [HttpPost("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> Callback()
    {
        var data = Request.Form.ToDictionary(
            kv => kv.Key,
            kv => kv.Value.ToString(),
            StringComparer.OrdinalIgnoreCase);

        if (!VerifyPayload(data))
            return Unauthorized();

        var billId = data.GetValueOrDefault("id");
        var paid = string.Equals(data.GetValueOrDefault("paid"), "true", StringComparison.OrdinalIgnoreCase);
        if (!string.IsNullOrWhiteSpace(billId))
            await _invoices.CompleteBillplzPaymentAsync(billId, paid);

        return Ok();
    }

    [HttpGet("redirect")]
    [AllowAnonymous]
    public async Task<IActionResult> Redirect()
    {
        var data = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var key in Request.Query.Keys)
        {
            if (!key.StartsWith("billplz[", StringComparison.OrdinalIgnoreCase) || !key.EndsWith(']'))
                continue;
            var inner = key[8..^1];
            data[inner] = Request.Query[key].ToString();
        }

        if (!VerifyPayload(data))
            return RedirectToFrontend("failed");

        var billId = data.GetValueOrDefault("id");
        var paid = string.Equals(data.GetValueOrDefault("paid"), "true", StringComparison.OrdinalIgnoreCase);
        if (!string.IsNullOrWhiteSpace(billId))
            await _invoices.CompleteBillplzPaymentAsync(billId, paid);

        return RedirectToFrontend(paid ? "success" : "failed", billId);
    }

    private bool VerifyPayload(IReadOnlyDictionary<string, string> data)
    {
        if (!_billplz.IsConfigured)
            return false;

        if (string.IsNullOrWhiteSpace(_settings.XSignatureKey))
            return true;

        var signature = data.GetValueOrDefault("x_signature");
        return _billplz.VerifySignature(data, signature);
    }

    private RedirectResult RedirectToFrontend(string result, string? billId = null)
    {
        var url = _settings.FrontendReturnUrl;
        var sep = url.Contains('?') ? '&' : '?';
        url += $"{sep}payment={result}";
        if (!string.IsNullOrWhiteSpace(billId))
            url += $"&billId={Uri.EscapeDataString(billId)}";
        return Redirect(url);
    }
}
