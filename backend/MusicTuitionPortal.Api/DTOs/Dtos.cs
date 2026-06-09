namespace MusicTuitionPortal.Api.DTOs;

public record UserDto(Guid Id, string FullName, string Email, string? PhoneNumber, string Role, bool IsActive, DateTime CreatedAt);
public record LoginRequest(string Email, string Password);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Email, string ResetCode, string NewPassword);
public record RegisterRequest(string FullName, string Email, string Password, string Role, string? PhoneNumber);
public record UpdateProfileRequest(string FullName, string Email, string? PhoneNumber, string? Password);
public record LoginResponse(string Token, UserDto User);

public record StudentDto(
    Guid Id, Guid UserId, string FullName, string Email, string StudentCode,
    DateTime? DateOfBirth, string? Gender, string? SchoolName, string? Notes, bool IsActive);

public record CreateStudentRequest(
    string FullName, string Email, string Password, string StudentCode,
    DateTime? DateOfBirth, string? Gender, string? SchoolName, string? Notes, string? PhoneNumber);

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
    int MaxStudents, int EnrolledCount, string Location, bool IsActive);

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
    Guid Id, Guid ClassSessionId, string? ClassName, Guid StudentUserId, string? StudentName,
    Guid TeacherUserId, string? TeacherName, string NoteTitle, string NoteContent,
    string? PracticeInstructions, DateTime CreatedAt);

public record AnnouncementDto(
    Guid Id, string Title, string Content, string Category, DateTime? HolidayDate, string TargetRole,
    Guid CreatedByUserId, string? CreatedByName, DateTime CreatedAt);

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

public record NotificationDto(
    Guid Id, Guid UserId, string Title, string Message, string Category,
    string? LinkPath, bool IsRead, DateTime CreatedAt);
