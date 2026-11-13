/**
 * Spreadsheet connection via PropertiesService (config only).
 */

function getConnectionStatus() {
  try {
    var id = PropertiesService.getScriptProperties().getProperty(PROP_SPREADSHEET_ID);
    if (!id) {
      return ok_({ connected: false });
    }
    var ss = SpreadsheetApp.openById(id);
    return ok_({
      connected: true,
      spreadsheetId: id,
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl()
    });
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function createNewSpreadsheet() {
  try {
    var ss = SpreadsheetApp.create('יומן מסיק זיתים');
    ensureSpreadsheetSchema_(ss);
    PropertiesService.getScriptProperties().setProperty(PROP_SPREADSHEET_ID, ss.getId());
    return ok_({
      connected: true,
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      created: true
    });
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function connectExistingSpreadsheet(urlOrId) {
  try {
    var id = extractSpreadsheetId_(urlOrId);
    if (!id) {
      return fail_('נא להדביק קישור או מזהה גיליון תקין');
    }
    var ss = SpreadsheetApp.openById(id);
    ensureSpreadsheetSchema_(ss);
    PropertiesService.getScriptProperties().setProperty(PROP_SPREADSHEET_ID, ss.getId());
    return ok_({
      connected: true,
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      created: false
    });
  } catch (e) {
    return fail_('לא ניתן לגשת לגיליון. בדקו הרשאות וקישור. ' + (e.message || ''));
  }
}

function disconnectSpreadsheet() {
  try {
    PropertiesService.getScriptProperties().deleteProperty(PROP_SPREADSHEET_ID);
    return ok_({ connected: false });
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function getAppBootstrap() {
  try {
    var status = getConnectionStatus();
    if (!status.ok || !status.data.connected) {
      return ok_({
        connected: false,
        connection: status.data || { connected: false }
      });
    }
    ensureSpreadsheetSchema_(getSpreadsheet_());
    var settings = getAllSettings_();
    var plots = listPlotsInternal_();
    var bins = listBinsInternal_();
    var seasons = listSeasonsInternal_();
    var activeSeasonId = String(settings.active_season_id || '');
    var harvest = activeSeasonId ? listHarvestInternal_(activeSeasonId) : [];
    var oil = activeSeasonId ? getOilInternal_(activeSeasonId) : null;
    return ok_({
      connected: true,
      connection: status.data,
      settings: settings,
      plots: plots,
      bins: bins,
      seasons: seasons,
      activeSeasonId: activeSeasonId,
      harvest: harvest,
      oil: oil
    });
  } catch (e) {
    return fail_(e.message || String(e));
  }
}

function getAllSettings_() {
  return {
    default_tare_kg: Number(getSetting_('default_tare_kg', DEFAULT_TARE_KG)) || DEFAULT_TARE_KG,
    oil_density: Number(getSetting_('oil_density', DEFAULT_OIL_DENSITY)) || DEFAULT_OIL_DENSITY,
    active_season_id: String(getSetting_('active_season_id', '') || '')
  };
}

function updateAppSettings(payload) {
  try {
    payload = payload || {};
    if (payload.default_tare_kg !== undefined && payload.default_tare_kg !== null && payload.default_tare_kg !== '') {
      var tare = Number(payload.default_tare_kg);
      if (isNaN(tare) || tare < 0) return fail_('משקל טרה ברירת מחדל אינו תקין');
      setSetting_('default_tare_kg', String(tare));
    }
    if (payload.oil_density !== undefined && payload.oil_density !== null && payload.oil_density !== '') {
      var density = Number(payload.oil_density);
      if (isNaN(density) || density <= 0) return fail_('צפיפות שמן אינה תקינה');
      setSetting_('oil_density', String(density));
    }
    return ok_(getAllSettings_());
  } catch (e) {
    return fail_(e.message || String(e));
  }
}
