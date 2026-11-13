/**
 * Statistics dashboard data.
 */

function getStatistics(filters) {
  try {
    filters = filters || {};
    var seasonId = filters.seasonId ? String(filters.seasonId) : '';
    var plotId = filters.plotId ? String(filters.plotId) : '';

    var seasons = listSeasonsInternal_();
    var plots = listPlotsInternal_();
    var allHarvest = listHarvestInternal_('');
    var oilSheet = getSheet_(SHEET_NAMES.OIL);
    var oilRows = sheetToObjects_(oilSheet, 'מזהה עונה').map(mapOil_);
    var oilBySeason = {};
    oilRows.forEach(function (o) { oilBySeason[o.seasonId] = o; });

    var filteredSeasons = seasons.filter(function (s) {
      if (seasonId && s.id !== seasonId) return false;
      if (plotId && s.plotId !== plotId) return false;
      return true;
    });

    var seasonIds = {};
    filteredSeasons.forEach(function (s) { seasonIds[s.id] = s; });

    var harvest = allHarvest.filter(function (h) {
      if (seasonId && h.seasonId !== seasonId) return false;
      if (plotId && h.plotId !== plotId) return false;
      if (!seasonId && !plotId) return true;
      if (seasonId) return true;
      // plot filter without season: include harvest for seasons of that plot OR direct plot match
      return h.plotId === plotId;
    });

    var totalNet = 0;
    var totalBins = 0;
    harvest.forEach(function (h) {
      totalNet += Number(h.netKg) || 0;
      totalBins += Number(h.binCount) || 0;
    });

    var oilKgSum = 0;
    var oilLSum = 0;
    var oilEntered = false;
    filteredSeasons.forEach(function (s) {
      var o = oilBySeason[s.id];
      if (o) {
        oilEntered = true;
        oilKgSum += Number(o.oilKg) || 0;
        oilLSum += Number(o.oilL) || 0;
      }
    });

    var yieldPct = null;
    if (oilEntered && totalNet > 0) {
      yieldPct = round2_((oilKgSum / totalNet) * 100);
    }

    // Per-season series for charts
    var bySeason = seasons.map(function (s) {
      if (plotId && s.plotId !== plotId) return null;
      var recs = allHarvest.filter(function (h) { return h.seasonId === s.id; });
      var net = 0;
      var bins = 0;
      recs.forEach(function (h) {
        net += Number(h.netKg) || 0;
        bins += Number(h.binCount) || 0;
      });
      var oil = oilBySeason[s.id] || null;
      var yld = oil && net > 0 ? round2_((oil.oilKg / net) * 100) : null;
      return {
        seasonId: s.id,
        label: s.year + ' — ' + (s.plotName || 'חלקה'),
        year: s.year,
        plotId: s.plotId,
        plotName: s.plotName,
        totalNetKg: round3_(net),
        totalBins: bins,
        recordCount: recs.length,
        oilKg: oil ? oil.oilKg : null,
        oilL: oil ? oil.oilL : null,
        yieldPct: yld,
        oilEntered: !!oil
      };
    }).filter(Boolean);

    // Per-plot aggregates
    var byPlotMap = {};
    plots.forEach(function (p) {
      byPlotMap[p.id] = {
        plotId: p.id,
        plotName: p.name,
        totalNetKg: 0,
        totalBins: 0,
        seasonCount: 0
      };
    });
    bySeason.forEach(function (s) {
      if (!byPlotMap[s.plotId]) {
        byPlotMap[s.plotId] = {
          plotId: s.plotId,
          plotName: s.plotName || s.plotId,
          totalNetKg: 0,
          totalBins: 0,
          seasonCount: 0
        };
      }
      byPlotMap[s.plotId].totalNetKg = round3_(byPlotMap[s.plotId].totalNetKg + s.totalNetKg);
      byPlotMap[s.plotId].totalBins += s.totalBins;
      byPlotMap[s.plotId].seasonCount += 1;
    });

    return ok_({
      filters: { seasonId: seasonId, plotId: plotId },
      kpis: {
        totalNetKg: round3_(totalNet),
        totalBins: totalBins,
        weighingCount: harvest.length,
        avgNetPerBin: totalBins > 0 ? round3_(totalNet / totalBins) : null,
        oilKg: oilEntered ? round3_(oilKgSum) : null,
        oilL: oilEntered ? round3_(oilLSum) : null,
        yieldPct: yieldPct,
        oilEntered: oilEntered
      },
      bySeason: bySeason,
      byPlot: Object.keys(byPlotMap).map(function (k) { return byPlotMap[k]; }),
      seasons: seasons,
      plots: plots
    });
  } catch (e) {
    return fail_(e.message || String(e));
  }
}
