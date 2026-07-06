# Demo seed: test1–test5 teachers + Sales Orders

## Prerequisites (SQL Account)

In **SY_USER**, ensure these accounts exist with **EMAIL** set and **UDF_ISADMIN = false** (teachers):

| Email | Name (suggested) |
|-------|------------------|
| test1@gmail.com | Test Teacher 1 |
| test2@gmail.com | Test Teacher 2 |
| test3@gmail.com | Test Teacher 3 |
| test4@gmail.com | Test Teacher 4 |
| test5@gmail.com | Test Teacher 5 |

Parent demo account (already configured in `.env`):

- **parent@gmail.com** → customer **300-P0001**, child branch **dawg**

Admin calendar (see all teachers): **admin@gmail.com** or **admin@demo.com**

---

## Part 1 — Portal data (automatic)

Restart the backend. On startup, `DbInitializer` seeds:

- Portal users **test1@gmail.com … test5@gmail.com** (Teacher role)
- One class per teacher (Mon–Fri), 8 weeks of sessions
- **ItemCodeClassLinks**: `TEST-T1` … `TEST-T5` → portal classes

Verify:

1. **Admin → Calendar** — filter by “Test Teacher 1” … “Test Teacher 5”
2. Sign in as **test1@gmail.com** (udf-email) → **Teacher → My calendar**

---

## Part 2 — Sales Orders (SQL Account UI)

The portal **does not write** to SQL Account. UDF values must be stored on each **detail line** in **`SL_SODTL`** (database `PORTAL.FDB`).

### UDF field names (on SL_SODTL)

| SQL Account UDF name | Type | Example | Portal reads? |
|----------------------|------|---------|---------------|
| `UDF_STUDENTNAME` | string | `Dawg` | Yes |
| `UDF_CLASSDAY` | string (day name) | `Monday` | Yes |
| `UDF_CLASSTIME` | float | `10` (= 10:00) | Yes |
| `UDF_CONDUCTEDBY` | string | `Test Teacher 1` | Yes — teacher name |

If `UDF_CLASSDAY` / `UDF_CLASSTIME` are left empty but `ITEMCODE` is linked to a portal class (`TEST-T1` …), the portal **displays** day/time from the portal schedule — but the FDB columns stay empty until you save them in SQL Account.

To populate existing lines automatically, run:

```powershell
.\scripts\Update-SodtlUdf.ps1
```

### Create / fill a Sales Order manually

1. Open **SQL Account** → **Sales Order**
2. Customer: **300-P0001** (parent1)
3. Branch: **dawg**
4. Add **5 detail lines** (use stock items or free-text lines):

| ITEMCODE | DESCRIPTION | UDF_STUDENTNAME | UDF_CLASSDAY | UDF_CLASSTIME | QTY | AMOUNT |
|----------|-------------|-----------------|---------------|---------------|-----|--------|
| TEST-T1 | Test Teacher 1 – Piano | Dawg | Monday | 10 | 1 | 350 |
| TEST-T2 | Test Teacher 2 – Piano | Dawg | Tuesday | 11 | 1 | 350 |
| TEST-T3 | Test Teacher 3 – Piano | Dawg | Wednesday | 12 | 1 | 350 |
| TEST-T4 | Test Teacher 4 – Piano | Dawg | Thursday | 14 | 1 | 350 |
| TEST-T5 | Test Teacher 5 – Piano | Dawg | Friday | 15 | 1 | 350 |

`UDF_STUDENTNAME` is shown on each line in the parent portal. `UDF_CLASSDAY` / `UDF_CLASSTIME` are optional — if left empty, the portal fills day/time from the linked portal class (`TEST-T1` … `TEST-T5` → Item code mappings).

5. Save. Ensure header **CANCELLED** is not set.

**ITEMCODE** must match exactly (`TEST-T1` … `TEST-T5`) so portal **Item code → class** links apply.

Verify parent view:

1. Sign in as **parent@gmail.com**
2. **My Children** → child **dawg**
3. See 5 enrolled classes with ERP day/time and linked portal schedule

---

## Optional: Firebird script

See [update-sodtl-udf-fields.sql](./update-sodtl-udf-fields.sql) to **UPDATE existing SL_SODTL rows** with UDF values via Firebird SQL.

See [seed-demo-sales-orders.sql](./seed-demo-sales-orders.sql) for reference values. Prefer creating the SO in SQL Account UI unless you know your `DOCKEY` / generator setup.

Database path (from `.env`): `C:\eStream\SQLAccounting\DB\PORTAL.FDB`
