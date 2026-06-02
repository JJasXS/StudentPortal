namespace MusicTuitionPortal.Api.DTOs;

public record UserDto(Guid Id, string FullName, string Email, string? PhoneNumber, string Role, bool IsActive, DateTime CreatedAt);
public record LoginRequest(string Email, string Password);
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
    string InvoiceNo, decimal Amount, string Status, DateTime DueDate, DateTime CreatedAt);
