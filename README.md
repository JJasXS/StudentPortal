# Music Tuition Portal

A generic student portal system for tuition and music class businesses. Supports multiple roles and is designed for future multi-centre / multi-tenant expansion.

## Features

- Role-based dashboards (Admin, Teacher, Student, Parent)
- Student, parent, and teacher management
- Course and class scheduling
- Enrollments and class sessions
- Attendance tracking
- Lesson notes
- Announcements
- Invoice list placeholder (payment gateway in future phase)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, Axios |
| Backend | ASP.NET Core Web API (.NET 10), EF Core |
| Database | PostgreSQL |
| Auth | JWT Bearer |
| API Docs | Swagger / OpenAPI |

## Installation

See `requirements.txt` for required tools.

Quick setup on Windows:

```powershell
.\setup.ps1
```

### Database

1. Install PostgreSQL
2. Create database:

```sql
CREATE DATABASE music_tuition_portal;
```

Default credentials used in config:
- Username: `postgres`
- Password: `postgres`

**Quick local dev (no PostgreSQL required):**  
Development mode uses **SQLite** by default (`appsettings.Development.json` → `"DatabaseProvider": "Sqlite"`).  
To switch to PostgreSQL, set `"DatabaseProvider": "Postgres"` and ensure PostgreSQL is running.

See [docs/database_setup.md](docs/database_setup.md) for details.

## Run Frontend

From **project root** (not from the backend folder):

```powershell
.\run-frontend.ps1
```

Or manually:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

> If `npm` is not recognized, **close and reopen your terminal** after installing Node.js, or use `.\run-frontend.ps1` which refreshes PATH automatically.

## Run Backend

```powershell
.\run-backend.ps1
```

Or manually:

```bash
cd backend/MusicTuitionPortal.Api
dotnet restore
dotnet run
```

API: http://localhost:5000  
Swagger: http://localhost:5000/swagger

On first run, `DbInitializer` creates tables and seeds sample data automatically.

## Default Login

| Field | Value |
|-------|-------|
| Email | admin@demo.com |
| Password | Admin@123 |

Other demo accounts are listed on the login page and in [docs/database_setup.md](docs/database_setup.md).

## Folder Structure

```
MusicTuitionPortal/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── api/              # Axios API clients
│   │   ├── components/       # UI and layout components
│   │   ├── context/          # Auth context
│   │   ├── layouts/          # Dashboard layout
│   │   ├── pages/            # Role-based pages
│   │   ├── routes/           # React Router config
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Mock data and helpers
│   └── package.json
├── backend/
│   └── MusicTuitionPortal.Api/
│       ├── Controllers/      # API controllers
│       ├── Data/             # DbContext + DbInitializer
│       ├── DTOs/             # Data transfer objects
│       ├── Models/           # EF Core entities
│       ├── Services/         # Business logic
│       ├── Helpers/          # JWT and password helpers
│       └── Program.cs
├── docs/
│   ├── database_setup.md
│   ├── api_plan.md
│   └── development_guide.md
├── requirements.txt
├── setup.ps1
└── README.md
```

## Future Phase Roadmap

### Phase 1
- Frontend UI
- Role dashboards
- Mock data

### Phase 2
- Backend API
- PostgreSQL database
- Authentication
- DbInitializer

### Phase 3
- Attendance
- Lesson notes
- Announcements
- Parent-child linking

### Phase 4
- Invoice and payment module
- Payment gateway integration
- Receipt generation

### Phase 5
- Notification system
- Email / SMS / WhatsApp reminders

### Phase 6
- Multi-tenant support
- Each music school can have separate data

### Phase 7
- SQL Account ERP integration
- Push invoice/payment records to SQL Account only
- Do not store education portal logic inside SQL Account database

## Notes

- Payment gateway (Stripe, Billplz, FPX, etc.) is **not** implemented yet
- SQL Account is **not** used as the main portal database
- System is generic and not tied to one company

## License

Internal / educational project template.
