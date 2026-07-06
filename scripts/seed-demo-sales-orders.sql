/*
  Demo Sales Order lines for parent@gmail.com / 300-P0001 / branch dawg

  RECOMMENDED: Create this Sales Order in SQL Account UI (see README-demo-seed.md).
  Direct INSERT into SL_SO / SL_SODTL requires valid DOCKEY, DOCNO, SEQ, and
  company-specific defaults — schema varies by SQL Account version.

  Line data to enter in UI:
  -----------------------------------------------------------------------
  ITEMCODE   DESCRIPTION                  UDF_STUDENTNAME   UDF_CLASSDAY   UDF_CLASSTIME   QTY   AMOUNT
  TEST-T1    Test Teacher 1 – Piano       Dawg              Monday         10              1     350
  TEST-T2    Test Teacher 2 – Piano       Dawg              Tuesday        11              1     350
  TEST-T3    Test Teacher 3 – Piano       Dawg              Wednesday      12              1     350
  TEST-T4    Test Teacher 4 – Piano       Dawg              Thursday       14              1     350
  TEST-T5    Test Teacher 5 – Piano       Dawg              Friday         15              1     350
  -----------------------------------------------------------------------

  UDF_STUDENTNAME: student/kid name per line (string).
  UDF_CLASSDAY: day name string (e.g. Monday). UDF_CLASSTIME: float hour (10 = 10:00).
  Optional — portal auto-fills from linked class when empty.

  Header:
    CODE (customer)  = 300-P0001
    BRANCHNAME       = dawg
    CANCELLED        = FALSE (or unset)

  Portal links ITEMCODE to classes via ItemCodeClassLinks (seeded on backend start).
*/

-- Example: inspect existing sales orders for this customer
-- SELECT A.DOCNO, A.DOCDATE, A.CODE, A.BRANCHNAME, B.ITEMCODE, B.DESCRIPTION,
--        B.UDF_CLASSDAY, B.UDF_CLASSTIME, B.UDF_STUDENTNAME
-- FROM SL_SO A
-- INNER JOIN SL_SODTL B ON A.DOCKEY = B.DOCKEY
-- WHERE A.CODE = '300-P0001' AND A.BRANCHNAME = 'dawg';

COMMIT;
