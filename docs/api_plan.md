# API Plan

Base URL: `http://localhost:5000/api`

Authentication: JWT Bearer token in `Authorization` header.

## Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Login and receive JWT |
| POST | /auth/register | Register new user |
| GET | /auth/me | Get current user profile |

## Users (Admin)

| Method | Endpoint |
|--------|----------|
| GET | /users |
| GET | /users/{id} |
| POST | /users |
| PUT | /users/{id} |
| DELETE | /users/{id} |

## Students

| Method | Endpoint |
|--------|----------|
| GET | /students |
| GET | /students/{id} |
| POST | /students |
| PUT | /students/{id} |
| DELETE | /students/{id} |

## Parents

| Method | Endpoint |
|--------|----------|
| GET | /parents |
| GET | /parents/{id} |
| POST | /parents |
| PUT | /parents/{id} |
| DELETE | /parents/{id} |

## Teachers

| Method | Endpoint |
|--------|----------|
| GET | /teachers |
| GET | /teachers/{id} |
| POST | /teachers |
| PUT | /teachers/{id} |
| DELETE | /teachers/{id} |

## Courses

| Method | Endpoint |
|--------|----------|
| GET | /courses |
| GET | /courses/{id} |
| POST | /courses |
| PUT | /courses/{id} |
| DELETE | /courses/{id} |

## Classes

| Method | Endpoint |
|--------|----------|
| GET | /classes |
| GET | /classes/{id} |
| POST | /classes |
| PUT | /classes/{id} |
| DELETE | /classes/{id} |

## Enrollments

| Method | Endpoint |
|--------|----------|
| GET | /enrollments |
| POST | /enrollments |
| PUT | /enrollments/{id} |
| DELETE | /enrollments/{id} |

## Class Sessions

| Method | Endpoint |
|--------|----------|
| GET | /class-sessions |
| GET | /class-sessions/{id} |
| POST | /class-sessions |
| PUT | /class-sessions/{id} |
| DELETE | /class-sessions/{id} |

## Attendance

| Method | Endpoint |
|--------|----------|
| GET | /attendance |
| GET | /attendance/session/{sessionId} |
| POST | /attendance |
| PUT | /attendance/{id} |

## Lesson Notes

| Method | Endpoint |
|--------|----------|
| GET | /lesson-notes |
| GET | /lesson-notes/student/{studentId} |
| POST | /lesson-notes |
| PUT | /lesson-notes/{id} |
| DELETE | /lesson-notes/{id} |

## Announcements

| Method | Endpoint |
|--------|----------|
| GET | /announcements |
| POST | /announcements |
| PUT | /announcements/{id} |
| DELETE | /announcements/{id} |

## Invoices (Placeholder)

| Method | Endpoint |
|--------|----------|
| GET | /invoices |
| GET | /invoices/{id} |

Payment gateway endpoints are intentionally excluded for this phase.

## Swagger

Development Swagger UI: http://localhost:5000/swagger
