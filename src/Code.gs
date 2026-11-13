/**
 * Olive Harvest Tracker — web app entry point.
 */

function doGet() {
  var template = HtmlService.createTemplateFromFile('Index');
  var output = template.evaluate()
    .setTitle('יומן מסיק זיתים')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
  return output;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
