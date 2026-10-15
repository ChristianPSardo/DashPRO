/** The only public data RPC. The browser cannot choose another spreadsheet. */
function getDashboardData() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '1ExgwfrUZy9a_aKla_Q4qgfgCY3Rm5cCchDMxPcYU05g';
  var ss;
  try { ss=SpreadsheetApp.openById(id); }
  catch(error) { throw new Error('Não foi possível ler a planilha. Confira SPREADSHEET_ID e a permissão de leitura da conta que executa o Web App.'); }
  return buildSnapshot_(ss,{now:new Date().toISOString()});
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
