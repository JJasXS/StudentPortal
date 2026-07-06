using FirebirdSql.Data.FirebirdClient;
var cs = new FbConnectionStringBuilder { DataSource="localhost", Database=@"C:\eStream\SQLAccounting\DB\PORTAL.FDB", UserID="SYSDBA", Password="masterkey", Charset="NONE" };
await using var c = new FbConnection(cs.ToString());
await c.OpenAsync();
await using var cmd = new FbCommand("SELECT TRIM(RF.RDB$FIELD_NAME) FROM RDB$RELATION_FIELDS RF WHERE RF.RDB$RELATION_NAME = ''SL_SODTL'' AND RF.RDB$FIELD_NAME CONTAINING ''UDF'' ORDER BY 1", c);
await using var r = await cmd.ExecuteReaderAsync();
while (await r.ReadAsync()) Console.WriteLine(r.GetString(0));
