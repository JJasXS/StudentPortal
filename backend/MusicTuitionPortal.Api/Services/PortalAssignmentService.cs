using FirebirdSql.Data.FirebirdClient;
using MusicTuitionPortal.Api.DTOs;

namespace MusicTuitionPortal.Api.Services;

public class PortalAssignmentService
{
    private readonly SqlAccountLocalDbService _localDb;
    private readonly ParentService _parents;

    public PortalAssignmentService(SqlAccountLocalDbService localDb, ParentService parents)
    {
        _localDb = localDb;
        _parents = parents;
    }

    public async Task<PortalAssignmentDto> CreateAsync(
        Guid teacherUserId,
        string teacherName,
        CreatePortalAssignmentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            throw new InvalidOperationException("Firebird database is not available.");

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

        var id = Guid.NewGuid().ToString();
        var now = DateTime.UtcNow;

        const string sql = """
            INSERT INTO PORTAL_ASSIGNMENTS (
                ID, CLASSNAME, ITEMCODE, TITLE, INSTRUCTIONS, DUEDATE,
                CREATEDBYUSERID, CREATEDBYNAME, CREATEDAT
            ) VALUES (
                @id, @className, @itemCode, @title, @instructions, @dueDate,
                @createdByUserId, @createdByName, @createdAt
            )
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@className", request.ClassName.Trim());
        command.Parameters.AddWithValue("@itemCode", (object?)request.ItemCode ?? DBNull.Value);
        command.Parameters.AddWithValue("@title", request.Title.Trim());
        command.Parameters.AddWithValue("@instructions", (object?)request.Instructions ?? DBNull.Value);
        command.Parameters.AddWithValue("@dueDate", request.DueDate.Date);
        command.Parameters.AddWithValue("@createdByUserId", teacherUserId.ToString());
        command.Parameters.AddWithValue("@createdByName", teacherName.Trim());
        command.Parameters.AddWithValue("@createdAt", now);
        await command.ExecuteNonQueryAsync(cancellationToken);

        return new PortalAssignmentDto(
            id,
            request.ClassName.Trim(),
            request.ItemCode,
            request.Title.Trim(),
            request.Instructions,
            request.DueDate.Date,
            teacherUserId,
            teacherName.Trim(),
            now);
    }

    public async Task<List<PortalAssignmentDto>> GetForClassAsync(
        string className,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(className) || !_localDb.CanReadLocalDb)
            return [];

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_ASSIGNMENTS", cancellationToken))
            return [];

        const string sql = """
            SELECT ID, CLASSNAME, ITEMCODE, TITLE, INSTRUCTIONS, DUEDATE,
                   CREATEDBYUSERID, CREATEDBYNAME, CREATEDAT
            FROM PORTAL_ASSIGNMENTS
            WHERE CLASSNAME = @className
            ORDER BY DUEDATE DESC, CREATEDAT DESC
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@className", className.Trim());
        return await ReadListAsync(command, cancellationToken);
    }

    public async Task<List<PortalAssignmentDto>> GetForParentAsync(
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

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_ASSIGNMENTS", cancellationToken))
            return [];

        var results = new List<PortalAssignmentDto>();
        foreach (var branch in branches)
        {
            var classNames = await GetEnrolledClassNamesAsync(connection, branch, cancellationToken);
            if (classNames.Count == 0)
                continue;

            var submissions = await GetSubmissionsForBranchAsync(connection, branch, cancellationToken);

            foreach (var className in classNames)
            {
                const string sql = """
                    SELECT ID, CLASSNAME, ITEMCODE, TITLE, INSTRUCTIONS, DUEDATE,
                           CREATEDBYUSERID, CREATEDBYNAME, CREATEDAT
                    FROM PORTAL_ASSIGNMENTS
                    WHERE CLASSNAME = @className
                    ORDER BY DUEDATE DESC, CREATEDAT DESC
                    """;
                await using var command = new FbCommand(sql, connection);
                command.Parameters.AddWithValue("@className", className);
                var rows = await ReadListAsync(command, cancellationToken);

                foreach (var row in rows)
                {
                    var match = submissions.FirstOrDefault(s =>
                        string.Equals(s.AssignmentId, row.Id, StringComparison.OrdinalIgnoreCase));
                    var hasSubmission = !string.IsNullOrEmpty(match.Id);
                    results.Add(row with
                    {
                        HasSubmission = hasSubmission,
                        SubmissionId = hasSubmission ? match.Id : null,
                        SubmissionStatus = hasSubmission ? match.Status : null,
                    });
                }
            }
        }

        return results
            .GroupBy(a => a.Id, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .OrderByDescending(a => a.DueDate)
            .ThenByDescending(a => a.CreatedAt)
            .ToList();
    }

    public async Task<List<PortalHomeworkPendingCountDto>> GetPendingCountsForParentAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        var children = await _parents.GetSqlAccountChildrenForEmailAsync(email, cancellationToken);
        var counts = new List<PortalHomeworkPendingCountDto>();

        foreach (var child in children.Children)
        {
            var branch = child.BranchName?.Trim();
            if (string.IsNullOrWhiteSpace(branch))
                continue;

            var assignments = await GetForParentAsync(email, branch, cancellationToken);
            var pending = assignments.Count(a => !a.HasSubmission);
            if (pending > 0)
                counts.Add(new PortalHomeworkPendingCountDto(branch, pending));
        }

        return counts;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            return false;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new FbCommand("DELETE FROM PORTAL_ASSIGNMENTS WHERE ID = @id", connection);
        command.Parameters.AddWithValue("@id", id.Trim());
        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
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

    private static async Task<List<(string Id, string? AssignmentId, string Status)>> GetSubmissionsForBranchAsync(
        FbConnection connection,
        string branchName,
        CancellationToken cancellationToken)
    {
        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_HOMEWORK", cancellationToken))
            return [];

        const string sql = """
            SELECT ID, ASSIGNMENTID, STATUS
            FROM PORTAL_HOMEWORK
            WHERE BRANCHNAME = @branch AND ASSIGNMENTID IS NOT NULL
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@branch", branchName.Trim());

        var results = new List<(string Id, string? AssignmentId, string Status)>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add((
                reader["ID"]?.ToString() ?? string.Empty,
                ReadOptionalString(reader, "ASSIGNMENTID"),
                ReadOptionalString(reader, "STATUS") ?? "Pending"));
        }

        return results;
    }

    private static async Task<List<PortalAssignmentDto>> ReadListAsync(
        FbCommand command,
        CancellationToken cancellationToken)
    {
        var results = new List<PortalAssignmentDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(Map(reader));
        }

        return results;
    }

    private static PortalAssignmentDto Map(FbDataReader reader)
    {
        var createdById = Guid.TryParse(reader["CREATEDBYUSERID"]?.ToString(), out var uid) ? uid : Guid.Empty;
        return new PortalAssignmentDto(
            reader["ID"]?.ToString() ?? string.Empty,
            reader["CLASSNAME"]?.ToString() ?? string.Empty,
            ReadOptionalString(reader, "ITEMCODE"),
            reader["TITLE"]?.ToString() ?? string.Empty,
            ReadOptionalString(reader, "INSTRUCTIONS"),
            Convert.ToDateTime(reader["DUEDATE"]).Date,
            createdById,
            ReadOptionalString(reader, "CREATEDBYNAME"),
            Convert.ToDateTime(reader["CREATEDAT"]));
    }

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
