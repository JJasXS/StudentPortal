/*
  Migrate SL_SODTL.UDF_CLASSDATE from INT64 (202607091400) to TIMESTAMP.

  Close SQL Account before running. Then:

    dotnet run --project scripts/FdbUdfUpdate/FdbUdfUpdate.csproj -- --migrate-classdate

  Or use Firebird directly:

    ALTER TABLE SL_SODTL DROP UDF_CLASSDATE;
    ALTER TABLE SL_SODTL ADD UDF_CLASSDATE TIMESTAMP;
    COMMIT;

  Then re-seed demo UDF values:

    dotnet run --project scripts/FdbUdfUpdate/FdbUdfUpdate.csproj

  Verify type (should be 35 = TIMESTAMP):

    dotnet run --project scripts/FdbUdfUpdate/FdbUdfUpdate.csproj -- --probe-fields
*/

COMMIT;
