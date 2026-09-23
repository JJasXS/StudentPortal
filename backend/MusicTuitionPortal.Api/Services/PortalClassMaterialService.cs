using FirebirdSql.Data.FirebirdClient;
using Microsoft.AspNetCore.Http;
using MusicTuitionPortal.Api.DTOs;

namespace MusicTuitionPortal.Api.Services;

public class PortalClassMaterialService
{
    private readonly SqlAccountLocalDbService _localDb;
    private readonly ParentService _parents;
    private readonly ClassMaterialFileStorageService _files;

    public PortalClassMaterialService(
        SqlAccountLocalDbService localDb,
        ParentService parents,
        ClassMaterialFileStorageService files)
    {
        _localDb = localDb;
        _parents = parents;
        _files = files;
    }

    public async Task<PortalClassMaterialDto> UploadAsync(
        Guid teacherUserId,
        string teacherName,
        string className,
        string title,
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            throw new InvalidOperationException("Firebird database is not available.");

        if (string.IsNullOrWhiteSpace(className))
            throw new InvalidOperationException("Class name is required.");

        if (string.IsNullOrWhiteSpace(title))
            throw new InvalidOperationException("Title is required.");

        if (file == null || file.Length <= 0)
            throw new InvalidOperationException("A video file is required.");

        var id = Guid.NewGuid().ToString();
        var (relativePath, originalName, contentType) = await _files.SaveAsync(id, file, cancellationToken);
        var now = DateTime.UtcNow;

        try
        {
            await using var connection = _localDb.OpenConnection();
            await connection.OpenAsync(cancellationToken);
            await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

            const string sql = """
                INSERT INTO PORTAL_CLASS_MATERIAL (
                    ID, CLASSNAME, TITLE, FILENAME, FILEPATH, CONTENTTYPE,
                    UPLOADEDBYUSERID, UPLOADEDBYNAME, CREATEDAT
                ) VALUES (
                    @id, @className, @title, @fileName, @filePath, @contentType,
                    @uploadedByUserId, @uploadedByName, @createdAt
                )
                """;

            await using var command = new FbCommand(sql, connection);
            command.Parameters.AddWithValue("@id", id);
            command.Parameters.AddWithValue("@className", className.Trim());
            command.Parameters.AddWithValue("@title", title.Trim());
            command.Parameters.AddWithValue("@fileName", originalName);
            command.Parameters.AddWithValue("@filePath", relativePath);
            command.Parameters.AddWithValue("@contentType", contentType);
            command.Parameters.AddWithValue("@uploadedByUserId", teacherUserId.ToString());
            command.Parameters.AddWithValue("@uploadedByName", teacherName.Trim());
            command.Parameters.AddWithValue("@createdAt", now);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        catch
        {
            _files.TryDelete(relativePath);
            throw;
        }

        return new PortalClassMaterialDto(
            id,
            className.Trim(),
            title.Trim(),
            originalName,
            contentType,
            teacherUserId,
            teacherName.Trim(),
            now);
    }

    public async Task<List<PortalClassMaterialDto>> GetForClassAsync(
        string className,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(className) || !_localDb.CanReadLocalDb)
            return [];

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_CLASS_MATERIAL", cancellationToken))
            return [];

        const string sql = """
            SELECT ID, CLASSNAME, TITLE, FILENAME, FILEPATH, CONTENTTYPE,
                   UPLOADEDBYUSERID, UPLOADEDBYNAME, CREATEDAT
            FROM PORTAL_CLASS_MATERIAL
            WHERE CLASSNAME = @className
            ORDER BY CREATEDAT DESC
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@className", className.Trim());
        return await ReadListAsync(command, cancellationToken);
    }

    public async Task<List<PortalClassMaterialDto>> GetForParentAsync(
        string email,
        string? branchName,
        CancellationToken cancellationToken = default)
    {
        var children = await _parents.GetSqlAccountChildrenForEmailAsync(email, cancellationToken);
        var branches = children.Children
            .Select(c => c.BranchName?.Trim())
            .Where(b => !string.IsNullOrWhiteSpace(b))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (branches.Count == 0)
            return [];

        if (!string.IsNullOrWhiteSpace(branchName))
        {
            var normalized = branchName.Trim();
            if (!branches.Contains(normalized))
                return [];
            branches = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { normalized };
        }

        if (!_localDb.CanReadLocalDb)
            return [];

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_CLASS_MATERIAL", cancellationToken))
            return [];

        var enrolledNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var branch in branches)
        {
            foreach (var name in await GetEnrolledClassNamesAsync(connection, branch!, cancellationToken))
                enrolledNames.Add(name);
        }

        if (enrolledNames.Count == 0)
            return [];

        var all = await GetAllAsync(connection, cancellationToken);
        return all
            .Where(m => enrolledNames.Contains(m.ClassName))
            .OrderByDescending(m => m.CreatedAt)
            .ToList();
    }

    public async Task<PortalClassMaterialDto?> GetByIdAsync(
        string id,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(id) || !_localDb.CanReadLocalDb)
            return null;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_CLASS_MATERIAL", cancellationToken))
            return null;

        const string sql = """
            SELECT ID, CLASSNAME, TITLE, FILENAME, FILEPATH, CONTENTTYPE,
                   UPLOADEDBYUSERID, UPLOADEDBYNAME, CREATEDAT
            FROM PORTAL_CLASS_MATERIAL
            WHERE ID = @id
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id.Trim());
        var list = await ReadListAsync(command, cancellationToken);
        return list.FirstOrDefault();
    }

    public async Task<(PortalClassMaterialDto Material, string FilePath)?> GetFileInfoAsync(
        string id,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(id) || !_localDb.CanReadLocalDb)
            return null;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_CLASS_MATERIAL", cancellationToken))
            return null;

        const string sql = """
            SELECT ID, CLASSNAME, TITLE, FILENAME, FILEPATH, CONTENTTYPE,
                   UPLOADEDBYUSERID, UPLOADEDBYNAME, CREATEDAT
            FROM PORTAL_CLASS_MATERIAL
            WHERE ID = @id
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id.Trim());
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        var filePath = reader["FILEPATH"]?.ToString();
        if (string.IsNullOrWhiteSpace(filePath))
            return null;

        return (Map(reader), filePath);
    }

    public async Task<bool> CanParentAccessAsync(
        string email,
        PortalClassMaterialDto material,
        CancellationToken cancellationToken = default)
    {
        var children = await _parents.GetSqlAccountChildrenForEmailAsync(email, cancellationToken);
        var branches = children.Children
            .Select(c => c.BranchName?.Trim())
            .Where(b => !string.IsNullOrWhiteSpace(b))
            .ToList();

        if (branches.Count == 0 || !_localDb.CanReadLocalDb)
            return false;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        foreach (var branch in branches)
        {
            var names = await GetEnrolledClassNamesAsync(connection, branch!, cancellationToken);
            if (names.Any(n => string.Equals(n, material.ClassName, StringComparison.OrdinalIgnoreCase)))
                return true;
        }

        return false;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            return false;

        var info = await GetFileInfoAsync(id, cancellationToken);
        if (info == null)
            return false;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new FbCommand("DELETE FROM PORTAL_CLASS_MATERIAL WHERE ID = @id", connection);
        command.Parameters.AddWithValue("@id", id.Trim());
        var deleted = await command.ExecuteNonQueryAsync(cancellationToken) > 0;
        if (deleted)
            _files.TryDelete(info.Value.FilePath);
        return deleted;
    }

    private static async Task<List<PortalClassMaterialDto>> GetAllAsync(
        FbConnection connection,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT ID, CLASSNAME, TITLE, FILENAME, FILEPATH, CONTENTTYPE,
                   UPLOADEDBYUSERID, UPLOADEDBYNAME, CREATEDAT
            FROM PORTAL_CLASS_MATERIAL
            ORDER BY CREATEDAT DESC
            """;

        await using var command = new FbCommand(sql, connection);
        return await ReadListAsync(command, cancellationToken);
    }

    private static async Task<List<string>> GetEnrolledClassNamesAsync(
        FbConnection connection,
        string branchName,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT DISTINCT COALESCE(NULLIF(TRIM(B.DESCRIPTION), ''), TRIM(B.ITEMCODE)) AS CLASSNAME
            FROM SL_SO A
            INNER JOIN SL_SODTL B ON A.DOCKEY = B.DOCKEY
            WHERE A.BRANCHNAME = @branch
              AND (A.CANCELLED IS NULL OR A.CANCELLED = FALSE)
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@branch", branchName.Trim());

        var names = new List<string>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var name = reader["CLASSNAME"]?.ToString()?.Trim();
            if (!string.IsNullOrWhiteSpace(name))
                names.Add(name);
        }

        return names;
    }

    private static async Task<List<PortalClassMaterialDto>> ReadListAsync(
        FbCommand command,
        CancellationToken cancellationToken)
    {
        var results = new List<PortalClassMaterialDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            results.Add(Map(reader));
        return results;
    }

    private static PortalClassMaterialDto Map(FbDataReader reader)
    {
        var uploadedById = Guid.TryParse(reader["UPLOADEDBYUSERID"]?.ToString(), out var uid)
            ? uid
            : Guid.Empty;
        return new PortalClassMaterialDto(
            reader["ID"]?.ToString() ?? string.Empty,
            reader["CLASSNAME"]?.ToString() ?? string.Empty,
            reader["TITLE"]?.ToString() ?? string.Empty,
            reader["FILENAME"]?.ToString() ?? string.Empty,
            ReadOptionalString(reader, "CONTENTTYPE"),
            uploadedById,
            ReadOptionalString(reader, "UPLOADEDBYNAME"),
            Convert.ToDateTime(reader["CREATEDAT"]));
    }

    private static string? ReadOptionalString(FbDataReader reader, string column)
    {
        var ordinal = reader.GetOrdinal(column);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal)?.Trim();
    }
}
