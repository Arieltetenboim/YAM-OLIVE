/**
 * Harvest seasons management.
 */

function listSeasons() {
  try {
    return ok_(listSeasonsInternal_());
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function listSeasonsInternal_() {
  var sheet = getSheet_(SHEET_NAMES.SEASONS);
  var plots = listPlotsInternal_();
  var plotMap = {};
  plots.forEach(function (p) { plotMap[p.id] = p; });
  return sheetToObjects_(sheet, 'מזהה').map(function (row) {
    return mapSeason_(row, plotMap);
  }).sort(function (a, b) {
    if (b.year !== a.year) return b.year - a.year;
    return String(b.startDate).localeCompare(String(a.startDate));
  });
}

function sheetDateString_(value) {
  if (!value && value !== 0) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'Asia/Jerusalem', 'yyyy-MM-dd');
  }
  var s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  var d = parseTimestamp_(s);
  return d ? Utilities.formatDate(d, 'Asia/Jerusalem', 'yyyy-MM-dd') : s;
}

function mapSeason_(row, plotMap) {
  plotMap = plotMap || {};
  var plotId = String(row['מזהה חלקה'] || '');
  var plot = plotMap[plotId];
  return {
    id: String(row['מזהה']),
    year: Number(row['שנה']) || null,
    plotId: plotId,
    plotName: plot ? plot.name : '',
    startDate: sheetDateString_(row['תאריך התחלה']),
    notes: String(row['הערות'] || ''),
    status: String(row['סטטוס'] || 'פעילה'),
    createdAt: formatTimestamp_(parseTimestamp_(row['נוצר ב'])) || String(row['נוצר ב'] || ''),
    updatedAt: formatTimestamp_(parseTimestamp_(row['עודכן ב'])) || String(row['עודכן ב'] || '')
  };
}

function saveSeason(payload) {
  try {
    payload = payload || {};
    var year = Number(payload.year);
    if (!year || isNaN(year)) return fail_('שנה היא שדה חובה');
    var plotId = String(payload.plotId || '').trim();
    if (!plotId) return fail_('יש לבחור חלקה');

    var plotSheet = getSheet_(SHEET_NAMES.PLOTS);
    if (!findRowById_(plotSheet, 'מזהה', plotId)) {
      return fail_('חלקה לא נמצאה');
    }

    var startDate = String(payload.startDate || '').trim();
    if (!startDate) return fail_('תאריך התחלה הוא שדה חובה');

    var status = String(payload.status || 'פעילה');
    if (status !== 'פעילה' && status !== 'סגורה') {
      status = 'פעילה';
    }

    var sheet = getSheet_(SHEET_NAMES.SEASONS);
    var headers = HEADERS.SEASONS;
    var now = nowIso_();
    var id = payload.id ? String(payload.id) : '';

    if (id) {
      var existing = findRowById_(sheet, 'מזהה', id);
      if (!existing) return fail_('עונה לא נמצאה');
      var updated = {};
      updated['מזהה'] = id;
      updated['שנה'] = year;
      updated['מזהה חלקה'] = plotId;
      updated['תאריך התחלה'] = startDate;
      updated['הערות'] = String(payload.notes || '');
      updated['סטטוס'] = status;
      updated['נוצר ב'] = existing['נוצר ב'] || now;
      updated['עודכן ב'] = now;
      updateObjectProps_(sheet, existing._row, headers, updated);
      return ok_(mapSeason_(updated));
    }

    id = generateId_();
    var created = {};
    created['מזהה'] = id;
    created['שנה'] = year;
    created['מזהה חלקה'] = plotId;
    created['תאריך התחלה'] = startDate;
    created['הערות'] = String(payload.notes || '');
    created['סטטוס'] = status;
    created['נוצר ב'] = now;
    created['עודכן ב'] = now;
    appendObjectProps_(sheet, headers, created);

    // Auto-select as active if none selected
    var active = String(getSetting_('active_season_id', '') || '');
    if (!active) {
      setSetting_('active_season_id', id);
    }

    return ok_(mapSeason_(created));
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function setActiveSeason(seasonId) {
  try {
    seasonId = String(seasonId || '');
    if (!seasonId) return fail_('מזהה עונה חסר');
    var sheet = getSheet_(SHEET_NAMES.SEASONS);
    if (!findRowById_(sheet, 'מזהה', seasonId)) {
      return fail_('עונה לא נמצאה');
    }
    setSetting_('active_season_id', seasonId);
    return ok_({ activeSeasonId: seasonId });
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function closeSeason(seasonId) {
  try {
    seasonId = String(seasonId || '');
    var sheet = getSheet_(SHEET_NAMES.SEASONS);
    var found = findRowById_(sheet, 'מזהה', seasonId);
    if (!found) return fail_('עונה לא נמצאה');
    found['סטטוס'] = 'סגורה';
    found['עודכן ב'] = nowIso_();
    updateObjectProps_(sheet, found._row, HEADERS.SEASONS, found);
    return ok_(mapSeason_(found));
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function reopenSeason(seasonId) {
  try {
    seasonId = String(seasonId || '');
    var sheet = getSheet_(SHEET_NAMES.SEASONS);
    var found = findRowById_(sheet, 'מזהה', seasonId);
    if (!found) return fail_('עונה לא נמצאה');
    found['סטטוס'] = 'פעילה';
    found['עודכן ב'] = nowIso_();
    updateObjectProps_(sheet, found._row, HEADERS.SEASONS, found);
    return ok_(mapSeason_(found));
  } catch (e) {
    return fail_(e.message || String(e));
  }
}
