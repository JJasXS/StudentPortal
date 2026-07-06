using FirebirdSql.Data.FirebirdClient;
using Microsoft.EntityFrameworkCore;
using MusicTuitionPortal.Api.Data;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Helpers;
using MusicTuitionPortal.Api.Models;

namespace MusicTuitionPortal.Api.Services;

public class PortalClassSessionService
{
    private readonly SqlAccountLocalDbService _localDb;
    private readonly AppDbContext _context;
    private readonly ClassAssignmentChangeLogService _assignmentLogs;
    private readonly ILogger<PortalClassSessionService> _logger;

    private static readonly Dictionary<string, DayOfWeek> DayMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Monday"] = DayOfWeek.Monday,
        ["Tuesday"] = DayOfWeek.Tuesday,
        ["Wednesday"] = DayOfWeek.Wednesday,
        ["Thursday"] = DayOfWeek.Thursday,
        ["Friday"] = DayOfWeek.Friday,
        ["Saturday"] = DayOfWeek.Saturday,
        ["Sunday"] = DayOfWeek.Sunday,
    };

    public PortalClassSessionService(
        SqlAccountLocalDbService localDb,
        AppDbContext context,
        ClassAssignmentChangeLogService assignmentLogs,
        ILogger<PortalClassSessionService> logger)
    {
        _localDb = localDb;
        _context = context;
        _assignmentLogs = assignmentLogs;
        _logger = logger;
    }

    public async Task SyncOccurrencesAsync(CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            return;

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

        const string sql = """
            SELECT A.CODE, A.BRANCHNAME, B.DOCKEY, B.SEQ, B.ITEMCODE, B.DESCRIPTION,
                   S.CLASSSTARTDATETIME, S.CLASSENDDATE, B.UDF_CLASSDAY, B.UDF_CLASSTIME,
                   B.UDF_STUDENTNAME, B.UDF_CONDUCTEDBY, B.DELIVERYDATE
            FROM SL_SO A
            INNER JOIN SL_SODTL B ON A.DOCKEY = B.DOCKEY
            INNER JOIN PORTAL_SO_LINE_SCHEDULE S ON S.DOCKEY = B.DOCKEY AND S.SEQ = B.SEQ
            WHERE (A.CANCELLED IS NULL OR A.CANCELLED = FALSE)
              AND B.UDF_CLASSDAY IS NOT NULL
              AND TRIM(B.UDF_CLASSDAY) <> ''
              AND S.CLASSSTARTDATETIME IS NOT NULL
            """;

        await using var command = new FbCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var descriptionCache = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        while (await reader.ReadAsync(cancellationToken))
        {
            var docKey = Convert.ToInt32(reader["DOCKEY"]);
            var seq = Convert.ToInt32(reader["SEQ"]);
            var classDay = reader["UDF_CLASSDAY"]?.ToString()?.Trim();
            if (string.IsNullOrWhiteSpace(classDay) || !DayMap.TryGetValue(classDay, out var targetDay))
                continue;

            var startDate = ReadTimestamp(reader, "CLASSSTARTDATETIME")?.Date
                ?? DateTime.UtcNow.Date;
            var endDate = ReadTimestamp(reader, "CLASSENDDATE")?.Date
                ?? ReadTimestamp(reader, "DELIVERYDATE")?.Date
                ?? startDate.AddDays(84);

            if (endDate < startDate)
                endDate = startDate.AddDays(84);

            var classTime = TimeHelper.FormatUdfClassTime(reader["UDF_CLASSTIME"]);
            var startTime = ParseTimeSpan(classTime) ?? new TimeSpan(10, 0, 0);
            var endTime = startTime.Add(TimeSpan.FromHours(1));

            var customerCode = reader["CODE"]?.ToString()?.Trim() ?? string.Empty;
            var branchName = reader["BRANCHNAME"]?.ToString()?.Trim() ?? string.Empty;
            var itemCode = reader["ITEMCODE"]?.ToString()?.Trim();
            var description = reader["DESCRIPTION"]?.ToString()?.Trim();
            var className = await ResolveClassDisplayNameAsync(
                itemCode,
                description,
                descriptionCache,
                cancellationToken);
            var studentName = reader["UDF_STUDENTNAME"]?.ToString()?.Trim();
            var conductedBy = reader["UDF_CONDUCTEDBY"]?.ToString()?.Trim();

            var first = startDate;
            while (first.DayOfWeek != targetDay && first <= endDate)
                first = first.AddDays(1);

            var index = 0;
            for (var d = first; d <= endDate; d = d.AddDays(7))
            {
                index++;
                var sessionDateTime = d.Date.Add(startTime);
                await InsertOccurrenceIfMissingAsync(
                    connection,
                    docKey,
                    seq,
                    index,
                    itemCode,
                    customerCode,
                    branchName,
                    studentName,
                    className,
                    conductedBy,
                    sessionDateTime,
                    TimeHelper.FormatTime(startTime),
                    TimeHelper.FormatTime(endTime),
                    cancellationToken);
            }
        }
    }

    public async Task<List<ErpCalendarEventDto>> GetCalendarEventsAsync(
        CancellationToken cancellationToken = default)
    {
        await SyncOccurrencesAsync(cancellationToken);
        var occurrences = await GetOccurrencesAsync(cancelled: false, cancellationToken: cancellationToken);
        var (linkByItem, classes, teacherUserIdByName) = await LoadClassContextAsync(cancellationToken);
        var itemCodes = occurrences
            .Select(o => o.ItemCode)
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c!)
            .Distinct(StringComparer.OrdinalIgnoreCase);
        var itemDescriptions = await _localDb.GetItemDescriptionsByCodeAsync(itemCodes, cancellationToken);
        return occurrences
            .Select(o => MapOccurrenceToEvent(o, linkByItem, classes, teacherUserIdByName, itemDescriptions))
            .OrderBy(e => e.SessionDate)
            .ThenBy(e => e.StartTime)
            .ToList();
    }

    public async Task<List<ErpCalendarEventDto>> GetCalendarEventsForParentAsync(
        string email,
        string? branchName,
        ParentService parentService,
        CancellationToken cancellationToken = default)
    {
        var children = await parentService.GetSqlAccountChildrenForEmailAsync(email, cancellationToken);
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

        var all = await GetCalendarEventsAsync(cancellationToken);
        return all
            .Where(e => !string.IsNullOrWhiteSpace(e.BranchName) && branches.Contains(e.BranchName.Trim()))
            .ToList();
    }

    public async Task<List<PortalClassSessionDto>> GetOccurrencesAsync(
        string? customerCode = null,
        string? branchName = null,
        string? conductedBy = null,
        DateTime? from = null,
        DateTime? to = null,
        bool? cancelled = null,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanReadLocalDb)
            return [];

        await SyncOccurrencesAsync(cancellationToken);

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        if (!await PortalFirebirdSchema.TableExistsAsync(connection, "PORTAL_CLASS_SESSIONS", cancellationToken))
            return [];

        var sql = """
            SELECT ID, DOCKEY, SEQ, ITEMCODE, CUSTOMERCODE, BRANCHNAME, STUDENTNAME, CLASSNAME,
                   CONDUCTEDBY, OCCURRENCEINDEX, SESSIONDATE, STARTTIME, ENDTIME, STATUS, REASON
            FROM PORTAL_CLASS_SESSIONS
            WHERE 1=1
            """;

        if (!string.IsNullOrWhiteSpace(customerCode))
            sql += " AND CUSTOMERCODE = @customerCode";
        if (!string.IsNullOrWhiteSpace(branchName))
            sql += " AND BRANCHNAME = @branchName";
        if (!string.IsNullOrWhiteSpace(conductedBy))
            sql += " AND CONDUCTEDBY = @conductedBy";
        if (from.HasValue)
            sql += " AND SESSIONDATE >= @fromDate";
        if (to.HasValue)
            sql += " AND SESSIONDATE <= @toDate";
        if (cancelled == false)
            sql += " AND STATUS <> 'Cancelled'";
        else if (cancelled == true)
            sql += " AND STATUS = 'Cancelled'";

        sql += " ORDER BY SESSIONDATE, DOCKEY, SEQ, OCCURRENCEINDEX";

        await using var command = new FbCommand(sql, connection);
        if (!string.IsNullOrWhiteSpace(customerCode))
            command.Parameters.AddWithValue("@customerCode", customerCode.Trim());
        if (!string.IsNullOrWhiteSpace(branchName))
            command.Parameters.AddWithValue("@branchName", branchName.Trim());
        if (!string.IsNullOrWhiteSpace(conductedBy))
            command.Parameters.AddWithValue("@conductedBy", conductedBy.Trim());
        if (from.HasValue)
            command.Parameters.AddWithValue("@fromDate", from.Value);
        if (to.HasValue)
            command.Parameters.AddWithValue("@toDate", to.Value);

        var results = new List<PortalClassSessionDto>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(MapOccurrence(reader));
        }

        return results;
    }

    public async Task<PortalClassSessionDto?> GetOccurrenceByIdAsync(
        string id,
        CancellationToken cancellationToken = default)
    {
        var list = await GetOccurrencesAsync(cancellationToken: cancellationToken);
        return list.FirstOrDefault(o => string.Equals(o.Id, id, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<bool> CancelOccurrenceAsync(
        string id,
        string reason,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            throw new InvalidOperationException("Firebird database is not available.");

        var before = await GetOccurrenceByIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException("Session occurrence not found.");

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            UPDATE PORTAL_CLASS_SESSIONS
            SET STATUS = 'Cancelled', REASON = @reason, UPDATEDAT = @updatedAt
            WHERE ID = @id
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@reason", reason.Trim());
        command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
        var updated = await command.ExecuteNonQueryAsync(cancellationToken);
        if (updated == 0)
            return false;

        await LogOccurrenceChangeAsync(before, "Cancelled", reason, null, null, null, cancellationToken);
        return true;
    }

    public async Task<PortalClassSessionDto?> RescheduleOccurrenceAsync(
        string id,
        string sessionDate,
        string startTime,
        string endTime,
        string reason,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            throw new InvalidOperationException("Firebird database is not available.");

        var before = await GetOccurrenceByIdAsync(id, cancellationToken)
            ?? throw new InvalidOperationException("Session occurrence not found.");

        if (!DateTime.TryParse($"{sessionDate.Trim()} {startTime.Trim()}", out var newDateTime))
            throw new InvalidOperationException("Invalid session date or start time.");

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);

        const string sql = """
            UPDATE PORTAL_CLASS_SESSIONS
            SET SESSIONDATE = @sessionDate, STARTTIME = @startTime, ENDTIME = @endTime,
                STATUS = 'Rescheduled', REASON = @reason, UPDATEDAT = @updatedAt
            WHERE ID = @id
            """;

        await using var command = new FbCommand(sql, connection);
        command.Parameters.AddWithValue("@id", id);
        command.Parameters.AddWithValue("@sessionDate", newDateTime);
        command.Parameters.AddWithValue("@startTime", startTime.Trim());
        command.Parameters.AddWithValue("@endTime", endTime.Trim());
        command.Parameters.AddWithValue("@reason", reason.Trim());
        command.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
        await command.ExecuteNonQueryAsync(cancellationToken);

        await LogOccurrenceChangeAsync(
            before,
            "Rescheduled",
            reason,
            newDateTime,
            ParseTimeSpan(startTime),
            ParseTimeSpan(endTime),
            cancellationToken);

        return await GetOccurrenceByIdAsync(id, cancellationToken);
    }

    private async Task LogOccurrenceChangeAsync(
        PortalClassSessionDto before,
        string newStatus,
        string reason,
        DateTime? newDateTime,
        TimeSpan? newStart,
        TimeSpan? newEnd,
        CancellationToken cancellationToken)
    {
        var (linkByItem, _, _) = await LoadClassContextAsync(cancellationToken);
        Guid? classId = null;
        string className = before.ClassName;
        if (!string.IsNullOrWhiteSpace(before.ItemCode)
            && linkByItem.TryGetValue(before.ItemCode.Trim(), out var link))
        {
            classId = link.PortalClassId;
        }

        var prevDate = DateTime.TryParse(before.SessionDate, out var pd) ? pd : (DateTime?)null;
        await _assignmentLogs.RecordCalendarEventChangedAsync(
            classId,
            className,
            before.StudentName,
            before.ItemCode,
            before.BranchName,
            newStatus == "Cancelled" ? ClassAssignmentOperations.Delete : ClassAssignmentOperations.Update,
            prevDate,
            ParseTimeSpan(before.StartTime),
            ParseTimeSpan(before.EndTime),
            newDateTime,
            newStart,
            newEnd,
            reason,
            cancellationToken);
    }

    private ErpCalendarEventDto MapOccurrenceToEvent(
        PortalClassSessionDto o,
        Dictionary<string, ItemCodeClassLink> linkByItem,
        List<MusicClass> classes,
        Dictionary<string, Guid> teacherUserIdByName,
        IReadOnlyDictionary<string, string> itemDescriptions)
    {
        MusicClass? portalClass = null;
        if (!string.IsNullOrWhiteSpace(o.ItemCode)
            && linkByItem.TryGetValue(o.ItemCode.Trim(), out var link))
        {
            portalClass = link.PortalClass;
        }

        var displayClassName = o.ClassName;
        if (!string.IsNullOrWhiteSpace(o.ItemCode)
            && itemDescriptions.TryGetValue(o.ItemCode.Trim(), out var stDesc)
            && !string.IsNullOrWhiteSpace(stDesc))
        {
            displayClassName = stDesc;
        }

        var conductorName = !string.IsNullOrWhiteSpace(o.ConductedBy)
            ? o.ConductedBy.Trim()
            : portalClass?.TeacherUser?.FullName;

        Guid? teacherUserId = null;
        if (!string.IsNullOrWhiteSpace(conductorName)
            && teacherUserIdByName.TryGetValue(conductorName, out var matchedId))
        {
            teacherUserId = matchedId;
        }
        else
        {
            teacherUserId = portalClass?.TeacherUserId;
        }

        return new ErpCalendarEventDto(
            $"occ-{o.Id}",
            o.DocKey,
            o.Seq,
            portalClass?.Id,
            portalClass?.CourseId,
            displayClassName,
            portalClass?.Course?.CourseName,
            teacherUserId,
            conductorName,
            o.StudentName,
            o.BranchName,
            o.ItemCode,
            o.CustomerCode,
            o.SessionDate,
            o.StartTime,
            o.EndTime,
            o.Status);
    }

    private async Task<(Dictionary<string, ItemCodeClassLink> LinkByItem, List<MusicClass> Classes, Dictionary<string, Guid> TeacherUserIdByName)> LoadClassContextAsync(
        CancellationToken cancellationToken)
    {
        var links = await _context.ItemCodeClassLinks
            .AsNoTracking()
            .Include(l => l.PortalClass)
            .ThenInclude(c => c.Course)
            .Include(l => l.PortalClass)
            .ThenInclude(c => c.TeacherUser)
            .ToListAsync(cancellationToken);

        var linkByItem = links.ToDictionary(l => l.ItemCode, l => l, StringComparer.OrdinalIgnoreCase);
        var classes = await _context.Classes
            .AsNoTracking()
            .Include(c => c.Course)
            .Include(c => c.TeacherUser)
            .Where(c => c.IsActive)
            .ToListAsync(cancellationToken);

        var teacherUserIdByName = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role == Roles.Teacher && u.IsActive)
            .ToDictionaryAsync(u => u.FullName.Trim(), u => u.Id, StringComparer.OrdinalIgnoreCase, cancellationToken);

        var erpTeachers = await _localDb.GetStaffTeachersAsync(cancellationToken);
        var portalByEmail = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role == Roles.Teacher && u.IsActive)
            .ToDictionaryAsync(u => u.Email.Trim().ToLowerInvariant(), u => u.Id, cancellationToken);

        foreach (var erp in erpTeachers)
        {
            if (string.IsNullOrWhiteSpace(erp.UserName))
                continue;
            if (portalByEmail.TryGetValue(erp.Email.Trim().ToLowerInvariant(), out var portalUserId))
                teacherUserIdByName[erp.UserName.Trim()] = portalUserId;
        }

        return (linkByItem, classes, teacherUserIdByName);
    }

    private static async Task InsertOccurrenceIfMissingAsync(
        FbConnection connection,
        int docKey,
        int seq,
        int occurrenceIndex,
        string? itemCode,
        string customerCode,
        string branchName,
        string? studentName,
        string className,
        string? conductedBy,
        DateTime sessionDateTime,
        string startTime,
        string endTime,
        CancellationToken cancellationToken)
    {
        const string existsSql = """
            SELECT ID FROM PORTAL_CLASS_SESSIONS
            WHERE DOCKEY = @docKey AND SEQ = @seq AND OCCURRENCEINDEX = @index
            """;
        await using var existsCmd = new FbCommand(existsSql, connection);
        existsCmd.Parameters.AddWithValue("@docKey", docKey);
        existsCmd.Parameters.AddWithValue("@seq", seq);
        existsCmd.Parameters.AddWithValue("@index", occurrenceIndex);
        var existing = await existsCmd.ExecuteScalarAsync(cancellationToken);
        if (existing != null)
        {
            const string updateSql = """
                UPDATE PORTAL_CLASS_SESSIONS
                SET CONDUCTEDBY = @conductedBy, CLASSNAME = @className, STUDENTNAME = @studentName,
                    UPDATEDAT = @updatedAt
                WHERE DOCKEY = @docKey AND SEQ = @seq AND OCCURRENCEINDEX = @index
                """;
            await using var updateCmd = new FbCommand(updateSql, connection);
            updateCmd.Parameters.AddWithValue("@conductedBy", (object?)conductedBy ?? DBNull.Value);
            updateCmd.Parameters.AddWithValue("@className", className);
            updateCmd.Parameters.AddWithValue("@studentName", (object?)studentName ?? DBNull.Value);
            updateCmd.Parameters.AddWithValue("@updatedAt", DateTime.UtcNow);
            updateCmd.Parameters.AddWithValue("@docKey", docKey);
            updateCmd.Parameters.AddWithValue("@seq", seq);
            updateCmd.Parameters.AddWithValue("@index", occurrenceIndex);
            await updateCmd.ExecuteNonQueryAsync(cancellationToken);
            return;
        }

        var id = Guid.NewGuid().ToString();
        var now = DateTime.UtcNow;
        const string insertSql = """
            INSERT INTO PORTAL_CLASS_SESSIONS (
                ID, DOCKEY, SEQ, ITEMCODE, CUSTOMERCODE, BRANCHNAME, STUDENTNAME, CLASSNAME,
                CONDUCTEDBY, OCCURRENCEINDEX, SESSIONDATE, STARTTIME, ENDTIME, STATUS,
                ORIGINALDATE, CREATEDAT, UPDATEDAT
            ) VALUES (
                @id, @docKey, @seq, @itemCode, @customerCode, @branchName, @studentName, @className,
                @conductedBy, @index, @sessionDate, @startTime, @endTime, 'Scheduled',
                @originalDate, @createdAt, @updatedAt
            )
            """;

        await using var insertCmd = new FbCommand(insertSql, connection);
        insertCmd.Parameters.AddWithValue("@id", id);
        insertCmd.Parameters.AddWithValue("@docKey", docKey);
        insertCmd.Parameters.AddWithValue("@seq", seq);
        insertCmd.Parameters.AddWithValue("@itemCode", (object?)itemCode ?? DBNull.Value);
        insertCmd.Parameters.AddWithValue("@customerCode", customerCode);
        insertCmd.Parameters.AddWithValue("@branchName", branchName);
        insertCmd.Parameters.AddWithValue("@studentName", (object?)studentName ?? DBNull.Value);
        insertCmd.Parameters.AddWithValue("@className", className);
        insertCmd.Parameters.AddWithValue("@conductedBy", (object?)conductedBy ?? DBNull.Value);
        insertCmd.Parameters.AddWithValue("@index", occurrenceIndex);
        insertCmd.Parameters.AddWithValue("@sessionDate", sessionDateTime);
        insertCmd.Parameters.AddWithValue("@startTime", startTime);
        insertCmd.Parameters.AddWithValue("@endTime", endTime);
        insertCmd.Parameters.AddWithValue("@originalDate", sessionDateTime);
        insertCmd.Parameters.AddWithValue("@createdAt", now);
        insertCmd.Parameters.AddWithValue("@updatedAt", now);
        await insertCmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static PortalClassSessionDto MapOccurrence(FbDataReader reader) =>
        new(
            reader["ID"]?.ToString() ?? string.Empty,
            Convert.ToInt32(reader["DOCKEY"]),
            Convert.ToInt32(reader["SEQ"]),
            reader["ITEMCODE"]?.ToString(),
            reader["CUSTOMERCODE"]?.ToString() ?? string.Empty,
            reader["BRANCHNAME"]?.ToString() ?? string.Empty,
            reader["STUDENTNAME"]?.ToString(),
            reader["CLASSNAME"]?.ToString() ?? "Class",
            reader["CONDUCTEDBY"]?.ToString(),
            Convert.ToInt32(reader["OCCURRENCEINDEX"]),
            FormatDateTime(reader["SESSIONDATE"]),
            reader["STARTTIME"]?.ToString() ?? "10:00",
            reader["ENDTIME"]?.ToString() ?? "11:00",
            reader["STATUS"]?.ToString() ?? "Scheduled",
            reader["REASON"]?.ToString());

    private static DateTime? ReadTimestamp(FbDataReader reader, string column)
    {
        var value = reader[column];
        if (value is DBNull or null)
            return null;
        return Convert.ToDateTime(value);
    }

    private static string FormatDateTime(object? value)
    {
        if (value is DBNull or null)
            return DateTime.UtcNow.ToString("yyyy-MM-dd");
        return Convert.ToDateTime(value).ToString("yyyy-MM-dd");
    }

    private static TimeSpan? ParseTimeSpan(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : TimeSpan.TryParse(value, out var parsed) ? parsed : null;

    private async Task<string> ResolveClassDisplayNameAsync(
        string? itemCode,
        string? sodtlDescription,
        Dictionary<string, string> cache,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(itemCode))
        {
            var code = itemCode.Trim();
            if (!cache.TryGetValue(code, out var cached))
            {
                var descriptions = await _localDb.GetItemDescriptionsByCodeAsync([code], cancellationToken);
                cached = descriptions.TryGetValue(code, out var stDesc) && !string.IsNullOrWhiteSpace(stDesc)
                    ? stDesc
                    : !string.IsNullOrWhiteSpace(sodtlDescription)
                        ? sodtlDescription
                        : code;
                cache[code] = cached;
            }

            return cached;
        }

        return !string.IsNullOrWhiteSpace(sodtlDescription) ? sodtlDescription : "Class";
    }
}
