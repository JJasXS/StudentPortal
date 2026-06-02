# Development Guide

## Project Overview

Generic music tuition / class management portal supporting Admin, Teacher, Student, and Parent roles.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, Axios
- Backend: ASP.NET Core Web API, EF Core, PostgreSQL, JWT, Swagger
- Database: PostgreSQL (`music_tuition_portal`)

## Quick Start

### 1. Run setup script (Windows)

```powershell
.\setup.ps1
```

### 2. Start backend

```bash
cd backend/MusicTuitionPortal.Api
dotnet restore
dotnet run
```

API: http://localhost:5000  
Swagger: http://localhost:5000/swagger

### 3. Start frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Frontend Mock Mode

To run frontend without backend, create `frontend/.env.local`:

```
VITE_USE_MOCK=true
```

## Environment Variables

### Backend

- `ConnectionStrings__DefaultConnection` - PostgreSQL connection string
- `Jwt__Secret` - JWT signing secret

### Frontend

- `VITE_API_URL` - API base URL (default: http://localhost:5000/api)
- `VITE_USE_MOCK` - Set to `true` for mock auth/data

## Role-Based Access

- Admin: full management pages
- Teacher: classes, sessions, attendance, lesson notes
- Student: own classes, attendance, notes, announcements
- Parent: linked children data

## Coding Conventions

- Backend uses DTOs, service layer, DI, async/await
- Frontend uses typed API modules with mock fallback
- Payment/invoice gateway is placeholder only

## Folder Structure

See README.md for full structure.

## Troubleshooting

### PostgreSQL connection failed
- Ensure PostgreSQL service is running
- Verify database exists
- Check connection string in appsettings

### CORS errors
- Backend allows http://localhost:5173 in development
- Ensure backend is running on port 5000

### npm not found
- Install Node.js LTS and restart terminal
