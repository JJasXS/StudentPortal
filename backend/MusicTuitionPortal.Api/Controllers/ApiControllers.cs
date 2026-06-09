using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MusicTuitionPortal.Api.DTOs;
using MusicTuitionPortal.Api.Services;

namespace MusicTuitionPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService) => _authService = authService;

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        if (result == null) return Unauthorized(new { message = "Invalid email or password." });
        return Ok(new
        {
            token = result.Token,
            user = new
            {
                id = result.User.Id.ToString(),
                fullName = result.User.FullName,
                email = result.User.Email,
                phoneNumber = result.User.PhoneNumber,
                role = result.User.Role
            }
        });
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var result = await _authService.RegisterAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await _authService.GetMeAsync(userId);
        if (user == null) return NotFound();
        return Ok(new
        {
            id = user.Id.ToString(),
            fullName = user.FullName,
            email = user.Email,
            phoneNumber = user.PhoneNumber,
            role = user.Role,
            isActive = user.IsActive
        });
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            var user = await _authService.UpdateMeAsync(userId, request);
            if (user == null) return NotFound();
            return Ok(new
            {
                id = user.Id.ToString(),
                fullName = user.FullName,
                email = user.Email,
                phoneNumber = user.PhoneNumber,
                role = user.Role,
                isActive = user.IsActive
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var code = await _authService.RequestPasswordResetAsync(request);
        return Ok(new
        {
            message = "If an account exists for this email, a reset code has been issued.",
            resetCode = code
        });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var ok = await _authService.ResetPasswordAsync(request);
        if (!ok) return BadRequest(new { message = "Invalid or expired reset code." });
        return Ok(new { message = "Password updated. You can sign in with your new password." });
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly UserService _service;
    public UsersController(UserService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _service.GetAllAsync());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _service.GetByIdAsync(id);
        return user == null ? NotFound() : Ok(user);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RegisterRequest request)
    {
        try { return Ok(await _service.CreateAsync(request)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] RegisterRequest request)
    {
        var user = await _service.UpdateAsync(id, request);
        return user == null ? NotFound() : Ok(user);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StudentsController : ControllerBase
{
    private readonly StudentService _service;
    public StudentsController(StudentService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(MapList(await _service.GetAllAsync()));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var student = await _service.GetByIdAsync(id);
        return student == null ? NotFound() : Ok(Map(student));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateStudentRequest request)
    {
        try { return Ok(Map(await _service.CreateAsync(request))); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateStudentRequest request)
    {
        var student = await _service.UpdateAsync(id, request);
        return student == null ? NotFound() : Ok(Map(student));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    private static object Map(StudentDto s) => new
    {
        id = s.Id.ToString(),
        userId = s.UserId.ToString(),
        fullName = s.FullName,
        email = s.Email,
        studentCode = s.StudentCode,
        dateOfBirth = s.DateOfBirth?.ToString("yyyy-MM-dd"),
        gender = s.Gender,
        schoolName = s.SchoolName,
        notes = s.Notes,
        isActive = s.IsActive
    };

    private static List<object> MapList(List<StudentDto> list) => list.Select(s => Map(s)).Cast<object>().ToList();
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ParentsController : ControllerBase
{
    private readonly ParentService _service;
    public ParentsController(ParentService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(MapList(await _service.GetAllAsync()));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var parent = await _service.GetByIdAsync(id);
        return parent == null ? NotFound() : Ok(Map(parent));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateParentRequest request)
    {
        try { return Ok(Map(await _service.CreateAsync(request))); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateParentRequest request)
    {
        var parent = await _service.UpdateAsync(id, request);
        return parent == null ? NotFound() : Ok(Map(parent));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    private static object Map(ParentDto p) => new
    {
        id = p.Id.ToString(),
        userId = p.UserId.ToString(),
        fullName = p.FullName,
        email = p.Email,
        phoneNumber = p.PhoneNumber,
        relationship = p.Relationship,
        address = p.Address,
        children = p.Children.Select(c => c.ToString()).ToList(),
        isActive = p.IsActive,
        createdAt = p.CreatedAt.ToString("o")
    };

    private static List<object> MapList(List<ParentDto> list) => list.Select(p => Map(p)).Cast<object>().ToList();
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TeachersController : ControllerBase
{
    private readonly TeacherService _service;
    public TeachersController(TeacherService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(MapList(await _service.GetAllAsync()));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var teacher = await _service.GetByIdAsync(id);
        return teacher == null ? NotFound() : Ok(Map(teacher));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateTeacherRequest request)
    {
        try { return Ok(Map(await _service.CreateAsync(request))); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateTeacherRequest request)
    {
        var teacher = await _service.UpdateAsync(id, request);
        return teacher == null ? NotFound() : Ok(Map(teacher));
    }

    [HttpPatch("{id:guid}/employment-type")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateEmploymentType(Guid id, [FromBody] UpdateEmploymentTypeRequest request)
    {
        try
        {
            var teacher = await _service.UpdateEmploymentTypeAsync(id, request.EmploymentType);
            return teacher == null ? NotFound() : Ok(Map(teacher));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    private static object Map(TeacherDto t) => new
    {
        id = t.Id.ToString(),
        userId = t.UserId.ToString(),
        fullName = t.FullName,
        email = t.Email,
        phoneNumber = t.PhoneNumber,
        specialization = t.Specialization,
        bio = t.Bio,
        hourlyRate = t.HourlyRate,
        employmentType = t.EmploymentType,
        isActive = t.IsActive,
        createdAt = t.CreatedAt.ToString("o")
    };

    private static List<object> MapList(List<TeacherDto> list) => list.Select(t => Map(t)).Cast<object>().ToList();
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CoursesController : ControllerBase
{
    private readonly CourseService _service;
    public CoursesController(CourseService service) => _service = service;

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll() => Ok(MapList(await _service.GetAllAsync()));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var course = await _service.GetByIdAsync(id);
        return course == null ? NotFound() : Ok(Map(course));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CourseDto request) => Ok(Map(await _service.CreateAsync(request)));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CourseDto request)
    {
        var course = await _service.UpdateAsync(id, request);
        return course == null ? NotFound() : Ok(Map(course));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    private static object Map(CourseDto c) => new
    {
        id = c.Id.ToString(),
        courseName = c.CourseName,
        category = c.Category,
        description = c.Description,
        level = c.Level,
        defaultDurationMinutes = c.DefaultDurationMinutes,
        isActive = c.IsActive
    };

    private static List<object> MapList(List<CourseDto> list) => list.Select(c => Map(c)).Cast<object>().ToList();
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClassesController : ControllerBase
{
    private readonly ClassService _service;
    public ClassesController(ClassService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(MapList(await _service.GetAllAsync()));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var cls = await _service.GetByIdAsync(id);
        return cls == null ? NotFound() : Ok(Map(cls));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] ClassDto request) => Ok(Map(await _service.CreateAsync(request)));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ClassDto request)
    {
        var cls = await _service.UpdateAsync(id, request);
        return cls == null ? NotFound() : Ok(Map(cls));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    private static object Map(ClassDto c) => new
    {
        id = c.Id.ToString(),
        courseId = c.CourseId.ToString(),
        courseName = c.CourseName,
        teacherUserId = c.TeacherUserId.ToString(),
        teacherName = c.TeacherName,
        className = c.ClassName,
        dayOfWeek = c.DayOfWeek,
        startTime = c.StartTime,
        endTime = c.EndTime,
        maxStudents = c.MaxStudents,
        enrolledCount = c.EnrolledCount,
        location = c.Location,
        isActive = c.IsActive
    };

    private static List<object> MapList(List<ClassDto> list) => list.Select(c => Map(c)).Cast<object>().ToList();
}

[ApiController]
[Route("api/enrollments")]
[Authorize]
public class EnrollmentsController : ControllerBase
{
    private readonly EnrollmentService _service;
    public EnrollmentsController(EnrollmentService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(MapList(await _service.GetAllAsync()));

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] EnrollmentDto request) => Ok(Map(await _service.CreateAsync(request)));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] EnrollmentDto request)
    {
        var enrollment = await _service.UpdateAsync(id, request);
        return enrollment == null ? NotFound() : Ok(Map(enrollment));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    private static object Map(EnrollmentDto e) => new
    {
        id = e.Id.ToString(),
        studentUserId = e.StudentUserId.ToString(),
        studentName = e.StudentName,
        classId = e.ClassId.ToString(),
        className = e.ClassName,
        enrollmentDate = e.EnrollmentDate.ToString("yyyy-MM-dd"),
        status = e.Status
    };

    private static List<object> MapList(List<EnrollmentDto> list) => list.Select(e => Map(e)).Cast<object>().ToList();
}

[ApiController]
[Route("api/class-sessions")]
[Authorize]
public class ClassSessionsController : ControllerBase
{
    private readonly ClassSessionService _service;
    public ClassSessionsController(ClassSessionService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(MapList(await _service.GetAllAsync()));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var session = await _service.GetByIdAsync(id);
        return session == null ? NotFound() : Ok(Map(session));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Create([FromBody] ClassSessionDto request) => Ok(Map(await _service.CreateAsync(request)));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ClassSessionDto request)
    {
        var session = await _service.UpdateAsync(id, request);
        return session == null ? NotFound() : Ok(Map(session));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("generate")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Generate([FromBody] GenerateSessionsRequest request)
    {
        var result = await _service.GenerateAsync(request);
        return Ok(new
        {
            createdCount = result.CreatedCount,
            skippedCount = result.SkippedCount,
            sessions = MapList(result.Sessions)
        });
    }

    [HttpPost("today/{classId:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetOrCreateToday(Guid classId)
    {
        try
        {
            return Ok(Map(await _service.GetOrCreateTodayAsync(classId)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static object Map(ClassSessionDto s) => new
    {
        id = s.Id.ToString(),
        classId = s.ClassId.ToString(),
        className = s.ClassName,
        sessionDate = s.SessionDate.ToString("yyyy-MM-dd"),
        startTime = s.StartTime,
        endTime = s.EndTime,
        topic = s.Topic,
        notes = s.Notes,
        status = s.Status
    };

    private static List<object> MapList(List<ClassSessionDto> list) => list.Select(s => Map(s)).Cast<object>().ToList();
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly AttendanceService _service;
    public AttendanceController(AttendanceService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(MapList(await _service.GetAllAsync()));

    [HttpGet("session/{sessionId:guid}")]
    public async Task<IActionResult> GetBySession(Guid sessionId) => Ok(MapList(await _service.GetBySessionAsync(sessionId)));

    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Create([FromBody] AttendanceDto request) => Ok(Map(await _service.CreateAsync(request)));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Update(Guid id, [FromBody] AttendanceDto request)
    {
        var attendance = await _service.UpdateAsync(id, request);
        return attendance == null ? NotFound() : Ok(Map(attendance));
    }

    [HttpGet("check-in/session/{sessionId:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetCheckIn(Guid sessionId)
    {
        var checkIn = await _service.GetActiveCheckInAsync(sessionId);
        return checkIn == null ? NoContent() : Ok(MapCheckIn(checkIn));
    }

    [HttpPost("check-in/generate")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GenerateCheckIn([FromBody] GenerateCheckInRequest request)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            var checkIn = await _service.GenerateCheckInAsync(request.ClassSessionId, userId);
            return Ok(MapCheckIn(checkIn));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("check-in/redeem")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> RedeemCheckIn([FromBody] RedeemCheckInRequest request)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            var attendance = await _service.RedeemCheckInAsync(request.Code, userId);
            return Ok(Map(attendance));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static object MapCheckIn(AttendanceCheckInDto c) => new
    {
        classSessionId = c.ClassSessionId.ToString(),
        className = c.ClassName,
        code = c.Code,
        classStartAt = c.ClassStartAt,
        classEndAt = c.ClassEndAt
    };

    private static object Map(AttendanceDto a) => new
    {
        id = a.Id.ToString(),
        classSessionId = a.ClassSessionId.ToString(),
        sessionDate = a.SessionDate?.ToString("yyyy-MM-dd"),
        className = a.ClassName,
        studentUserId = a.StudentUserId.ToString(),
        studentName = a.StudentName,
        status = a.Status,
        remarks = a.Remarks
    };

    private static List<object> MapList(List<AttendanceDto> list) => list.Select(a => Map(a)).Cast<object>().ToList();
}

[ApiController]
[Route("api/lesson-notes")]
[Authorize]
public class LessonNotesController : ControllerBase
{
    private readonly LessonNoteService _service;
    public LessonNotesController(LessonNoteService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(MapList(await _service.GetAllAsync()));

    [HttpGet("student/{studentId:guid}")]
    public async Task<IActionResult> GetByStudent(Guid studentId) => Ok(MapList(await _service.GetByStudentAsync(studentId)));

    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Create([FromBody] LessonNoteDto request) => Ok(Map(await _service.CreateAsync(request)));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Update(Guid id, [FromBody] LessonNoteDto request)
    {
        var note = await _service.UpdateAsync(id, request);
        return note == null ? NotFound() : Ok(Map(note));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    private static object Map(LessonNoteDto n) => new
    {
        id = n.Id.ToString(),
        classSessionId = n.ClassSessionId.ToString(),
        className = n.ClassName,
        studentUserId = n.StudentUserId.ToString(),
        studentName = n.StudentName,
        teacherUserId = n.TeacherUserId.ToString(),
        teacherName = n.TeacherName,
        noteTitle = n.NoteTitle,
        noteContent = n.NoteContent,
        practiceInstructions = n.PracticeInstructions,
        createdAt = n.CreatedAt
    };

    private static List<object> MapList(List<LessonNoteDto> list) => list.Select(n => Map(n)).Cast<object>().ToList();
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnnouncementsController : ControllerBase
{
    private readonly AnnouncementService _service;
    public AnnouncementsController(AnnouncementService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(MapList(await _service.GetAllAsync()));

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] AnnouncementDto request) => Ok(Map(await _service.CreateAsync(request)));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] AnnouncementDto request)
    {
        var announcement = await _service.UpdateAsync(id, request);
        return announcement == null ? NotFound() : Ok(Map(announcement));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    private static object Map(AnnouncementDto a) => new
    {
        id = a.Id.ToString(),
        title = a.Title,
        content = a.Content,
        category = a.Category,
        holidayDate = a.HolidayDate?.ToString("yyyy-MM-dd"),
        targetRole = a.TargetRole,
        createdByUserId = a.CreatedByUserId.ToString(),
        createdByName = a.CreatedByName,
        createdAt = a.CreatedAt
    };

    private static List<object> MapList(List<AnnouncementDto> list) => list.Select(a => Map(a)).Cast<object>().ToList();
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly InvoiceService _service;
    public InvoicesController(InvoiceService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(MapList(await _service.GetAllAsync()));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var invoice = await _service.GetByIdAsync(id);
        return invoice == null ? NotFound() : Ok(Map(invoice));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateInvoiceRequest request)
    {
        var invoice = await _service.CreateAsync(request);
        return invoice == null ? BadRequest(new { message = "Could not create invoice." }) : Ok(Map(invoice));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateInvoiceRequest request)
    {
        var invoice = await _service.UpdateAsync(id, request);
        return invoice == null ? BadRequest(new { message = "Invoice cannot be updated." }) : Ok(Map(invoice));
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateInvoiceStatusRequest request)
    {
        var invoice = await _service.UpdateStatusAsync(id, request.Status);
        return invoice == null ? NotFound() : Ok(Map(invoice));
    }

    [HttpPost("{id:guid}/billplz")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> PayWithBillplz(Guid id, [FromBody] BillplzPayRequest? request)
    {
        var parentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var email = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
        var name = User.FindFirstValue(ClaimTypes.Name) ?? "Parent";

        try
        {
            var session = await _service.CreateBillplzPaymentAsync(
                id,
                parentUserId,
                request?.FpxBankCode,
                email,
                name,
                null);
            return session == null
                ? BadRequest(new { message = "Invoice cannot be paid." })
                : Ok(new
                {
                    billId = session.BillId,
                    paymentUrl = session.PaymentUrl,
                    invoiceId = session.InvoiceId,
                });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static object Map(InvoiceDto i) => new
    {
        id = i.Id.ToString(),
        studentUserId = i.StudentUserId.ToString(),
        studentName = i.StudentName,
        parentUserId = i.ParentUserId?.ToString(),
        parentName = i.ParentName,
        invoiceNo = i.InvoiceNo,
        courseName = i.CourseName,
        className = i.ClassName,
        amount = i.Amount,
        status = i.Status,
        billingPeriod = i.BillingPeriod,
        dueDate = i.DueDate.ToString("yyyy-MM-dd"),
        createdAt = i.CreatedAt,
        paidAt = i.PaidAt
    };

    private static List<object> MapList(List<InvoiceDto> list) => list.Select(i => Map(i)).Cast<object>().ToList();
}

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class SettingsController : ControllerBase
{
    private readonly CentreSettingsService _service;
    public SettingsController(CentreSettingsService service) => _service = service;

    [HttpGet("centre")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCentre() => Ok(await _service.GetAsync());

    [HttpPut("centre")]
    public async Task<IActionResult> UpdateCentre([FromBody] UpdateCentreSettingsRequest request) =>
        Ok(await _service.UpdateAsync(request));
}

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = "Admin")]
public class AuditLogsController : ControllerBase
{
    private readonly AuditLogService _service;
    public AuditLogsController(AuditLogService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? action,
        [FromQuery] string? entityType,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to) =>
        Ok(await _service.GetAllAsync(search, action, entityType, from, to));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAuditLogRequest request)
    {
        await _service.LogAsync(
            request.Action,
            request.EntityType,
            request.EntityId,
            request.EntityLabel,
            request.Details);
        return Ok(new { success = true });
    }

    private static object Map(AuditLogDto a) => new
    {
        id = a.Id.ToString(),
        actorUserId = a.ActorUserId?.ToString(),
        actorName = a.ActorName,
        actorRole = a.ActorRole,
        action = a.Action,
        entityType = a.EntityType,
        entityId = a.EntityId,
        entityLabel = a.EntityLabel,
        details = a.Details,
        createdAt = a.CreatedAt
    };
}

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly NotificationService _service;

    public NotificationsController(NotificationService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? unreadOnly)
    {
        var userId = Guid.Parse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)!);
        return Ok(MapList(await _service.GetForUserAsync(userId, unreadOnly)));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = Guid.Parse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)!);
        return Ok(new { count = await _service.GetUnreadCountAsync(userId) });
    }

    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)!);
        var notification = await _service.MarkReadAsync(id, userId);
        return notification == null ? NotFound() : Ok(Map(notification));
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = Guid.Parse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)!);
        await _service.MarkAllReadAsync(userId);
        return Ok(new { success = true });
    }

    private static object Map(NotificationDto n) => new
    {
        id = n.Id.ToString(),
        userId = n.UserId.ToString(),
        title = n.Title,
        message = n.Message,
        category = n.Category,
        linkPath = n.LinkPath,
        isRead = n.IsRead,
        createdAt = n.CreatedAt
    };

    private static List<object> MapList(List<NotificationDto> list) =>
        list.Select(n => Map(n)).Cast<object>().ToList();
}
