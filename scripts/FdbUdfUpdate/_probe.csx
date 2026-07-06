using FirebirdSql.Data.FirebirdClient;
var cs = new FbConnectionStringBuilder { DataSource="localhost", Database=@"C:\eStream\SQLAccounting\DB\PORTAL.FDB", UserID="SYSDBA", Password="masterkey", Charset="NONE" };
await using var c = new FbConnection(cs.ToString());
await c.OpenAsync();
await using var cmd = new FbCommand("SELECT FIRST 1 B.UDF_CLASSTIME, B.UDF_CLASSDATE FROM SL_SODTL B WHERE B.UDF_CLASSTIME IS NOT NULL", c);
await using var r = await cmd.ExecuteReaderAsync();
if (await r.ReadAsync()) {
  Console.WriteLine($"CLASSTIME raw={r["UDF_CLASSTIME"]} type={r["UDF_CLASSTIME"]?.GetType().Name}");
  Console.WriteLine($"CLASSDATE raw={r["UDF_CLASSDATE"]} type={r["UDF_CLASSDATE"]?.GetType().Name}");
}
