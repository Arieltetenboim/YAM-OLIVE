# YAM-OLIVE — Olive Harvest Tracker (Phase 1)

Hebrew RTL harvest journal for a small private Israeli olive farm.  
**Backend:** Google Apps Script · **UI:** HTML/CSS/vanilla JS · **Database:** Google Sheets only.

The web app is hosted as an Apps Script Web App. All agricultural data lives in Sheets; `PropertiesService` stores only the connected spreadsheet ID.

## Features

- First-run setup: **create** a new spreadsheet (`יומן מסיק זיתים`) or **connect** an existing one
- Pages: **מסיק** · **סטטיסטיקות** · **הגדרות**
- Plots, named bins (דולבים), harvest seasons
- Fast bin weighing with live net-weight calculation
- Optional olive sample / ripeness / fruit condition fields
- Season-level oil production and yield %
- Simple Chart.js statistics (net olives & yield by season)

## Sheet schema (Hebrew tabs)

| Tab | Purpose |
|-----|---------|
| `הגדרות` | Key/value settings (`default_tare_kg`, `oil_density`, `active_season_id`, …) |
| `חלקות` | Plots (id, name, variety, area, trees, notes) |
| `דולבים` | Optional named bins with tare weight |
| `עונות` | Seasons (year, plot, start date, status) |
| `רשומות מסיק` | Harvest weighings (gross/tare/leaves/net + optional sample fields) |
| `ייצור שמן` | Season oil totals (quantity, unit, density, kg, L) |

Stable UUID-style IDs are used for records. Optional numeric fields are stored blank (not `0`) when empty. Historical tare weights are frozen per harvest row.

## Project layout (clasp-ready)

```
src/
  appsscript.json
  Code.gs              # doGet + include()
  Config.gs            # spreadsheet connect / bootstrap / settings
  Schema.gs            # create & ensure Hebrew sheets/headers
  Utils.gs             # IDs, timestamps, sheet helpers
  PlotsService.gs
  BinsService.gs
  SeasonsService.gs
  HarvestService.gs
  OilService.gs
  StatsService.gs
  Index.html           # shell (Hebrew RTL)
  Styles.html
  Client.html          # google.script.run client
.clasp.json.example
```

## Deploy with clasp

### 1. Prerequisites

- Node.js 18+
- A Google account with access to Drive & Sheets
- [clasp](https://github.com/google/clasp): `npm install -g @google/clasp`
- Enable the **Apps Script API** in your Google account:  
  https://script.google.com/home/usersettings

### 2. Login and create a script project

```bash
clasp login
cp .clasp.json.example .clasp.json
clasp create --title "YAM-OLIVE Harvest Tracker" --type webapp --rootDir src
```

If `clasp create` writes a new `.clasp.json`, ensure it contains `"rootDir": "src"`.  
If you already have a script, put its ID into `.clasp.json`:

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "src"
}
```

### 3. Push code

```bash
clasp push
```

### 4. Deploy as Web App

1. Open the project: `clasp open`
2. **Deploy → New deployment → Web app**
3. Execute as: **Me**
4. Who has access: **Only myself** (or your preferred option)
5. Authorize Sheets/Drive when prompted
6. Open the Web App URL

Or from CLI (after an initial UI deployment exists):

```bash
clasp deploy -d "Phase 1"
```

### 5. First run in the app

1. Choose **יצירת גיליון חדש** or paste an existing Sheets URL/ID
2. In **הגדרות**, add a plot, then create a season and select it
3. Enter weighings on **מסיק**

Manual edits in the spreadsheet appear in the app after refresh/reload.

## Local notes

- UI language is **Hebrew** with full **RTL** layout.
- Do **not** use Supabase, Firebase, SQL, Next.js, or `localStorage` as a database.
- Chart.js is loaded from CDN in `Index.html` (compatible with Apps Script HtmlService).

## Calculations

- Total tare = bins × tare per bin  
- Net olives = gross − total tare − leaves  
- Oil yield % (season) = oil kg ÷ net olives kg × 100  

Changing default tare later does **not** rewrite historical rows.
