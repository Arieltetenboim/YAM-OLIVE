/**
 * Season-level olive oil production.
 */

function getOil(seasonId) {
  try {
    return ok_(getOilInternal_(seasonId));
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function getOilInternal_(seasonId) {
  seasonId = String(seasonId || '');
  if (!seasonId) return null;
  var sheet = getSheet_(SHEET_NAMES.OIL);
  var found = findRowById_(sheet, 'מזהה עונה', seasonId);
  if (!found) return null;
  return mapOil_(found);
}

function mapOil_(row) {
  return {
    seasonId: String(row['מזהה עונה']),
    quantity: Number(row['כמות']) || 0,
    unit: String(row['יחידה'] || 'kg'),
    density: Number(row['צפיפות']) || DEFAULT_OIL_DENSITY,
    oilKg: Number(row['משקל בק״ג']) || 0,
    oilL: Number(row['נפח בליטר']) || 0,
    updatedAt: String(row['עודכן ב'] || '')
  };
}

function saveOil(payload) {
  try {
    payload = payload || {};
    var seasonId = String(payload.seasonId || '');
    if (!seasonId) return fail_('מזהה עונה חסר');

    var seasonSheet = getSheet_(SHEET_NAMES.SEASONS);
    if (!findRowById_(seasonSheet, 'מזהה', seasonId)) {
      return fail_('עונה לא נמצאה');
    }

    var quantity = Number(payload.quantity);
    if (isNaN(quantity) || quantity < 0) return fail_('כמות שמן אינה תקינה');

    var unit = String(payload.unit || 'kg').toLowerCase();
    if (unit !== 'kg' && unit !== 'l' && unit !== 'liter' && unit !== 'liters') {
      return fail_('יחידה חייבת להיות kg או L');
    }
    if (unit === 'liter' || unit === 'liters') unit = 'l';

    var density = payload.density !== undefined && payload.density !== null && payload.density !== ''
      ? Number(payload.density)
      : Number(getSetting_('oil_density', DEFAULT_OIL_DENSITY));
    if (isNaN(density) || density <= 0) return fail_('צפיפות שמן אינה תקינה');

    var oilKg;
    var oilL;
    if (unit === 'kg') {
      oilKg = round3_(quantity);
      oilL = round3_(oilKg / density);
    } else {
      oilL = round3_(quantity);
      oilKg = round3_(oilL * density);
    }

    var sheet = getSheet_(SHEET_NAMES.OIL);
    var headers = HEADERS.OIL;
    var now = nowIso_();
    var row = {};
    row['מזהה עונה'] = seasonId;
    row['כמות'] = quantity;
    row['יחידה'] = unit;
    row['צפיפות'] = density;
    row['משקל בק״ג'] = oilKg;
    row['נפח בליטר'] = oilL;
    row['עודכן ב'] = now;

    var existing = findRowById_(sheet, 'מזהה עונה', seasonId);
    if (existing) {
      updateObjectProps_(sheet, existing._row, headers, row);
    } else {
      appendObjectProps_(sheet, headers, row);
    }

    var totals = getSeasonTotalsInternal_(seasonId);
    var yieldPct = null;
    if (totals.totalNetKg > 0) {
      yieldPct = round2_((oilKg / totals.totalNetKg) * 100);
    }

    var mapped = mapOil_(row);
    mapped.yieldPct = yieldPct;
    mapped.totalNetKg = totals.totalNetKg;
    return ok_(mapped);
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function clearOil(seasonId) {
  try {
    seasonId = String(seasonId || '');
    var sheet = getSheet_(SHEET_NAMES.OIL);
    var found = findRowById_(sheet, 'מזהה עונה', seasonId);
    if (!found) return ok_({ cleared: true });
    sheet.deleteRow(found._row);
    return ok_({ cleared: true, seasonId: seasonId });
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function computeYield_(oilKg, netOlivesKg) {
  if (!oilKg || !netOlivesKg || netOlivesKg <= 0) return null;
  return round2_((oilKg / netOlivesKg) * 100);
}
