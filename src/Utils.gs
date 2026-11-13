/**
 * Shared helpers: IDs, dates, sheet I/O, validation.
 */

var SHEET_NAMES = {
  SETTINGS: 'הגדרות',
  PLOTS: 'חלקות',
  BINS: 'דולבים',
  SEASONS: 'עונות',
  HARVEST: 'רשומות מסיק',
  OIL: 'ייצור שמן'
};

var DEFAULT_TARE_KG = 25;
var DEFAULT_OIL_DENSITY = 0.916;

var PROP_SPREADSHEET_ID = 'SPREADSHEET_ID';

function generateId_() {
  return Utilities.getUuid();
}

/**
 * Format Date as ISO-like string in Asia/Jerusalem for storage.
 * Example: 2026-11-13T16:55:00+02:00
 */
function formatTimestamp_(date) {
  if (!date) return '';
  var d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, 'Asia/Jerusalem', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function parseTimestamp_(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  var s = String(value).trim();
  if (!s) return null;
  var d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return null;
}

function displayIsraelTime_(value) {
  var d = parseTimestamp_(value);
  if (!d) return '';
  return Utilities.formatDate(d, 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm');
}

function displayIsraelDate_(value) {
  var d = parseTimestamp_(value);
  if (!d) return '';
  return Utilities.formatDate(d, 'Asia/Jerusalem', 'dd/MM/yyyy');
}

function nowIso_() {
  return formatTimestamp_(new Date());
}

function blankOrNumber_(value) {
  if (value === null || value === undefined || value === '') return '';
  var n = Number(value);
  if (isNaN(n)) return '';
  return n;
}

function requireNumber_(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    throw new Error('שדה חובה חסר: ' + fieldName);
  }
  var n = Number(value);
  if (isNaN(n)) {
    throw new Error('ערך מספרי לא תקין: ' + fieldName);
  }
  return n;
}

function round3_(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

function round2_(n) {
  return Math.round(Number(n) * 100) / 100;
}

function ok_(data) {
  return { ok: true, data: data };
}

function fail_(message, code) {
  return { ok: false, error: message || 'שגיאה', code: code || 'ERROR' };
}

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty(PROP_SPREADSHEET_ID);
  if (!id) {
    throw new Error('לא מחובר גיליון. יש להשלים את ההגדרה הראשונית.');
  }
  return SpreadsheetApp.openById(id);
}

function getSheet_(name) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error('גיליון חסר: ' + name);
  }
  return sheet;
}

/**
 * Read all data rows as objects keyed by header (row 1).
 * Skips empty ID column rows.
 */
function sheetToObjects_(sheet, idHeader) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var idIdx = idHeader ? headers.indexOf(idHeader) : 0;
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (idIdx >= 0 && (row[idIdx] === '' || row[idIdx] === null)) continue;
    var obj = { _row: i + 1 };
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    rows.push(obj);
  }
  return rows;
}

function findRowById_(sheet, idHeader, id) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var idIdx = headers.indexOf(idHeader);
  if (idIdx < 0) return null;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) === String(id)) {
      var obj = { _row: i + 1 };
      for (var c = 0; c < headers.length; c++) {
        obj[headers[c]] = values[i][c];
      }
      return obj;
    }
  }
  return null;
}

function appendObjectRow_(sheet, headers, obj) {
  var row = headers.map(function (h) {
    return obj.hasOwnProperty(h) ? obj[h] : '';
  });
  sheet.appendRow(row);
}

function updateObjectRow_(sheet, rowNumber, headers, obj) {
  var row = headers.map(function (h) {
    return obj.hasOwnProperty(h) ? obj[h] : '';
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
}

function getHeaders_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h).trim();
  });
}

function extractSpreadsheetId_(input) {
  if (!input) return '';
  var s = String(input).trim();
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s) && s.indexOf('/') === -1) return s;
  var m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  return s;
}
