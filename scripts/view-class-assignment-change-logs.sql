/*
  View ClassAssignmentChangeLogs (portal SQLite)

  With sqlite3 CLI:
    sqlite3 backend/MusicTuitionPortal.Api/music_tuition_portal.db < scripts/view-class-assignment-change-logs.sql

  Or on Windows:
    .\scripts\View-ClassAssignmentChangeLogs.ps1
*/

.headers on
.mode column
.width 36 36 20 10 10 20 20 24

SELECT '--- Row count ---' AS Info;
SELECT COUNT(*) AS TotalRows FROM ClassAssignmentChangeLogs;

SELECT '--- Latest 50 entries ---' AS Info;
SELECT
    Id,
    ClassId,
    ClassName,
    EntityType,
    Operation,
    StudentName,
    ActorName,
    CreatedAt
FROM ClassAssignmentChangeLogs
ORDER BY CreatedAt DESC
LIMIT 50;

SELECT '--- Full detail (latest 20) ---' AS Info;
SELECT *
FROM ClassAssignmentChangeLogs
ORDER BY CreatedAt DESC
LIMIT 20;

SELECT '--- By class ---' AS Info;
SELECT
    ClassName,
    EntityType,
    Operation,
    COUNT(*) AS Cnt
FROM ClassAssignmentChangeLogs
GROUP BY ClassName, EntityType, Operation
ORDER BY ClassName, EntityType, Operation;
