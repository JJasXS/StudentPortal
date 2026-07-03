using System.Security.Cryptography;
using System.Text;

namespace MusicTuitionPortal.Api.Services;

internal static class AwsSigV4Signer
{
    public static void Sign(
        HttpRequestMessage request,
        string accessKey,
        string secretKey,
        string region,
        string service,
        byte[] payload)
    {
        var now = DateTime.UtcNow;
        var amzDate = now.ToString("yyyyMMdd'T'HHmmss'Z'");
        var dateStamp = now.ToString("yyyyMMdd");
        var uri = request.RequestUri ?? throw new InvalidOperationException("Request URI is required.");
        var path = string.IsNullOrEmpty(uri.AbsolutePath) ? "/" : uri.AbsolutePath;
        var query = uri.Query.TrimStart('?');
        var payloadHash = ToHex(SHA256.HashData(payload));

        var headers = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["host"] = uri.Host,
            ["x-amz-date"] = amzDate
        };

        if (request.Content?.Headers.ContentType is { } contentType)
            headers["content-type"] = contentType.ToString();

        var canonicalHeaders = string.Join("\n", headers.Select(h => $"{h.Key}:{h.Value.Trim()}")) + "\n";
        var signedHeaders = string.Join(";", headers.Keys);
        var canonicalRequest = string.Join('\n',
            request.Method.Method,
            path,
            query,
            canonicalHeaders,
            signedHeaders,
            payloadHash);

        var credentialScope = $"{dateStamp}/{region}/{service}/aws4_request";
        var stringToSign = string.Join('\n',
            "AWS4-HMAC-SHA256",
            amzDate,
            credentialScope,
            ToHex(SHA256.HashData(Encoding.UTF8.GetBytes(canonicalRequest))));

        var signingKey = GetSigningKey(secretKey, dateStamp, region, service);
        var signature = ToHex(HmacSha256(Encoding.UTF8.GetBytes(stringToSign), signingKey));
        var authHeader =
            $"AWS4-HMAC-SHA256 Credential={accessKey}/{credentialScope}, SignedHeaders={signedHeaders}, Signature={signature}";

        request.Headers.TryAddWithoutValidation("x-amz-date", amzDate);
        request.Headers.TryAddWithoutValidation("Authorization", authHeader);
    }

    private static byte[] GetSigningKey(string secretKey, string dateStamp, string region, string service)
    {
        var kDate = HmacSha256(Encoding.UTF8.GetBytes(dateStamp), Encoding.UTF8.GetBytes("AWS4" + secretKey));
        var kRegion = HmacSha256(kDate, Encoding.UTF8.GetBytes(region));
        var kService = HmacSha256(kRegion, Encoding.UTF8.GetBytes(service));
        return HmacSha256(kService, Encoding.UTF8.GetBytes("aws4_request"));
    }

    private static byte[] HmacSha256(byte[] data, byte[] key)
    {
        using var hmac = new HMACSHA256(key);
        return hmac.ComputeHash(data);
    }

    private static string ToHex(byte[] data) => Convert.ToHexString(data).ToLowerInvariant();
}
