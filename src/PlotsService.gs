/**
 * Olive plots CRUD.
 */

function listPlots() {
  try {
    return ok_(listPlotsInternal_());
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function listPlotsInternal_() {
  var sheet = getSheet_(SHEET_NAMES.PLOTS);
  return sheetToObjects_(sheet, 'מזהה').map(mapPlot_);
}

function mapPlot_(row) {
  return {
    id: String(row['מזהה']),
    name: String(row['שם חלקה'] || ''),
    variety: String(row['זן'] || ''),
    areaDunams: row['שטח בדונם'] === '' || row['שטח בדונם'] === null ? null : Number(row['שטח בדונם']),
    treeCount: row['מספר עצים'] === '' || row['מספר עצים'] === null ? null : Number(row['מספר עצים']),
    notes: String(row['הערות'] || ''),
    createdAt: String(row['נוצר ב'] || ''),
    updatedAt: String(row['עודכן ב'] || '')
  };
}

function savePlot(payload) {
  try {
    payload = payload || {};
    var name = String(payload.name || '').trim();
    if (!name) return fail_('שם חלקה הוא שדה חובה');

    var sheet = getSheet_(SHEET_NAMES.PLOTS);
    var headers = HEADERS.PLOTS;
    var now = nowIso_();
    var id = payload.id ? String(payload.id) : '';

    var area = blankOrNumber_(payload.areaDunams);
    var trees = blankOrNumber_(payload.treeCount);

    if (id) {
      var existing = findRowById_(sheet, 'מזהה', id);
      if (!existing) return fail_('חלקה לא נמצאה');
      var updated = {};
      updated['מזהה'] = id;
      updated['שם חלקה'] = name;
      updated['זן'] = String(payload.variety || '');
      updated['שטח בדונם'] = area;
      updated['מספר עצים'] = trees;
      updated['הערות'] = String(payload.notes || '');
      updated['נוצר ב'] = existing['נוצר ב'] || now;
      updated['עודכן ב'] = now;
      updateObjectProps_(sheet, existing._row, headers, updated);
      return ok_(mapPlot_(Object.assign({ _row: existing._row }, updated)));
    }

    id = generateId_();
    var created = {};
    created['מזהה'] = id;
    created['שם חלקה'] = name;
    created['זן'] = String(payload.variety || '');
    created['שטח בדונם'] = area;
    created['מספר עצים'] = trees;
    created['הערות'] = String(payload.notes || '');
    created['נוצר ב'] = now;
    created['עודכן ב'] = now;
    appendObjectProps_(sheet, headers, created);
    return ok_(mapPlot_(created));
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function deletePlot(plotId) {
  try {
    plotId = String(plotId || '');
    if (!plotId) return fail_('מזהה חלקה חסר');

    var harvestSheet = getSheet_(SHEET_NAMES.HARVEST);
    var harvestRows = sheetToObjects_(harvestSheet, 'מזהה');
    for (var i = 0; i < harvestRows.length; i++) {
      if (String(harvestRows[i]['מזהה חלקה']) === plotId) {
        return fail_('לא ניתן למחוק חלקה עם נתוני מסיק היסטוריים', 'HAS_HARVEST');
      }
    }

    var seasonsSheet = getSheet_(SHEET_NAMES.SEASONS);
    var seasonRows = sheetToObjects_(seasonsSheet, 'מזהה');
    for (var s = 0; s < seasonRows.length; s++) {
      if (String(seasonRows[s]['מזהה חלקה']) === plotId) {
        return fail_('לא ניתן למחוק חלקה המשויכת לעונות מסיק', 'HAS_SEASONS');
      }
    }

    var sheet = getSheet_(SHEET_NAMES.PLOTS);
    var found = findRowById_(sheet, 'מזהה', plotId);
    if (!found) return fail_('חלקה לא נמצאה');
    sheet.deleteRow(found._row);
    return ok_({ deleted: true, id: plotId });
  } catch (e) {
    return fail_(e.message || String(e));
  }
}
