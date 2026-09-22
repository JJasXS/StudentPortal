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
        try
        {
            var result = await _authService.LoginAsync(request);
            if (result == null) return Unauthorized(new { message = "Invalid email or password." });
            return Ok(MapLogin(result));
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpPost("login/method")]
    [AllowAnonymous]
    public async Task<IActionResult> GetLoginMethod([FromBody] LoginMethodRequest request)
    {
        try
        {
            var method = await _authService.GetLoginMethodAsync(request.Email);
            return Ok(new { method = method.Method, bypassOtp = method.BypassOtp });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login/udf-email")]
    [AllowAnonymous]
    public async Task<IActionResult> LoginWithUdfEmail([FromBody] UdfEmailLoginRequest request)
    {
        try
        {
            var result = await _authService.LoginWithUdfEmailAsync(request.Email);
            if (result == null)
                return Unauthorized(new { message = "Email not found in SQL Account (SY_USER email or AR_CUSTOMERBRANCH email)." });
            return Ok(MapLogin(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("dev-logins")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDevLogins(CancellationToken cancellationToken)
    {
        var env = HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>();
        if (!env.IsDevelopment())
            return NotFound();

        var directory = await _authService.GetDevLoginDirectoryAsync(cancellationToken);
        return Ok(directory);
    }

    [HttpPost("login/otp/request")]
    [AllowAnonymous]
    public async Task<IActionResult> RequestLoginOtp([FromBody] RequestLoginOtpRequest request)
    {
        try
        {
            var result = await _authService.RequestLoginOtpAsync(request.Email);
            return Ok(new
            {
                message = result.Message,
                bypassOtp = result.BypassOtp,
                otpCode = result.OtpCode
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login/otp/verify")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyLoginOtp([FromBody] VerifyLoginOtpRequest request)
    {
        try
        {
            var result = await _authService.VerifyLoginOtpAsync(request.Email, request.Otp);
            if (result == null)
                return Unauthorized(new { message = "Invalid or expired OTP." });
            return Ok(MapLogin(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static object MapLogin(LoginResponse result) => new
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
    };

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

    [HttpPost("register/student")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterStudent([FromBody] RegisterStudentRequest request)
    {
        try
        {
            var result = await _authService.RegisterStudentAsync(request);
            return Ok(new
            {
                token = result.Token,
                user = new
                {
                    id = result.User.Id.ToString(),
                    fullName = result.User.FullName,
                    email = result.User.Email,
                    phoneNumber = result.User.PhoneNumber,
                    role = result.User.Role,
                    isActive = result.User.IsActive
                }
            });
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
    private readonly ParentService _parentService;

    public StudentsController(StudentService service, ParentService parentService)
    {
        _service = service;
        _parentService = parentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(MapList(await _service.GetAllAsync()));

    [HttpGet("me")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMe()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var profile = await _service.GetSelfProfileAsync(userId);
        return profile == null ? NotFound() : Ok(MapSelf(profile));
    }

    [HttpGet("me/sql-account")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMySqlAccount(CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Email not found in token." });

        var student = await _parentService.GetSqlAccountStudentForEmailAsync(email, cancellationToken);
        if (student == null)
            return NotFound(new { message = "No SQL Account student found for this email." });

        return Ok(new
        {
            customerCode = student.CustomerCode,
            studentName = student.StudentName,
            email = student.Email,
            phone = student.Phone,
            branchName = student.BranchName,
        });
    }

    [HttpGet("me/outstanding-invoices")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyOutstandingInvoices(CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Email not found in token." });

        var invoices = await _parentService.GetOutstandingInvoicesForEmailAsync(email, cancellationToken);
        return Ok(new
        {
            invoices = invoices.Select(MapStudentInvoice).ToList(),
        });
    }

    [HttpGet("me/invoices")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyInvoices(CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Email not found in token." });

        var bundle = await _parentService.GetStudentInvoicesForEmailAsync(email, cancellationToken);
        return Ok(new
        {
            due = bundle.Due.Select(MapStudentInvoice).ToList(),
            history = bundle.History.Select(MapStudentInvoice).ToList(),
        });
    }

    private static object MapStudentInvoice(SqlAccountOutstandingInvoiceDto i) => new
    {
        docKey = i.DocKey,
        docNo = i.DocNo,
        docDate = i.DocDate,
        dueDate = i.DueDate,
        docAmt = i.DocAmt,
        paymentAmt = i.PaymentAmt,
        outstanding = i.Outstanding,
        description = i.Description,
        status = i.Status,
    };

    [HttpGet("me/calendar-events")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyCalendarEvents(
        [FromQuery] string? branchName,
        CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Email not found in token." });

        var events = await _parentService.GetCalendarEventsForEmailAsync(email, branchName, cancellationToken);
        return Ok(events.Select(MapErpCalendarEvent).ToList());
    }

    private static object MapErpCalendarEvent(ErpCalendarEventDto e) => new
    {
        id = e.Id,
        docKey = e.DocKey,
        seq = e.Seq,
        classId = e.ClassId?.ToString(),
        courseId = e.CourseId?.ToString(),
        className = e.ClassName,
        courseName = e.CourseName,
        teacherUserId = e.TeacherUserId?.ToString(),
        teacherName = e.TeacherName,
        studentName = e.StudentName,
        branchName = e.BranchName,
        itemCode = e.ItemCode,
        customerCode = e.CustomerCode,
        sessionDate = e.SessionDate,
        startTime = e.StartTime,
        endTime = e.EndTime,
        status = e.Status,
    };

    [HttpGet("me/enrollments")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyEnrollments(CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Email not found in token." });

        var student = await _parentService.GetSqlAccountStudentForEmailAsync(email, cancellationToken);
        if (student == null)
            return NotFound(new { message = "No SQL Account student found for this email." });

        var result = await _parentService.GetSqlAccountChildEnrollmentsForEmailAsync(
            email,
            student.BranchName,
            cancellationToken);

        if (result == null)
            return NotFound(new { message = "Enrollments not found." });

        return Ok(new
        {
            customerCode = result.CustomerCode,
            branchName = result.BranchName,
            enrollments = result.Enrollments.Select(e => new
            {
                docKey = e.DocKey,
                seq = e.Seq,
                docNo = e.DocNo,
                docDate = e.DocDate,
                className = e.ClassName,
                itemCode = e.ItemCode,
                qty = e.Qty,
                unitPrice = e.UnitPrice,
                amount = e.Amount,
                deliveryDate = e.DeliveryDate,
                classDay = e.ClassDay,
                classTime = e.ClassTime,
                classDate = e.ClassDate,
                studentName = e.StudentName,
                conductedBy = e.ConductedBy,
                linkedClassId = e.LinkedClassId,
                linkedClassName = e.LinkedClassName,
                linkedClassDayOfWeek = e.LinkedClassDayOfWeek,
                linkedClassStartTime = e.LinkedClassStartTime,
                linkedClassEndTime = e.LinkedClassEndTime,
                linkedClassTeacherName = e.LinkedClassTeacherName,
                nextSessionDate = e.NextSessionDate,
            }),
        });
    }

    [HttpPut("me")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateStudentSelfRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            var profile = await _service.UpdateSelfAsync(userId, request);
            return profile == null ? NotFound() : Ok(MapSelf(profile));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

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

    private static object MapSelf(StudentSelfProfileDto s) => new
    {
        id = s.Id.ToString(),
        userId = s.UserId.ToString(),
        fullName = s.FullName,
        email = s.Email,
        phoneNumber = s.PhoneNumber,
        studentCode = s.StudentCode,
        dateOfBirth = s.DateOfBirth?.ToString("yyyy-MM-dd"),
        gender = s.Gender,
        schoolName = s.SchoolName,
        notes = s.Notes,
        isActive = s.IsActive,
        parent = s.Parent == null
            ? null
            : new
            {
                fullName = s.Parent.FullName,
                email = s.Parent.Email,
                phoneNumber = s.Parent.PhoneNumber,
                relationship = s.Parent.Relationship
            }
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

    [HttpGet("me/sql-account-children")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMySqlAccountChildren(CancellationToken cancellationToken)
    {
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Email not found in token." });

        var result = await _service.GetSqlAccountChildrenForEmailAsync(email, cancellationToken);
        return Ok(new
        {
            parentName = result.ParentName,
            children = result.Children.Select(c => new
            {
                branchName = c.BranchName,
                attention = c.Attention,
                email = c.Email,
                phone = c.Phone,
            }),
        });
    }

    [HttpGet("me/outstanding-invoices")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyOutstandingInvoices(CancellationToken cancellationToken)
    {
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Email not found in token." });

        var invoices = await _service.GetOutstandingInvoicesForEmailAsync(email, cancellationToken);
        return Ok(new
        {
            invoices = invoices.Select(i => new
            {
                docKey = i.DocKey,
                docNo = i.DocNo,
                docDate = i.DocDate,
                dueDate = i.DueDate,
                docAmt = i.DocAmt,
                paymentAmt = i.PaymentAmt,
                outstanding = i.Outstanding,
                description = i.Description,
                status = i.Status,
            }),
        });
    }

    [HttpGet("me/calendar-events")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyCalendarEvents(
        [FromQuery] string? branchName,
        CancellationToken cancellationToken)
    {
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Email not found in token." });

        var events = await _service.GetCalendarEventsForEmailAsync(email, branchName, cancellationToken);
        return Ok(events.Select(MapCalendarEvent).ToList());
    }

    [HttpGet("me/sql-account-children/{branchName}/enrollments")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMySqlAccountChildEnrollments(
        string branchName,
        CancellationToken cancellationToken)
    {
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Email not found in token." });

        var result = await _service.GetSqlAccountChildEnrollmentsForEmailAsync(
            email,
            branchName,
            cancellationToken);

        if (result == null)
            return NotFound(new { message = "Child branch not found for this parent." });

        return Ok(new
        {
            customerCode = result.CustomerCode,
            branchName = result.BranchName,
            enrollments = result.Enrollments.Select(e => new
            {
                docKey = e.DocKey,
                seq = e.Seq,
                docNo = e.DocNo,
                docDate = e.DocDate,
                className = e.ClassName,
                itemCode = e.ItemCode,
                qty = e.Qty,
                unitPrice = e.UnitPrice,
                amount = e.Amount,
                deliveryDate = e.DeliveryDate,
                classDay = e.ClassDay,
                classTime = e.ClassTime,
                classDate = e.ClassDate,
                studentName = e.StudentName,
                conductedBy = e.ConductedBy,
                linkedClassId = e.LinkedClassId,
                linkedClassName = e.LinkedClassName,
                linkedClassDayOfWeek = e.LinkedClassDayOfWeek,
                linkedClassStartTime = e.LinkedClassStartTime,
                linkedClassEndTime = e.LinkedClassEndTime,
                linkedClassTeacherName = e.LinkedClassTeacherName,
                nextSessionDate = e.NextSessionDate,
            }),
        });
    }

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

    private static object MapCalendarEvent(ErpCalendarEventDto e) => new
    {
        id = e.Id,
        docKey = e.DocKey,
        seq = e.Seq,
        classId = e.ClassId?.ToString(),
        courseId = e.CourseId?.ToString(),
        className = e.ClassName,
        courseName = e.CourseName,
        teacherUserId = e.TeacherUserId?.ToString(),
        teacherName = e.TeacherName,
        studentName = e.StudentName,
        branchName = e.BranchName,
        itemCode = e.ItemCode,
        customerCode = e.CustomerCode,
        sessionDate = e.SessionDate,
        startTime = e.StartTime,
        endTime = e.EndTime,
        status = e.Status,
    };
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

    [HttpGet("calendar-filter")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetCalendarFilter(CancellationToken cancellationToken) =>
        Ok((await _service.GetCalendarFilterTeachersAsync(cancellationToken)).Select(t => new
        {
            erpUserId = t.ErpUserId,
            fullName = t.FullName,
            email = t.Email,
            portalUserId = t.PortalUserId?.ToString(),
            mobile = t.Mobile,
        }));

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
        isActive = c.IsActive,
        startDate = c.StartDate?.ToString("yyyy-MM-dd"),
        endDate = c.EndDate?.ToString("yyyy-MM-dd")
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
    public async Task<IActionResult> Create([FromBody] EnrollmentDto request)
    {
        try { return Ok(Map(await _service.CreateAsync(request))); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

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
    private readonly ClassSessionChangeHistoryService _history;

    public ClassSessionsController(ClassSessionService service, ClassSessionChangeHistoryService history)
    {
        _service = service;
        _history = history;
    }

    [HttpGet("changes")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetChanges(
        [FromQuery] Guid? classId,
        [FromQuery] Guid? sessionId,
        CancellationToken cancellationToken)
    {
        var rows = await _history.GetAsync(classId, sessionId, cancellationToken: cancellationToken);
        return Ok(rows.Select(MapChange).ToList());
    }

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
    public async Task<IActionResult> Update(Guid id, [FromBody] ClassSessionDto request, [FromQuery] string? reason)
    {
        var session = await _service.UpdateAsync(id, request, reason);
        return session == null ? NotFound() : Ok(Map(session));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] string? reason)
    {
        var deleted = await _service.DeleteAsync(id, reason);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/replace")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> Replace(Guid id, [FromBody] ReplaceClassSessionRequest request)
    {
        try
        {
            return Ok(Map(await _service.ReplaceAsync(id, request)));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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

    private static object MapChange(ClassSessionChangeHistoryDto h) => new
    {
        id = h.Id.ToString(),
        classSessionId = h.ClassSessionId.ToString(),
        classId = h.ClassId.ToString(),
        className = h.ClassName,
        changeType = h.ChangeType,
        actorUserId = h.ActorUserId?.ToString(),
        actorName = h.ActorName,
        reason = h.Reason,
        previousSessionDate = h.PreviousSessionDate,
        previousStartTime = h.PreviousStartTime,
        previousEndTime = h.PreviousEndTime,
        previousStatus = h.PreviousStatus,
        newSessionDate = h.NewSessionDate,
        newStartTime = h.NewStartTime,
        newEndTime = h.NewEndTime,
        newStatus = h.NewStatus,
        replacementClassSessionId = h.ReplacementClassSessionId?.ToString(),
        createdAt = h.CreatedAt
    };
}

[ApiController]
[Route("api/class-assignment-logs")]
[Authorize(Roles = "Admin,Teacher")]
public class ClassAssignmentLogsController : ControllerBase
{
    private readonly ClassAssignmentChangeLogService _service;

    public ClassAssignmentLogsController(ClassAssignmentChangeLogService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? classId,
        CancellationToken cancellationToken)
    {
        var rows = await _service.GetAsync(classId, cancellationToken: cancellationToken);
        return Ok(rows.Select(Map).ToList());
    }

    private static object Map(ClassAssignmentChangeLogDto l) => new
    {
        id = l.Id.ToString(),
        classId = l.ClassId.ToString(),
        className = l.ClassName,
        entityType = l.EntityType,
        operation = l.Operation,
        entityId = l.EntityId?.ToString(),
        studentUserId = l.StudentUserId?.ToString(),
        studentName = l.StudentName,
        previousTeacherUserId = l.PreviousTeacherUserId?.ToString(),
        previousTeacherName = l.PreviousTeacherName,
        newTeacherUserId = l.NewTeacherUserId?.ToString(),
        newTeacherName = l.NewTeacherName,
        previousDayOfWeek = l.PreviousDayOfWeek,
        newDayOfWeek = l.NewDayOfWeek,
        previousClassStartTime = l.PreviousClassStartTime,
        newClassStartTime = l.NewClassStartTime,
        previousClassEndTime = l.PreviousClassEndTime,
        newClassEndTime = l.NewClassEndTime,
        previousSessionDate = l.PreviousSessionDate,
        newSessionDate = l.NewSessionDate,
        previousSessionStartTime = l.PreviousSessionStartTime,
        newSessionStartTime = l.NewSessionStartTime,
        previousSessionEndTime = l.PreviousSessionEndTime,
        newSessionEndTime = l.NewSessionEndTime,
        previousStatus = l.PreviousStatus,
        newStatus = l.NewStatus,
        actorUserId = l.ActorUserId?.ToString(),
        actorName = l.ActorName,
        reason = l.Reason,
        createdAt = l.CreatedAt
    };
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

    [HttpGet("for-branch/{branchName}")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetForBranch(string branchName, CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrWhiteSpace(email)) return Unauthorized();
        return Ok(MapList(await _service.GetForParentBranchAsync(email, branchName, cancellationToken)));
    }

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
        homeworkId = n.HomeworkId,
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
        expiryDate = a.ExpiryDate?.ToString("yyyy-MM-dd"),
        targetRole = a.TargetRole,
        createdByUserId = a.CreatedByUserId.ToString(),
        createdByName = a.CreatedByName,
        isSystem = a.IsSystem,
        relatedType = a.RelatedType,
        relatedId = a.RelatedId,
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
    [Authorize(Roles = "Student")]
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
[Route("api/calendar")]
[Authorize(Roles = "Admin,Teacher")]
public class CalendarController : ControllerBase
{
    private readonly AdminCalendarService _calendarService;

    public CalendarController(AdminCalendarService calendarService) => _calendarService = calendarService;

    [HttpGet("events")]
    public async Task<IActionResult> GetEvents(CancellationToken cancellationToken)
    {
        var events = await _calendarService.GetEventsAsync(cancellationToken);
        return Ok(events.Select(Map).ToList());
    }

    [HttpPost("events/{id}/cancel")]
    public async Task<IActionResult> CancelEvent(
        string id,
        [FromBody] CalendarEventCancelRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(new { message = "Reason is required." });

        try
        {
            if (AdminCalendarService.TryParseOccurrenceId(id, out var occurrenceId))
            {
                await _calendarService.CancelOccurrenceByIdAsync(occurrenceId, request.Reason, cancellationToken);
                return NoContent();
            }

            if (!AdminCalendarService.TryParseEventId(id, out var docKey, out var seq))
                return BadRequest(new { message = "Invalid event id." });

            await _calendarService.CancelEventAsync(docKey, seq, request.Reason, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("events/{id}/replace")]
    public async Task<IActionResult> ReplaceEvent(
        string id,
        [FromBody] CalendarEventReplaceRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(new { message = "Reason is required." });

        try
        {
            if (AdminCalendarService.TryParseOccurrenceId(id, out var occurrenceId))
            {
                var updated = await _calendarService.ReplaceOccurrenceByIdAsync(
                    occurrenceId,
                    request.SessionDate,
                    request.StartTime,
                    request.EndTime,
                    request.Reason,
                    request.Notes,
                    cancellationToken);
                return updated == null ? NoContent() : Ok(Map(updated));
            }

            if (!AdminCalendarService.TryParseEventId(id, out var docKey, out var seq))
                return BadRequest(new { message = "Invalid event id." });

            var legacyUpdated = await _calendarService.ReplaceEventAsync(
                docKey,
                seq,
                request.SessionDate,
                request.StartTime,
                request.EndTime,
                request.Reason,
                request.Notes,
                cancellationToken);

            return legacyUpdated == null ? NoContent() : Ok(Map(legacyUpdated));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static object Map(ErpCalendarEventDto e) => new
    {
        id = e.Id,
        docKey = e.DocKey,
        seq = e.Seq,
        classId = e.ClassId?.ToString(),
        courseId = e.CourseId?.ToString(),
        className = e.ClassName,
        courseName = e.CourseName,
        teacherUserId = e.TeacherUserId?.ToString(),
        teacherName = e.TeacherName,
        studentName = e.StudentName,
        branchName = e.BranchName,
        itemCode = e.ItemCode,
        customerCode = e.CustomerCode,
        sessionDate = e.SessionDate,
        startTime = e.StartTime,
        endTime = e.EndTime,
        status = e.Status,
    };
}
