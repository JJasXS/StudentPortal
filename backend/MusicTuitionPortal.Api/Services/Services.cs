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

        if (!Roles.CanSignIn(user.Role))
            throw new InvalidOperationException(
                "This account cannot sign in here. Use a student account — each learner has their own login.");

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

    public async Task<LoginResponse> RegisterStudentAsync(RegisterStudentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            throw new InvalidOperationException("Full name is required.");
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new InvalidOperationException("Email is required.");
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            throw new InvalidOperationException("Password must be at least 6 characters.");
        if (string.IsNullOrWhiteSpace(request.Gender))
            throw new InvalidOperationException("Gender is required.");
        if (request.DateOfBirth.Date > DateTime.UtcNow.Date)
            throw new InvalidOperationException("Date of birth cannot be in the future.");

        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already exists.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim(),
            PasswordHash = PasswordHelper.Hash(request.Password),
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            Role = Roles.Student,
            IsActive = true
        };

        var notes = BuildStudentInterestNotes(request.Instrument, request.Experience);
        var profile = new StudentProfile
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            StudentCode = await NextStudentCodeAsync(),
            DateOfBirth = request.DateOfBirth.Date,
            Gender = request.Gender.Trim(),
            SchoolName = string.IsNullOrWhiteSpace(request.SchoolName) ? null : request.SchoolName.Trim(),
            Notes = notes
        };

        _context.Users.Add(user);
        _context.StudentProfiles.Add(profile);
        await _context.SaveChangesAsync();

        var token = JwtHelper.GenerateToken(user, _jwtSettings);
        return new LoginResponse(token, MapUser(user));
    }

    private async Task<string> NextStudentCodeAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"STU-{year}-";
        var count = await _context.StudentProfiles.CountAsync(s => s.StudentCode.StartsWith(prefix));
        return $"{prefix}{(count + 1):D4}";
    }

    private static string? BuildStudentInterestNotes(string? instrument, string? experience)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(instrument))
            parts.Add($"Interest: {instrument.Trim()}");
        if (!string.IsNullOrWhiteSpace(experience))
            parts.Add($"Experience: {experience.Trim()}");
        return parts.Count == 0 ? null : string.Join("; ", parts);
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

    public async Task<string?> RequestPasswordResetAsync(ForgotPasswordRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email && u.IsActive);
        if (user == null) return null;

        var existing = await _context.PasswordResets.Where(r => r.UserId == user.Id).ToListAsync();
        if (existing.Count > 0)
            _context.PasswordResets.RemoveRange(existing);

        var code = Random.Shared.Next(100000, 999999).ToString();
        _context.PasswordResets.Add(new PasswordReset
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = code,
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        });
        await _context.SaveChangesAsync();
        return code;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email && u.IsActive);
        if (user == null) return false;

        var reset = await _context.PasswordResets
            .Where(r => r.UserId == user.Id && r.Token == request.ResetCode.Trim())
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();

        if (reset == null || reset.ExpiresAt < DateTime.UtcNow)
            return false;

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            return false;

        user.PasswordHash = PasswordHelper.Hash(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        _context.PasswordResets.Remove(reset);
        await _context.SaveChangesAsync();
        return true;
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
    private readonly AuditLogService _audit;
    public StudentService(AppDbContext context, AuditLogService audit)
    {
        _context = context;
        _audit = audit;
    }

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

    public async Task<StudentSelfProfileDto?> GetSelfProfileAsync(Guid userId)
    {
        var profile = await _context.StudentProfiles.Include(s => s.User).FirstOrDefaultAsync(s => s.UserId == userId);
        if (profile == null) return null;

        LinkedParentSummaryDto? parent = null;
        var link = await _context.ParentStudents.FirstOrDefaultAsync(l => l.StudentUserId == userId);
        if (link != null)
        {
            var parentProfile = await _context.ParentProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.UserId == link.ParentUserId);
            if (parentProfile != null)
            {
                parent = new LinkedParentSummaryDto(
                    parentProfile.User.FullName,
                    parentProfile.User.Email,
                    parentProfile.User.PhoneNumber,
                    parentProfile.Relationship ?? link.Relationship);
            }
        }

        return new StudentSelfProfileDto(
            profile.Id,
            profile.UserId,
            profile.User.FullName,
            profile.User.Email,
            profile.User.PhoneNumber,
            profile.StudentCode,
            profile.DateOfBirth,
            profile.Gender,
            profile.SchoolName,
            profile.Notes,
            parent,
            profile.User.IsActive);
    }

    public async Task<StudentSelfProfileDto?> UpdateSelfAsync(Guid userId, UpdateStudentSelfRequest request)
    {
        var profile = await _context.StudentProfiles.Include(s => s.User).FirstOrDefaultAsync(s => s.UserId == userId);
        if (profile == null) return null;

        if (request.DateOfBirth.HasValue && request.DateOfBirth.Value.Date > DateTime.UtcNow.Date)
            throw new InvalidOperationException("Date of birth cannot be in the future.");

        profile.DateOfBirth = request.DateOfBirth?.Date;
        profile.Gender = string.IsNullOrWhiteSpace(request.Gender) ? profile.Gender : request.Gender.Trim();
        profile.SchoolName = string.IsNullOrWhiteSpace(request.SchoolName) ? null : request.SchoolName.Trim();
        profile.Notes = BuildStudentInterestNotes(request.Instrument, request.Experience);
        profile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return await GetSelfProfileAsync(userId);
    }

    private static string? BuildStudentInterestNotes(string? instrument, string? experience)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(instrument))
            parts.Add($"Interest: {instrument.Trim()}");
        if (!string.IsNullOrWhiteSpace(experience))
            parts.Add($"Experience: {experience.Trim()}");
        return parts.Count == 0 ? null : string.Join("; ", parts);
    }

    public async Task<StudentDto> CreateAsync(CreateStudentRequest request)
    {
        if (request.ParentUserId is not Guid parentUserId || parentUserId == Guid.Empty)
            throw new InvalidOperationException("A parent account is required before adding a student.");

        var parent = await _context.ParentProfiles
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.UserId == parentUserId && p.User.IsActive);
        if (parent == null)
            throw new InvalidOperationException("Selected parent was not found. Create the parent account first.");

        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already exists.");

        var password = string.IsNullOrWhiteSpace(request.Password) ? "Student@123" : request.Password.Trim();
        if (password.Length < 6)
            throw new InvalidOperationException("Password must be at least 6 characters.");

        var studentCode = string.IsNullOrWhiteSpace(request.StudentCode)
            ? await NextStudentCodeAsync()
            : request.StudentCode.Trim();

        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim(),
            PasswordHash = PasswordHelper.Hash(password),
            PhoneNumber = request.PhoneNumber,
            Role = Roles.Student,
            IsActive = true
        };
        var profile = new StudentProfile
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            StudentCode = studentCode,
            DateOfBirth = request.DateOfBirth,
            Gender = request.Gender,
            SchoolName = request.SchoolName,
            Notes = request.Notes
        };
        _context.Users.Add(user);
        _context.StudentProfiles.Add(profile);
        _context.ParentStudents.Add(new ParentStudent
        {
            Id = Guid.NewGuid(),
            ParentUserId = parent.UserId,
            StudentUserId = user.Id,
            Relationship = parent.Relationship
        });
        await _context.SaveChangesAsync();
        profile.User = user;
        await _audit.LogAsync("student.created", "Student", profile.Id.ToString(), user.FullName);
        return Map(profile);
    }

    private async Task<string> NextStudentCodeAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"STU-{year}-";
        var count = await _context.StudentProfiles.CountAsync(s => s.StudentCode.StartsWith(prefix));
        return $"{prefix}{(count + 1):D4}";
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
        if (!string.IsNullOrWhiteSpace(request.StudentCode))
            profile.StudentCode = request.StudentCode.Trim();
        profile.DateOfBirth = request.DateOfBirth;
        profile.Gender = request.Gender;
        profile.SchoolName = request.SchoolName;
        profile.Notes = request.Notes;
        profile.UpdatedAt = DateTime.UtcNow;
        profile.User.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _audit.LogAsync("student.updated", "Student", profile.Id.ToString(), profile.User.FullName);
        return Map(profile);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var profile = await _context.StudentProfiles.Include(s => s.User).FirstOrDefaultAsync(s => s.Id == id);
        if (profile == null) return false;
        profile.User.IsActive = false;
        await _context.SaveChangesAsync();
        await _audit.LogAsync("student.deactivated", "Student", profile.Id.ToString(), profile.User.FullName);
        return true;
    }

    private static StudentDto Map(StudentProfile s) =>
        new(s.Id, s.UserId, s.User.FullName, s.User.Email, s.StudentCode,
            s.DateOfBirth, s.Gender, s.SchoolName, s.Notes, s.User.IsActive);
}

public class ParentService
{
    private readonly AppDbContext _context;
    private readonly AuditLogService _audit;
    public ParentService(AppDbContext context, AuditLogService audit)
    {
        _context = context;
        _audit = audit;
    }

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
        await _audit.LogAsync("parent.created", "Parent", profile.Id.ToString(), user.FullName);
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
        await _audit.LogAsync("parent.updated", "Parent", profile.Id.ToString(), profile.User.FullName);

        var children = await _context.ParentStudents.Where(l => l.ParentUserId == profile.UserId).Select(l => l.StudentUserId).ToListAsync();
        return Map(profile, children);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var profile = await _context.ParentProfiles.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == id);
        if (profile == null) return false;
        profile.User.IsActive = false;
        await _context.SaveChangesAsync();
        await _audit.LogAsync("parent.deactivated", "Parent", profile.Id.ToString(), profile.User.FullName);
        return true;
    }

    private static ParentDto Map(ParentProfile p, List<Guid> children) =>
        new(p.Id, p.UserId, p.User.FullName, p.User.Email, p.User.PhoneNumber, p.Relationship, p.Address, children, p.User.IsActive, p.User.CreatedAt);
}

public class TeacherService
{
    private readonly AppDbContext _context;
    private readonly AuditLogService _audit;
    public TeacherService(AppDbContext context, AuditLogService audit)
    {
        _context = context;
        _audit = audit;
    }

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
        await _audit.LogAsync("teacher.created", "Teacher", profile.Id.ToString(), user.FullName);
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
        await _audit.LogAsync("teacher.updated", "Teacher", profile.Id.ToString(), profile.User.FullName);
        return Map(profile);
    }

    public async Task<TeacherDto?> UpdateEmploymentTypeAsync(Guid id, string employmentType)
    {
        var profile = await _context.TeacherProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == id);
        if (profile == null) return null;

        profile.EmploymentType = NormalizeEmploymentType(employmentType);
        profile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _audit.LogAsync("teacher.employment_updated", "Teacher", profile.Id.ToString(), profile.User.FullName, employmentType);
        return Map(profile);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var profile = await _context.TeacherProfiles.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == id);
        if (profile == null) return false;
        profile.User.IsActive = false;
        await _context.SaveChangesAsync();
        await _audit.LogAsync("teacher.deactivated", "Teacher", profile.Id.ToString(), profile.User.FullName);
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
    private readonly AuditLogService _audit;
    public CourseService(AppDbContext context, AuditLogService audit)
    {
        _context = context;
        _audit = audit;
    }

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
        await _audit.LogAsync("course.created", "Course", course.Id.ToString(), course.CourseName);
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
        await _audit.LogAsync("course.updated", "Course", course.Id.ToString(), course.CourseName);
        return Map(course);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var course = await _context.Courses.FindAsync(id);
        if (course == null) return false;
        course.IsActive = false;
        course.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _audit.LogAsync("course.deactivated", "Course", course.Id.ToString(), course.CourseName);
        return true;
    }

    private static CourseDto Map(Course c) =>
        new(c.Id, c.CourseName, c.Category, c.Description, c.Level, c.DefaultDurationMinutes, c.IsActive);
}

public class ClassService
{
    private readonly AppDbContext _context;
    private readonly AuditLogService _audit;
    private readonly ClassSessionService _sessions;
    public ClassService(AppDbContext context, AuditLogService audit, ClassSessionService sessions)
    {
        _context = context;
        _audit = audit;
        _sessions = sessions;
    }

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
        await _audit.LogAsync("class.created", "Class", cls.Id.ToString(), cls.ClassName);

        var from = DateTime.UtcNow.Date;
        await _sessions.GenerateAsync(new GenerateSessionsRequest(cls.Id, from.ToString("yyyy-MM-dd"), from.AddDays(56).ToString("yyyy-MM-dd")));

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
        await _audit.LogAsync("class.updated", "Class", cls.Id.ToString(), cls.ClassName);
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var cls = await _context.Classes.FindAsync(id);
        if (cls == null) return false;
        cls.IsActive = false;
        cls.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _audit.LogAsync("class.deactivated", "Class", cls.Id.ToString(), cls.ClassName);
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
    private readonly AuditLogService _audit;
    public EnrollmentService(AppDbContext context, AuditLogService audit)
    {
        _context = context;
        _audit = audit;
    }

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
        var created = (await GetAllAsync()).First(e => e.Id == enrollment.Id);
        await _audit.LogAsync("enrollment.created", "Enrollment", enrollment.Id.ToString(), created.StudentName);
        return created;
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
        await _audit.LogAsync("enrollment.updated", "Enrollment", enrollment.Id.ToString(), updated.StudentUser.FullName, dto.Status);
        return Map(updated);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var enrollment = await _context.Enrollments.Include(e => e.StudentUser).FirstOrDefaultAsync(e => e.Id == id);
        if (enrollment == null) return false;
        enrollment.Status = "Cancelled";
        enrollment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _audit.LogAsync("enrollment.cancelled", "Enrollment", enrollment.Id.ToString(), enrollment.StudentUser.FullName);
        return true;
    }

    private static EnrollmentDto Map(Enrollment e) =>
        new(e.Id, e.StudentUserId, e.StudentUser.FullName, e.ClassId, e.Class.ClassName, e.EnrollmentDate, e.Status);
}

public class ClassSessionService
{
    private readonly AppDbContext _context;
    private readonly AuditLogService _audit;
    public ClassSessionService(AppDbContext context, AuditLogService audit)
    {
        _context = context;
        _audit = audit;
    }

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
        await _audit.LogAsync("session.created", "ClassSession", session.Id.ToString(), session.Topic ?? "Session");
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

    public async Task<ClassSessionDto> GetOrCreateTodayAsync(Guid classId)
    {
        var today = DateTime.UtcNow.Date;
        var existing = await _context.ClassSessions
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.ClassId == classId && s.SessionDate.Date == today);
        if (existing != null) return Map(existing);

        var cls = await _context.Classes.FindAsync(classId)
            ?? throw new InvalidOperationException("Class not found");

        if (!MatchesDayOfWeek(cls.DayOfWeek, today))
            throw new InvalidOperationException("Today is not a scheduled day for this class.");

        var session = new ClassSession
        {
            Id = Guid.NewGuid(),
            ClassId = classId,
            SessionDate = today,
            StartTime = cls.StartTime,
            EndTime = cls.EndTime,
            Status = "Scheduled"
        };
        _context.ClassSessions.Add(session);
        await _context.SaveChangesAsync();
        await _audit.LogAsync("session.auto_created", "ClassSession", session.Id.ToString(), cls.ClassName, "Today");
        return (await GetByIdAsync(session.Id))!;
    }

    public async Task<GenerateSessionsResultDto> GenerateAsync(GenerateSessionsRequest request)
    {
        var from = DateTime.Parse(request.FromDate).Date;
        var to = DateTime.Parse(request.ToDate).Date;
        if (to < from) throw new ArgumentException("ToDate must be on or after FromDate.");

        var holidayDates = (await _context.Announcements
            .Where(a => a.HolidayDate != null)
            .Select(a => a.HolidayDate!.Value.Date)
            .ToListAsync()).ToHashSet();

        var classesQuery = _context.Classes.Where(c => c.IsActive);
        if (request.ClassId.HasValue)
            classesQuery = classesQuery.Where(c => c.Id == request.ClassId.Value);
        var classes = await classesQuery.ToListAsync();

        var existingKeys = (await _context.ClassSessions
            .Where(s => s.SessionDate >= from && s.SessionDate <= to)
            .Select(s => new { s.ClassId, Date = s.SessionDate.Date })
            .ToListAsync())
            .Select(x => (x.ClassId, x.Date))
            .ToHashSet();

        var createdSessions = new List<ClassSession>();
        var skipped = 0;

        for (var date = from; date <= to; date = date.AddDays(1))
        {
            if (holidayDates.Contains(date))
            {
                skipped++;
                continue;
            }

            foreach (var cls in classes.Where(c => MatchesDayOfWeek(c.DayOfWeek, date)))
            {
                if (existingKeys.Contains((cls.Id, date)))
                {
                    skipped++;
                    continue;
                }

                var session = new ClassSession
                {
                    Id = Guid.NewGuid(),
                    ClassId = cls.Id,
                    SessionDate = date,
                    StartTime = cls.StartTime,
                    EndTime = cls.EndTime,
                    Status = "Scheduled"
                };
                createdSessions.Add(session);
                existingKeys.Add((cls.Id, date));
            }
        }

        if (createdSessions.Count > 0)
        {
            _context.ClassSessions.AddRange(createdSessions);
            await _context.SaveChangesAsync();
            await _audit.LogAsync(
                "session.bulk_generated",
                "ClassSession",
                request.ClassId?.ToString(),
                createdSessions.Count.ToString(),
                $"{from:yyyy-MM-dd} to {to:yyyy-MM-dd}");
        }

        var sessionDtos = new List<ClassSessionDto>();
        foreach (var s in createdSessions)
        {
            var loaded = await _context.ClassSessions.Include(x => x.Class).FirstAsync(x => x.Id == s.Id);
            sessionDtos.Add(Map(loaded));
        }

        return new GenerateSessionsResultDto(createdSessions.Count, skipped, sessionDtos);
    }

    private static bool MatchesDayOfWeek(string dayOfWeek, DateTime date)
    {
        var normalized = dayOfWeek.Trim();
        return string.Equals(date.ToString("dddd"), normalized, StringComparison.OrdinalIgnoreCase)
            || string.Equals(date.ToString("ddd"), normalized, StringComparison.OrdinalIgnoreCase);
    }

    private static ClassSessionDto Map(ClassSession s) =>
        new(s.Id, s.ClassId, s.Class.ClassName, s.SessionDate,
            TimeHelper.FormatTime(s.StartTime), TimeHelper.FormatTime(s.EndTime),
            s.Topic, s.Notes, s.Status);
}

public class AttendanceService
{
    private readonly AppDbContext _context;
    private readonly NotificationService _notifications;
    public AttendanceService(AppDbContext context, NotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

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
        await NotifyIfAbsentAsync(attendance);
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
        await NotifyIfAbsentAsync(attendance);
        return (await GetAllAsync()).FirstOrDefault(a => a.Id == id);
    }

    private async Task NotifyIfAbsentAsync(Attendance attendance)
    {
        if (attendance.Status is not ("Absent" or "Late")) return;

        var session = await _context.ClassSessions
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == attendance.ClassSessionId);
        if (session == null) return;

        var student = await _context.Users.FindAsync(attendance.StudentUserId);
        var label = attendance.Status == "Late" ? "Late to class" : "Absent from class";
        await _notifications.NotifyParentsOfStudentAsync(
            attendance.StudentUserId,
            label,
            $"{student?.FullName ?? "Your child"} was marked {attendance.Status.ToLower()} for {session.Class.ClassName} on {session.SessionDate:dd MMM yyyy}.",
            "Attendance",
            "/parent/attendance");
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
    private readonly NotificationService _notifications;
    public LessonNoteService(AppDbContext context, NotificationService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

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
        var created = (await GetAllAsync()).First(n => n.Id == note.Id);
        await _notifications.NotifyParentsOfStudentAsync(
            note.StudentUserId,
            "New lesson note",
            created.NoteTitle,
            "LessonNote",
            "/parent/lesson-notes");
        return created;
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
    private readonly AuditLogService _audit;
    private readonly NotificationService _notifications;
    public AnnouncementService(AppDbContext context, AuditLogService audit, NotificationService notifications)
    {
        _context = context;
        _audit = audit;
        _notifications = notifications;
    }

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
        var created = (await GetAllAsync()).First(a => a.Id == announcement.Id);
        await _audit.LogAsync("announcement.created", "Announcement", announcement.Id.ToString(), announcement.Title);
        await _notifications.NotifyAnnouncementAsync(announcement);
        return created;
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
        var updated = (await GetAllAsync()).FirstOrDefault(a => a.Id == id);
        if (updated != null)
            await _audit.LogAsync("announcement.updated", "Announcement", announcement.Id.ToString(), announcement.Title);
        return updated;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var announcement = await _context.Announcements.FindAsync(id);
        if (announcement == null) return false;
        var title = announcement.Title;
        _context.Announcements.Remove(announcement);
        await _context.SaveChangesAsync();
        await _audit.LogAsync("announcement.deleted", "Announcement", id.ToString(), title);
        return true;
    }

    private static AnnouncementDto Map(Announcement a) =>
        new(a.Id, a.Title, a.Content, a.Category, a.HolidayDate, a.TargetRole, a.CreatedByUserId, a.CreatedByUser.FullName, a.CreatedAt);
}

public class InvoiceService
{
    private readonly AppDbContext _context;
    private readonly AuditLogService _audit;
    private readonly NotificationService _notifications;
    private readonly BillplzService _billplz;
    public InvoiceService(
        AppDbContext context,
        AuditLogService audit,
        NotificationService notifications,
        BillplzService billplz)
    {
        _context = context;
        _audit = audit;
        _notifications = notifications;
        _billplz = billplz;
    }

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

    public async Task<InvoiceDto?> UpdateStatusAsync(Guid id, string status)
    {
        var invoice = await _context.Invoices
            .Include(i => i.StudentUser)
            .Include(i => i.ParentUser)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (invoice == null) return null;

        invoice.Status = status;
        invoice.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _audit.LogAsync("invoice.status_changed", "Invoice", invoice.Id.ToString(), invoice.InvoiceNo, $"Status: {status}");
        return Map(invoice);
    }

    public async Task<BillplzPayResponse?> CreateBillplzPaymentAsync(
        Guid id,
        Guid parentUserId,
        string? fpxBankCode,
        string payerEmail,
        string payerName,
        string? payerMobile)
    {
        if (!_billplz.IsConfigured)
            throw new InvalidOperationException(
                "Billplz is not configured. Set Billplz__ApiKey and Billplz__CollectionId in .env and restart the backend.");

        var invoice = await LoadPayableInvoiceAsync(id, parentUserId);
        if (invoice == null) return null;

        var amountSen = (int)Math.Round(invoice.Amount * 100m, MidpointRounding.AwayFromZero);
        if (amountSen < 100)
            throw new InvalidOperationException("Invoice amount must be at least RM 1.00 for online payment.");

        var description = $"{invoice.InvoiceNo} — {invoice.CourseName ?? "Tuition"}";
        var bill = await _billplz.CreateBillAsync(
            payerEmail,
            payerName,
            description,
            amountSen,
            invoice.Id.ToString(),
            fpxBankCode,
            payerMobile);

        invoice.BillplzBillId = bill.Id;
        invoice.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new BillplzPayResponse(bill.Id, bill.Url, invoice.Id.ToString());
    }

    public async Task<bool> CompleteBillplzPaymentAsync(string billId, bool paid)
    {
        var invoice = await _context.Invoices
            .Include(i => i.StudentUser)
            .Include(i => i.ParentUser)
            .FirstOrDefaultAsync(i => i.BillplzBillId == billId);
        if (invoice == null) return false;

        if (!paid || invoice.Status == "Paid")
            return invoice.Status == "Paid";

        await MarkPaidAsync(invoice, "Paid via Billplz FPX");
        return true;
    }

    private async Task<Invoice?> LoadPayableInvoiceAsync(Guid id, Guid parentUserId) =>
        await _context.Invoices
            .Include(i => i.StudentUser)
            .Include(i => i.ParentUser)
            .FirstOrDefaultAsync(i =>
                i.Id == id && i.ParentUserId == parentUserId && i.Status == "Unpaid");

    private async Task<InvoiceDto> MarkPaidAsync(Invoice invoice, string auditDetails)
    {
        invoice.Status = "Paid";
        invoice.PaidAt = DateTime.UtcNow;
        invoice.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _audit.LogAsync("invoice.paid", "Invoice", invoice.Id.ToString(), invoice.InvoiceNo, auditDetails);

        if (invoice.ParentUserId.HasValue)
        {
            await _notifications.CreateAsync(
                invoice.ParentUserId.Value,
                "Payment received",
                $"{invoice.InvoiceNo} has been paid.",
                "Invoice",
                "/parent/invoices");
        }

        return Map(invoice);
    }

    public async Task<InvoiceDto?> CreateAsync(CreateInvoiceRequest request)
    {
        var student = await _context.Users.FindAsync(request.StudentUserId);
        if (student == null) return null;

        var parentLink = await _context.ParentStudents
            .FirstOrDefaultAsync(l => l.StudentUserId == request.StudentUserId);
        var settings = await GetCentreSettingsAsync();
        var year = DateTime.UtcNow.Year;
        var invoiceNo = await NextInvoiceNoAsync(settings.InvoicePrefix, year);

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            StudentUserId = request.StudentUserId,
            ParentUserId = parentLink?.ParentUserId,
            InvoiceNo = invoiceNo,
            CourseName = request.CourseName,
            ClassName = request.ClassName,
            Amount = request.Amount,
            BillingPeriod = request.BillingPeriod,
            Status = request.SendNow ? "Unpaid" : "Draft",
            DueDate = DateTime.Parse(request.DueDate),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();
        await _audit.LogAsync(
            request.SendNow ? "invoice.sent" : "invoice.created",
            "Invoice",
            invoice.Id.ToString(),
            invoice.InvoiceNo,
            $"Amount: {invoice.Amount}");

        if (request.SendNow && invoice.ParentUserId.HasValue)
        {
            await _notifications.CreateAsync(
                invoice.ParentUserId.Value,
                "New invoice",
                $"{invoice.InvoiceNo} — RM {invoice.Amount:N2} due {invoice.DueDate:dd MMM yyyy}",
                "Invoice",
                "/parent/invoices");
        }

        return await GetByIdAsync(invoice.Id);
    }

    public async Task<InvoiceDto?> UpdateAsync(Guid id, UpdateInvoiceRequest request)
    {
        var invoice = await _context.Invoices
            .Include(i => i.StudentUser)
            .Include(i => i.ParentUser)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (invoice == null) return null;

        var editingDetails = request.Amount.HasValue || request.DueDate != null || request.BillingPeriod != null;
        if (editingDetails && invoice.Status != "Draft") return null;

        if (request.Amount.HasValue) invoice.Amount = request.Amount.Value;
        if (request.DueDate != null) invoice.DueDate = DateTime.Parse(request.DueDate);
        if (request.BillingPeriod != null) invoice.BillingPeriod = request.BillingPeriod;
        if (request.Status != null)
        {
            invoice.Status = request.Status;
            if (request.Status == "Paid" && invoice.PaidAt == null)
                invoice.PaidAt = DateTime.UtcNow;
        }
        invoice.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        var action = request.Status == "Cancelled" ? "invoice.cancelled"
            : request.Status != null ? "invoice.status_changed"
            : "invoice.updated";
        await _audit.LogAsync(action, "Invoice", invoice.Id.ToString(), invoice.InvoiceNo,
            request.Status != null ? $"Status: {request.Status}" : null);
        return Map(invoice);
    }

    private async Task<string> NextInvoiceNoAsync(string prefix, int year)
    {
        var pattern = $"{prefix.TrimEnd('-')}-{year}-";
        var existing = await _context.Invoices
            .Where(i => i.InvoiceNo.StartsWith(pattern))
            .Select(i => i.InvoiceNo)
            .ToListAsync();
        var max = existing
            .Select(n => int.TryParse(n[pattern.Length..], out var num) ? num : 0)
            .DefaultIfEmpty(0)
            .Max();
        return $"{pattern}{max + 1:D3}";
    }

    private async Task<CentreSettings> GetCentreSettingsAsync()
    {
        var id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var settings = await _context.CentreSettings.FindAsync(id);
        return settings ?? new CentreSettings { InvoicePrefix = "INV" };
    }

    private static InvoiceDto Map(Invoice i) =>
        new(i.Id, i.StudentUserId, i.StudentUser.FullName, i.ParentUserId, i.ParentUser?.FullName,
            i.InvoiceNo, i.CourseName, i.ClassName, i.Amount, i.Status, i.BillingPeriod,
            i.DueDate, i.CreatedAt, i.PaidAt);
}

public class CentreSettingsService
{
    private static readonly Guid SettingsId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private readonly AppDbContext _context;
    private readonly AuditLogService _audit;
    private readonly IConfiguration _configuration;

    public CentreSettingsService(AppDbContext context, AuditLogService audit, IConfiguration configuration)
    {
        _context = context;
        _audit = audit;
        _configuration = configuration;
    }

    public async Task<CentreSettingsDto> GetAsync()
    {
        var settings = await _context.CentreSettings.FindAsync(SettingsId);
        if (settings == null)
        {
            settings = new CentreSettings
            {
                Id = SettingsId,
                CentreName = CentreBrandingDefaults.CentreName(_configuration),
                Timezone = "Asia/Kuala_Lumpur",
                Currency = "MYR",
                DefaultMonthlyFee = 300m,
                PaymentInstructions = "Pay online via the parent portal or bank transfer to the centre account.",
                Address = "12 Jalan Melati, 50450 Kuala Lumpur",
                Phone = "+60 3-1234 5678",
                Email = "billing@harmonymusic.demo",
                BankName = "Maybank",
                BankAccountNo = "5123 4567 8901",
                InvoicePrefix = "INV"
            };
            _context.CentreSettings.Add(settings);
            await _context.SaveChangesAsync();
        }

        return Map(settings);
    }

    public async Task<CentreSettingsDto> UpdateAsync(UpdateCentreSettingsRequest request)
    {
        var settings = await _context.CentreSettings.FindAsync(SettingsId);
        if (settings == null)
        {
            settings = new CentreSettings { Id = SettingsId };
            _context.CentreSettings.Add(settings);
        }

        settings.CentreName = request.CentreName.Trim();
        settings.Timezone = request.Timezone.Trim();
        settings.Currency = request.Currency.Trim();
        settings.DefaultMonthlyFee = request.DefaultMonthlyFee;
        settings.PaymentInstructions = request.PaymentInstructions?.Trim();
        settings.Address = request.Address?.Trim();
        settings.Phone = request.Phone?.Trim();
        settings.Email = request.Email?.Trim();
        settings.BankName = request.BankName?.Trim();
        settings.BankAccountNo = request.BankAccountNo?.Trim();
        settings.InvoicePrefix = string.IsNullOrWhiteSpace(request.InvoicePrefix)
            ? "INV"
            : request.InvoicePrefix.Trim().ToUpperInvariant();
        settings.LogoDataUrl = request.LogoDataUrl;
        settings.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _audit.LogAsync("settings.updated", "Settings", SettingsId.ToString(), settings.CentreName);
        return Map(settings);
    }

    private static CentreSettingsDto Map(CentreSettings s) =>
        new(s.CentreName, s.Timezone, s.Currency, s.DefaultMonthlyFee, s.PaymentInstructions,
            s.Address, s.Phone, s.Email, s.BankName, s.BankAccountNo,
            s.InvoicePrefix, s.LogoDataUrl);
}
