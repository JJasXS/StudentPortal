namespace MusicTuitionPortal.Api.DTOs;

public record UserDto(Guid Id, string FullName, string Email, string? PhoneNumber, string Role, bool IsActive, DateTime CreatedAt);
public record LoginRequest(string Email, string Password);
public record LoginMethodRequest(string Email);
public record LoginMethodResponse(string Method, bool BypassOtp);
public record UdfEmailLoginRequest(string Email);
public record RequestLoginOtpRequest(string Email);
public record RequestLoginOtpResponse(string Message, bool BypassOtp, string? OtpCode);
public record VerifyLoginOtpRequest(string Email, string Otp);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Email, string ResetCode, string NewPassword);
public record RegisterRequest(string FullName, string Email, string Password, string Role, string? PhoneNumber);

public record RegisterStudentRequest(
    string FullName,
    string Email,
    string Password,
    DateTime DateOfBirth,
    string Gender,
    string? PhoneNumber,
    string? SchoolName,
    string? Instrument,
    string? Experience);
public record UpdateProfileRequest(string FullName, string Email, string? PhoneNumber, string? Password);
public record LoginResponse(string Token, UserDto User);

public record StudentDto(
    Guid Id, Guid UserId, string FullName, string Email, string StudentCode,
    DateTime? DateOfBirth, string? Gender, string? SchoolName, string? Notes, bool IsActive);

public record CreateStudentRequest(
    string FullName, string Email, string Password, string? StudentCode,
    DateTime? DateOfBirth, string? Gender, string? SchoolName, string? Notes, string? PhoneNumber,
    Guid? ParentUserId = null);

public record LinkedParentSummaryDto(string FullName, string Email, string? PhoneNumber, string? Relationship);

public record StudentSelfProfileDto(
    Guid Id, Guid UserId, string FullName, string Email, string? PhoneNumber, string StudentCode,
    DateTime? DateOfBirth, string? Gender, string? SchoolName, string? Notes,
    LinkedParentSummaryDto? Parent, bool IsActive);

public record UpdateStudentSelfRequest(
    DateTime? DateOfBirth, string? Gender, string? SchoolName, string? Instrument, string? Experience);

public record ParentDto(
    Guid Id, Guid UserId, string FullName, string Email, string? PhoneNumber,
    string? Relationship, string? Address, List<Guid> Children, bool IsActive, DateTime CreatedAt);

public record CreateParentRequest(
    string FullName, string Email, string Password, string? PhoneNumber,
    string? Relationship, string? Address, List<Guid>? StudentUserIds);

public record TeacherDto(
    Guid Id, Guid UserId, string FullName, string Email, string? PhoneNumber,
    string? Specialization, string? Bio, decimal HourlyRate, string EmploymentType, bool IsActive, DateTime CreatedAt);

public record CreateTeacherRequest(
    string FullName, string Email, string Password, string? PhoneNumber,
    string? Specialization, string? Bio, decimal HourlyRate, string? EmploymentType);

public record UpdateEmploymentTypeRequest(string EmploymentType);

public record CourseDto(
    Guid Id, string CourseName, string Category, string? Description,
    string Level, int DefaultDurationMinutes, bool IsActive);

public record ClassDto(
    Guid Id, Guid CourseId, string? CourseName, Guid TeacherUserId, string? TeacherName,
    string ClassName, string DayOfWeek, string StartTime, string EndTime,
    int MaxStudents, int EnrolledCount, string Location, bool IsActive,
    DateTime? StartDate = null, DateTime? EndDate = null);

public record EnrollmentDto(
    Guid Id, Guid StudentUserId, string? StudentName, Guid ClassId, string? ClassName,
    DateTime EnrollmentDate, string Status);

public record ClassSessionDto(
    Guid Id, Guid ClassId, string? ClassName, DateTime SessionDate,
    string StartTime, string EndTime, string? Topic, string? Notes, string Status);

public record AttendanceDto(
    Guid Id, Guid ClassSessionId, DateTime? SessionDate, string? ClassName,
    Guid StudentUserId, string? StudentName, string Status, string? Remarks);

public record AttendanceCheckInDto(
    Guid ClassSessionId, string? ClassName, string Code, DateTime ClassStartAt, DateTime ClassEndAt);

public record GenerateCheckInRequest(Guid ClassSessionId);

public record RedeemCheckInRequest(string Code);

public record LessonNoteDto(
    Guid Id, Guid? ClassSessionId, string? ClassName, Guid? StudentUserId, string? StudentName,
    Guid TeacherUserId, string? TeacherName, string NoteTitle, string NoteContent,
    string? PracticeInstructions, string? HomeworkId, DateTime CreatedAt);

public record AnnouncementDto(
    Guid Id, string Title, string Content, string Category, DateTime? HolidayDate, string TargetRole,
    Guid CreatedByUserId, string? CreatedByName, DateTime CreatedAt,
    bool IsSystem = false, string? RelatedType = null, string? RelatedId = null, bool IsRead = false);

public record InvoiceDto(
    Guid Id, Guid StudentUserId, string? StudentName, Guid? ParentUserId, string? ParentName,
    string InvoiceNo, string? CourseName, string? ClassName,
    decimal Amount, string Status, string? BillingPeriod, DateTime DueDate, DateTime CreatedAt, DateTime? PaidAt);

public record UpdateInvoiceStatusRequest(string Status);

public record BillplzPayRequest(string? FpxBankCode);

public record BillplzPayResponse(string BillId, string PaymentUrl, string InvoiceId);

public record CreateInvoiceRequest(
    Guid StudentUserId, string? CourseName, string? ClassName,
    decimal Amount, string DueDate, string? BillingPeriod, bool SendNow);

public record UpdateInvoiceRequest(
    decimal? Amount, string? DueDate, string? BillingPeriod, string? Status);

public record CentreSettingsDto(
    string CentreName, string Timezone, string Currency, decimal DefaultMonthlyFee, string? PaymentInstructions,
    string? Address, string? Phone, string? Email, string? BankName, string? BankAccountNo,
    string InvoicePrefix, string? LogoDataUrl);

public record UpdateCentreSettingsRequest(
    string CentreName, string Timezone, string Currency, decimal DefaultMonthlyFee, string? PaymentInstructions,
    string? Address, string? Phone, string? Email, string? BankName, string? BankAccountNo,
    string InvoicePrefix, string? LogoDataUrl);

public record AuditLogDto(
    Guid Id, Guid? ActorUserId, string? ActorName, string? ActorRole,
    string Action, string EntityType, string? EntityId, string? EntityLabel, string? Details, DateTime CreatedAt);

public record CreateAuditLogRequest(
    string Action, string EntityType, string? EntityId, string? EntityLabel, string? Details);

public record GenerateSessionsRequest(Guid? ClassId, string FromDate, string ToDate);

public record GenerateSessionsResultDto(int CreatedCount, int SkippedCount, List<ClassSessionDto> Sessions);

public record ClassSessionChangeHistoryDto(
    Guid Id,
    Guid ClassSessionId,
    Guid ClassId,
    string? ClassName,
    string ChangeType,
    Guid? ActorUserId,
    string? ActorName,
    string? Reason,
    string PreviousSessionDate,
    string PreviousStartTime,
    string PreviousEndTime,
    string PreviousStatus,
    string? NewSessionDate,
    string? NewStartTime,
    string? NewEndTime,
    string? NewStatus,
    Guid? ReplacementClassSessionId,
    DateTime CreatedAt);

public record ReplaceClassSessionRequest(
    string SessionDate,
    string StartTime,
    string EndTime,
    string? Reason = null,
    string? Notes = null);

public record ClassAssignmentChangeLogDto(
    Guid Id,
    Guid ClassId,
    string? ClassName,
    string EntityType,
    string Operation,
    Guid? EntityId,
    Guid? StudentUserId,
    string? StudentName,
    Guid? PreviousTeacherUserId,
    string? PreviousTeacherName,
    Guid? NewTeacherUserId,
    string? NewTeacherName,
    string? PreviousDayOfWeek,
    string? NewDayOfWeek,
    string? PreviousClassStartTime,
    string? NewClassStartTime,
    string? PreviousClassEndTime,
    string? NewClassEndTime,
    string? PreviousSessionDate,
    string? NewSessionDate,
    string? PreviousSessionStartTime,
    string? NewSessionStartTime,
    string? PreviousSessionEndTime,
    string? NewSessionEndTime,
    string? PreviousStatus,
    string? NewStatus,
    Guid? ActorUserId,
    string? ActorName,
    string? Reason,
    DateTime CreatedAt);

public record NotificationDto(
    Guid Id, Guid UserId, string Title, string Message, string Category,
    string? LinkPath, bool IsRead, DateTime CreatedAt);

public record SqlAccountChildDto(string BranchName, string? Attention, string? Email, string? Phone);

public record SqlAccountParentDto(
    string CustomerCode, string ParentName, string? ParentEmail, IReadOnlyList<SqlAccountChildDto> Children);

public record SqlAccountStatusDto(bool Configured, bool Connected, string? DatabasePath);

public record SqlAccountMyChildrenDto(string ParentName, IReadOnlyList<SqlAccountChildDto> Children);

public record SqlAccountCalendarTeacherDto(
    string ErpUserId,
    string FullName,
    string Email,
    Guid? PortalUserId);

public record SqlAccountChildEnrollmentDto(
    int DocKey,
    int Seq,
    string DocNo,
    string? DocDate,
    string ClassName,
    string? ItemCode,
    string? Qty,
    string? UnitPrice,
    string? Amount,
    string? DeliveryDate,
    string? ClassDay = null,
    string? ClassTime = null,
    string? StudentName = null,
    string? ConductedBy = null,
    string? ClassDate = null,
    Guid? LinkedClassId = null,
    string? LinkedClassName = null,
    string? LinkedClassDayOfWeek = null,
    string? LinkedClassStartTime = null,
    string? LinkedClassEndTime = null,
    string? LinkedClassTeacherName = null,
    string? NextSessionDate = null);

public record SqlAccountChildEnrollmentsDto(
    string CustomerCode,
    string BranchName,
    IReadOnlyList<SqlAccountChildEnrollmentDto> Enrollments);

public record ItemCodeClassLinkDto(
    Guid Id,
    string ItemCode,
    Guid PortalClassId,
    string? PortalClassName,
    DateTime CreatedAt);

public record CreateItemCodeClassLinkRequest(string ItemCode, Guid PortalClassId);

public record CreateSqlAccountChildEnrollmentLineRequest(
    string ItemCode,
    Guid TeacherUserId,
    string StartDate,
    string EndDate,
    IReadOnlyList<string> ClassDays);

public record CreateSqlAccountChildEnrollmentRequest(
    string CustomerCode,
    string BranchName,
    IReadOnlyList<CreateSqlAccountChildEnrollmentLineRequest> Lines);

public record UpdateSqlAccountEnrollmentScheduleRequest(
    string CustomerCode,
    string BranchName,
    string StartDate,
    string EndDate);

public record SqlAccountCourseOptionDto(
    string ItemCode,
    string Description,
    string? DayOfWeek,
    string? StartTime,
    string? EndTime,
    string? TeacherName);

public record SqlAccountErpCalendarLineDto(
    int DocKey,
    int Seq,
    string CustomerCode,
    string BranchName,
    string? ItemCode,
    string? Description,
    DateTime? ClassDateTime,
    string? ClassDay,
    string? ClassTime,
    string? StudentName,
    string? ConductedBy);

public record ErpCalendarEventDto(
    string Id,
    int DocKey,
    int Seq,
    Guid? ClassId,
    Guid? CourseId,
    string ClassName,
    string? CourseName,
    Guid? TeacherUserId,
    string? TeacherName,
    string? StudentName,
    string? BranchName,
    string? ItemCode,
    string? CustomerCode,
    string SessionDate,
    string StartTime,
    string EndTime,
    string Status);

public record CalendarEventCancelRequest(string Reason);

public record CalendarEventReplaceRequest(
    string SessionDate,
    string StartTime,
    string EndTime,
    string Reason,
    string? Notes);

public record PortalClassSessionDto(
    string Id,
    int DocKey,
    int Seq,
    string? ItemCode,
    string CustomerCode,
    string BranchName,
    string? StudentName,
    string ClassName,
    string? ConductedBy,
    int OccurrenceIndex,
    string SessionDate,
    string StartTime,
    string EndTime,
    string Status,
    string? Reason);

public record PortalHomeworkDto(
    string Id,
    int DocKey,
    int Seq,
    string CustomerCode,
    string BranchName,
    string? ClassName,
    string? ItemCode,
    string? Url,
    string? Note,
    string? FileName,
    string? FilePath,
    string SubmittedBy,
    DateTime CreatedAt);

public record CreatePortalHomeworkRequest(
    int DocKey,
    int Seq,
    string BranchName,
    string? Url,
    string? Note);

public record ReplacementOptionDto(string Date, string Time);

public record PortalLeaveRequestDto(
    string Id,
    string? OccurrenceId,
    int DocKey,
    int Seq,
    string CustomerCode,
    string BranchName,
    string? ClassName,
    string SessionDate,
    string Reason,
    string Status,
    string? AdminNote,
    bool NeedsReplacement,
    IReadOnlyList<ReplacementOptionDto> ReplOptions,
    string? ReplDate,
    string? ReplStart,
    string? ReplEnd,
    string? ReplTeacher,
    string? TeacherResponse,
    string? CounterDate,
    string? CounterStart,
    string? CounterEnd,
    string? CounterMsg,
    string? RequestedBy,
    string RequesterType,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CreatePortalLeaveRequest(
    string? OccurrenceId,
    int DocKey,
    int Seq,
    string BranchName,
    string SessionDate,
    string? StartTime,
    string Reason,
    IReadOnlyList<ReplacementOptionDto>? ReplacementOptions);

public record AdminLeaveDecisionRequest(
    bool Approve,
    string? AdminNote,
    string? ChosenDate,
    string? ChosenTime);
