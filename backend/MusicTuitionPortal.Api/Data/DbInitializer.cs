using Microsoft.EntityFrameworkCore;
using MusicTuitionPortal.Api.Helpers;
using MusicTuitionPortal.Api.Models;

namespace MusicTuitionPortal.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await context.Database.EnsureCreatedAsync();
        await EnsureEmploymentTypeColumnAsync(context);
        await EnsureAttendanceCheckInsTableAsync(context);

        if (await context.Users.AnyAsync())
        {
            await EnsureDemoStudentsAsync(context);
            await EnsureDemoParentsAsync(context);
            await EnsureDemoTeachersAsync(context);
            return;
        }

        var adminId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var teacher1Id = Guid.Parse("22222222-2222-2222-2222-222222222221");
        var teacher2Id = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var student1Id = Guid.Parse("33333333-3333-3333-3333-333333333331");
        var student2Id = Guid.Parse("33333333-3333-3333-3333-333333333332");
        var student3Id = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var student4Id = Guid.Parse("33333333-3333-3333-3333-333333333334");
        var student5Id = Guid.Parse("33333333-3333-3333-3333-333333333335");
        var student6Id = Guid.Parse("33333333-3333-3333-3333-333333333336");
        var student7Id = Guid.Parse("33333333-3333-3333-3333-333333333337");
        var student8Id = Guid.Parse("33333333-3333-3333-3333-333333333338");
        var student9Id = Guid.Parse("33333333-3333-3333-3333-333333333339");
        var parent1Id = Guid.Parse("44444444-4444-4444-4444-444444444441");
        var parent2Id = Guid.Parse("44444444-4444-4444-4444-444444444442");

        var admin = new User
        {
            Id = adminId,
            FullName = "System Admin",
            Email = "admin@demo.com",
            PasswordHash = PasswordHelper.Hash("Admin@123"),
            PhoneNumber = "+60123456789",
            Role = Roles.Admin,
            IsActive = true
        };

        var teacher1 = new User
        {
            Id = teacher1Id,
            FullName = "Sarah Chen",
            Email = "sarah.chen@demo.com",
            PasswordHash = PasswordHelper.Hash("Teacher@123"),
            PhoneNumber = "+60198765432",
            Role = Roles.Teacher,
            IsActive = true
        };

        var teacher2 = new User
        {
            Id = teacher2Id,
            FullName = "David Wong",
            Email = "david.wong@demo.com",
            PasswordHash = PasswordHelper.Hash("Teacher@123"),
            PhoneNumber = "+60187654321",
            Role = Roles.Teacher,
            IsActive = true
        };

        var student1 = new User
        {
            Id = student1Id,
            FullName = "Emily Tan",
            Email = "emily.tan@demo.com",
            PasswordHash = PasswordHelper.Hash("Student@123"),
            PhoneNumber = "+60123456780",
            Role = Roles.Student,
            IsActive = true
        };

        var student2 = new User
        {
            Id = student2Id,
            FullName = "James Lim",
            Email = "james.lim@demo.com",
            PasswordHash = PasswordHelper.Hash("Student@123"),
            PhoneNumber = "+60123456781",
            Role = Roles.Student,
            IsActive = true
        };

        var student3 = new User
        {
            Id = student3Id,
            FullName = "Sophia Lee",
            Email = "sophia.lee@demo.com",
            PasswordHash = PasswordHelper.Hash("Student@123"),
            PhoneNumber = "+60123456790",
            Role = Roles.Student,
            IsActive = true
        };

        var student4 = new User
        {
            Id = student4Id,
            FullName = "Ahmad Razak",
            Email = "ahmad.razak@demo.com",
            PasswordHash = PasswordHelper.Hash("Student@123"),
            PhoneNumber = "+60123456791",
            Role = Roles.Student,
            IsActive = true
        };

        var student5 = new User
        {
            Id = student5Id,
            FullName = "Chloe Ng",
            Email = "chloe.ng@demo.com",
            PasswordHash = PasswordHelper.Hash("Student@123"),
            PhoneNumber = "+60123456792",
            Role = Roles.Student,
            IsActive = true
        };

        var student6 = new User
        {
            Id = student6Id,
            FullName = "Daniel Koh",
            Email = "daniel.koh@demo.com",
            PasswordHash = PasswordHelper.Hash("Student@123"),
            PhoneNumber = "+60123456793",
            Role = Roles.Student,
            IsActive = true
        };

        var student7 = new User
        {
            Id = student7Id,
            FullName = "Nurul Huda",
            Email = "nurul.huda@demo.com",
            PasswordHash = PasswordHelper.Hash("Student@123"),
            PhoneNumber = "+60123456794",
            Role = Roles.Student,
            IsActive = false
        };

        var student8 = new User
        {
            Id = student8Id,
            FullName = "Ryan Teo",
            Email = "ryan.teo@demo.com",
            PasswordHash = PasswordHelper.Hash("Student@123"),
            PhoneNumber = "+60123456795",
            Role = Roles.Student,
            IsActive = false
        };

        var student9 = new User
        {
            Id = student9Id,
            FullName = "Priya Devi",
            Email = "priya.devi@demo.com",
            PasswordHash = PasswordHelper.Hash("Student@123"),
            PhoneNumber = "+60123456796",
            Role = Roles.Student,
            IsActive = false
        };

        var parent1 = new User
        {
            Id = parent1Id,
            FullName = "Michael Tan",
            Email = "michael.tan@demo.com",
            PasswordHash = PasswordHelper.Hash("Parent@123"),
            PhoneNumber = "+60123456782",
            Role = Roles.Parent,
            IsActive = true
        };

        var parent2 = new User
        {
            Id = parent2Id,
            FullName = "Lisa Lim",
            Email = "lisa.lim@demo.com",
            PasswordHash = PasswordHelper.Hash("Parent@123"),
            PhoneNumber = "+60123456783",
            Role = Roles.Parent,
            IsActive = true
        };

        context.Users.AddRange(
            admin, teacher1, teacher2,
            student1, student2, student3, student4, student5, student6, student7, student8, student9,
            parent1, parent2);

        context.StudentProfiles.AddRange(
            new StudentProfile
            {
                Id = Guid.NewGuid(),
                UserId = student1Id,
                StudentCode = "STU-001",
                DateOfBirth = new DateTime(2012, 5, 15, 0, 0, 0, DateTimeKind.Utc),
                Gender = "F",
                SchoolName = "Green Valley Primary",
                Notes = "Prefers afternoon sessions"
            },
            new StudentProfile
            {
                Id = Guid.NewGuid(),
                UserId = student2Id,
                StudentCode = "STU-002",
                DateOfBirth = new DateTime(2010, 8, 22, 0, 0, 0, DateTimeKind.Utc),
                Gender = "M",
                SchoolName = "Sunshine Secondary"
            },
            new StudentProfile
            {
                Id = Guid.NewGuid(),
                UserId = student3Id,
                StudentCode = "STU-003",
                DateOfBirth = new DateTime(2013, 3, 10, 0, 0, 0, DateTimeKind.Utc),
                Gender = "F",
                SchoolName = "Harmony Primary"
            },
            new StudentProfile
            {
                Id = Guid.NewGuid(),
                UserId = student4Id,
                StudentCode = "STU-004",
                DateOfBirth = new DateTime(2011, 11, 28, 0, 0, 0, DateTimeKind.Utc),
                Gender = "M",
                SchoolName = "Sri Damai Secondary"
            },
            new StudentProfile
            {
                Id = Guid.NewGuid(),
                UserId = student5Id,
                StudentCode = "STU-005",
                DateOfBirth = new DateTime(2014, 7, 4, 0, 0, 0, DateTimeKind.Utc),
                Gender = "F",
                SchoolName = "Green Valley Primary"
            },
            new StudentProfile
            {
                Id = Guid.NewGuid(),
                UserId = student6Id,
                StudentCode = "STU-006",
                DateOfBirth = new DateTime(2009, 1, 19, 0, 0, 0, DateTimeKind.Utc),
                Gender = "M",
                SchoolName = "Metro College",
                Notes = "Violin intermediate"
            },
            new StudentProfile
            {
                Id = Guid.NewGuid(),
                UserId = student7Id,
                StudentCode = "STU-007",
                DateOfBirth = new DateTime(2012, 9, 30, 0, 0, 0, DateTimeKind.Utc),
                Gender = "F",
                SchoolName = "Sri Damai Secondary",
                Notes = "Withdrawn — relocated"
            },
            new StudentProfile
            {
                Id = Guid.NewGuid(),
                UserId = student8Id,
                StudentCode = "STU-008",
                DateOfBirth = new DateTime(2010, 12, 5, 0, 0, 0, DateTimeKind.Utc),
                Gender = "M",
                SchoolName = "Sunshine Secondary",
                Notes = "Cancelled — fee outstanding"
            },
            new StudentProfile
            {
                Id = Guid.NewGuid(),
                UserId = student9Id,
                StudentCode = "STU-009",
                DateOfBirth = new DateTime(2013, 6, 18, 0, 0, 0, DateTimeKind.Utc),
                Gender = "F",
                SchoolName = "Harmony Primary",
                Notes = "Cancelled — completed programme"
            });

        context.ParentProfiles.AddRange(
            new ParentProfile
            {
                Id = Guid.NewGuid(),
                UserId = parent1Id,
                Relationship = "Father",
                Address = "12 Jalan Melati, Kuala Lumpur"
            },
            new ParentProfile
            {
                Id = Guid.NewGuid(),
                UserId = parent2Id,
                Relationship = "Mother",
                Address = "45 Lorong Bunga, Petaling Jaya"
            });

        context.TeacherProfiles.AddRange(
            new TeacherProfile
            {
                Id = Guid.NewGuid(),
                UserId = teacher1Id,
                Specialization = "Piano, Music Theory",
                Bio = "10 years teaching experience. ABRSM certified.",
                HourlyRate = 120,
                EmploymentType = EmploymentTypes.FullTime
            },
            new TeacherProfile
            {
                Id = Guid.NewGuid(),
                UserId = teacher2Id,
                Specialization = "Guitar, Ukulele",
                Bio = "Professional guitarist and music educator.",
                HourlyRate = 100,
                EmploymentType = EmploymentTypes.PartTime
            });

        context.ParentStudents.AddRange(
            new ParentStudent { Id = Guid.NewGuid(), ParentUserId = parent1Id, StudentUserId = student1Id, Relationship = "Father" },
            new ParentStudent { Id = Guid.NewGuid(), ParentUserId = parent2Id, StudentUserId = student2Id, Relationship = "Mother" });

        var course1 = new Course { Id = Guid.NewGuid(), CourseName = "Piano Beginner", Category = "Piano", Description = "Introduction to piano basics", Level = "Beginner", DefaultDurationMinutes = 60 };
        var course2 = new Course { Id = Guid.NewGuid(), CourseName = "Guitar Beginner", Category = "Guitar", Description = "Learn guitar fundamentals", Level = "Beginner", DefaultDurationMinutes = 60 };
        var course3 = new Course { Id = Guid.NewGuid(), CourseName = "Violin Intermediate", Category = "Violin", Description = "Intermediate violin techniques", Level = "Intermediate", DefaultDurationMinutes = 45 };
        var course4 = new Course { Id = Guid.NewGuid(), CourseName = "Vocal Basic", Category = "Vocal", Description = "Basic vocal training", Level = "Beginner", DefaultDurationMinutes = 45 };
        var course5 = new Course { Id = Guid.NewGuid(), CourseName = "Drum Beginner", Category = "Drums", Description = "Drum kit basics", Level = "Beginner", DefaultDurationMinutes = 60 };
        context.Courses.AddRange(course1, course2, course3, course4, course5);

        var class1 = new MusicClass
        {
            Id = Guid.NewGuid(),
            CourseId = course1.Id,
            TeacherUserId = teacher1Id,
            ClassName = "Piano Mon AM",
            DayOfWeek = "Monday",
            StartTime = new TimeSpan(10, 0, 0),
            EndTime = new TimeSpan(11, 0, 0),
            MaxStudents = 8,
            Location = "Room A"
        };
        var class2 = new MusicClass
        {
            Id = Guid.NewGuid(),
            CourseId = course2.Id,
            TeacherUserId = teacher2Id,
            ClassName = "Guitar Wed PM",
            DayOfWeek = "Wednesday",
            StartTime = new TimeSpan(15, 0, 0),
            EndTime = new TimeSpan(16, 0, 0),
            MaxStudents = 6,
            Location = "Room B"
        };
        var class3 = new MusicClass
        {
            Id = Guid.NewGuid(),
            CourseId = course1.Id,
            TeacherUserId = teacher1Id,
            ClassName = "Piano Sat AM",
            DayOfWeek = "Saturday",
            StartTime = new TimeSpan(9, 0, 0),
            EndTime = new TimeSpan(10, 0, 0),
            MaxStudents = 8,
            Location = "Room A"
        };
        context.Classes.AddRange(class1, class2, class3);

        context.Enrollments.AddRange(
            new Enrollment { Id = Guid.NewGuid(), StudentUserId = student1Id, ClassId = class1.Id, EnrollmentDate = new DateTime(2025, 1, 15, 0, 0, 0, DateTimeKind.Utc), Status = "Active" },
            new Enrollment { Id = Guid.NewGuid(), StudentUserId = student2Id, ClassId = class2.Id, EnrollmentDate = new DateTime(2025, 2, 1, 0, 0, 0, DateTimeKind.Utc), Status = "Active" },
            new Enrollment { Id = Guid.NewGuid(), StudentUserId = student1Id, ClassId = class3.Id, EnrollmentDate = new DateTime(2025, 1, 20, 0, 0, 0, DateTimeKind.Utc), Status = "Active" });

        var session1 = new ClassSession
        {
            Id = Guid.NewGuid(),
            ClassId = class1.Id,
            SessionDate = new DateTime(2025, 5, 26, 0, 0, 0, DateTimeKind.Utc),
            StartTime = new TimeSpan(10, 0, 0),
            EndTime = new TimeSpan(11, 0, 0),
            Topic = "Scales and Hand Position",
            Status = "Scheduled"
        };
        var session2 = new ClassSession
        {
            Id = Guid.NewGuid(),
            ClassId = class1.Id,
            SessionDate = new DateTime(2025, 5, 19, 0, 0, 0, DateTimeKind.Utc),
            StartTime = new TimeSpan(10, 0, 0),
            EndTime = new TimeSpan(11, 0, 0),
            Topic = "Introduction to C Major",
            Notes = "Good progress overall",
            Status = "Completed"
        };
        var session3 = new ClassSession
        {
            Id = Guid.NewGuid(),
            ClassId = class2.Id,
            SessionDate = new DateTime(2025, 5, 28, 0, 0, 0, DateTimeKind.Utc),
            StartTime = new TimeSpan(15, 0, 0),
            EndTime = new TimeSpan(16, 0, 0),
            Topic = "Basic Chords",
            Status = "Scheduled"
        };
        context.ClassSessions.AddRange(session1, session2, session3);

        context.Attendances.AddRange(
            new Attendance { Id = Guid.NewGuid(), ClassSessionId = session2.Id, StudentUserId = student1Id, Status = "Present" },
            new Attendance { Id = Guid.NewGuid(), ClassSessionId = session2.Id, StudentUserId = student2Id, Status = "Late", Remarks = "Arrived 10 mins late" });

        context.LessonNotes.AddRange(
            new LessonNote
            {
                Id = Guid.NewGuid(),
                ClassSessionId = session2.Id,
                StudentUserId = student1Id,
                TeacherUserId = teacher1Id,
                NoteTitle = "C Major Progress",
                NoteContent = "Emily showed good understanding of C major scale.",
                PracticeInstructions = "Practice C major scale hands separately, 10 mins daily."
            },
            new LessonNote
            {
                Id = Guid.NewGuid(),
                ClassSessionId = session2.Id,
                StudentUserId = student2Id,
                TeacherUserId = teacher1Id,
                NoteTitle = "Hand Position",
                NoteContent = "Needs improvement on wrist position.",
                PracticeInstructions = "Practice with metronome at 60 BPM."
            });

        context.Announcements.AddRange(
            new Announcement
            {
                Id = Guid.NewGuid(),
                Title = "King's Birthday — Centre Closed",
                Content = "Centre closed for public holiday. All classes on this date are cancelled.",
                Category = "Holiday",
                HolidayDate = new DateTime(2026, 6, 7, 0, 0, 0, DateTimeKind.Utc),
                TargetRole = "All",
                CreatedByUserId = adminId
            },
            new Announcement
            {
                Id = Guid.NewGuid(),
                Title = "Public Holiday — Class Reschedule",
                Content = "Classes on June 2 will be rescheduled. Please check your class sessions.",
                Category = "Holiday",
                HolidayDate = new DateTime(2026, 6, 2, 0, 0, 0, DateTimeKind.Utc),
                TargetRole = "All",
                CreatedByUserId = adminId
            },
            new Announcement
            {
                Id = Guid.NewGuid(),
                Title = "Mid-Year Break",
                Content = "Centre closed for mid-year break. Normal classes resume the following week.",
                Category = "Holiday",
                HolidayDate = new DateTime(2026, 7, 20, 0, 0, 0, DateTimeKind.Utc),
                TargetRole = "All",
                CreatedByUserId = adminId
            },
            new Announcement
            {
                Id = Guid.NewGuid(),
                Title = "Merdeka Day — Centre Closed",
                Content = "The centre will be closed on 31 August for Merdeka Day. No classes on that date.",
                Category = "Holiday",
                HolidayDate = new DateTime(2026, 8, 31, 0, 0, 0, DateTimeKind.Utc),
                TargetRole = "All",
                CreatedByUserId = adminId
            },
            new Announcement
            {
                Id = Guid.NewGuid(),
                Title = "Malaysia Day — Centre Closed",
                Content = "Centre closed for Malaysia Day. Classes will not run on this date.",
                Category = "Holiday",
                HolidayDate = new DateTime(2026, 9, 16, 0, 0, 0, DateTimeKind.Utc),
                TargetRole = "All",
                CreatedByUserId = adminId
            },
            new Announcement
            {
                Id = Guid.NewGuid(),
                Title = "Christmas Day — Centre Closed",
                Content = "Centre closed for Christmas. Happy holidays to all students and families.",
                Category = "Holiday",
                HolidayDate = new DateTime(2026, 12, 25, 0, 0, 0, DateTimeKind.Utc),
                TargetRole = "All",
                CreatedByUserId = adminId
            },
            new Announcement
            {
                Id = Guid.NewGuid(),
                Title = "Recital Registration Open",
                Content = "Annual student recital registration is now open. Register by June 15.",
                Category = "General",
                TargetRole = "Student",
                CreatedByUserId = adminId
            },
            new Announcement
            {
                Id = Guid.NewGuid(),
                Title = "Teacher Meeting",
                Content = "Monthly teacher meeting on Friday at 4 PM in the staff room.",
                Category = "General",
                TargetRole = "Teacher",
                CreatedByUserId = adminId
            },
            new Announcement
            {
                Id = Guid.NewGuid(),
                Title = "Practice Room Booking",
                Content = "Extra practice rooms available on weekends. Book at the front desk.",
                Category = "General",
                TargetRole = "Student",
                CreatedByUserId = adminId
            });

        context.Invoices.AddRange(
            new Invoice
            {
                Id = Guid.NewGuid(),
                StudentUserId = student1Id,
                ParentUserId = parent1Id,
                InvoiceNo = "INV-2025-001",
                Amount = 350,
                Status = "Unpaid",
                DueDate = new DateTime(2025, 6, 15, 0, 0, 0, DateTimeKind.Utc)
            },
            new Invoice
            {
                Id = Guid.NewGuid(),
                StudentUserId = student2Id,
                ParentUserId = parent2Id,
                InvoiceNo = "INV-2025-002",
                Amount = 280,
                Status = "Paid",
                DueDate = new DateTime(2025, 5, 15, 0, 0, 0, DateTimeKind.Utc)
            });

        await context.SaveChangesAsync();
        await EnsureDemoStudentsAsync(context);
        await EnsureDemoParentsAsync(context);
        await EnsureDemoTeachersAsync(context);
    }

    /// <summary>Adds STU-003…STU-009 when DB was seeded before extra demo students existed.</summary>
    private static async Task EnsureDemoStudentsAsync(AppDbContext context)
    {
        if (await context.StudentProfiles.AnyAsync(s => s.StudentCode == "STU-003"))
            return;

        var student3Id = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var student4Id = Guid.Parse("33333333-3333-3333-3333-333333333334");
        var student5Id = Guid.Parse("33333333-3333-3333-3333-333333333335");
        var student6Id = Guid.Parse("33333333-3333-3333-3333-333333333336");
        var student7Id = Guid.Parse("33333333-3333-3333-3333-333333333337");
        var student8Id = Guid.Parse("33333333-3333-3333-3333-333333333338");
        var student9Id = Guid.Parse("33333333-3333-3333-3333-333333333339");

        var extraStudents = new[]
        {
            (student3Id, "Sophia Lee", "sophia.lee@demo.com", "+60123456790", true, "STU-003", new DateTime(2013, 3, 10, 0, 0, 0, DateTimeKind.Utc), "F", "Harmony Primary", (string?)null),
            (student4Id, "Ahmad Razak", "ahmad.razak@demo.com", "+60123456791", true, "STU-004", new DateTime(2011, 11, 28, 0, 0, 0, DateTimeKind.Utc), "M", "Sri Damai Secondary", (string?)null),
            (student5Id, "Chloe Ng", "chloe.ng@demo.com", "+60123456792", true, "STU-005", new DateTime(2014, 7, 4, 0, 0, 0, DateTimeKind.Utc), "F", "Green Valley Primary", (string?)null),
            (student6Id, "Daniel Koh", "daniel.koh@demo.com", "+60123456793", true, "STU-006", new DateTime(2009, 1, 19, 0, 0, 0, DateTimeKind.Utc), "M", "Metro College", "Violin intermediate"),
            (student7Id, "Nurul Huda", "nurul.huda@demo.com", "+60123456794", false, "STU-007", new DateTime(2012, 9, 30, 0, 0, 0, DateTimeKind.Utc), "F", "Sri Damai Secondary", "Withdrawn — relocated"),
            (student8Id, "Ryan Teo", "ryan.teo@demo.com", "+60123456795", false, "STU-008", new DateTime(2010, 12, 5, 0, 0, 0, DateTimeKind.Utc), "M", "Sunshine Secondary", "Cancelled — fee outstanding"),
            (student9Id, "Priya Devi", "priya.devi@demo.com", "+60123456796", false, "STU-009", new DateTime(2013, 6, 18, 0, 0, 0, DateTimeKind.Utc), "F", "Harmony Primary", "Cancelled — completed programme"),
        };

        foreach (var (userId, fullName, email, phone, isActive, code, dob, gender, school, notes) in extraStudents)
        {
            if (await context.Users.AnyAsync(u => u.Id == userId || u.Email == email))
                continue;

            context.Users.Add(new User
            {
                Id = userId,
                FullName = fullName,
                Email = email,
                PasswordHash = PasswordHelper.Hash("Student@123"),
                PhoneNumber = phone,
                Role = Roles.Student,
                IsActive = isActive
            });

            context.StudentProfiles.Add(new StudentProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                StudentCode = code,
                DateOfBirth = dob,
                Gender = gender,
                SchoolName = school,
                Notes = notes
            });
        }

        await context.SaveChangesAsync();
    }

    private static async Task EnsureDemoTeachersAsync(AppDbContext context)
    {
        if (await context.Users.AnyAsync(u => u.Email == "jason.ooi@demo.com"))
            return;

        var extras = new[]
        {
            (Guid.Parse("22222222-2222-2222-2222-222222222223"), "Michelle Yap", "michelle.yap@demo.com", "+60198765440", true, "Violin", 110m, EmploymentTypes.FullTime),
            (Guid.Parse("22222222-2222-2222-2222-222222222224"), "Kevin Lim", "kevin.lim@demo.com", "+60198765441", true, "Drums", 95m, EmploymentTypes.Contract),
            (Guid.Parse("22222222-2222-2222-2222-222222222225"), "Amira Hassan", "amira.hassan@demo.com", "+60198765442", false, "Vocal", 105m, EmploymentTypes.Substitute),
            (Guid.Parse("22222222-2222-2222-2222-222222222226"), "Jason Ooi", "jason.ooi@demo.com", "+60198765450", true, "Piano", 90m, EmploymentTypes.PartTime),
            (Guid.Parse("22222222-2222-2222-2222-222222222227"), "Lily Chan", "lily.chan@demo.com", "+60198765451", true, "Music Theory", 85m, EmploymentTypes.PartTime),
            (Guid.Parse("22222222-2222-2222-2222-222222222228"), "Marcus Lee", "marcus.lee@demo.com", "+60198765452", true, "Guitar", 88m, EmploymentTypes.PartTime),
            (Guid.Parse("22222222-2222-2222-2222-222222222229"), "Nadia Ibrahim", "nadia.ibrahim@demo.com", "+60198765453", true, "Cello", 115m, EmploymentTypes.Contract),
            (Guid.Parse("22222222-2222-2222-2222-222222222230"), "Oliver Tan", "oliver.tan@demo.com", "+60198765454", true, "Brass, Trumpet", 102m, EmploymentTypes.Contract),
            (Guid.Parse("22222222-2222-2222-2222-222222222231"), "Priya Menon", "priya.menon@demo.com", "+60198765455", true, "Vocal, Choir", 92m, EmploymentTypes.Substitute),
            (Guid.Parse("22222222-2222-2222-2222-222222222232"), "Quinn Lau", "quinn.lau@demo.com", "+60198765456", true, "Drums, Percussion", 87m, EmploymentTypes.Substitute),
            (Guid.Parse("22222222-2222-2222-2222-222222222233"), "Rachel Goh", "rachel.goh@demo.com", "+60198765457", false, "Flute", 80m, EmploymentTypes.Substitute),
        };

        foreach (var (userId, fullName, email, phone, isActive, specialization, rate, employmentType) in extras)
        {
            if (await context.Users.AnyAsync(u => u.Email == email))
                continue;

            context.Users.Add(new User
            {
                Id = userId,
                FullName = fullName,
                Email = email,
                PasswordHash = PasswordHelper.Hash("Teacher@123"),
                PhoneNumber = phone,
                Role = Roles.Teacher,
                IsActive = isActive,
                CreatedAt = DateTime.UtcNow.AddMonths(-8)
            });

            context.TeacherProfiles.Add(new TeacherProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Specialization = specialization,
                HourlyRate = rate,
                EmploymentType = employmentType
            });
        }

        await context.SaveChangesAsync();
    }

    private static async Task EnsureDemoParentsAsync(AppDbContext context)
    {
        if (await context.Users.AnyAsync(u => u.Email == "david.tan@demo.com"))
            return;

        var parent3Id = Guid.Parse("44444444-4444-4444-4444-444444444443");
        var parent4Id = Guid.Parse("44444444-4444-4444-4444-444444444444");
        var parent5Id = Guid.Parse("44444444-4444-4444-4444-444444444445");
        var parent6Id = Guid.Parse("44444444-4444-4444-4444-444444444446");
        var student3Id = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var student4Id = Guid.Parse("33333333-3333-3333-3333-333333333334");
        var student5Id = Guid.Parse("33333333-3333-3333-3333-333333333335");
        var student7Id = Guid.Parse("33333333-3333-3333-3333-333333333337");

        var extras = new[]
        {
            (parent3Id, "David Tan", "david.tan@demo.com", "+60123456800", true, "Father", "8 Jalan Harmoni, Shah Alam",
                new[] { student3Id, student5Id }),
            (parent4Id, "Siti Rahman", "siti.rahman@demo.com", "+60123456801", true, "Mother", "22 Taman Sri, Johor Bahru",
                new[] { student4Id }),
            (parent5Id, "Helen Koh", "helen.koh@demo.com", "+60123456802", false, "Guardian", "3 Persiaran Metro, KL",
                new[] { student7Id }),
            (parent6Id, "Robert Ng", "robert.ng@demo.com", "+60123456803", false, "Father", "19 Jalan Bukit, Penang",
                Array.Empty<Guid>()),
        };

        foreach (var (userId, fullName, email, phone, isActive, relationship, address, childIds) in extras)
        {
            if (await context.Users.AnyAsync(u => u.Email == email))
                continue;

            context.Users.Add(new User
            {
                Id = userId,
                FullName = fullName,
                Email = email,
                PasswordHash = PasswordHelper.Hash("Parent@123"),
                PhoneNumber = phone,
                Role = Roles.Parent,
                IsActive = isActive,
                CreatedAt = DateTime.UtcNow.AddMonths(-6)
            });

            context.ParentProfiles.Add(new ParentProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Relationship = relationship,
                Address = address
            });

            foreach (var childId in childIds)
            {
                if (!await context.ParentStudents.AnyAsync(l => l.ParentUserId == userId && l.StudentUserId == childId))
                {
                    context.ParentStudents.Add(new ParentStudent
                    {
                        Id = Guid.NewGuid(),
                        ParentUserId = userId,
                        StudentUserId = childId,
                        Relationship = relationship
                    });
                }
            }
        }

        await context.SaveChangesAsync();
    }

    private static async Task EnsureEmploymentTypeColumnAsync(AppDbContext context)
    {
        try
        {
            await context.Database.ExecuteSqlRawAsync(
                "ALTER TABLE TeacherProfiles ADD COLUMN EmploymentType TEXT NOT NULL DEFAULT 'FullTime'");
        }
        catch
        {
            // Column already exists
        }
    }

    private static async Task EnsureAttendanceCheckInsTableAsync(AppDbContext context)
    {
        await context.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS AttendanceCheckIns (
                Id TEXT NOT NULL PRIMARY KEY,
                ClassSessionId TEXT NOT NULL,
                Code TEXT NOT NULL,
                ExpiresAt TEXT NOT NULL,
                CreatedByUserId TEXT NOT NULL,
                CreatedAt TEXT NOT NULL
            )");
    }
}
