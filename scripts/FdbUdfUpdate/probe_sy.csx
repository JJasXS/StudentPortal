using FirebirdSql.Data.FirebirdClient;
var root = Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, "..", "..", ".."));
foreach (var line in File.ReadAllLines(Path.Combine(root, ".env")))
{
    var t = line.Trim();
    if (t.StartsWith("#") || !t.Contains('=')) continue;
    var eq = t.IndexOf('=');
    Environment.SetEnvironmentVariable(t[..eq].Trim(), t[(eq+1)..].Trim().Trim('"'));
}
var db = Environment.GetEnvironmentVariable("SqlAccount__DatabasePath");
var cs = new FbConnectionStringBuilder { DataSource="localhost", Database=db, UserID="SYSDBA", Password="masterkey", Charset="NONE" };
await using var c = new FbConnection(cs.ToString());
await c.OpenAsync();
foreach (var pattern in new[] { "SY_UDF%", "%UDF%", "SY_FIELD%" })
{
    Console.WriteLine("=== " + pattern + " ===");
    await using var cmd = new FbCommand($"SELECT TRIM(RDB$RELATION_NAME) FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG=0 AND TRIM(RDB$RELATION_NAME) LIKE '{pattern}' ORDER BY 1", c);
    await using var r = await cmd.ExecuteReaderAsync();
    var n = 0;
    while (await r.ReadAsync()) { Console.WriteLine(r.GetString(0)); n++; if (n>30) break; }
    if (n==0) Console.WriteLine("(none)");
}
