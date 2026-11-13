/**
 * Named reusable olive bins (דולבים) with tare weights.
 */

function listBins() {
  try {
    return ok_(listBinsInternal_());
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function listBinsInternal_() {
  var sheet = getSheet_(SHEET_NAMES.BINS);
  return sheetToObjects_(sheet, 'מזהה').map(mapBin_);
}

function mapBin_(row) {
  return {
    id: String(row['מזהה']),
    name: String(row['שם'] || ''),
    tareKg: Number(row['משקל טרה בק״ג']) || 0,
    notes: String(row['הערות'] || ''),
    createdAt: String(row['נוצר ב'] || ''),
    updatedAt: String(row['עודכן ב'] || '')
  };
}

function saveBin(payload) {
  try {
    payload = payload || {};
    var name = String(payload.name || '').trim();
    if (!name) return fail_('שם דולב הוא שדה חובה');
    var tare = Number(payload.tareKg);
    if (isNaN(tare) || tare < 0) return fail_('משקל טרה אינו תקין');

    var sheet = getSheet_(SHEET_NAMES.BINS);
    var headers = HEADERS.BINS;
    var now = nowIso_();
    var id = payload.id ? String(payload.id) : '';

    if (id) {
      var existing = findRowById_(sheet, 'מזהה', id);
      if (!existing) return fail_('דולב לא נמצא');
      var updated = {};
      updated['מזהה'] = id;
      updated['שם'] = name;
      updated['משקל טרה בק״ג'] = tare;
      updated['הערות'] = String(payload.notes || '');
      updated['נוצר ב'] = existing['נוצר ב'] || now;
      updated['עודכן ב'] = now;
      updateObjectProps_(sheet, existing._row, headers, updated);
      return ok_(mapBin_(updated));
    }

    id = generateId_();
    var created = {};
    created['מזהה'] = id;
    created['שם'] = name;
    created['משקל טרה בק״ג'] = tare;
    created['הערות'] = String(payload.notes || '');
    created['נוצר ב'] = now;
    created['עודכן ב'] = now;
    appendObjectProps_(sheet, headers, created);
    return ok_(mapBin_(created));
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function deleteBin(binId) {
  try {
    binId = String(binId || '');
    if (!binId) return fail_('מזהה דולב חסר');
    var sheet = getSheet_(SHEET_NAMES.BINS);
    var found = findRowById_(sheet, 'מזהה', binId);
    if (!found) return fail_('דולב לא נמצא');
    sheet.deleteRow(found._row);
    return ok_({ deleted: true, id: binId });
  } catch (e) {
    return fail_(e.message || String(e));
  }
}
