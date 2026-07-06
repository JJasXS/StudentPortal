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
    private readonly AppDbContext _context;
    private readonly PortalClassSessionService _portalSessions;
    private readonly ILogger<SqlAccountChildEnrollmentWriteService> _logger;

    public SqlAccountChildEnrollmentWriteService(
        SqlAccountLocalDbService localDb,
        SqlAccountSalesOrderService salesOrders,
        AppDbContext context,
        PortalClassSessionService portalSessions,
        ILogger<SqlAccountChildEnrollmentWriteService> logger)
    {
        _localDb = localDb;
        _salesOrders = salesOrders;
        _context = context;
        _portalSessions = portalSessions;
        _logger = logger;
    }

    public async Task<SqlAccountChildEnrollmentDto> AssignCourseAsync(
        CreateSqlAccountChildEnrollmentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!_localDb.CanWriteLocalDb)
            throw new InvalidOperationException("SQL Account database is not available for writes.");

        var customerCode = request.CustomerCode.Trim();
        var branchName = request.BranchName.Trim();
        var itemCode = request.ItemCode.Trim();

        var parent = (await _localDb.GetParentChildrenAsync(cancellationToken))
            .FirstOrDefault(p => string.Equals(p.CustomerCode, customerCode, StringComparison.OrdinalIgnoreCase));
        if (parent == null)
            throw new InvalidOperationException($"Customer {customerCode} not found.");

        var child = parent.Children.FirstOrDefault(c =>
            string.Equals(c.BranchName, branchName, StringComparison.OrdinalIgnoreCase));
        if (child == null)
            throw new InvalidOperationException($"Branch {branchName} not found for customer {customerCode}.");

        var link = await _context.ItemCodeClassLinks
            .Include(l => l.PortalClass)
            .ThenInclude(c => c.TeacherUser)
            .FirstOrDefaultAsync(l => l.ItemCode == itemCode, cancellationToken);
        if (link?.PortalClass == null)
            throw new InvalidOperationException($"Item code {itemCode} is not linked to a portal class.");

        if (!DateTime.TryParse(request.StartDate, out var startDate))
            throw new InvalidOperationException("Invalid start date.");
        if (!DateTime.TryParse(request.EndDate, out var endDate))
            throw new InvalidOperationException("Invalid end date.");
        startDate = startDate.Date;
        endDate = endDate.Date;
        if (endDate < startDate)
            throw new InvalidOperationException("End date must be on or after start date.");

        var teacherUser = await _context.Users.FirstOrDefaultAsync(
            u => u.Id == request.TeacherUserId && u.IsActive,
            cancellationToken);
        if (teacherUser == null || teacherUser.Role != Roles.Teacher)
            throw new InvalidOperationException("Selected teacher is not valid.");

        var portalClass = link.PortalClass;
        var studentName = !string.IsNullOrWhiteSpace(child.Attention)
            ? child.Attention!.Trim()
            : branchName;
        var teacherName = await ResolveErpTeacherNameAsync(teacherUser, cancellationToken);
        var itemDescriptions = await _localDb.GetItemDescriptionsByCodeAsync([itemCode], cancellationToken);
        if (!itemDescriptions.TryGetValue(itemCode, out var description) || string.IsNullOrWhiteSpace(description))
            throw new InvalidOperationException($"Item code {itemCode} was not found in ST_ITEM.");
        var classDay = portalClass.DayOfWeek;
        var udfTime = ToUdfClassTimeDecimal(portalClass.StartTime);
        var classDateTime = startDate.Add(portalClass.StartTime);
        var unitPrice = 350m;

        if (_salesOrders.CanCreateViaApi)
        {
            try
            {
                var companyName = parent.ParentName;
                var customerMatch = await _localDb.FindCustomerByCodeAsync(customerCode, cancellationToken);
                if (customerMatch != null && !string.IsNullOrWhiteSpace(customerMatch.ParentName))
                    companyName = customerMatch.ParentName;

                var created = await _salesOrders.CreateSalesOrderAsync(
                    customerCode,
                    companyName,
                    branchName,
                    new CreateSalesOrderLineRequest(
                        itemCode,
                        description,
                        classDay,
                        udfTime,
                        studentName,
                        teacherName,
                        classDateTime,
                        endDate,
                        unitPrice),
                    cancellationToken);

                _logger.LogInformation(
                    "Created sales order {DocNo} ({DocKey}) via SQL Account API for {Customer}/{Branch} item {ItemCode}",
                    created.DocNo, created.DocKey, customerCode, branchName, itemCode);

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

        return await AssignCourseViaLocalDbAsync(
            customerCode,
            branchName,
            itemCode,
            description,
            studentName,
            teacherName,
            classDay,
            udfTime,
            classDateTime,
            endDate,
            unitPrice,
            parent.ParentName,
            cancellationToken);
    }

    private async Task<SqlAccountChildEnrollmentDto> AssignCourseViaLocalDbAsync(
        string customerCode,
        string branchName,
        string itemCode,
        string description,
        string studentName,
        string teacherName,
        string classDay,
        decimal udfTime,
        DateTime classDateTime,
        DateTime endDate,
        decimal unitPrice,
        string parentName,
        CancellationToken cancellationToken)
    {
        await using var connection = _localDb.OpenConnection();
        await connection.OpenAsync(cancellationToken);
        await PortalFirebirdSchema.EnsureUdfClassEndDateAsync(connection, cancellationToken);

        var companyName = await ReadCustomerNameAsync(connection, customerCode, cancellationToken)
            ?? parentName;

        var docKey = await NextIntAsync(connection, "SELECT MAX(DOCKEY) FROM SL_SO", cancellationToken) + 1;
        var dtlKey = await NextIntAsync(connection, "SELECT MAX(DTLKEY) FROM SL_SODTL", cancellationToken) + 1;
        var docNo = await NextDocNoAsync(connection, cancellationToken);
        var today = DateTime.Today;
        var amount = unitPrice;

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
            cmd.Parameters.AddWithValue("@docAmt", amount);
            cmd.Parameters.AddWithValue("@branchName", branchName);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        const string insertDtl = """
            INSERT INTO SL_SODTL (
                DTLKEY, DOCKEY, SEQ, ITEMCODE, LOCATION, PROJECT, DESCRIPTION,
                QTY, UOM, RATE, SQTY, UNITPRICE, DELIVERYDATE, AMOUNT, LOCALAMOUNT,
                TAXINCLUSIVE, PRINTABLE, TRANSFERABLE,
                UDF_CLASSDAY, UDF_CLASSTIME, UDF_STUDENTNAME, UDF_CONDUCTEDBY,
                UDF_CLASSDATE, UDF_CLASSENDDATE
            ) VALUES (
                @dtlKey, @docKey, 1000, @itemCode, '----', '----', @description,
                1, 'UNIT', 1, 1, @unitPrice, @deliveryDate, @amount, @amount,
                FALSE, TRUE, TRUE,
                @classDay, @udfTime, @studentName, @teacherName,
                @classDate, @classEndDate
            )
            """;

        await using (var cmd = new FbCommand(insertDtl, connection))
        {
            cmd.Parameters.AddWithValue("@dtlKey", dtlKey);
            cmd.Parameters.AddWithValue("@docKey", docKey);
            cmd.Parameters.AddWithValue("@itemCode", itemCode);
            cmd.Parameters.AddWithValue("@description", description);
            cmd.Parameters.AddWithValue("@unitPrice", unitPrice);
            cmd.Parameters.AddWithValue("@deliveryDate", endDate);
            cmd.Parameters.AddWithValue("@amount", amount);
            cmd.Parameters.AddWithValue("@classDay", classDay);
            cmd.Parameters.AddWithValue("@udfTime", udfTime);
            cmd.Parameters.AddWithValue("@studentName", studentName);
            cmd.Parameters.AddWithValue("@teacherName", teacherName);
            cmd.Parameters.Add(new FbParameter("@classDate", FbDbType.TimeStamp) { Value = classDateTime });
            cmd.Parameters.Add(new FbParameter("@classEndDate", FbDbType.TimeStamp) { Value = endDate });
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Created sales order {DocNo} ({DocKey}) via local DB for {Customer}/{Branch} item {ItemCode} {Start:yyyy-MM-dd}–{End:yyyy-MM-dd}",
            docNo, docKey, customerCode, branchName, itemCode, classDateTime.Date, endDate);

        await _portalSessions.SyncOccurrencesAsync(cancellationToken);

        var enrollments = await _salesOrders.GetChildEnrollmentsAsync(customerCode, branchName, cancellationToken);
        var created = enrollments.FirstOrDefault(e => e.DocKey == docKey && e.Seq == 1000);
        if (created == null)
        {
            return new SqlAccountChildEnrollmentDto(
                docKey, 1000, docNo, today.ToString("yyyy-MM-dd"), description, itemCode,
                "1", unitPrice.ToString("0.00"), amount.ToString("0.00"), endDate.ToString("yyyy-MM-dd"),
                classDay, TimeHelper.FormatUdfClassTime(udfTime), studentName, teacherName,
                ClassDate: classDateTime.ToString("yyyy-MM-dd HH:mm"));
        }

        return created;
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

    private async Task<string> ResolveErpTeacherNameAsync(User teacherUser, CancellationToken cancellationToken)
    {
        var staff = await _localDb.GetStaffTeachersAsync(cancellationToken);
        var match = staff.FirstOrDefault(s =>
            string.Equals(s.Email, teacherUser.Email, StringComparison.OrdinalIgnoreCase));
        if (match != null && !string.IsNullOrWhiteSpace(match.UserName))
            return match.UserName.Trim();

        return teacherUser.FullName.Trim();
    }
}
