using FirebirdSql.Data.FirebirdClient;

partial class Program
{
    /// <summary>
    /// Rewrites ST_ITEM descriptions + STOCKGROUP into music classes
    /// (instrument × lesson type × grade). Keeps CODE unchanged.
    /// </summary>
    static async Task<int> RenameStockAsMusicAsync(FbConnection connection)
    {
        var instruments = new (string Code, string Name)[]
        {
            ("PIANO", "Piano"),
            ("GUITAR", "Guitar"),
            ("VIOLIN", "Violin"),
            ("VOCAL", "Vocal"),
            ("DRUMS", "Drums"),
            ("UKULELE", "Ukulele"),
            ("CELLO", "Cello"),
            ("FLUTE", "Flute"),
            ("THEORY", "Music Theory"),
        };
        var lessonTypes = new[] { "Individual", "Group", "Ensemble" };
        var grades = new[]
        {
            "Beginner",
            "Grade 1", "Grade 2", "Grade 3", "Grade 4",
            "Grade 5", "Grade 6", "Grade 7", "Grade 8",
        };

        var template = await LoadDefaultStockGroupTemplateAsync(connection);
        if (template is null)
        {
            Console.Error.WriteLine("No ST_GROUP row found to copy account codes from.");
            return 1;
        }

        Console.WriteLine($"Using account template from ST_GROUP '{template.Code}'.");
        foreach (var (code, name) in instruments)
            await EnsureMusicStockGroupAsync(connection, code, name, template);

        var items = new List<(string Code, string OldDescription, string? OldGroup)>();
        await using (var list = new FbCommand(
            """
            SELECT CODE, DESCRIPTION, STOCKGROUP
            FROM ST_ITEM
            WHERE ISACTIVE IS NULL OR ISACTIVE = TRUE
            ORDER BY CODE
            """,
            connection))
        await using (var reader = await list.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                var code = reader["CODE"]?.ToString()?.Trim();
                if (string.IsNullOrWhiteSpace(code))
                    continue;
                items.Add((
                    code,
                    reader["DESCRIPTION"]?.ToString()?.Trim() ?? "",
                    reader["STOCKGROUP"]?.ToString()?.Trim()));
            }
        }

        Console.WriteLine($"Updating {items.Count} active ST_ITEM row(s)...");
        var comboCount = instruments.Length * lessonTypes.Length * grades.Length;
        for (var i = 0; i < items.Count; i++)
        {
            var combo = i % comboCount;
            var instrument = instruments[combo / (lessonTypes.Length * grades.Length)];
            var remainder = combo % (lessonTypes.Length * grades.Length);
            var lesson = lessonTypes[remainder / grades.Length];
            var grade = grades[remainder % grades.Length];
            var description = $"{instrument.Name} {lesson} — {grade}";

            var item = items[i];
            await using var upd = new FbCommand(
                """
                UPDATE ST_ITEM
                SET DESCRIPTION = @description,
                    STOCKGROUP = @stockgroup
                WHERE CODE = @code
                """,
                connection);
            upd.Parameters.AddWithValue("@description", description);
            upd.Parameters.AddWithValue("@stockgroup", instrument.Code);
            upd.Parameters.AddWithValue("@code", item.Code);
            await upd.ExecuteNonQueryAsync();

            Console.WriteLine(
                $"  {item.Code}: [{item.OldGroup}] {item.OldDescription} → [{instrument.Code}] {description}");
        }

        Console.WriteLine("Done. Sample after update:");
        await using var verify = new FbCommand(
            """
            SELECT FIRST 10 CODE, DESCRIPTION, STOCKGROUP
            FROM ST_ITEM
            WHERE ISACTIVE IS NULL OR ISACTIVE = TRUE
            ORDER BY CODE
            """,
            connection);
        await using var vr = await verify.ExecuteReaderAsync();
        while (await vr.ReadAsync())
            Console.WriteLine($"  {vr["CODE"]} | {vr["DESCRIPTION"]} | {vr["STOCKGROUP"]}");

        return 0;
    }

    sealed record StockGroupTemplate(
        string Code,
        string Sales,
        string SalesReturned,
        string CashSales,
        string Purchase,
        string CashPurchase,
        string PurchaseReturned,
        string BalanceStock,
        int CostingMethod);

    static async Task<StockGroupTemplate?> LoadDefaultStockGroupTemplateAsync(FbConnection connection)
    {
        await using var cmd = new FbCommand(
            """
            SELECT FIRST 1 CODE, SALES, SALESRETURNED, CASHSALES, PURCHASE, CASHPURCHASE,
                   PURCHASERETURNED, BALANCESTOCK, COSTINGMETHOD
            FROM ST_GROUP
            WHERE CODE = 'DEFAULT'
               OR CODE IS NOT NULL
            ORDER BY CASE WHEN CODE = 'DEFAULT' THEN 0 ELSE 1 END, CODE
            """,
            connection);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return null;

        return new StockGroupTemplate(
            reader["CODE"]?.ToString()?.Trim() ?? "DEFAULT",
            reader["SALES"]?.ToString()?.Trim() ?? "",
            reader["SALESRETURNED"]?.ToString()?.Trim() ?? "",
            reader["CASHSALES"]?.ToString()?.Trim() ?? "",
            reader["PURCHASE"]?.ToString()?.Trim() ?? "",
            reader["CASHPURCHASE"]?.ToString()?.Trim() ?? "",
            reader["PURCHASERETURNED"]?.ToString()?.Trim() ?? "",
            reader["BALANCESTOCK"]?.ToString()?.Trim() ?? "",
            reader["COSTINGMETHOD"] is DBNull or null ? 1 : Convert.ToInt32(reader["COSTINGMETHOD"]));
    }

    static async Task EnsureMusicStockGroupAsync(
        FbConnection connection,
        string code,
        string description,
        StockGroupTemplate template)
    {
        await using (var existsCmd = new FbCommand(
            "SELECT COUNT(*) FROM ST_GROUP WHERE UPPER(TRIM(CODE)) = UPPER(@code)",
            connection))
        {
            existsCmd.Parameters.AddWithValue("@code", code);
            var count = Convert.ToInt32(await existsCmd.ExecuteScalarAsync());
            if (count > 0)
            {
                await using var upd = new FbCommand(
                    """
                    UPDATE ST_GROUP
                    SET DESCRIPTION = @description, ISACTIVE = TRUE
                    WHERE UPPER(TRIM(CODE)) = UPPER(@code)
                    """,
                    connection);
                upd.Parameters.AddWithValue("@description", description);
                upd.Parameters.AddWithValue("@code", code);
                await upd.ExecuteNonQueryAsync();
                Console.WriteLine($"  ST_GROUP exists: {code} → {description}");
                return;
            }
        }

        await using var insert = new FbCommand(
            """
            INSERT INTO ST_GROUP (
                CODE, DESCRIPTION, SALES, SALESRETURNED, CASHSALES,
                PURCHASE, CASHPURCHASE, PURCHASERETURNED, BALANCESTOCK,
                COSTINGMETHOD, ISACTIVE)
            VALUES (
                @code, @description, @sales, @salesreturned, @cashsales,
                @purchase, @cashpurchase, @purchasereturned, @balancestock,
                @costingmethod, TRUE)
            """,
            connection);
        insert.Parameters.AddWithValue("@code", code);
        insert.Parameters.AddWithValue("@description", description);
        insert.Parameters.AddWithValue("@sales", template.Sales);
        insert.Parameters.AddWithValue("@salesreturned", template.SalesReturned);
        insert.Parameters.AddWithValue("@cashsales", template.CashSales);
        insert.Parameters.AddWithValue("@purchase", template.Purchase);
        insert.Parameters.AddWithValue("@cashpurchase", template.CashPurchase);
        insert.Parameters.AddWithValue("@purchasereturned", template.PurchaseReturned);
        insert.Parameters.AddWithValue("@balancestock", template.BalanceStock);
        insert.Parameters.AddWithValue("@costingmethod", template.CostingMethod);
        await insert.ExecuteNonQueryAsync();
        Console.WriteLine($"  ST_GROUP created: {code} → {description}");
    }
}
