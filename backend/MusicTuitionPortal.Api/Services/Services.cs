using Microsoft.EntityFrameworkCore;
using MusicTuitionPortal.Api.Data;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Helpers;
using MusicTuitionPortal.Api.Models;

namespace MusicTuitionPortal.Api.Services;

public class AuthService
{
    private readonly AppDbContext _context;
    private readonly JwtSettings _jwtSettings;

    public AuthService(AppDbContext context, JwtSettings jwtSettings)
    {
        _context = context;
        _jwtSettings = jwtSettings;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);
        if (user == null || !PasswordHelper.Verify(request.Password, user.PasswordHash))
            return null;

        var token = JwtHelper.GenerateToken(user, _jwtSettings);
        return new LoginResponse(token, MapUser(user));
    }

    public async Task<LoginResponse?> RegisterAsync(RegisterRequest request)
    {
        if (!Roles.All.Contains(request.Role))
            throw new InvalidOperationException("Invalid role.");

        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = PasswordHelper.Hash(request.Password),
            PhoneNumber = request.PhoneNumber,
            Role = request.Role,
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = JwtHelper.GenerateToken(user, _jwtSettings);
        return new LoginResponse(token, MapUser(user));
    }

    public async Task<UserDto?> GetMeAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        return user == null ? null : MapUser(user);
    }

    public async Task<UserDto?> UpdateMeAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return null;

        if (await _context.Users.AnyAsync(u => u.Email == request.Email && u.Id != userId))
            throw new InvalidOperationException("Email already exists.");

        user.FullName = request.FullName;
        user.Email = request.Email;
        user.PhoneNumber = request.PhoneNumber;
        if (!string.IsNullOrWhiteSpace(request.Password))
            user.PasswordHash = PasswordHelper.Hash(request.Password);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return MapUser(user);
    }

    public static UserDto MapUser(User user) =>
        new(user.Id, user.FullName, user.Email, user.PhoneNumber, user.Role, user.IsActive, user.CreatedAt);
}

public class UserService
{
    private readonly AppDbContext _context;
    public UserService(AppDbContext context) => _context = context;

    public async Task<List<UserDto>> GetAllAsync() =>
        await _context.Users.Select(u => AuthService.MapUser(u)).ToListAsync();

    public async Task<UserDto?> GetByIdAsync(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        return user == null ? null : AuthService.MapUser(user);
    }

    public async Task<UserDto> CreateAsync(RegisterRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = PasswordHelper.Hash(request.Password),
            PhoneNumber = request.PhoneNumber,
            Role = request.Role,
            IsActive = true
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return AuthService.MapUser(user);
    }

    public async Task<UserDto?> UpdateAsync(Guid id, RegisterRequest request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return null;

        user.FullName = request.FullName;
        user.Email = request.Email;
        user.PhoneNumber = request.PhoneNumber;
        user.Role = request.Role;
        if (!string.IsNullOrWhiteSpace(request.Password))
            user.PasswordHash = PasswordHelper.Hash(request.Password);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return AuthService.MapUser(user);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;
        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }
}

public class StudentService
{
    private readonly AppDbContext _context;
    public StudentService(AppDbContext context) => _context = context;

    public async Task<List<StudentDto>> GetAllAsync() =>
        await _context.StudentProfiles.Include(s => s.User)
            .Select(s => Map(s)).ToListAsync();

    public async Task<StudentDto?> GetByIdAsync(Guid id)
    {
        var s = await _context.StudentProfiles.Include(x => x.User).FirstOrDefaultAsync(x => x.Id == id);
        return s == null ? null : Map(s);
    }

    public async Task<StudentDto?> GetByUserIdAsync(Guid userId)
    {
        var s = await _context.StudentProfiles.Include(x => x.User).FirstOrDefaultAsync(x => x.UserId == userId);
        return s == null ? null : Map(s);
    }

    public async Task<StudentDto> CreateAsync(CreateStudentRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = PasswordHelper.Hash(request.Password),
            PhoneNumber = request.PhoneNumber,
            Role = Roles.Student,
            IsActive = true
        };
        var profile = new StudentProfile
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            StudentCode = request.StudentCode,
            DateOfBirth = request.DateOfBirth,
            Gender = request.Gender,
            SchoolName = request.SchoolName,
            Notes = request.Notes
        };
        _context.Users.Add(user);
        _context.StudentProfiles.Add(profile);
        await _context.SaveChangesAsync();
        profile.User = user;
        return Map(profile);
    }

    public async Task<StudentDto?> UpdateAsync(Guid id, CreateStudentRequest request)
    {
        var profile = await _context.StudentProfiles.Include(s => s.User).FirstOrDefaultAsync(s => s.Id == id);
        if (profile == null) return null;

        profile.User.FullName = request.FullName;
        profile.User.Email = request.Email;
        profile.User.PhoneNumber = request.PhoneNumber;
        if (!string.IsNullOrWhiteSpace(request.Password))
            profile.User.PasswordHash = PasswordHelper.Hash(request.Password);
        profile.StudentCode = request.StudentCode;
        profile.DateOfBirth = request.DateOfBirth;
        profile.Gender = request.Gender;
        profile.SchoolName = request.SchoolName;
        profile.Notes = request.Notes;
        profile.UpdatedAt = DateTime.UtcNow;
        profile.User.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Map(profile);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var profile = await _context.StudentProfiles.Include(s => s.User).FirstOrDefaultAsync(s => s.Id == id);
        if (profile == null) return false;
        profile.User.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    private static StudentDto Map(StudentProfile s) =>
        new(s.Id, s.UserId, s.User.FullName, s.User.Email, s.StudentCode,
            s.DateOfBirth, s.Gender, s.SchoolName, s.Notes, s.User.IsActive);
}

public class ParentService
{
    private readonly AppDbContext _context;
    public ParentService(AppDbContext context) => _context = context;

    public async Task<List<ParentDto>> GetAllAsync()
    {
        var parents = await _context.ParentProfiles.Include(p => p.User).ToListAsync();
        var links = await _context.ParentStudents.ToListAsync();
        return parents.Select(p => Map(p, links.Where(l => l.ParentUserId == p.UserId).Select(l => l.StudentUserId).ToList())).ToList();
    }

    public async Task<ParentDto?> GetByIdAsync(Guid id)
    {
        var p = await _context.ParentProfiles.Include(x => x.User).FirstOrDefaultAsync(x => x.Id == id);
        if (p == null) return null;
        var children = await _context.ParentStudents.Where(l => l.ParentUserId == p.UserId).Select(l => l.StudentUserId).ToListAsync();
        return Map(p, children);
    }

    public async Task<ParentDto> CreateAsync(CreateParentRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = PasswordHelper.Hash(request.Password),
            PhoneNumber = request.PhoneNumber,
            Role = Roles.Parent,
            IsActive = true
        };
        var profile = new ParentProfile
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Relationship = request.Relationship,
            Address = request.Address
        };
        _context.Users.Add(user);
        _context.ParentProfiles.Add(profile);

        if (request.StudentUserIds != null)
        {
            foreach (var studentId in request.StudentUserIds)
            {
                _context.ParentStudents.Add(new ParentStudent
                {
                    Id = Guid.NewGuid(),
                    ParentUserId = user.Id,
                    StudentUserId = studentId,
                    Relationship = request.Relationship
                });
            }
        }

        await _context.SaveChangesAsync();
        profile.User = user;
        return Map(profile, request.StudentUserIds ?? []);
    }

    public async Task<ParentDto?> UpdateAsync(Guid id, CreateParentRequest request)
    {
        var profile = await _context.ParentProfiles.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == id);
        if (profile == null) return null;

        profile.User.FullName = request.FullName;
        profile.User.Email = request.Email;
        profile.User.PhoneNumber = request.PhoneNumber;
        if (!string.IsNullOrWhiteSpace(request.Password))
            profile.User.PasswordHash = PasswordHelper.Hash(request.Password);
        profile.Relationship = request.Relationship;
        profile.Address = request.Address;
        profile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var children = await _context.ParentStudents.Where(l => l.ParentUserId == profile.UserId).Select(l => l.StudentUserId).ToListAsync();
        return Map(profile, children);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var profile = await _context.ParentProfiles.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == id);
        if (profile == null) return false;
        profile.User.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    private static ParentDto Map(ParentProfile p, List<Guid> children) =>
        new(p.Id, p.UserId, p.User.FullName, p.User.Email, p.User.PhoneNumber, p.Relationship, p.Address, children, p.User.IsActive, p.User.CreatedAt);
}

public class TeacherService
{
    private readonly AppDbContext _context;
    public TeacherService(AppDbContext context) => _context = context;

    public async Task<List<TeacherDto>> GetAllAsync() =>
        await _context.TeacherProfiles.Include(t => t.User).Select(t => Map(t)).ToListAsync();

    public async Task<TeacherDto?> GetByIdAsync(Guid id)
    {
        var t = await _context.TeacherProfiles.Include(x => x.User).FirstOrDefaultAsync(x => x.Id == id);
        return t == null ? null : Map(t);
    }

    public async Task<TeacherDto> CreateAsync(CreateTeacherRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = PasswordHelper.Hash(request.Password),
            PhoneNumber = request.PhoneNumber,
            Role = Roles.Teacher,
            IsActive = true
        };
        var profile = new TeacherProfile
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Specialization = request.Specialization,
            Bio = request.Bio,
            HourlyRate = request.HourlyRate,
            EmploymentType = NormalizeEmploymentType(request.EmploymentType)
        };
        _context.Users.Add(user);
        _context.TeacherProfiles.Add(profile);
        await _context.SaveChangesAsync();
        profile.User = user;
        return Map(profile);
    }

    public async Task<TeacherDto?> UpdateAsync(Guid id, CreateTeacherRequest request)
    {
        var profile = await _context.TeacherProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == id);
        if (profile == null) return null;

        profile.User.FullName = request.FullName;
        profile.User.Email = request.Email;
        profile.User.PhoneNumber = request.PhoneNumber;
        if (!string.IsNullOrWhiteSpace(request.Password))
            profile.User.PasswordHash = PasswordHelper.Hash(request.Password);
        profile.Specialization = request.Specialization;
        profile.Bio = request.Bio;
        profile.HourlyRate = request.HourlyRate;
        profile.EmploymentType = NormalizeEmploymentType(request.EmploymentType ?? profile.EmploymentType);
        profile.UpdatedAt = DateTime.UtcNow;
        profile.User.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Map(profile);
    }

    public async Task<TeacherDto?> UpdateEmploymentTypeAsync(Guid id, string employmentType)
    {
        var profile = await _context.TeacherProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == id);
        if (profile == null) return null;

        profile.EmploymentType = NormalizeEmploymentType(employmentType);
        profile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Map(profile);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var profile = await _context.TeacherProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == id);
        if (profile == null) return false;
        profile.User.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    private static string NormalizeEmploymentType(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return EmploymentTypes.FullTime;
        var match = EmploymentTypes.All.FirstOrDefault(t =>
            t.Equals(value, StringComparison.OrdinalIgnoreCase) ||
            t.Replace(" ", "", StringComparison.Ordinal).Equals(value.Replace(" ", "", StringComparison.Ordinal), StringComparison.OrdinalIgnoreCase));
        if (match != null) return match;
        throw new InvalidOperationException($"Invalid employment type. Use: {string.Join(", ", EmploymentTypes.All)}");
    }

    private static TeacherDto Map(TeacherProfile t) =>
        new(t.Id, t.UserId, t.User.FullName, t.User.Email, t.User.PhoneNumber, t.Specialization, t.Bio, t.HourlyRate, t.EmploymentType, t.User.IsActive, t.User.CreatedAt);
}

public class CourseService
{
    private readonly AppDbContext _context;
    public CourseService(AppDbContext context) => _context = context;

    public async Task<List<CourseDto>> GetAllAsync() =>
        await _context.Courses.Select(c => Map(c)).ToListAsync();

    public async Task<CourseDto?> GetByIdAsync(Guid id)
    {
        var c = await _context.Courses.FindAsync(id);
        return c == null ? null : Map(c);
    }

    public async Task<CourseDto> CreateAsync(CourseDto dto)
    {
        var course = new Course
        {
            Id = Guid.NewGuid(),
            CourseName = dto.CourseName,
            Category = dto.Category,
            Description = dto.Description,
            Level = dto.Level,
            DefaultDurationMinutes = dto.DefaultDurationMinutes,
            IsActive = dto.IsActive
        };
        _context.Courses.Add(course);
        await _context.SaveChangesAsync();
        return Map(course);
    }

    public async Task<CourseDto?> UpdateAsync(Guid id, CourseDto dto)
    {
        var course = await _context.Courses.FindAsync(id);
        if (course == null) return null;
        course.CourseName = dto.CourseName;
        course.Category = dto.Category;
        course.Description = dto.Description;
        course.Level = dto.Level;
        course.DefaultDurationMinutes = dto.DefaultDurationMinutes;
        course.IsActive = dto.IsActive;
        course.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Map(course);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var course = await _context.Courses.FindAsync(id);
        if (course == null) return false;
        course.IsActive = false;
        course.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    private static CourseDto Map(Course c) =>
        new(c.Id, c.CourseName, c.Category, c.Description, c.Level, c.DefaultDurationMinutes, c.IsActive);
}

public class ClassService
{
    private readonly AppDbContext _context;
    public ClassService(AppDbContext context) => _context = context;

    public async Task<List<ClassDto>> GetAllAsync() =>
        await _context.Classes
            .Include(c => c.Course)
            .Include(c => c.TeacherUser)
            .Include(c => c.Enrollments)
            .Select(c => Map(c)).ToListAsync();

    public async Task<ClassDto?> GetByIdAsync(Guid id)
    {
        var c = await _context.Classes.Include(x => x.Course).Include(x => x.TeacherUser).Include(x => x.Enrollments)
            .FirstOrDefaultAsync(x => x.Id == id);
        return c == null ? null : Map(c);
    }

    public async Task<ClassDto> CreateAsync(ClassDto dto)
    {
        var cls = new MusicClass
        {
            Id = Guid.NewGuid(),
            CourseId = dto.CourseId,
            TeacherUserId = dto.TeacherUserId,
            ClassName = dto.ClassName,
            DayOfWeek = dto.DayOfWeek,
            StartTime = TimeSpan.Parse(dto.StartTime),
            EndTime = TimeSpan.Parse(dto.EndTime),
            MaxStudents = dto.MaxStudents,
            Location = dto.Location,
            IsActive = dto.IsActive
        };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();
        return (await GetByIdAsync(cls.Id))!;
    }

    public async Task<ClassDto?> UpdateAsync(Guid id, ClassDto dto)
    {
        var cls = await _context.Classes.FindAsync(id);
        if (cls == null) return null;
        cls.CourseId = dto.CourseId;
        cls.TeacherUserId = dto.TeacherUserId;
        cls.ClassName = dto.ClassName;
        cls.DayOfWeek = dto.DayOfWeek;
        cls.StartTime = TimeSpan.Parse(dto.StartTime);
        cls.EndTime = TimeSpan.Parse(dto.EndTime);
        cls.MaxStudents = dto.MaxStudents;
        cls.Location = dto.Location;
        cls.IsActive = dto.IsActive;
        cls.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var cls = await _context.Classes.FindAsync(id);
        if (cls == null) return false;
        cls.IsActive = false;
        cls.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    private static ClassDto Map(MusicClass c) =>
        new(c.Id, c.CourseId, c.Course.CourseName, c.TeacherUserId, c.TeacherUser.FullName,
            c.ClassName, c.DayOfWeek, TimeHelper.FormatTime(c.StartTime), TimeHelper.FormatTime(c.EndTime),
            c.MaxStudents, c.Enrollments.Count(e => e.Status == "Active"), c.Location, c.IsActive);
}

public class EnrollmentService
{
    private readonly AppDbContext _context;
    public EnrollmentService(AppDbContext context) => _context = context;

    public async Task<List<EnrollmentDto>> GetAllAsync() =>
        await _context.Enrollments
            .Include(e => e.StudentUser)
            .Include(e => e.Class)
            .Select(e => Map(e)).ToListAsync();

    public async Task<EnrollmentDto> CreateAsync(EnrollmentDto dto)
    {
        var enrollment = new Enrollment
        {
            Id = Guid.NewGuid(),
            StudentUserId = dto.StudentUserId,
            ClassId = dto.ClassId,
            EnrollmentDate = dto.EnrollmentDate,
            Status = dto.Status
        };
        _context.Enrollments.Add(enrollment);
        await _context.SaveChangesAsync();
        return (await GetAllAsync()).First(e => e.Id == enrollment.Id);
    }

    public async Task<EnrollmentDto?> UpdateAsync(Guid id, EnrollmentDto dto)
    {
        var enrollment = await _context.Enrollments.FindAsync(id);
        if (enrollment == null) return null;
        enrollment.Status = dto.Status;
        enrollment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        var updated = await _context.Enrollments.Include(e => e.StudentUser).Include(e => e.Class)
            .FirstAsync(e => e.Id == id);
        return Map(updated);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var enrollment = await _context.Enrollments.FindAsync(id);
        if (enrollment == null) return false;
        enrollment.Status = "Cancelled";
        enrollment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    private static EnrollmentDto Map(Enrollment e) =>
        new(e.Id, e.StudentUserId, e.StudentUser.FullName, e.ClassId, e.Class.ClassName, e.EnrollmentDate, e.Status);
}

public class ClassSessionService
{
    private readonly AppDbContext _context;
    public ClassSessionService(AppDbContext context) => _context = context;

    public async Task<List<ClassSessionDto>> GetAllAsync() =>
        await _context.ClassSessions.Include(s => s.Class).Select(s => Map(s)).ToListAsync();

    public async Task<ClassSessionDto?> GetByIdAsync(Guid id)
    {
        var s = await _context.ClassSessions.Include(x => x.Class).FirstOrDefaultAsync(x => x.Id == id);
        return s == null ? null : Map(s);
    }

    public async Task<ClassSessionDto> CreateAsync(ClassSessionDto dto)
    {
        var session = new ClassSession
        {
            Id = Guid.NewGuid(),
            ClassId = dto.ClassId,
            SessionDate = dto.SessionDate,
            StartTime = TimeSpan.Parse(dto.StartTime),
            EndTime = TimeSpan.Parse(dto.EndTime),
            Topic = dto.Topic,
            Notes = dto.Notes,
            Status = dto.Status
        };
        _context.ClassSessions.Add(session);
        await _context.SaveChangesAsync();
        return (await GetByIdAsync(session.Id))!;
    }

    public async Task<ClassSessionDto?> UpdateAsync(Guid id, ClassSessionDto dto)
    {
        var session = await _context.ClassSessions.FindAsync(id);
        if (session == null) return null;
        session.SessionDate = dto.SessionDate;
        session.StartTime = TimeSpan.Parse(dto.StartTime);
        session.EndTime = TimeSpan.Parse(dto.EndTime);
        session.Topic = dto.Topic;
        session.Notes = dto.Notes;
        session.Status = dto.Status;
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var session = await _context.ClassSessions.FindAsync(id);
        if (session == null) return false;
        session.Status = "Cancelled";
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    private static ClassSessionDto Map(ClassSession s) =>
        new(s.Id, s.ClassId, s.Class.ClassName, s.SessionDate,
            TimeHelper.FormatTime(s.StartTime), TimeHelper.FormatTime(s.EndTime),
            s.Topic, s.Notes, s.Status);
}

public class AttendanceService
{
    private readonly AppDbContext _context;
    public AttendanceService(AppDbContext context) => _context = context;

    public async Task<List<AttendanceDto>> GetAllAsync() =>
        await _context.Attendances
            .Include(a => a.StudentUser)
            .Include(a => a.ClassSession).ThenInclude(s => s.Class)
            .Select(a => Map(a)).ToListAsync();

    public async Task<List<AttendanceDto>> GetBySessionAsync(Guid sessionId) =>
        await _context.Attendances
            .Include(a => a.StudentUser)
            .Include(a => a.ClassSession).ThenInclude(s => s.Class)
            .Where(a => a.ClassSessionId == sessionId)
            .Select(a => Map(a)).ToListAsync();

    public async Task<AttendanceDto> CreateAsync(AttendanceDto dto)
    {
        var attendance = new Attendance
        {
            Id = Guid.NewGuid(),
            ClassSessionId = dto.ClassSessionId,
            StudentUserId = dto.StudentUserId,
            Status = dto.Status,
            Remarks = dto.Remarks
        };
        _context.Attendances.Add(attendance);
        await _context.SaveChangesAsync();
        return (await GetAllAsync()).First(a => a.Id == attendance.Id);
    }

    public async Task<AttendanceDto?> UpdateAsync(Guid id, AttendanceDto dto)
    {
        var attendance = await _context.Attendances.FindAsync(id);
        if (attendance == null) return null;
        attendance.Status = dto.Status;
        attendance.Remarks = dto.Remarks;
        attendance.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return (await GetAllAsync()).FirstOrDefault(a => a.Id == id);
    }

    private static AttendanceDto Map(Attendance a) =>
        new(a.Id, a.ClassSessionId, a.ClassSession.SessionDate, a.ClassSession.Class.ClassName,
            a.StudentUserId, a.StudentUser.FullName, a.Status, a.Remarks);

    public async Task<AttendanceCheckInDto?> GetActiveCheckInAsync(Guid classSessionId)
    {
        var now = DateTime.UtcNow;
        var checkIn = await _context.AttendanceCheckIns
            .Include(c => c.ClassSession).ThenInclude(s => s.Class)
            .Where(c => c.ClassSessionId == classSessionId)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync();
        if (checkIn == null || !ClassHasNotEnded(checkIn.ClassSession, now))
            return null;
        return MapCheckIn(checkIn, checkIn.ClassSession);
    }

    public async Task<AttendanceCheckInDto> GenerateCheckInAsync(Guid classSessionId, Guid teacherUserId)
    {
        var session = await _context.ClassSessions.Include(s => s.Class).FirstOrDefaultAsync(s => s.Id == classSessionId)
            ?? throw new InvalidOperationException("Session not found.");
        if (session.Class.TeacherUserId != teacherUserId)
            throw new UnauthorizedAccessException("Not your class session.");

        var now = DateTime.UtcNow;
        var existing = await _context.AttendanceCheckIns
            .Where(c => c.ClassSessionId == classSessionId)
            .ToListAsync();
        _context.AttendanceCheckIns.RemoveRange(existing);

        var classEnd = GetSessionEnd(session);
        var code = await GenerateUniqueCodeAsync();
        var checkIn = new AttendanceCheckIn
        {
            Id = Guid.NewGuid(),
            ClassSessionId = classSessionId,
            Code = code,
            ExpiresAt = classEnd,
            CreatedByUserId = teacherUserId,
            CreatedAt = now
        };
        _context.AttendanceCheckIns.Add(checkIn);
        await _context.SaveChangesAsync();
        return MapCheckIn(checkIn, session, session.Class.ClassName);
    }

    public async Task<AttendanceDto> RedeemCheckInAsync(string code, Guid studentUserId)
    {
        var normalized = code.Trim();
        if (normalized.Length != 5 || !normalized.All(char.IsDigit))
            throw new InvalidOperationException("Enter a valid 5-digit code.");

        var now = DateTime.UtcNow;
        var checkIn = await _context.AttendanceCheckIns
            .Include(c => c.ClassSession).ThenInclude(s => s.Class)
            .FirstOrDefaultAsync(c => c.Code == normalized)
            ?? throw new InvalidOperationException("Invalid code.");

        if (!IsWithinClassWindow(checkIn.ClassSession, now))
            throw new InvalidOperationException("Check-in is only available during class time.");

        var classId = checkIn.ClassSession.ClassId;
        var enrolled = await _context.Enrollments.AnyAsync(e =>
            e.ClassId == classId && e.StudentUserId == studentUserId && e.Status == "Active");
        if (!enrolled)
            throw new InvalidOperationException("You are not enrolled in this class.");

        var existing = await _context.Attendances.FirstOrDefaultAsync(a =>
            a.ClassSessionId == checkIn.ClassSessionId && a.StudentUserId == studentUserId);
        if (existing != null)
        {
            existing.Status = "Present";
            existing.Remarks = "Checked in with code";
            existing.UpdatedAt = now;
            await _context.SaveChangesAsync();
            return (await GetAllAsync()).First(a => a.Id == existing.Id);
        }

        return await CreateAsync(new AttendanceDto(
            Guid.Empty,
            checkIn.ClassSessionId,
            checkIn.ClassSession.SessionDate,
            checkIn.ClassSession.Class.ClassName,
            studentUserId,
            null,
            "Present",
            "Checked in with code"));
    }

    private async Task<string> GenerateUniqueCodeAsync()
    {
        for (var i = 0; i < 20; i++)
        {
            var code = Random.Shared.Next(10000, 100000).ToString();
            var exists = await _context.AttendanceCheckIns.AnyAsync(c => c.Code == code);
            if (!exists) return code;
        }
        throw new InvalidOperationException("Could not generate a unique code. Try again.");
    }

    private static DateTime GetSessionStart(ClassSession session) =>
        session.SessionDate.Date.Add(session.StartTime);

    private static DateTime GetSessionEnd(ClassSession session) =>
        session.SessionDate.Date.Add(session.EndTime);

    private static bool IsWithinClassWindow(ClassSession session, DateTime now)
    {
        return now >= GetSessionStart(session) && now <= GetSessionEnd(session);
    }

    private static bool ClassHasNotEnded(ClassSession session, DateTime now) =>
        now <= GetSessionEnd(session);

    private static AttendanceCheckInDto MapCheckIn(AttendanceCheckIn c, ClassSession session, string? className = null) =>
        new(
            c.ClassSessionId,
            className ?? session.Class?.ClassName,
            c.Code,
            GetSessionStart(session),
            GetSessionEnd(session));
}

public class LessonNoteService
{
    private readonly AppDbContext _context;
    public LessonNoteService(AppDbContext context) => _context = context;

    public async Task<List<LessonNoteDto>> GetAllAsync() =>
        await _context.LessonNotes
            .Include(n => n.StudentUser)
            .Include(n => n.TeacherUser)
            .Include(n => n.ClassSession).ThenInclude(s => s.Class)
            .Select(n => Map(n)).ToListAsync();

    public async Task<List<LessonNoteDto>> GetByStudentAsync(Guid studentUserId) =>
        await _context.LessonNotes
            .Include(n => n.StudentUser)
            .Include(n => n.TeacherUser)
            .Include(n => n.ClassSession).ThenInclude(s => s.Class)
            .Where(n => n.StudentUserId == studentUserId)
            .Select(n => Map(n)).ToListAsync();

    public async Task<LessonNoteDto> CreateAsync(LessonNoteDto dto)
    {
        var note = new LessonNote
        {
            Id = Guid.NewGuid(),
            ClassSessionId = dto.ClassSessionId,
            StudentUserId = dto.StudentUserId,
            TeacherUserId = dto.TeacherUserId,
            NoteTitle = dto.NoteTitle,
            NoteContent = dto.NoteContent,
            PracticeInstructions = dto.PracticeInstructions
        };
        _context.LessonNotes.Add(note);
        await _context.SaveChangesAsync();
        return (await GetAllAsync()).First(n => n.Id == note.Id);
    }

    public async Task<LessonNoteDto?> UpdateAsync(Guid id, LessonNoteDto dto)
    {
        var note = await _context.LessonNotes.FindAsync(id);
        if (note == null) return null;
        note.NoteTitle = dto.NoteTitle;
        note.NoteContent = dto.NoteContent;
        note.PracticeInstructions = dto.PracticeInstructions;
        note.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return (await GetAllAsync()).FirstOrDefault(n => n.Id == id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var note = await _context.LessonNotes.FindAsync(id);
        if (note == null) return false;
        _context.LessonNotes.Remove(note);
        await _context.SaveChangesAsync();
        return true;
    }

    private static LessonNoteDto Map(LessonNote n) =>
        new(n.Id, n.ClassSessionId, n.ClassSession.Class.ClassName, n.StudentUserId, n.StudentUser.FullName,
            n.TeacherUserId, n.TeacherUser.FullName, n.NoteTitle, n.NoteContent, n.PracticeInstructions, n.CreatedAt);
}

public class AnnouncementService
{
    private readonly AppDbContext _context;
    public AnnouncementService(AppDbContext context) => _context = context;

    public async Task<List<AnnouncementDto>> GetAllAsync() =>
        await _context.Announcements.Include(a => a.CreatedByUser).Select(a => Map(a)).ToListAsync();

    public async Task<AnnouncementDto> CreateAsync(AnnouncementDto dto)
    {
        var announcement = new Announcement
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            Content = dto.Content,
            Category = dto.Category,
            HolidayDate = dto.HolidayDate,
            TargetRole = dto.TargetRole,
            CreatedByUserId = dto.CreatedByUserId
        };
        _context.Announcements.Add(announcement);
        await _context.SaveChangesAsync();
        return (await GetAllAsync()).First(a => a.Id == announcement.Id);
    }

    public async Task<AnnouncementDto?> UpdateAsync(Guid id, AnnouncementDto dto)
    {
        var announcement = await _context.Announcements.FindAsync(id);
        if (announcement == null) return null;
        announcement.Title = dto.Title;
        announcement.Content = dto.Content;
        announcement.Category = dto.Category;
        announcement.HolidayDate = dto.HolidayDate;
        announcement.TargetRole = dto.TargetRole;
        announcement.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return (await GetAllAsync()).FirstOrDefault(a => a.Id == id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var announcement = await _context.Announcements.FindAsync(id);
        if (announcement == null) return false;
        _context.Announcements.Remove(announcement);
        await _context.SaveChangesAsync();
        return true;
    }

    private static AnnouncementDto Map(Announcement a) =>
        new(a.Id, a.Title, a.Content, a.Category, a.HolidayDate, a.TargetRole, a.CreatedByUserId, a.CreatedByUser.FullName, a.CreatedAt);
}

public class InvoiceService
{
    private readonly AppDbContext _context;
    public InvoiceService(AppDbContext context) => _context = context;

    public async Task<List<InvoiceDto>> GetAllAsync() =>
        await _context.Invoices
            .Include(i => i.StudentUser)
            .Include(i => i.ParentUser)
            .Select(i => Map(i)).ToListAsync();

    public async Task<InvoiceDto?> GetByIdAsync(Guid id)
    {
        var i = await _context.Invoices.Include(x => x.StudentUser).Include(x => x.ParentUser).FirstOrDefaultAsync(x => x.Id == id);
        return i == null ? null : Map(i);
    }

    private static InvoiceDto Map(Invoice i) =>
        new(i.Id, i.StudentUserId, i.StudentUser.FullName, i.ParentUserId, i.ParentUser?.FullName,
            i.InvoiceNo, i.Amount, i.Status, i.DueDate, i.CreatedAt);
}
