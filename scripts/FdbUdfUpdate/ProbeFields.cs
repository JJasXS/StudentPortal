using FirebirdSql.Data.FirebirdClient;
var cs = new FbConnectionStringBuilder { DataSource="localhost", Database=@"C:\eStream\SQLAccounting\DB\PORTAL.FDB", UserID="SYSDBA", Password="masterkey", Charset="NONE" };
await using var c = new FbConnection(cs.ToString());
await c.OpenAsync();
const string sql = """
    SELECT TRIM(RF.RDB$FIELD_NAME), F.RDB$FIELD_TYPE, F.RDB$FIELD_LENGTH, F.RDB$FIELD_PRECISION, F.RDB$FIELD_SCALE
    FROM RDB$RELATION_FIELDS RF
    JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
    WHERE RF.RDB$RELATION_NAME = 'SL_SODTL' AND RF.RDB$FIELD_NAME CONTAINING 'UDF'
    ORDER BY 1
    """;
await using var cmd = new FbCommand(sql, c);
await using var r = await cmd.ExecuteReaderAsync();
while (await r.ReadAsync()) Console.WriteLine($"{r.GetString(0).Trim()} type={r.GetInt16(1)} len={r.GetInt16(2)}");
