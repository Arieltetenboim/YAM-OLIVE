/**
 * Spreadsheet schema: create / ensure sheets and Hebrew headers.
 */

var HEADERS = {
  SETTINGS: ['מפתח', 'ערך'],
  PLOTS: [
    'מזהה',
    'שם חלקה',
    'זן',
    'שטח בדונם',
    'מספר עצים',
    'הערות',
    'נוצר ב',
    'עודכן ב'
  ],
  BINS: [
    'מזהה',
    'שם',
    'משקל טרה בק״ג',
    'הערות',
    'נוצר ב',
    'עודכן ב'
  ],
  SEASONS: [
    'מזהה',
    'שנה',
    'מזהה חלקה',
    'תאריך התחלה',
    'הערות',
    'סטטוס',
    'נוצר ב',
    'עודכן ב'
  ],
  HARVEST: [
    'מזהה',
    'מזהה עונה',
    'מזהה חלקה',
    'מספר דולבים',
    'משקל ברוטו',
    'משקל טרה ליחידה',
    'טרה כוללת',
    'משקל עלים',
    'משקל נטו',
    'חותמת יצירה',
    'חותמת הגעה',
    'עודכן ב',
    'משקל 10 זיתים גרם',
    'קוטר ממוצע מ״מ',
    'משקל ממוצע לזית',
    'הערכת מספר זיתים',
    'בשלות',
    'מצב פרי',
    'תאריך מסיק בפועל',
    'הערות',
    'שקילה קבוצתית'
  ],
  OIL: [
    'מזהה עונה',
    'כמות',
    'יחידה',
    'צפיפות',
    'משקל בק״ג',
    'נפח בליטר',
    'עודכן ב'
  ]
};

var DEFAULT_SETTINGS = {
  default_tare_kg: String(DEFAULT_TARE_KG),
  oil_density: String(DEFAULT_OIL_DENSITY),
  active_season_id: '',
  initialized: 'true'
};

function ensureSpreadsheetSchema_(ss) {
  ensureSheetWithHeaders_(ss, SHEET_NAMES.SETTINGS, HEADERS.SETTINGS);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.PLOTS, HEADERS.PLOTS);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.BINS, HEADERS.BINS);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.SEASONS, HEADERS.SEASONS);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.HARVEST, HEADERS.HARVEST);
  ensureSheetWithHeaders_(ss, SHEET_NAMES.OIL, HEADERS.OIL);

  seedDefaultSettings_(ss);
  formatSheetsHebrew_(ss);
  return true;
}

function ensureSheetWithHeaders_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  var existing = getHeaders_(sheet);
  if (existing.length === 0 || (existing.length === 1 && existing[0] === '')) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#5a7a4a')
      .setFontColor('#ffffff');
  } else {
    // Add any missing headers at the end without deleting data
    var missing = [];
    for (var i = 0; i < headers.length; i++) {
      if (existing.indexOf(headers[i]) === -1) {
        missing.push(headers[i]);
      }
    }
    if (missing.length) {
      sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
      sheet.getRange(1, existing.length + 1, 1, missing.length)
        .setFontWeight('bold')
        .setBackground('#5a7a4a')
        .setFontColor('#ffffff');
    }
  }
  return sheet;
}

function seedDefaultSettings_(ss) {
  var sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  var rows = sheetToObjects_(sheet, 'מפתח');
  var existing = {};
  rows.forEach(function (r) {
    existing[String(r['מפתח'])] = true;
  });
  Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
    if (!existing[key]) {
      sheet.appendRow([key, DEFAULT_SETTINGS[key]]);
    }
  });
}

function formatSheetsHebrew_(ss) {
  ss.getSheets().forEach(function (sheet) {
    sheet.setRightToLeft(true);
  });
  // Remove default "Sheet1" if empty leftover after creating named sheets
  var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('גיליון1');
  if (defaultSheet && ss.getSheets().length > 1) {
    var lastRow = defaultSheet.getLastRow();
    var lastCol = defaultSheet.getLastColumn();
    if (lastRow <= 1 && lastCol <= 1) {
      try {
        ss.deleteSheet(defaultSheet);
      } catch (e) {
        // ignore if cannot delete
      }
    }
  }
}

function getSetting_(key, fallback) {
  var sheet = getSheet_(SHEET_NAMES.SETTINGS);
  var rows = sheetToObjects_(sheet, 'מפתח');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i]['מפתח']) === String(key)) {
      var v = rows[i]['ערך'];
      if (v === null || v === undefined || v === '') {
        return fallback !== undefined ? fallback : '';
      }
      return v;
    }
  }
  return fallback !== undefined ? fallback : '';
}

function setSetting_(key, value) {
  var sheet = getSheet_(SHEET_NAMES.SETTINGS);
  var found = findRowById_(sheet, 'מפתח', key);
  if (found) {
    sheet.getRange(found._row, 2).setValue(value);
  } else {
    sheet.appendRow([key, value]);
  }
}
