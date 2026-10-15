/* Shared, read-only schema. Functions live in an object, not public RPC endpoints. */
var DashSchema = (function () {
  'use strict';
  var specs = {
    'BASE': [
      [0,'ID ITEM','itemId','id'],[1,'DATA SOLICITAÇÃO','date','date'],[3,'MACRO-FASE','macro'],[4,'OP','op','id'],[5,'ARTIGO','article','id'],[6,'ROTA','route','id'],[7,'GRUPO','group','id'],[8,'DESC. REPOSIÇÃO','item'],[10,'MOTIVO','reason'],[11,'MOTIVO ESPECÍFICO','specificReason'],[12,'ÁREA CAUSADORA','area'],[14,'PLANO','plan','id'],[15,'UND. CORTE','unit'],[16,'FASE','phase'],[17,'EMBARQUE','shipment','shipment'],[18,'MARCA','brand'],[19,'PÇS TOTAL','orderPieces','num'],[27,'FALTA TOTAL','pieces','num'],[28,'DATA DO ENVIO','sentDate','date'],[29,'SITUAÇÃO','situation'],[30,'BLOCO','block'],[31,'DATA SUSPENSÃO','suspendedDate','date'],[33,'ANÁLISE PCP','pcp'],[34,'ARITGOSIGLA','articleShort','id'],[35,'SOLICITAÇÂO','request','id'],[36,'AUDITORIA SOL','requestFlag'],[37,'AUDITORIA OP','opFlag']
    ],
    'REPOSIÇÔES': [
      [0,'MOTIVO','reason'],[1,'FILIAL','branch'],[2,'STATUS PCP','pcp'],[3,'DATA','date','date'],[4,'ORDEM','op','order'],[5,'SOLICITAÇÃO','request','id'],[6,'EMBARQUE','shipment','shipment'],[7,'TOTAL DE PEÇAS','pieces','num'],[8,'TIPO','type'],[9,'ITEM','item'],[10,'CONSUMO KG','kg','num'],[11,'STATUS DEPÓSITO','depot'],[12,'LOTE BAIXADO','lot','id'],[13,'DATA ENTREGA DEPÓSITO','depotDate','date'],[14,'STATUS CORTE','cut'],[15,'STATUS CD','cd'],[16,'DATA RECEBIMENTO','receivedDate','date'],[19,'DATA DE ENVIO','sentDate','date'],[20,'RECEBIMENTO SLMB','endDate','date']
    ],
    'LINK': [
      [2,'Solicitacao','request','id'],[3,'Ordem','op','id'],[5,'SgUnidade','unit'],[6,'Plano','plan','id'],[7,'Embarque','shipment','shipment'],[9,'Prog','programmed','num'],[12,'QtFase','phasePieces','num'],[13,'DtFim','date','date'],[14,'Artigo','article','id'],[15,'Desc Artigo','description'],[18,'Ds Tipo de Ordem','orderType'],[26,'Negocio','business'],[27,'Categoria','category'],[28,'Grupo Coml','commercialGroup'],[31,'Colecao','collection'],[32,'Evento','event'],[33,'Turno','shift','id'],[35,'Linha','line'],[36,'SAFL-QtPCON','produced','num'],[37,'SAFL-QtSegQld','secondQuality','num'],[38,'SAFL-QtSaldos','balance','num']
    ],
    'QUALIDADE': [
      [0,'','date','date'],[1,'ORDEM','op','id'],[2,'SOLICITAÇÃO','request','id'],[3,'TURNO AUDITADO','auditShift','id'],[4,'TURNO PRODUZIDO','productionShift','id'],[5,'PESO SOLICITADO','requestedWeight','num'],[6,'PESO CORTE','cutWeight','num'],[7,'PESO AUDITADO','auditWeight','num'],[8,'STATUS','status'],[9,'Parte','part'],[11,'OT CRUZADA','crossed'],[12,'Duplicada','duplicateFlag'],[13,'AUDITADA SOL','requestFlag'],[14,'AUDITADA OP','opFlag']
    ],
    'Página5': [[0,'Artigo','article','id'],[1,'Produzido','produced','num'],[2,'Solicitado','pieces','num'],[4,'%','sourceRatio','num']]
  };
  function text(v) { return v == null ? '' : String(v).trim().replace(/\s+/g,' '); }
  function label(v) { return text(v).toUpperCase(); }
  function headerKey(v) { return label(v).normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
  function normalizeId(v) {
    if (v instanceof Date || typeof v === 'boolean' || (typeof v === 'number' && !Number.isFinite(v))) return null;
    var id = label(v); return !id || id === '-' || /^0+(\.0+)?$/.test(id) || id[0] === '#' ? null : id;
  }
  function normalizeOrder(v) { return normalizeId(typeof v === 'string' ? v.replace(/\s*\(\d+\)\s*$/,'') : v); }
  function day(v,zone) {
    if (v instanceof Date) {
      if (!Number.isFinite(v.getTime())) return null;
      return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(v);
    }
    var s=text(v), m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T| |$)/);
    if (!m) { var br=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if(br) m=[s,br[3],br[2],br[1]]; }
    if (!m) return null;
    var d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
    return d.getFullYear()===+m[1] && d.getMonth()===+m[2]-1 && d.getDate()===+m[3] ? m[1]+'-'+m[2]+'-'+m[3] : null;
  }
  function headers(name) {
    var spec=specs[name] || [], width=name==='LINK'?78:Math.max.apply(null,spec.map(function(d){return d[0];}))+1;
    var h=Array(width).fill(null);spec.forEach(function(d){h[d[0]]=d[1];});if(name==='LINK')h[57]='Turno';return h;
  }
  function parseSheet(name,values,context) {
    if(name==='AsakaiDash')return parseSummary(values);
    var spec=specs[name]; if(!spec)throw new Error('Aba não suportada: '+name);
    var h=values[0] || [];
    spec.forEach(function(d){if(d[1] && headerKey(h[d[0]])!==headerKey(d[1]))throw new Error('Coluna ausente ou deslocada: '+name+' / '+d[1]+' (coluna '+(d[0]+1)+')');});
    var cols=spec.map(function(d){return d[2];}).concat(['opOriginal','sourceRow','dateValid','dateTime']);
    var out={columns:cols,rows:[],diagnostics:[]},today=day(new Date(context.now),context.timeZone);
    values.slice(1).forEach(function(row,i){
      var source=i+2;
      if(name==='BASE' && (!normalizeId(row[0])||!normalizeId(row[4])))return;
      if(name==='REPOSIÇÔES' && (!normalizeOrder(row[4]) || !text(row[3])))return;
      if(name==='LINK' && !normalizeId(row[3]))return;
      if(name==='QUALIDADE' && ((!normalizeId(row[1])&&!normalizeId(row[2]))||!['APROVADO','REPROVADO'].includes(label(row[8]))))return;
      if(name==='Página5' && (!normalizeId(row[0])||typeof row[1]!=='number'))return;
      var dateValid=true;
      function issue(field,code){out.diagnostics.push({sheet:name,row:source,field:field,code:code});}
      var cells=spec.map(function(d){
        var v=row[d[0]],t=d[3],f=d[2];
        if(t==='id')return normalizeId(v);
        if(t==='order')return normalizeOrder(v);
        if(t==='num'){
          if(v==null||v==='')return null;
          if(typeof v==='number' && Number.isFinite(v) && v>=0)return v;
          issue(f,'NUMERO_INVALIDO');return null;
        }
        if(t==='date'){
          var dt=day(v,context.timeZone);
          if(!dt || !/^\d{4}-\d{2}-\d{2}$/.test(dt) || dt<'2000-01-01' || dt>'2100-12-31'){
            if(v!=null&&v!=='')issue(f,'DATA_INVALIDA');if(f==='date')dateValid=false;return null;
          }
          if(dt>today){issue(f,'DATA_FUTURA');if(f==='date')dateValid=false;}
          return dt;
        }
        if(t==='shipment')return v instanceof Date ? day(v,context.timeZone) : label(v);
        return label(v);
      });
      var opCol=spec.find(function(d){return d[2]==='op';});
      var dateCol=spec.find(function(d){return d[2]==='date';});
      var rawDate=dateCol?row[dateCol[0]]:null;
      var instant=rawDate instanceof Date && Number.isFinite(rawDate.getTime()) ? rawDate.toISOString() : null;
      cells.push(opCol?text(row[opCol[0]]):null,source,dateValid,instant);out.rows.push(cells);
    });return out;
  }
  function parseSummary(values){
    var out={columns:['block','label','value','sourceCell','sourceRow'],rows:[],diagnostics:[]};
    var blocks={};
    values.forEach(function(row,i){
      row.slice(0,63).forEach(function(v,j){
        if(typeof v!=='string' || !text(v))return;
        var next=row[j+1];
        if(typeof next==='number' && Number.isFinite(next)){
          var col=j+1,letters='';while(col){col--;letters=String.fromCharCode(65+col%26)+letters;col=Math.floor(col/26);}
          out.rows.push([blocks[j] || 'Resumo — coluna '+letters,text(v),next,letters+(i+1),i+1]);
        }else if(!text(next) && text(v).length>5)blocks[j]=text(v);
      });
    });return out;
  }
  return {names:Object.keys(specs).concat(['AsakaiDash']),specs:specs,headers:headers,normalizeId:normalizeId,normalizeOrder:normalizeOrder,parseSheet:parseSheet};
})();
