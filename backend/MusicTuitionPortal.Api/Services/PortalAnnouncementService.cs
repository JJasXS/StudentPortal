using FirebirdSql.Data.FirebirdClient;
using MusicTuitionPortal.Api.DTOs;

namespace MusicTuitionPortal.Api.Services;

public class PortalAnnouncementService
{
    private readonly SqlAccountLocalDbService _localDb;
    private readonly AuditLogService _audit;

    public PortalAnnouncementService(SqlAccountLocalDbService localDb, AuditLogService audit)
    {
        _localDb = localDb;
        _audit = audit;
    }

    public async Task<List<AnnouncementDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await EnsureTableAsync(cancellationToken);
        if (!_localDb.CanReadLocalDb)
            return [];

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_ANNOUNCEMENTS", cancellationToken))
            return [];

        const string sql = """
            SELECT ID, TITLE, CONTENT, CATEGORY, HOLIDAYDATE, TARGETROLE,
                   CREATEDBYUSERID, CREATEDBYNAME, CREATEDAT
            FROM PORTAL_ANNOUNCEMENTS
            ORDER BY CREATEDAT DESC
            """;

        await using var command = new FbCommand(sql, connection);
        var results = new List<AnnouncementDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(Map(reader));
        }

        return results;
    }

    public async Task<AnnouncementDto> CreateAsync(AnnouncementDto dto, CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            throw new InvalidOperationException("Firebird database is not available.");

        await EnsureTableAsync(cancellationToken);
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            INSERT INTO PORTAL_ANNOUNCEMENTS (
                ID, TITLE, CONTENT, CATEGORY, HOLIDAYDATE, TARGETROLE,
                CREATEDBYUSERID, CREATEDBYNAME, CREATEDAT, UPDATEDAT
            ) VALUES (
                @id, @title, @content, @category, @holidayDate, @targetRole,
                @createdByUserId, @createdByName, @createdAt, @updatedAt
            )
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id.ToString());
        command.Parameters.AddWithValue("@title", dto.Title.Trim());
        command.Parameters.AddWithValue("@content", dto.Content.Trim());
        command.Parameters.AddWithValue("@category", dto.Category.Trim());
        command.Parameters.AddWithValue("@holidayDate", (object?)dto.HolidayDate?.Date ?? DBNull.Value);
        command.Parameters.AddWithValue("@targetRole", dto.TargetRole.Trim());
        command.Parameters.AddWithValue("@createdByUserId", dto.CreatedByUserId.ToString());
        command.Parameters.AddWithValue("@createdByName", (object?)dto.CreatedByName ?? DBNull.Value);
        command.Parameters.AddWithValue("@createdAt", now);
        command.Parameters.AddWithValue("@updatedAt", now);
        await command.ExecuteNonQueryAsync(cancellationToken);

        await _audit.LogAsync("announcement.created", "Announcement", id.ToString(), dto.Title);
        return dto with { Id = id, CreatedAt = now };
    }

    public async Task<AnnouncementDto?> UpdateAsync(Guid id, AnnouncementDto dto, CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            return null;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            UPDATE PORTAL_ANNOUNCEMENTS
            SET TITLE = @title, CONTENT = @content, CATEGORY = @category,
                HOLIDAYDATE = @holidayDate, TARGETROLE = @targetRole, UPDATEDAT = @updatedAt
            WHERE ID = @id
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id.ToString());
        command.Parameters.AddWithValue("@title", dto.Title.Trim());
        command.Parameters.AddWithValue("@content", dto.Content.Trim());
        command.Parameters.AddWithValue("@category", dto.Category.Trim());
        command.Parameters.AddWithValue("@holidayDate", (object?)dto.HolidayDate?.Date ?? DBNull.Value);
        command.Parameters.AddWithValue("@targetRole", dto.TargetRole.Trim());
        command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
        var updated = await command.ExecuteNonQueryAsync(cancellationToken);
        if (updated == 0)
            return null;

        await _audit.LogAsync("announcement.updated", "Announcement", id.ToString(), dto.Title);
        return (await GetAllAsync(cancellationToken)).FirstOrDefault(a => a.Id == id);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            return false;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new FbCommand("DELETE FROM PORTAL_ANNOUNCEMENTS WHERE ID = @id", connection);
        command.Parameters.AddWithValue("@id", id.ToString());
        var deleted = await command.ExecuteNonQueryAsync(cancellationToken);
        if (deleted > 0)
            await _audit.LogAsync("announcement.deleted", "Announcement", id.ToString(), id.ToString());
        return deleted > 0;
    }

    private async Task EnsureTableAsync(CancellationToken cancellationToken)
    {
        if (!_localDb.CanWriteLocalDb)
            return;
        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);
    }

    private static AnnouncementDto Map(FbDataReader reader)
    {
        var holiday = reader["HOLIDAYDATE"];
        DateTime? holidayDate = holiday is DBNull or null ? null : Convert.ToDateTime(holiday);
        var createdById = Guid.TryParse(reader["CREATEDBYUSERID"]?.ToString(), out var uid) ? uid : Guid.Empty;

        return new AnnouncementDto(
            Guid.Parse(reader["ID"]?.ToString() ?? Guid.Empty.ToString()),
            reader["TITLE"]?.ToString() ?? string.Empty,
            reader["CONTENT"]?.ToString() ?? string.Empty,
            reader["CATEGORY"]?.ToString() ?? "General",
            holidayDate,
            reader["TARGETROLE"]?.ToString() ?? "All",
            createdById,
            reader["CREATEDBYNAME"]?.ToString(),
            Convert.ToDateTime(reader["CREATEDAT"]));
    }
}
