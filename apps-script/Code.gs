function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('DashPRO · Inteligência operacional').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function include_(name) {
  if (!['Styles','Analytics','Charts','Filters','Table','App'].includes(name)) throw new Error('Include não permitido.');
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
