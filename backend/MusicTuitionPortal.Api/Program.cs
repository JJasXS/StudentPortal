using System.Text;
using FirebirdSql.EntityFrameworkCore.Firebird;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MusicTuitionPortal.Api.Data;
using MusicTuitionPortal.Api.Helpers;
using MusicTuitionPortal.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
builder.Services.AddSingleton(jwtSettings);

var authSettings = builder.Configuration.GetSection("Auth").Get<AuthSettings>() ?? new AuthSettings();
builder.Services.AddSingleton(authSettings);

var billplzSettings = builder.Configuration.GetSection("Billplz").Get<BillplzSettings>() ?? new BillplzSettings();
builder.Services.AddSingleton(billplzSettings);
builder.Services.AddHttpClient("Billplz");
builder.Services.AddScoped<BillplzService>();

var sqlAccountSettings = builder.Configuration.GetSection("SqlAccount").Get<SqlAccountSettings>() ?? new SqlAccountSettings();
builder.Services.AddSingleton(sqlAccountSettings);
builder.Services.AddHttpClient("SqlAccount");
builder.Services.AddScoped<SqlAccountLocalDbService>();
builder.Services.AddScoped<PortalSoLineScheduleService>();
builder.Services.AddScoped<SqlAccountSodtlUdfSyncService>();
builder.Services.AddScoped<SqlAccountService>();
builder.Services.AddScoped<SqlAccountSalesOrderService>();
builder.Services.AddScoped<SqlAccountChildEnrollmentWriteService>();
builder.Services.AddScoped<ItemCodeClassLinkService>();

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var provider = builder.Configuration["DatabaseProvider"] ?? FirebirdDbConfig.ProviderName;
    if (string.Equals(provider, FirebirdDbConfig.ProviderName, StringComparison.OrdinalIgnoreCase))
    {
        options.UseFirebird(FirebirdDbConfig.BuildConnectionString(builder.Configuration));
    }
    else if (string.Equals(provider, "Postgres", StringComparison.OrdinalIgnoreCase))
    {
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
    }
    else
    {
        throw new InvalidOperationException(
            $"Unsupported DatabaseProvider '{provider}'. Use {FirebirdDbConfig.ProviderName} or Postgres.");
    }
});

builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<StudentService>();
builder.Services.AddScoped<ParentService>();
builder.Services.AddScoped<TeacherService>();
builder.Services.AddScoped<CourseService>();
builder.Services.AddScoped<ClassService>();
builder.Services.AddScoped<EnrollmentService>();
builder.Services.AddScoped<ClassSessionService>();
builder.Services.AddScoped<ClassSessionChangeHistoryService>();
builder.Services.AddScoped<ClassAssignmentChangeLogService>();
builder.Services.AddScoped<PortalClassSessionService>();
builder.Services.AddScoped<PortalHomeworkService>();
builder.Services.AddSingleton<HomeworkFileStorageService>();
builder.Services.AddScoped<PortalLeaveRequestService>();
builder.Services.AddScoped<PortalAnnouncementService>();
builder.Services.AddScoped<AdminCalendarService>();
builder.Services.AddScoped<AttendanceService>();
builder.Services.AddScoped<LessonNoteService>();
builder.Services.AddScoped<AnnouncementService>();
builder.Services.AddScoped<InvoiceService>();
builder.Services.AddScoped<CentreSettingsService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AuditLogService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = $"{CentreBrandingDefaults.ApiTitle(builder.Configuration)} API",
        Version = "v1"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? builder.Configuration["Cors:AllowedOrigins"]?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

var billplz = app.Services.GetRequiredService<BillplzSettings>();
var sqlAccount = app.Services.GetRequiredService<SqlAccountSettings>();
var startupLog = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
if (billplz.IsConfigured)
    startupLog.LogInformation("Billplz FPX payments enabled ({Mode}).", billplz.Sandbox ? "sandbox" : "live");
else
    startupLog.LogWarning(
        "Billplz not configured — parent online pay disabled. Set Billplz__ApiKey and Billplz__CollectionId in .env.");

if (sqlAccount.IsConfigured)
    startupLog.LogInformation("SQL Account API configured ({Database}).", sqlAccount.DatabasePath ?? "PORTAL.FDB");
else
    startupLog.LogWarning(
        "SQL Account not configured — customer view disabled. Set SqlAccount__AccessKey and SqlAccount__SecretKey in .env.");

try
{
    await DbInitializer.InitializeAsync(app.Services);
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
    logger.LogError(ex, "Database initialization failed. Check Firebird PORTAL.FDB path (SqlAccount__DatabasePath) and credentials.");
    throw;
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
