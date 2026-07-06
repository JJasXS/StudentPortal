using FirebirdSql.Data.FirebirdClient;
using Microsoft.EntityFrameworkCore;
using MusicTuitionPortal.Api.Data;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Helpers;
using MusicTuitionPortal.Api.Models;

namespace MusicTuitionPortal.Api.Services;

public class SqlAccountChildEnrollmentWriteService
{
    private readonly SqlAccountLocalDbService _localDb;
    private readonly SqlAccountSalesOrderService _salesOrders;
    private readonly PortalSoLineScheduleService _schedules;
    private readonly AppDbContext _context;
    private readonly PortalClassSessionService _portalSessions;
    private readonly ILogger<SqlAccountChildEnrollmentWriteService> _logger;

    public SqlAccountChildEnrollmentWriteService(
        SqlAccountLocalDbService localDb,
        SqlAccountSalesOrderService salesOrders,
        PortalSoLineScheduleService schedules,
        AppDbContext context,
        PortalClassSessionService portalSessions,
        ILogger<SqlAccountChildEnrollmentWriteService> logger)
    {
        _localDb = localDb;
        _salesOrders = salesOrders;
        _schedules = schedules;
        _context = context;
        _portalSessions = portalSessions;
        _logger = logger;
    }

    public async Task<SqlAccountChildEnrollmentDto> UpdateEnrollmentScheduleAsync(
        int docKey,
        int seq,
        UpdateSqlAccountEnrollmentScheduleRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            throw new InvalidOperationException("SQL Account database is not available for writes.");

        var customerCode = request.CustomerCode.Trim();
        var branchName = request.BranchName.Trim();

        if (!DateTime.TryParse(request.StartDate, out var startDate))
            throw new InvalidOperationException("Invalid start date.");
        if (!DateTime.TryParse(request.EndDate, out var endDate))
            throw new InvalidOperationException("Invalid end date.");
        startDate = startDate.Date;
        endDate = endDate.Date;
        if (endDate < startDate)
            throw new InvalidOperationException("End date must be on or after start date.");

        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

        const string lineSql = """
            SELECT B.UDF_CLASSTIME
            FROM SL_SO A
            INNER JOIN SL_SODTL B ON A.DOCKEY = B.DOCKEY
            WHERE B.DOCKEY = @docKey
              AND B.SEQ = @seq
              AND A.CODE = @code
              AND A.BRANCHNAME = @branch
              AND (A.CANCELLED IS NULL OR A.CANCELLED = FALSE)
            """;

        object? udfClassTime;
        await using (var lineCmd = new FbCommand(lineSql, connection))
        {
            lineCmd.Parameters.AddWithValue("@docKey", docKey);
            lineCmd.Parameters.AddWithValue("@seq", seq);
            lineCmd.Parameters.AddWithValue("@code", customerCode);
            lineCmd.Parameters.AddWithValue("@branch", branchName);
            udfClassTime = await lineCmd.ExecuteScalarAsync(cancellationToken);
            if (udfClassTime is null or DBNull)
                throw new InvalidOperationException("Sales order line not found for this child.");
        }

        var startTime = TimeHelper.ParseUdfClassTimeToTimeSpan(udfClassTime) ?? new TimeSpan(10, 0, 0);
        var classDateTime = startDate.Add(startTime);

        const string updateDtlSql = """
            UPDATE SL_SODTL SET DELIVERYDATE = @endDate
            WHERE DOCKEY = @docKey AND SEQ = @seq
            """;
        await using (var updateDtl = new FbCommand(updateDtlSql, connection))
        {
            updateDtl.Parameters.AddWithValue("@docKey", docKey);
            updateDtl.Parameters.AddWithValue("@seq", seq);
            updateDtl.Parameters.Add(new FbParameter("@endDate", FbDbType.TimeStamp) { Value = endDate });
            await updateDtl.ExecuteNonQueryAsync(cancellationToken);
        }

        await _schedules.UpsertOnConnectionAsync(connection, docKey, seq, classDateTime, endDate, cancellationToken);

        _logger.LogInformation(
            "Updated portal schedule for SO line {DocKey}/{Seq} ({Customer}/{Branch}) {Start:yyyy-MM-dd}–{End:yyyy-MM-dd}",
            docKey, seq, customerCode, branchName, classDateTime.Date, endDate);

        await _portalSessions.SyncOccurrencesAsync(cancellationToken);

        var enrollments = await _salesOrders.GetChildEnrollmentsAsync(customerCode, branchName, cancellationToken);
        var updated = enrollments.FirstOrDefault(e => e.DocKey == docKey && e.Seq == seq);
        if (updated == null)
            throw new InvalidOperationException("Schedule saved but enrollment could not be reloaded.");

        return updated;
    }

    public async Task<IReadOnlyList<SqlAccountChildEnrollmentDto>> AssignCourseAsync(
        CreateSqlAccountChildEnrollmentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            throw new InvalidOperationException("SQL Account database is not available for writes.");

        var customerCode = request.CustomerCode.Trim();
        var branchName = request.BranchName.Trim();
        var inputLines = request.Lines?
            .Where(l => !string.IsNullOrWhiteSpace(l.ItemCode))
            .ToList() ?? [];

        if (inputLines.Count == 0)
            throw new InvalidOperationException("Add at least one class line.");

        var parent = (await _localDb.GetParentChildrenAsync(cancellationToken))
            .FirstOrDefault(p => string.Equals(p.CustomerCode, customerCode, StringComparison.OrdinalIgnoreCase));
        if (parent == null)
            throw new InvalidOperationException($"Customer {customerCode} not found.");

        var child = parent.Children.FirstOrDefault(c =>
            string.Equals(c.BranchName, branchName, StringComparison.OrdinalIgnoreCase));
        if (child == null)
            throw new InvalidOperationException($"Branch {branchName} not found for customer {customerCode}.");

        var studentName = !string.IsNullOrWhiteSpace(child.Attention)
            ? child.Attention!.Trim()
            : branchName;

        var itemCodes = inputLines.Select(l => l.ItemCode.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var itemDescriptions = await _localDb.GetItemDescriptionsByCodeAsync(itemCodes, cancellationToken);
        var links = await _context.ItemCodeClassLinks
            .Include(l => l.PortalClass)
            .Where(l => itemCodes.Contains(l.ItemCode))
            .ToListAsync(cancellationToken);
        var linksByCode = links.ToDictionary(l => l.ItemCode, l => l, StringComparer.OrdinalIgnoreCase);

        var teacherIds = inputLines.Select(l => l.TeacherUserId).Distinct().ToList();
        var teachers = await _context.Users
            .Where(u => teacherIds.Contains(u.Id) && u.IsActive && u.Role == Roles.Teacher)
            .ToDictionaryAsync(u => u.Id, cancellationToken);
        if (teachers.Count != teacherIds.Count)
            throw new InvalidOperationException("One or more selected teachers are not valid.");

        var staff = await _localDb.GetStaffTeachersAsync(cancellationToken);
        var resolvedLines = new List<CreateSalesOrderLineRequest>();
        foreach (var input in inputLines)
        {
            var itemCode = input.ItemCode.Trim();
            if (!itemDescriptions.TryGetValue(itemCode, out var description) || string.IsNullOrWhiteSpace(description))
                throw new InvalidOperationException($"Item code {itemCode} was not found in ST_ITEM.");

            if (!teachers.TryGetValue(input.TeacherUserId, out var teacherUser))
                throw new InvalidOperationException("Selected teacher is not valid.");

            if (!DateTime.TryParse(input.StartDate, out var lineStart))
                throw new InvalidOperationException($"Invalid start date for {itemCode}.");
            if (!DateTime.TryParse(input.EndDate, out var lineEnd))
                throw new InvalidOperationException($"Invalid end date for {itemCode}.");
            lineStart = lineStart.Date;
            lineEnd = lineEnd.Date;
            if (lineEnd < lineStart)
                throw new InvalidOperationException($"End date must be on or after start date for {itemCode}.");

            var classDays = (input.ClassDays ?? Array.Empty<string>())
                .Select(NormalizeClassDayName)
                .Where(d => d != null)
                .Cast<string>()
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(d => ClassDayOrder(d))
                .ToList();
            if (classDays.Count == 0)
                throw new InvalidOperationException($"Select at least one weekday for {itemCode}.");

            linksByCode.TryGetValue(itemCode, out var link);
            var classStartTime = link?.PortalClass?.StartTime ?? new TimeSpan(10, 0, 0);
            var teacherName = ResolveErpTeacherName(teacherUser, staff);
            var udfTime = ToUdfClassTimeDecimal(classStartTime);

            foreach (var classDay in classDays)
            {
                var firstSessionDate = FirstSessionDateOnOrAfter(lineStart, lineEnd, classDay);
                if (firstSessionDate == null)
                {
                    throw new InvalidOperationException(
                        $"No {classDay} between {lineStart:yyyy-MM-dd} and {lineEnd:yyyy-MM-dd} for {itemCode}.");
                }

                var classDateTime = firstSessionDate.Value.Add(classStartTime);
                resolvedLines.Add(new CreateSalesOrderLineRequest(
                    itemCode,
                    description,
                    classDay,
                    udfTime,
                    studentName,
                    teacherName,
                    classDateTime,
                    lineEnd));
            }
        }

        if (_salesOrders.CanCreateViaApi)
        {
            try
            {
                var companyName = parent.ParentName;
                var customerMatch = await _localDb.FindCustomerByCodeAsync(customerCode, cancellationToken);
                if (customerMatch != null && !string.IsNullOrWhiteSpace(customerMatch.ParentName))
                    companyName = customerMatch.ParentName;

                var created = await _salesOrders.CreateSalesOrderWithLinesAsync(
                    customerCode,
                    companyName,
                    branchName,
                    resolvedLines,
                    cancellationToken);

                _logger.LogInformation(
                    "Created sales order {DocNo} ({DocKey}) with {LineCount} line(s) via SQL Account API for {Customer}/{Branch}",
                    created.FirstOrDefault()?.DocNo,
                    created.FirstOrDefault()?.DocKey,
                    created.Count,
                    customerCode,
                    branchName);

                await _portalSessions.SyncOccurrencesAsync(cancellationToken);
                return created;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "SQL Account API POST salesorder failed for {Customer}/{Branch}; falling back to local database",
                    customerCode,
                    branchName);
            }
        }

        return await AssignCoursesViaLocalDbAsync(
            customerCode,
            branchName,
            resolvedLines,
            parent.ParentName,
            cancellationToken);
    }

    private async Task<IReadOnlyList<SqlAccountChildEnrollmentDto>> AssignCoursesViaLocalDbAsync(
        string customerCode,
        string branchName,
        IReadOnlyList<CreateSalesOrderLineRequest> lines,
        string parentName,
        CancellationToken cancellationToken)
    {
        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureAllTablesAsync(connection, cancellationToken);

        var companyName = await ReadCustomerNameAsync(connection, customerCode, cancellationToken)
            ?? parentName;

        var docKey = await NextIntAsync(connection, "SELECT MAX(DOCKEY) FROM SL_SO", cancellationToken) + 1;
        var nextDtlKey = await NextIntAsync(connection, "SELECT MAX(DTLKEY) FROM SL_SODTL", cancellationToken);
        var docNo = await NextDocNoAsync(connection, cancellationToken);
        var today = DateTime.Today;
        var totalAmount = lines.Sum(l => l.UnitPrice);

        const string insertSo = """
            INSERT INTO SL_SO (
                DOCKEY, DOCNO, DOCDATE, POSTDATE, TAXDATE, CODE, COMPANYNAME,
                AREA, AGENT, PROJECT, TERMS, CURRENCYCODE, CURRENCYRATE, SHIPPER,
                DESCRIPTION, CANCELLED, STATUS, DOCAMT, LOCALDOCAMT, BRANCHNAME,
                TRANSFERABLE, PRINTCOUNT
            ) VALUES (
                @docKey, @docNo, @docDate, @docDate, @docDate, @code, @companyName,
                '----', '----', '----', '30 Days', '----', 1, '----',
                'Sales Order', FALSE, 0, @docAmt, @docAmt, @branchName,
                TRUE, 0
            )
            """;

        await using (var cmd = new FbCommand(insertSo, connection))
        {
            cmd.Parameters.AddWithValue("@docKey", docKey);
            cmd.Parameters.AddWithValue("@docNo", docNo);
            cmd.Parameters.AddWithValue("@docDate", today);
            cmd.Parameters.AddWithValue("@code", customerCode);
            cmd.Parameters.AddWithValue("@companyName", companyName);
            cmd.Parameters.AddWithValue("@docAmt", totalAmount);
            cmd.Parameters.AddWithValue("@branchName", branchName);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        const string insertDtl = """
            INSERT INTO SL_SODTL (
                DTLKEY, DOCKEY, SEQ, ITEMCODE, LOCATION, PROJECT, DESCRIPTION,
                QTY, UOM, RATE, SQTY, UNITPRICE, DELIVERYDATE, AMOUNT, LOCALAMOUNT,
                TAXINCLUSIVE, PRINTABLE, TRANSFERABLE,
                UDF_CLASSDAY, UDF_CLASSTIME, UDF_STUDENTNAME, UDF_CONDUCTEDBY
            ) VALUES (
                @dtlKey, @docKey, @seq, @itemCode, '----', '----', @description,
                1, 'UNIT', 1, 1, @unitPrice, @deliveryDate, @amount, @amount,
                FALSE, TRUE, TRUE,
                @classDay, @udfTime, @studentName, @teacherName
            )
            """;

        var createdLines = new List<SqlAccountChildEnrollmentDto>();
        for (var i = 0; i < lines.Count; i++)
        {
            var line = lines[i];
            var seq = (i + 1) * 1000;
            var dtlKey = nextDtlKey + i + 1;
            var amount = line.UnitPrice;

            await using (var cmd = new FbCommand(insertDtl, connection))
            {
                cmd.Parameters.AddWithValue("@dtlKey", dtlKey);
                cmd.Parameters.AddWithValue("@docKey", docKey);
                cmd.Parameters.AddWithValue("@seq", seq);
                cmd.Parameters.AddWithValue("@itemCode", line.ItemCode);
                cmd.Parameters.AddWithValue("@description", line.Description);
                cmd.Parameters.AddWithValue("@unitPrice", line.UnitPrice);
                cmd.Parameters.AddWithValue("@deliveryDate", line.DeliveryDate);
                cmd.Parameters.AddWithValue("@amount", amount);
                cmd.Parameters.AddWithValue("@classDay", line.ClassDay);
                cmd.Parameters.AddWithValue("@udfTime", line.UdfClassTime);
                cmd.Parameters.AddWithValue("@studentName", line.StudentName);
                cmd.Parameters.AddWithValue("@teacherName", line.ConductedBy);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
            }

            await _schedules.UpsertOnConnectionAsync(
                connection, docKey, seq, line.ClassDateTime, line.DeliveryDate, cancellationToken);

            createdLines.Add(new SqlAccountChildEnrollmentDto(
                docKey,
                seq,
                docNo,
                today.ToString("yyyy-MM-dd"),
                line.Description,
                line.ItemCode,
                "1",
                line.UnitPrice.ToString("0.00"),
                amount.ToString("0.00"),
                line.DeliveryDate.ToString("yyyy-MM-dd"),
                line.ClassDay,
                TimeHelper.FormatUdfClassTime(line.UdfClassTime),
                line.StudentName,
                line.ConductedBy,
                ClassDate: line.ClassDateTime.ToString("yyyy-MM-dd HH:mm")));
        }

        _logger.LogInformation(
            "Created sales order {DocNo} ({DocKey}) with {LineCount} line(s) via local DB for {Customer}/{Branch}",
            docNo, docKey, lines.Count, customerCode, branchName);

        await _portalSessions.SyncOccurrencesAsync(cancellationToken);

        var enrollments = await _salesOrders.GetChildEnrollmentsAsync(customerCode, branchName, cancellationToken);
        var fromDb = enrollments.Where(e => e.DocKey == docKey).ToList();
        return fromDb.Count > 0 ? fromDb : createdLines;
    }

    private static decimal ToUdfClassTimeDecimal(TimeSpan time) =>
        time.Hours + time.Minutes / 60m + time.Seconds / 3600m;

    private static async Task<int> NextIntAsync(
        FbConnection connection, string sql, CancellationToken cancellationToken)
    {
        await using var cmd = new FbCommand(sql, connection);
        var value = await cmd.ExecuteScalarAsync(cancellationToken);
        return value is null or DBNull ? 0 : Convert.ToInt32(value);
    }

    private static async Task<string> NextDocNoAsync(FbConnection connection, CancellationToken cancellationToken)
    {
        await using var cmd = new FbCommand(
            "SELECT MAX(DOCNO) FROM SL_SO WHERE DOCNO STARTING 'SO-'", connection);
        var value = await cmd.ExecuteScalarAsync(cancellationToken) as string;
        if (string.IsNullOrWhiteSpace(value))
            return "SO-00001";

        var digits = new string(value.Where(char.IsDigit).ToArray());
        if (!int.TryParse(digits, out var num))
            return $"SO-{DateTime.UtcNow:yyyyMMddHHmmss}";

        return $"SO-{(num + 1):D5}";
    }

    private static async Task<string?> ReadCustomerNameAsync(
        FbConnection connection, string customerCode, CancellationToken cancellationToken)
    {
        await using var cmd = new FbCommand(
            "SELECT COMPANYNAME FROM AR_CUSTOMER WHERE CODE = @code", connection);
        cmd.Parameters.AddWithValue("@code", customerCode);
        return (await cmd.ExecuteScalarAsync(cancellationToken))?.ToString()?.Trim();
    }

    private static string ResolveErpTeacherName(
        User teacherUser,
        IReadOnlyList<SqlAccountStaffUserMatch> staff)
    {
        var match = staff.FirstOrDefault(s =>
            string.Equals(s.Email, teacherUser.Email, StringComparison.OrdinalIgnoreCase));
        if (match != null && !string.IsNullOrWhiteSpace(match.UserName))
            return match.UserName.Trim();

        return teacherUser.FullName.Trim();
    }

    private static readonly Dictionary<string, DayOfWeek> ClassDayMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Monday"] = DayOfWeek.Monday,
        ["Mon"] = DayOfWeek.Monday,
        ["Tuesday"] = DayOfWeek.Tuesday,
        ["Tue"] = DayOfWeek.Tuesday,
        ["Wednesday"] = DayOfWeek.Wednesday,
        ["Wed"] = DayOfWeek.Wednesday,
        ["Thursday"] = DayOfWeek.Thursday,
        ["Thu"] = DayOfWeek.Thursday,
        ["Friday"] = DayOfWeek.Friday,
        ["Fri"] = DayOfWeek.Friday,
        ["Saturday"] = DayOfWeek.Saturday,
        ["Sat"] = DayOfWeek.Saturday,
        ["Sunday"] = DayOfWeek.Sunday,
        ["Sun"] = DayOfWeek.Sunday,
    };

    private static string? NormalizeClassDayName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = value.Trim();
        if (!ClassDayMap.TryGetValue(trimmed, out var dayOfWeek))
            return null;

        return dayOfWeek.ToString();
    }

    private static int ClassDayOrder(string dayName) =>
        ClassDayMap.TryGetValue(dayName, out var day) ? (int)day : 99;

    private static DateTime? FirstSessionDateOnOrAfter(DateTime start, DateTime end, string classDay)
    {
        if (!ClassDayMap.TryGetValue(classDay, out var targetDay))
            return null;

        var date = start;
        while (date.DayOfWeek != targetDay && date <= end)
            date = date.AddDays(1);

        return date <= end ? date : null;
    }
}
