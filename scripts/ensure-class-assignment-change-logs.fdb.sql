/*
  Firebird (PORTAL.FDB): ClassAssignmentChangeLogs

  Close SQL Account before running DDL, then:

    dotnet run --project scripts/FdbUdfUpdate/FdbUdfUpdate.csproj -- --create-assign-log

  View rows:

    dotnet run --project scripts/FdbUdfUpdate/FdbUdfUpdate.csproj -- --view-assign-log

  Or:

    .\scripts\View-ClassAssignmentChangeLogs.ps1

  Table stores portal CRUD logs for enrollments, class schedule/teacher, and sessions.
*/

CREATE TABLE ClassAssignmentChangeLogs (
    ID                      VARCHAR(36)  NOT NULL PRIMARY KEY,
    CLASSID                 VARCHAR(36)  NOT NULL,
    CLASSNAME               VARCHAR(200),
    ENTITYTYPE              VARCHAR(50)  NOT NULL,
    OPERATION               VARCHAR(20)  NOT NULL,
    ENTITYID                VARCHAR(36),
    STUDENTUSERID           VARCHAR(36),
    STUDENTNAME             VARCHAR(200),
    PREVIOUSTEACHERUSERID   VARCHAR(36),
    PREVIOUSTEACHERNAME     VARCHAR(200),
    NEWTEACHERUSERID        VARCHAR(36),
    NEWTEACHERNAME          VARCHAR(200),
    PREVIOUSDAYOFWEEK       VARCHAR(20),
    NEWDAYOFWEEK            VARCHAR(20),
    PREVIOUSCLASSSTARTTIME  VARCHAR(10),
    NEWCLASSSTARTTIME       VARCHAR(10),
    PREVIOUSCLASSENDTIME    VARCHAR(10),
    NEWCLASSENDTIME         VARCHAR(10),
    PREVIOUSSESSIONDATE     DATE,
    NEWSESSIONDATE          DATE,
    PREVIOUSSESSIONSTARTTIME VARCHAR(10),
    NEWSESSIONSTARTTIME     VARCHAR(10),
    PREVIOUSSESSIONENDTIME  VARCHAR(10),
    NEWSESSIONENDTIME       VARCHAR(10),
    PREVIOUSSTATUS          VARCHAR(50),
    NEWSTATUS               VARCHAR(50),
    ACTORUSERID             VARCHAR(36),
    ACTORNAME               VARCHAR(200),
    REASON                  VARCHAR(500),
    CREATEDAT               TIMESTAMP    NOT NULL
);

CREATE INDEX IX_CLASSASSIGNLOG_CLASSID ON ClassAssignmentChangeLogs (CLASSID);
CREATE INDEX IX_CLASSASSIGNLOG_CREATEDAT ON ClassAssignmentChangeLogs (CREATEDAT);

COMMIT;
