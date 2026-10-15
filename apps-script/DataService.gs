/** The only public data RPC. The browser cannot choose another spreadsheet. */
function configuredSpreadsheetId_() {
  var configured = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var value = configured == null ? '' : String(configured).trim();
  if (!value) value = '1ExgwfrUZy9a_aKla_Q4qgfgCY3Rm5cCchDMxPcYU05g';
  var url = value.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:[/?#]|$)/);
  if (url) value = url[1];
  if (!/^[A-Za-z0-9_-]{20,}$/.test(value)) {
    throw new Error('SPREADSHEET_ID inválido. Use somente o ID ou a URL https://docs.google.com/spreadsheets/d/... da planilha.');
  }
  return value;
}
function getDashboardData() {
  var id = configuredSpreadsheetId_();
  var ss;
  try { ss = SpreadsheetApp.openById(id); }
  catch (error) {
    var detail = error && error.message ? error.message : String(error);
    throw new Error('Não foi possível ler a planilha. Detalhe do Google: ' + detail + ' Execute diagnosticarAcessoPlanilha_ no editor para conferir a autorização e o acesso da conta atual.');
  }
  return buildSnapshot_(ss,{now:new Date().toISOString()});
}
/** Editor-only diagnostic: preserves the native error and never reads cell data. */
function diagnosticarAcessoPlanilha_() {
  var ss = SpreadsheetApp.openById(configuredSpreadsheetId_());
  var result = {acesso:'OK',quantidadeAbas:ss.getSheets().length,fuso:ss.getSpreadsheetTimeZone()};
  console.log(JSON.stringify(result));
  return result;
}
function buildSnapshot_(spreadsheet,context) {
  var started=context.now || new Date().toISOString();
  var zone=spreadsheet.getSpreadsheetTimeZone();
  var snapshot={version:1,readStartedAt:started,readFinishedAt:null,timeZone:zone,tables:{},diagnostics:[],unavailable:{}};
  DashSchema.names.forEach(function(name){
    try {
      var sheet=spreadsheet.getSheetByName(name);
      if(!sheet)throw new Error('Aba não encontrada: '+name);
      var maxCol=name==='AsakaiDash'?63:Math.max.apply(null,DashSchema.specs[name].map(function(d){return d[0];}))+1;
      var last=sheet.getLastRow(),width=Math.min(maxCol,sheet.getLastColumn());
      if(!last || !width)throw new Error('Aba vazia: '+name);
      var values=sheet.getRange(1,1,last,width).getValues();
      var table=DashSchema.parseSheet(name,values,{now:started,timeZone:zone});
      snapshot.tables[name]={columns:table.columns,rows:table.rows};
      snapshot.diagnostics=snapshot.diagnostics.concat(table.diagnostics);
    } catch(error) { snapshot.unavailable[name]=error.message; }
  });
  snapshot.readFinishedAt=new Date().toISOString();
  return snapshot;
}
