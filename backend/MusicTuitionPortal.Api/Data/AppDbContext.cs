using Microsoft.EntityFrameworkCore;
using MusicTuitionPortal.Api.Models;

namespace MusicTuitionPortal.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<StudentProfile> StudentProfiles => Set<StudentProfile>();
    public DbSet<ParentProfile> ParentProfiles => Set<ParentProfile>();
    public DbSet<TeacherProfile> TeacherProfiles => Set<TeacherProfile>();
    public DbSet<ParentStudent> ParentStudents => Set<ParentStudent>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<MusicClass> Classes => Set<MusicClass>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<ClassSession> ClassSessions => Set<ClassSession>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<AttendanceCheckIn> AttendanceCheckIns => Set<AttendanceCheckIn>();
    public DbSet<LessonNote> LessonNotes => Set<LessonNote>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<Invoice> Invoices => Set<Invoice>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<StudentProfile>().HasIndex(s => s.StudentCode).IsUnique();
        modelBuilder.Entity<StudentProfile>().HasOne(s => s.User).WithOne(u => u.StudentProfile).HasForeignKey<StudentProfile>(s => s.UserId);
        modelBuilder.Entity<ParentProfile>().HasOne(p => p.User).WithOne(u => u.ParentProfile).HasForeignKey<ParentProfile>(p => p.UserId);
        modelBuilder.Entity<TeacherProfile>().HasOne(t => t.User).WithOne(u => u.TeacherProfile).HasForeignKey<TeacherProfile>(t => t.UserId);

        modelBuilder.Entity<ParentStudent>()
            .HasOne(ps => ps.ParentUser).WithMany().HasForeignKey(ps => ps.ParentUserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ParentStudent>()
            .HasOne(ps => ps.StudentUser).WithMany().HasForeignKey(ps => ps.StudentUserId).OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<MusicClass>().ToTable("Classes");
        modelBuilder.Entity<MusicClass>().HasOne(c => c.TeacherUser).WithMany().HasForeignKey(c => c.TeacherUserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Enrollment>().HasOne(e => e.StudentUser).WithMany().HasForeignKey(e => e.StudentUserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Attendance>().HasOne(a => a.StudentUser).WithMany().HasForeignKey(a => a.StudentUserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<LessonNote>().HasOne(l => l.StudentUser).WithMany().HasForeignKey(l => l.StudentUserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<LessonNote>().HasOne(l => l.TeacherUser).WithMany().HasForeignKey(l => l.TeacherUserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Invoice>().HasOne(i => i.StudentUser).WithMany().HasForeignKey(i => i.StudentUserId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Invoice>().HasOne(i => i.ParentUser).WithMany().HasForeignKey(i => i.ParentUserId).OnDelete(DeleteBehavior.SetNull);
    }
}
