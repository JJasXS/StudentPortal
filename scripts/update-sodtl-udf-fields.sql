/*
  Populate UDF fields on SL_SODTL (Sales Order detail lines)

  WHERE THE DATA LIVES:
    Table:  SL_SODTL  (detail lines)
    Header: SL_SO     (customer CODE + BRANCHNAME identify the child)

  FIELD NAMES (must match SQL Account UDF setup):
    UDF_STUDENTNAME  — string (e.g. kid name "Dawg")
    UDF_CLASSDAY     — string day name (e.g. "Monday")
    UDF_CLASSTIME    — float  (e.g. 10 = 10:00, 14.5 = 14:30)

  Run via: scripts/Update-SodtlUdf.ps1
  Database: C:\eStream\SQLAccounting\DB\PORTAL.FDB
*/

-- Inspect current lines for parent 300-P0001 / branch dawg
SELECT A.DOCNO, A.CODE, A.BRANCHNAME, B.SEQ, B.ITEMCODE, B.DESCRIPTION,
       B.UDF_STUDENTNAME, B.UDF_CLASSDAY, B.UDF_CLASSTIME
FROM SL_SO A
INNER JOIN SL_SODTL B ON A.DOCKEY = B.DOCKEY
WHERE A.CODE = '300-P0001'
  AND A.BRANCHNAME = 'dawg'
  AND (A.CANCELLED IS NULL OR A.CANCELLED = FALSE)
ORDER BY A.DOCNO, B.SEQ;

COMMIT;
