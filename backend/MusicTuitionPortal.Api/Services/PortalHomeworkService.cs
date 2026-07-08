using FirebirdSql.Data.FirebirdClient;
using Microsoft.AspNetCore.Http;
using MusicTuitionPortal.Api.DTOs;

namespace MusicTuitionPortal.Api.Services;

public class PortalHomeworkService
{
    private readonly SqlAccountLocalDbService _localDb;
    private readonly ParentService _parents;
    private readonly HomeworkFileStorageService _files;

    public PortalHomeworkService(
        SqlAccountLocalDbService localDb,
        ParentService parents,
        HomeworkFileStorageService files)
    {
        _localDb = localDb;
        _parents = parents;
        _files = files;
    }

    public async Task<List<PortalHomeworkDto>> GetForTeacherAsync(
        string? conductedBy,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanReadLocalDb)
            return [];

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_HOMEWORK", cancellationToken))
            return [];

        var sql = """
            SELECT H.ID, H.DOCKEY, H.SEQ, H.CUSTOMERCODE, H.BRANCHNAME, H.CLASSNAME, H.ITEMCODE,
                   H.TITLE, H.NOTE, H.FILENAME, H.FILEPATH, H.SUBMITTEDBY, H.CREATEDAT
            FROM PORTAL_HOMEWORK H
            INNER JOIN SL_SODTL B ON H.DOCKEY = B.DOCKEY AND H.SEQ = B.SEQ
            WHERE 1=1
            """;

        if (!string.IsNullOrWhiteSpace(conductedBy))
            sql += " AND B.UDF_CONDUCTEDBY = @teacher";

        sql += " ORDER BY H.CREATEDAT DESC";

        await using var command = new FbCommand(sql, connection);
        if (!string.IsNullOrWhiteSpace(conductedBy))
            command.Parameters.AddWithValue("@teacher", conductedBy.Trim());

        return await ReadHomeworkListAsync(command, cancellationToken);
    }

    public async Task<List<PortalHomeworkDto>> GetForParentAsync(
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
            if (!branches.Contains(branchName.Trim()))
                return [];
            branches = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { branchName.Trim() };
        }

        if (!_localDb.CanReadLocalDb)
            return [];

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_HOMEWORK", cancellationToken))
            return [];

        var results = new List<PortalHomeworkDto>();
        foreach (var branch in branches)
        {
            const string sql = """
                SELECT ID, DOCKEY, SEQ, CUSTOMERCODE, BRANCHNAME, CLASSNAME, ITEMCODE,
                       TITLE, NOTE, FILENAME, FILEPATH, SUBMITTEDBY, CREATEDAT
                FROM PORTAL_HOMEWORK
                WHERE BRANCHNAME = @branch
                ORDER BY CREATEDAT DESC
                """;
            await using var command = new FbCommand(sql, connection);
            command.Parameters.AddWithValue("@branch", branch);
            results.AddRange(await ReadHomeworkListAsync(command, cancellationToken));
        }

        return results.OrderByDescending(h => h.CreatedAt).ToList();
    }

    public async Task<PortalHomeworkDto> SubmitAsync(
        string email,
        CreatePortalHomeworkRequest request,
        IFormFile? file,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            throw new InvalidOperationException("Firebird database is not available.");

        var children = await _parents.GetSqlAccountChildrenForEmailAsync(email, cancellationToken);
        var branch = request.BranchName.Trim();
        if (!children.Children.Any(c => string.Equals(c.BranchName, branch, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("Child branch not found for this parent.");

        var customerCode = await _parents.GetCustomerCodeForEmailAsync(email, cancellationToken)
            ?? throw new InvalidOperationException("Customer code not found.");

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

        var className = await GetClassNameAsync(connection, request.DocKey, request.Seq, cancellationToken);
        var itemCode = await GetItemCodeAsync(connection, request.DocKey, request.Seq, cancellationToken);

        var id = Guid.NewGuid().ToString();
        var now = DateTime.UtcNow;
        string? fileName = null;
        string? filePath = null;

        if (file is { Length: > 0 })
        {
            var saved = await _files.SaveAsync(id, file, cancellationToken);
            filePath = saved.RelativePath;
            fileName = saved.OriginalFileName;
        }

        const string sql = """
            INSERT INTO PORTAL_HOMEWORK (
                ID, DOCKEY, SEQ, CUSTOMERCODE, BRANCHNAME, CLASSNAME, ITEMCODE,
                TITLE, NOTE, FILENAME, FILEPATH, SUBMITTEDBY, CREATEDAT
            ) VALUES (
                @id, @docKey, @seq, @customerCode, @branchName, @className, @itemCode,
                @title, @note, @fileName, @filePath, @submittedBy, @createdAt
            )
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@docKey", request.DocKey);
        command.Parameters.AddWithValue("@seq", request.Seq);
        command.Parameters.AddWithValue("@customerCode", customerCode);
        command.Parameters.AddWithValue("@branchName", branch);
        command.Parameters.AddWithValue("@className", (object?)className ?? DBNull.Value);
        command.Parameters.AddWithValue("@itemCode", (object?)itemCode ?? DBNull.Value);
        command.Parameters.AddWithValue("@title", (object?)request.Title ?? DBNull.Value);
        command.Parameters.AddWithValue("@note", (object?)request.Note ?? DBNull.Value);
        command.Parameters.AddWithValue("@fileName", (object?)fileName ?? DBNull.Value);
        command.Parameters.AddWithValue("@filePath", (object?)filePath ?? DBNull.Value);
        command.Parameters.AddWithValue("@submittedBy", email.Trim());
        command.Parameters.AddWithValue("@createdAt", now);
        await command.ExecuteNonQueryAsync(cancellationToken);

        return new PortalHomeworkDto(
            id, request.DocKey, request.Seq, customerCode, branch, className, itemCode,
            request.Title, request.Note, fileName, filePath, email.Trim(), now);
    }

    public async Task<PortalHomeworkDto?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanReadLocalDb)
            return null;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_HOMEWORK", cancellationToken))
            return null;

        const string sql = """
            SELECT ID, DOCKEY, SEQ, CUSTOMERCODE, BRANCHNAME, CLASSNAME, ITEMCODE,
                   TITLE, NOTE, FILENAME, FILEPATH, SUBMITTEDBY, CREATEDAT
            FROM PORTAL_HOMEWORK
            WHERE ID = @id
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id);
        var list = await ReadHomeworkListAsync(command, cancellationToken);
        return list.FirstOrDefault();
    }

    public async Task<bool> CanParentAccessAsync(string email, PortalHomeworkDto homework, CancellationToken cancellationToken = default)
    {
        if (!string.Equals(homework.SubmittedBy, email.Trim(), StringComparison.OrdinalIgnoreCase))
            return false;

        var children = await _parents.GetSqlAccountChildrenForEmailAsync(email, cancellationToken);
        return children.Children.Any(c =>
            string.Equals(c.BranchName, homework.BranchName, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<bool> CanTeacherAccessAsync(string conductedBy, PortalHomeworkDto homework, CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanReadLocalDb)
            return false;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            SELECT B.UDF_CONDUCTEDBY
            FROM SL_SODTL B
            WHERE B.DOCKEY = @docKey AND B.SEQ = @seq
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@docKey", homework.DocKey);
        command.Parameters.AddWithValue("@seq", homework.Seq);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        var teacher = result?.ToString()?.Trim();
        return !string.IsNullOrWhiteSpace(teacher)
            && string.Equals(teacher, conductedBy.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    private async Task<string?> GetClassNameAsync(FbConnection connection, int docKey, int seq, CancellationToken ct)
    {
        const string sql = "SELECT DESCRIPTION, ITEMCODE FROM SL_SODTL WHERE DOCKEY = @docKey AND SEQ = @seq";
        await using var cmd = new FbCommand(sql, connection);
        cmd.Parameters.AddWithValue("@docKey", docKey);
        cmd.Parameters.AddWithValue("@seq", seq);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
            return null;
        var desc = reader["DESCRIPTION"]?.ToString();
        return !string.IsNullOrWhiteSpace(desc) ? desc : reader["ITEMCODE"]?.ToString();
    }

    private async Task<string?> GetItemCodeAsync(FbConnection connection, int docKey, int seq, CancellationToken ct)
    {
        const string sql = "SELECT ITEMCODE FROM SL_SODTL WHERE DOCKEY = @docKey AND SEQ = @seq";
        await using var cmd = new FbCommand(sql, connection);
        cmd.Parameters.AddWithValue("@docKey", docKey);
        cmd.Parameters.AddWithValue("@seq", seq);
        var result = await cmd.ExecuteScalarAsync(ct);
        return result?.ToString();
    }

    private static async Task<List<PortalHomeworkDto>> ReadHomeworkListAsync(
        FbCommand command,
        CancellationToken cancellationToken)
    {
        var results = new List<PortalHomeworkDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(MapReader(reader));
        }

        return results;
    }

    private static PortalHomeworkDto MapReader(FbDataReader reader) =>
        new(
            reader["ID"]?.ToString() ?? string.Empty,
            Convert.ToInt32(reader["DOCKEY"]),
            Convert.ToInt32(reader["SEQ"]),
            reader["CUSTOMERCODE"]?.ToString() ?? string.Empty,
            reader["BRANCHNAME"]?.ToString() ?? string.Empty,
            reader["CLASSNAME"]?.ToString(),
            reader["ITEMCODE"]?.ToString(),
            reader["TITLE"]?.ToString(),
            reader["NOTE"]?.ToString(),
            reader["FILENAME"]?.ToString(),
            ReadOptionalString(reader, "FILEPATH"),
            reader["SUBMITTEDBY"]?.ToString() ?? string.Empty,
            Convert.ToDateTime(reader["CREATEDAT"]));

    private static string? ReadOptionalString(FbDataReader reader, string column)
    {
        try
        {
            var ordinal = reader.GetOrdinal(column);
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }
        catch (IndexOutOfRangeException)
        {
            return null;
        }
    }
}
