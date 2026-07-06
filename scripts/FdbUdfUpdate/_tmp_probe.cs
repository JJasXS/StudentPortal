using FirebirdSql.Data.FirebirdClient;
var root = Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, "..", ".."));
foreach (var line in File.ReadAllLines(Path.Combine(root, ".env")))
{
    var t = line.Trim();
    if (t.StartsWith("#") || !t.Contains('=')) continue;
    var eq = t.IndexOf('=');
    Environment.SetEnvironmentVariable(t[..eq].Trim(), t[(eq+1)..].Trim().Trim('"'));
}
var db = Environment.GetEnvironmentVariable("SqlAccount__DatabasePath");
Console.WriteLine("DB: " + db);
var cs = new FbConnectionStringBuilder { DataSource="localhost", Database=db, UserID="SYSDBA", Password="masterkey", Charset="NONE" };
await using var c = new FbConnection(cs.ToString());
await c.OpenAsync();
const string sql = """
    SELECT TRIM(RF.RDB$FIELD_NAME), TRIM(RF.RDB$FIELD_SOURCE), F.RDB$FIELD_TYPE, F.RDB$FIELD_PRECISION, F.RDB$FIELD_SCALE, F.RDB$FIELD_SUB_TYPE
    FROM RDB$RELATION_FIELDS RF
    JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
    WHERE RF.RDB$RELATION_NAME = 'SL_SODTL'
      AND TRIM(RF.RDB$FIELD_NAME) IN ('UDF_CLASSDATE','UDF_CLASSENDDATE','UDF_CLASSTIME','UNITPRICE')
    ORDER BY 1
    """;
await using var cmd = new FbCommand(sql, c);
await using var r = await cmd.ExecuteReaderAsync();
while (await r.ReadAsync())
    Console.WriteLine($"{r.GetString(0)} domain={r.GetString(1)} type={r.GetInt16(2)} prec={r[3]} scale={r[4]} sub={r[5]}");
