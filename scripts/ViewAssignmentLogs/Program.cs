using Microsoft.Data.Sqlite;

var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));
var defaultDb = Path.Combine(root, "backend", "MusicTuitionPortal.Api", "music_tuition_portal.db");

if (args.Contains("--apply-ddl", StringComparer.OrdinalIgnoreCase))
{
    var ddlDb = args.FirstOrDefault(a => !a.StartsWith('-')) ?? defaultDb;
    return await ApplyDdlAsync(root, ddlDb);
}

var dbPath = args.FirstOrDefault(a => !a.StartsWith('-')) ?? defaultDb;
var classId = GetArg(args, "--class-id");
var limit = int.TryParse(GetArg(args, "--limit"), out var n) ? n : 50;

if (!File.Exists(dbPath))
{
    Console.Error.WriteLine($"Database not found: {dbPath}");
    return 1;
}

await using var connection = new SqliteConnection($"Data Source={dbPath}");
await connection.OpenAsync();

if (!await TableExistsAsync(connection, "ClassAssignmentChangeLogs"))
{
    Console.WriteLine("Table ClassAssignmentChangeLogs does not exist.");
    Console.WriteLine("Create it: .\\scripts\\View-ClassAssignmentChangeLogs.ps1 -Create");
    return 1;
}

var count = await ScalarAsync(connection, "SELECT COUNT(*) FROM ClassAssignmentChangeLogs");
Console.WriteLine($"Database: {dbPath}");
Console.WriteLine($"Table:    ClassAssignmentChangeLogs");
Console.WriteLine($"Rows:     {count}");
Console.WriteLine();

var sql = """
    SELECT
        CreatedAt,
        Operation,
        EntityType,
        ClassName,
        StudentName,
        ActorName,
        PreviousDayOfWeek,
        NewDayOfWeek,
        PreviousSessionDate,
        NewSessionDate,
        Reason
    FROM ClassAssignmentChangeLogs
    """;

if (!string.IsNullOrWhiteSpace(classId))
{
    sql += " WHERE ClassId = $classId";
}

sql += " ORDER BY CreatedAt DESC LIMIT $limit";

await using var command = connection.CreateCommand();
command.CommandText = sql;
command.Parameters.AddWithValue("$limit", limit);
if (!string.IsNullOrWhiteSpace(classId))
{
    command.Parameters.AddWithValue("$classId", classId.Trim());
}

await using var reader = await command.ExecuteReaderAsync();
var rows = new List<string[]>();
var headers = new string[reader.FieldCount];
for (var i = 0; i < reader.FieldCount; i++)
{
    headers[i] = reader.GetName(i);
}

while (await reader.ReadAsync())
{
    var row = new string[reader.FieldCount];
    for (var i = 0; i < reader.FieldCount; i++)
    {
        row[i] = reader.IsDBNull(i) ? "" : reader.GetValue(i)?.ToString() ?? "";
    }

    rows.Add(row);
}

PrintTable(headers, rows);
return 0;

static async Task<int> ApplyDdlAsync(string root, string dbPath)
{
    var ddlPath = Path.Combine(root, "scripts", "ensure-class-assignment-change-logs.sql");
    if (!File.Exists(ddlPath))
    {
        Console.Error.WriteLine($"DDL script not found: {ddlPath}");
        return 1;
    }

    var ddl = await File.ReadAllTextAsync(ddlPath);
    var statements = ddl
        .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Where(s => !s.StartsWith("/*") && !s.StartsWith("--") && s.Length > 0)
        .ToList();

    await using var connection = new SqliteConnection($"Data Source={dbPath}");
    await connection.OpenAsync();

    foreach (var statement in statements)
    {
        if (statement.StartsWith("*/") || statement.Contains("Portal SQLite"))
        {
            continue;
        }

        await using var command = connection.CreateCommand();
        command.CommandText = statement;
        await command.ExecuteNonQueryAsync();
    }

    Console.WriteLine($"Ensured ClassAssignmentChangeLogs on {dbPath}");
    return 0;
}

static string? GetArg(string[] args, string name)
{
    var index = Array.FindIndex(args, a => string.Equals(a, name, StringComparison.OrdinalIgnoreCase));
    return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
}

static async Task<bool> TableExistsAsync(SqliteConnection connection, string table)
{
    await using var command = connection.CreateCommand();
    command.CommandText = "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = $name LIMIT 1";
    command.Parameters.AddWithValue("$name", table);
    return await command.ExecuteScalarAsync() != null;
}

static async Task<long> ScalarAsync(SqliteConnection connection, string sql)
{
    await using var command = connection.CreateCommand();
    command.CommandText = sql;
    var value = await command.ExecuteScalarAsync();
    return value is long l ? l : Convert.ToInt64(value);
}

static void PrintTable(string[] headers, List<string[]> rows)
{
    if (rows.Count == 0)
    {
        Console.WriteLine("(no rows)");
        return;
    }

    var widths = new int[headers.Length];
    for (var i = 0; i < headers.Length; i++)
    {
        widths[i] = headers[i].Length;
    }

    foreach (var row in rows)
    {
        for (var i = 0; i < row.Length; i++)
        {
            widths[i] = Math.Max(widths[i], Math.Min(row[i].Length, 40));
        }
    }

    WriteRow(headers, widths);
    Console.WriteLine(new string('-', widths.Sum() + (widths.Length * 3) - 1));
    foreach (var row in rows)
    {
        WriteRow(row, widths);
    }
}

static void WriteRow(string[] cells, int[] widths)
{
    for (var i = 0; i < cells.Length; i++)
    {
        var text = cells[i];
        if (text.Length > widths[i])
        {
            text = text[..Math.Max(0, widths[i] - 1)] + "…";
        }

        Console.Write(i == 0 ? text.PadRight(widths[i]) : text.PadRight(widths[i] + 1));
        if (i < cells.Length - 1)
        {
            Console.Write(" | ");
        }
    }

    Console.WriteLine();
}
