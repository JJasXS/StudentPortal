# Database Setup Guide

## PostgreSQL Installation

1. Download PostgreSQL from https://www.postgresql.org/download/
2. Install with default options
3. Remember your postgres user password (default in this project: `postgres`)

## Create Database

Using psql:

```sql
CREATE DATABASE music_tuition_portal;
```

Or using pgAdmin:
1. Connect to local PostgreSQL server
2. Right-click Databases → Create → Database
3. Name: `music_tuition_portal`

## Connection String

Default in `appsettings.json`:

```
Host=localhost;Port=5432;Database=music_tuition_portal;Username=postgres;Password=postgres
```

Override in `appsettings.Development.json` or environment variable:

```
ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=music_tuition_portal;Username=postgres;Password=postgres
```

## Automatic Table Creation

On first backend startup, `DbInitializer` runs:

- Creates tables using `EnsureCreated()`
- Seeds roles, admin account, sample teachers/students/parents
- Seeds courses, classes, enrollments, sessions, attendance, announcements, invoices

## Migrations (Future)

For production, switch from `EnsureCreated()` to EF Core migrations:

```bash
cd backend/MusicTuitionPortal.Api
dotnet ef migrations add InitialCreate
dotnet ef database update
```

## Default Seeded Admin

- Email: admin@demo.com
- Password: Admin@123

## Other Demo Accounts

| Role    | Email                 | Password     |
|---------|-----------------------|--------------|
| Teacher | sarah.chen@demo.com   | Teacher@123  |
| Teacher | david.wong@demo.com   | Teacher@123  |
| Parent  | michael.tan@demo.com  | Parent@123   |
| Parent  | lisa.lim@demo.com     | Parent@123   |
