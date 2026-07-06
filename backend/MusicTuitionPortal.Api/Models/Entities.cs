namespace MusicTuitionPortal.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = "Student";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public StudentProfile? StudentProfile { get; set; }
    public ParentProfile? ParentProfile { get; set; }
    public TeacherProfile? TeacherProfile { get; set; }
}

public class StudentProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string StudentCode { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? SchoolName { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class ParentProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string? Relationship { get; set; }
    public string? Address { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class TeacherProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string? Specialization { get; set; }
    public string? Bio { get; set; }
    public decimal HourlyRate { get; set; }
    public string EmploymentType { get; set; } = EmploymentTypes.FullTime;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public static class EmploymentTypes
{
    public const string FullTime = "FullTime";
    public const string PartTime = "PartTime";
    public const string Contract = "Contract";
    public const string Substitute = "Substitute";

    public static readonly string[] All = [FullTime, PartTime, Contract, Substitute];
}

public class ParentStudent
{
    public Guid Id { get; set; }
    public Guid ParentUserId { get; set; }
    public User ParentUser { get; set; } = null!;
    public Guid StudentUserId { get; set; }
    public User StudentUser { get; set; } = null!;
    public string? Relationship { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Course
{
    public Guid Id { get; set; }
    public string CourseName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Level { get; set; } = string.Empty;
    public int DefaultDurationMinutes { get; set; } = 60;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<MusicClass> Classes { get; set; } = new List<MusicClass>();
}

public class MusicClass
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public Course Course { get; set; } = null!;
    public Guid TeacherUserId { get; set; }
    public User TeacherUser { get; set; } = null!;
    public string ClassName { get; set; } = string.Empty;
    public string DayOfWeek { get; set; } = string.Empty;
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int MaxStudents { get; set; }
    public string Location { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<ClassSession> ClassSessions { get; set; } = new List<ClassSession>();
}

public class Enrollment
{
    public Guid Id { get; set; }
    public Guid StudentUserId { get; set; }
    public User StudentUser { get; set; } = null!;
    public Guid ClassId { get; set; }
    public MusicClass Class { get; set; } = null!;
    public DateTime EnrollmentDate { get; set; } = DateTime.UtcNow.Date;
    public string Status { get; set; } = "Active";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class ClassSession
{
    public Guid Id { get; set; }
    public Guid ClassId { get; set; }
    public MusicClass Class { get; set; } = null!;
    public DateTime SessionDate { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string? Topic { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "Scheduled";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<LessonNote> LessonNotes { get; set; } = new List<LessonNote>();
    public ICollection<ClassSessionChangeHistory> ChangeHistories { get; set; } = new List<ClassSessionChangeHistory>();
}

public static class ClassSessionChangeTypes
{
    public const string Cancellation = "Cancellation";
    public const string Replacement = "Replacement";
}

public static class ClassAssignmentEntityTypes
{
    public const string Enrollment = "Enrollment";
    public const string Class = "Class";
    public const string ClassSession = "ClassSession";
}

public static class ClassAssignmentOperations
{
    public const string Create = "Create";
    public const string Update = "Update";
    public const string Delete = "Delete";
}

public class ClassAssignmentChangeLog
{
    public Guid Id { get; set; }
    public Guid ClassId { get; set; }
    public string? ClassName { get; set; }
    public string EntityType { get; set; } = ClassAssignmentEntityTypes.Class;
    public string Operation { get; set; } = ClassAssignmentOperations.Update;
    public Guid? EntityId { get; set; }
    public Guid? StudentUserId { get; set; }
    public string? StudentName { get; set; }
    public Guid? PreviousTeacherUserId { get; set; }
    public string? PreviousTeacherName { get; set; }
    public Guid? NewTeacherUserId { get; set; }
    public string? NewTeacherName { get; set; }
    public string? PreviousDayOfWeek { get; set; }
    public string? NewDayOfWeek { get; set; }
    public TimeSpan? PreviousClassStartTime { get; set; }
    public TimeSpan? NewClassStartTime { get; set; }
    public TimeSpan? PreviousClassEndTime { get; set; }
    public TimeSpan? NewClassEndTime { get; set; }
    public DateTime? PreviousSessionDate { get; set; }
    public DateTime? NewSessionDate { get; set; }
    public TimeSpan? PreviousSessionStartTime { get; set; }
    public TimeSpan? NewSessionStartTime { get; set; }
    public TimeSpan? PreviousSessionEndTime { get; set; }
    public TimeSpan? NewSessionEndTime { get; set; }
    public string? PreviousStatus { get; set; }
    public string? NewStatus { get; set; }
    public Guid? ActorUserId { get; set; }
    public string? ActorName { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ClassSessionChangeHistory
{
    public Guid Id { get; set; }
    public Guid ClassSessionId { get; set; }
    public ClassSession ClassSession { get; set; } = null!;
    public Guid ClassId { get; set; }
    public MusicClass Class { get; set; } = null!;
    public string ChangeType { get; set; } = ClassSessionChangeTypes.Cancellation;
    public Guid? ActorUserId { get; set; }
    public string? ActorName { get; set; }
    public string? Reason { get; set; }
    public DateTime PreviousSessionDate { get; set; }
    public TimeSpan PreviousStartTime { get; set; }
    public TimeSpan PreviousEndTime { get; set; }
    public string PreviousStatus { get; set; } = string.Empty;
    public DateTime? NewSessionDate { get; set; }
    public TimeSpan? NewStartTime { get; set; }
    public TimeSpan? NewEndTime { get; set; }
    public string? NewStatus { get; set; }
    public Guid? ReplacementClassSessionId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Attendance
{
    public Guid Id { get; set; }
    public Guid ClassSessionId { get; set; }
    public ClassSession ClassSession { get; set; } = null!;
    public Guid StudentUserId { get; set; }
    public User StudentUser { get; set; } = null!;
    public string Status { get; set; } = "Present";
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class AttendanceCheckIn
{
    public Guid Id { get; set; }
    public Guid ClassSessionId { get; set; }
    public ClassSession ClassSession { get; set; } = null!;
    public string Code { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class LessonNote
{
    public Guid Id { get; set; }
    public Guid? ClassSessionId { get; set; }
    public ClassSession? ClassSession { get; set; }
    public Guid? StudentUserId { get; set; }
    public User? StudentUser { get; set; }
    public Guid TeacherUserId { get; set; }
    public User TeacherUser { get; set; } = null!;
    public string? ClassName { get; set; }
    public string? StudentName { get; set; }
    public string NoteTitle { get; set; } = string.Empty;
    public string NoteContent { get; set; } = string.Empty;
    public string? PracticeInstructions { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Announcement
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public DateTime? HolidayDate { get; set; }
    public string TargetRole { get; set; } = "All";
    public Guid CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Invoice
{
    public Guid Id { get; set; }
    public Guid StudentUserId { get; set; }
    public User StudentUser { get; set; } = null!;
    public Guid? ParentUserId { get; set; }
    public User? ParentUser { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public string? CourseName { get; set; }
    public string? ClassName { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "Draft";
    public string? BillingPeriod { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
    public string? BillplzBillId { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class CentreSettings
{
    public Guid Id { get; set; }
    public string CentreName { get; set; } = "Music Tuition Portal";
    public string Timezone { get; set; } = "Asia/Kuala_Lumpur";
    public string Currency { get; set; } = "MYR";
    public decimal DefaultMonthlyFee { get; set; } = 300m;
    public string? PaymentInstructions { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountNo { get; set; }
    public string InvoicePrefix { get; set; } = "INV";
    public string? LogoDataUrl { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class PasswordReset
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class LoginOtp
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class AuditLog
{
    public Guid Id { get; set; }
    public Guid? ActorUserId { get; set; }
    public string? ActorName { get; set; }
    public string? ActorRole { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? EntityLabel { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Category { get; set; } = "System";
    public string? LinkPath { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ItemCodeClassLink
{
    public Guid Id { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public Guid PortalClassId { get; set; }
    public MusicClass PortalClass { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public static class Roles
{
    public const string Admin = "Admin";
    public const string Teacher = "Teacher";
    public const string Student = "Student";
    public const string Parent = "Parent";

    public static readonly string[] All = [Admin, Teacher, Student, Parent];

    public static readonly string[] PortalSignIn = [Admin, Teacher, Student, Parent];

    public static bool CanSignIn(string role) =>
        role is Admin or Teacher or Student or Parent;
}
