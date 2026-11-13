/**
 * Harvest bin weighings — create, list, update, delete with server-side calc.
 */

function listHarvest(seasonId) {
  try {
    return ok_(listHarvestInternal_(seasonId));
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function listHarvestInternal_(seasonId) {
  seasonId = String(seasonId || '');
  var sheet = getSheet_(SHEET_NAMES.HARVEST);
  var rows = sheetToObjects_(sheet, 'מזהה')
    .filter(function (r) {
      return !seasonId || String(r['מזהה עונה']) === seasonId;
    })
    .map(mapHarvest_)
    .sort(function (a, b) {
      return String(b.arrivalAt).localeCompare(String(a.arrivalAt));
    });

  // Entry numbers newest-first within season (1 = newest)
  rows.forEach(function (r, idx) {
    r.entryNumber = idx + 1;
  });
  return rows;
}

function coerceTs_(value) {
  var d = parseTimestamp_(value);
  return d ? formatTimestamp_(d) : (value ? String(value) : '');
}

function mapHarvest_(row) {
  var binCount = Number(row['מספר דולבים']) || 0;
  var sample10 = row['משקל 10 זיתים גרם'];
  var avgDiameter = row['קוטר ממוצע מ״מ'];
  var avgOlive = row['משקל ממוצע לזית'];
  var estCount = row['הערכת מספר זיתים'];
  var leaves = row['משקל עלים'];
  var createdAt = coerceTs_(row['חותמת יצירה']);
  var arrivalAt = coerceTs_(row['חותמת הגעה']);
  var updatedAt = coerceTs_(row['עודכן ב']);
  var actualHarvest = row['תאריך מסיק בפועל'];
  if (Object.prototype.toString.call(actualHarvest) === '[object Date]' && !isNaN(actualHarvest.getTime())) {
    actualHarvest = Utilities.formatDate(actualHarvest, 'Asia/Jerusalem', 'yyyy-MM-dd');
  } else {
    actualHarvest = actualHarvest ? String(actualHarvest) : '';
  }

  return {
    id: String(row['מזהה']),
    seasonId: String(row['מזהה עונה'] || ''),
    plotId: String(row['מזהה חלקה'] || ''),
    binCount: binCount,
    grossKg: Number(row['משקל ברוטו']) || 0,
    tarePerBinKg: Number(row['משקל טרה ליחידה']) || 0,
    totalTareKg: Number(row['טרה כוללת']) || 0,
    leavesKg: leaves === '' || leaves === null ? null : Number(leaves),
    netKg: Number(row['משקל נטו']) || 0,
    createdAt: createdAt,
    arrivalAt: arrivalAt,
    updatedAt: updatedAt,
    sample10g: sample10 === '' || sample10 === null ? null : Number(sample10),
    avgDiameterMm: avgDiameter === '' || avgDiameter === null ? null : Number(avgDiameter),
    avgOliveG: avgOlive === '' || avgOlive === null ? null : Number(avgOlive),
    estimatedOliveCount: estCount === '' || estCount === null ? null : Number(estCount),
    ripeness: String(row['בשלות'] || ''),
    fruitCondition: String(row['מצב פרי'] || ''),
    actualHarvestDate: actualHarvest,
    notes: String(row['הערות'] || ''),
    groupedWeighing: String(row['שקילה קבוצתית'] || '') === 'כן' || binCount > 1,
    arrivalDisplay: displayIsraelTime_(arrivalAt),
    createdDisplay: displayIsraelTime_(createdAt)
  };
}

function computeHarvestFields_(payload, existing) {
  var binCount = requireNumber_(payload.binCount !== undefined ? payload.binCount : (existing && existing.binCount), 'מספר דולבים');
  if (binCount < 1) throw new Error('מספר דולבים חייב להיות לפחות 1');

  var grossKg = requireNumber_(payload.grossKg !== undefined ? payload.grossKg : (existing && existing.grossKg), 'משקל ברוטו');
  if (grossKg < 0) throw new Error('משקל ברוטו אינו תקין');

  var tarePerBin;
  if (payload.tarePerBinKg !== undefined && payload.tarePerBinKg !== null && payload.tarePerBinKg !== '') {
    tarePerBin = Number(payload.tarePerBinKg);
  } else if (existing) {
    tarePerBin = Number(existing.tarePerBinKg);
  } else {
    tarePerBin = Number(getSetting_('default_tare_kg', DEFAULT_TARE_KG));
  }
  if (isNaN(tarePerBin) || tarePerBin < 0) throw new Error('משקל טרה אינו תקין');

  var leavesRaw = payload.leavesKg;
  if (leavesRaw === undefined && existing) leavesRaw = existing.leavesKg;
  var leavesKg = null;
  if (leavesRaw !== null && leavesRaw !== undefined && leavesRaw !== '') {
    leavesKg = Number(leavesRaw);
    if (isNaN(leavesKg) || leavesKg < 0) throw new Error('משקל עלים אינו תקין');
  }

  var totalTare = round3_(binCount * tarePerBin);
  var leavesForCalc = leavesKg === null ? 0 : leavesKg;
  var netKg = round3_(grossKg - totalTare - leavesForCalc);
  if (netKg < 0) throw new Error('משקל נטו שלילי — בדקו משקלים');

  // Sample fields — blank if missing, never coerce to 0
  var sample10g = null;
  var sampleRaw = payload.sample10g;
  if (sampleRaw === undefined && existing) sampleRaw = existing.sample10g;
  if (sampleRaw !== null && sampleRaw !== undefined && sampleRaw !== '') {
    sample10g = Number(sampleRaw);
    if (isNaN(sample10g) || sample10g <= 0) throw new Error('משקל מדגם זיתים אינו תקין');
  }

  var avgDiameterMm = null;
  var diamRaw = payload.avgDiameterMm;
  if (diamRaw === undefined && existing) diamRaw = existing.avgDiameterMm;
  if (diamRaw !== null && diamRaw !== undefined && diamRaw !== '') {
    avgDiameterMm = Number(diamRaw);
    if (isNaN(avgDiameterMm) || avgDiameterMm <= 0) throw new Error('קוטר ממוצע אינו תקין');
  }

  var avgOliveG = null;
  var estimatedOliveCount = null;
  if (sample10g !== null) {
    avgOliveG = round3_(sample10g / 10);
    if (avgOliveG > 0) {
      estimatedOliveCount = Math.round((netKg * 1000) / avgOliveG);
    }
  }

  var arrivalAt = payload.arrivalAt;
  if (!arrivalAt && existing) arrivalAt = existing.arrivalAt;
  if (!arrivalAt) arrivalAt = nowIso_();
  else {
    var parsed = parseTimestamp_(arrivalAt);
    arrivalAt = parsed ? formatTimestamp_(parsed) : String(arrivalAt);
  }

  return {
    binCount: binCount,
    grossKg: round3_(grossKg),
    tarePerBinKg: round3_(tarePerBin),
    totalTareKg: totalTare,
    leavesKg: leavesKg,
    netKg: netKg,
    sample10g: sample10g,
    avgDiameterMm: avgDiameterMm,
    avgOliveG: avgOliveG,
    estimatedOliveCount: estimatedOliveCount,
    arrivalAt: arrivalAt,
    ripeness: String(payload.ripeness !== undefined ? payload.ripeness : (existing && existing.ripeness) || ''),
    fruitCondition: String(payload.fruitCondition !== undefined ? payload.fruitCondition : (existing && existing.fruitCondition) || ''),
    actualHarvestDate: String(payload.actualHarvestDate !== undefined ? payload.actualHarvestDate : (existing && existing.actualHarvestDate) || ''),
    notes: String(payload.notes !== undefined ? payload.notes : (existing && existing.notes) || ''),
    groupedWeighing: binCount > 1 ? 'כן' : 'לא'
  };
}

function harvestToRow_(id, seasonId, plotId, fields, createdAt, updatedAt) {
  var row = {};
  row['מזהה'] = id;
  row['מזהה עונה'] = seasonId;
  row['מזהה חלקה'] = plotId;
  row['מספר דולבים'] = fields.binCount;
  row['משקל ברוטו'] = fields.grossKg;
  row['משקל טרה ליחידה'] = fields.tarePerBinKg;
  row['טרה כוללת'] = fields.totalTareKg;
  row['משקל עלים'] = fields.leavesKg === null ? '' : fields.leavesKg;
  row['משקל נטו'] = fields.netKg;
  row['חותמת יצירה'] = createdAt;
  row['חותמת הגעה'] = fields.arrivalAt;
  row['עודכן ב'] = updatedAt;
  row['משקל 10 זיתים גרם'] = fields.sample10g === null ? '' : fields.sample10g;
  row['קוטר ממוצע מ״מ'] = fields.avgDiameterMm === null ? '' : fields.avgDiameterMm;
  row['משקל ממוצע לזית'] = fields.avgOliveG === null ? '' : fields.avgOliveG;
  row['הערכת מספר זיתים'] = fields.estimatedOliveCount === null ? '' : fields.estimatedOliveCount;
  row['בשלות'] = fields.ripeness;
  row['מצב פרי'] = fields.fruitCondition;
  row['תאריך מסיק בפועל'] = fields.actualHarvestDate;
  row['הערות'] = fields.notes;
  row['שקילה קבוצתית'] = fields.groupedWeighing;
  return row;
}

function saveHarvest(payload) {
  try {
    payload = payload || {};
    var seasonId = String(payload.seasonId || getSetting_('active_season_id', '') || '');
    if (!seasonId) return fail_('אין עונה פעילה נבחרת');

    var seasonSheet = getSheet_(SHEET_NAMES.SEASONS);
    var season = findRowById_(seasonSheet, 'מזהה', seasonId);
    if (!season) return fail_('עונה לא נמצאה');

    var plotId = String(payload.plotId || season['מזהה חלקה'] || '');
    if (!plotId) return fail_('מזהה חלקה חסר');

    var sheet = getSheet_(SHEET_NAMES.HARVEST);
    var headers = HEADERS.HARVEST;
    var now = nowIso_();
    var id = payload.id ? String(payload.id) : '';

    if (id) {
      var existingRow = findRowById_(sheet, 'מזהה', id);
      if (!existingRow) return fail_('רשומה לא נמצאה');
      var existing = mapHarvest_(existingRow);
      var fields = computeHarvestFields_(payload, existing);
      var updated = harvestToRow_(id, seasonId, plotId, fields, existing.createdAt || now, now);
      updateObjectProps_(sheet, existingRow._row, headers, updated);
      return ok_(mapHarvest_(updated));
    }

    var fieldsNew = computeHarvestFields_(payload, null);
    id = generateId_();
    var created = harvestToRow_(id, seasonId, plotId, fieldsNew, now, now);
    appendObjectProps_(sheet, headers, created);
    return ok_(mapHarvest_(created));
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function deleteHarvest(recordId) {
  try {
    recordId = String(recordId || '');
    if (!recordId) return fail_('מזהה רשומה חסר');
    var sheet = getSheet_(SHEET_NAMES.HARVEST);
    var found = findRowById_(sheet, 'מזהה', recordId);
    if (!found) return fail_('רשומה לא נמצאה');
    sheet.deleteRow(found._row);
    return ok_({ deleted: true, id: recordId });
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function getSeasonTotals(seasonId) {
  try {
    return ok_(getSeasonTotalsInternal_(seasonId));
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function getSeasonTotalsInternal_(seasonId) {
  var records = listHarvestInternal_(seasonId);
  var totalNet = 0;
  var totalGross = 0;
  var totalBins = 0;
  records.forEach(function (r) {
    totalNet += Number(r.netKg) || 0;
    totalGross += Number(r.grossKg) || 0;
    totalBins += Number(r.binCount) || 0;
  });
  return {
    seasonId: seasonId,
    recordCount: records.length,
    totalBins: totalBins,
    totalGrossKg: round3_(totalGross),
    totalNetKg: round3_(totalNet),
    avgNetPerBin: totalBins > 0 ? round3_(totalNet / totalBins) : null
  };
}
