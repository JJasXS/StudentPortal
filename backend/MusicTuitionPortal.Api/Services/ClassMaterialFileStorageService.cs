using Microsoft.AspNetCore.Http;

namespace MusicTuitionPortal.Api.Services;

public class ClassMaterialFileStorageService
{
    public const long MaxBytes = 100 * 1024 * 1024;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp4", ".webm", ".mov",
    };

    private static readonly Dictionary<string, string> ContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".mp4"] = "video/mp4",
        [".webm"] = "video/webm",
        [".mov"] = "video/quicktime",
    };

    private readonly string _uploadRoot;

    public ClassMaterialFileStorageService(IWebHostEnvironment env, IConfiguration configuration)
    {
        var configured = configuration["ClassMaterials:UploadPath"];
        _uploadRoot = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(env.ContentRootPath, "Uploads", "class-materials")
            : configured.Trim();
        Directory.CreateDirectory(_uploadRoot);
    }

    public async Task<(string RelativePath, string OriginalFileName, string ContentType)> SaveAsync(
        string materialId,
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        if (file.Length <= 0)
            throw new InvalidOperationException("Uploaded file is empty.");

        if (file.Length > MaxBytes)
            throw new InvalidOperationException("Video exceeds the 100 MB limit.");

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
            throw new InvalidOperationException("Only MP4, WebM, and MOV videos are allowed.");

        var safeName = SanitizeFileName(Path.GetFileName(file.FileName));
        if (!safeName.EndsWith(extension, StringComparison.OrdinalIgnoreCase))
            safeName += extension.ToLowerInvariant();

        var relativePath = $"{materialId}/{safeName}".Replace('\\', '/');
        var directory = Path.Combine(_uploadRoot, materialId);
        Directory.CreateDirectory(directory);

        var destination = Path.Combine(directory, safeName);
        await using (var stream = File.Create(destination))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var contentType = ContentTypes.TryGetValue(extension, out var ct)
            ? ct
            : "application/octet-stream";
        return (relativePath, file.FileName, contentType);
    }

    public string GetFullPath(string relativePath) =>
        Path.GetFullPath(Path.Combine(_uploadRoot, relativePath.Replace('/', Path.DirectorySeparatorChar)));

    public bool TryOpenRead(string? relativePath, out FileStream? stream)
    {
        stream = null;
        if (string.IsNullOrWhiteSpace(relativePath))
            return false;

        var fullPath = GetFullPath(relativePath);
        var root = Path.GetFullPath(_uploadRoot);
        if (!fullPath.StartsWith(root, StringComparison.OrdinalIgnoreCase) || !File.Exists(fullPath))
            return false;

        stream = File.OpenRead(fullPath);
        return true;
    }

    public void TryDelete(string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
            return;

        try
        {
            var fullPath = GetFullPath(relativePath);
            var root = Path.GetFullPath(_uploadRoot);
            if (!fullPath.StartsWith(root, StringComparison.OrdinalIgnoreCase))
                return;

            if (File.Exists(fullPath))
                File.Delete(fullPath);

            var dir = Path.GetDirectoryName(fullPath);
            if (dir != null && Directory.Exists(dir) && !Directory.EnumerateFileSystemEntries(dir).Any())
                Directory.Delete(dir);
        }
        catch
        {
            // Best-effort cleanup.
        }
    }

    private static string SanitizeFileName(string fileName)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var cleaned = new string(fileName.Select(ch => invalid.Contains(ch) ? '_' : ch).ToArray()).Trim();
        return string.IsNullOrWhiteSpace(cleaned) ? "video" : cleaned;
    }
}
