using Microsoft.AspNetCore.Http;

namespace MusicTuitionPortal.Api.Services;

public class HomeworkFileStorageService
{
    public const long MaxBytes = 10 * 1024 * 1024;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".doc", ".docx", ".txt", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".zip", ".mp3", ".mp4",
    };

    private readonly string _uploadRoot;

    public HomeworkFileStorageService(IWebHostEnvironment env, IConfiguration configuration)
    {
        var configured = configuration["Homework:UploadPath"];
        _uploadRoot = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(env.ContentRootPath, "Uploads", "homework")
            : configured.Trim();
        Directory.CreateDirectory(_uploadRoot);
    }

    public async Task<(string RelativePath, string OriginalFileName)> SaveAsync(
        string submissionId,
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        if (file.Length <= 0)
            throw new InvalidOperationException("Uploaded file is empty.");

        if (file.Length > MaxBytes)
            throw new InvalidOperationException("File exceeds the 10 MB limit.");

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
            throw new InvalidOperationException("File type is not allowed.");

        var safeName = SanitizeFileName(Path.GetFileName(file.FileName));
        var relativePath = $"{submissionId}/{safeName}".Replace('\\', '/');
        var directory = Path.Combine(_uploadRoot, submissionId);
        Directory.CreateDirectory(directory);

        var destination = Path.Combine(directory, safeName);
        await using (var stream = File.Create(destination))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return (relativePath, file.FileName);
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

    private static string SanitizeFileName(string fileName)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var cleaned = new string(fileName.Select(ch => invalid.Contains(ch) ? '_' : ch).ToArray()).Trim();
        return string.IsNullOrWhiteSpace(cleaned) ? "attachment" : cleaned;
    }
}
