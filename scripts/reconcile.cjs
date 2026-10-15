const fs=require('node:fs');const {load}=require('./load-source.cjs');const c=load(['Schema.gs','Analytics.html']);
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'),(k,v)=>v&&v.__date__?new Date(v.__date__+(v.__date__.length===10?'T00:00:00':'')+'-03:00'):v);
const snapshot={version:1,readStartedAt:'2026-10-15T12:00:00Z',readFinishedAt:'2026-10-15T12:00:01Z',timeZone:'America/Sao_Paulo',tables:{},diagnostics:[],unavailable:{}};
for(const [name,values]of Object.entries(input)){try{const t=c.DashSchema.parseSheet(name,values,{now:snapshot.readStartedAt,timeZone:snapshot.timeZone});snapshot.tables[name]={columns:t.columns,rows:t.rows};snapshot.diagnostics.push(...t.diagnostics);}catch(e){snapshot.unavailable[name]=e.message;}}
fs.writeFileSync(process.argv[3],JSON.stringify(snapshot));
const p=c.DashAnalytics.prepare(snapshot),q=p.records.QUALIDADE||[];
const counts=Object.fromEntries(Object.entries(p.records).map(([name,rs])=>[name,rs.length]));const audit={events:q.length,approved:q.filter(r=>r.status==='APROVADO').length,rejected:q.filter(r=>r.status==='REPROVADO').length};const quality=c.DashAnalytics.quality(p,{},{}).metrics;
console.log(JSON.stringify({counts,audit,coverage:quality,diagnostics:snapshot.diagnostics.length,unavailable:snapshot.unavailable,payloadBytes:Buffer.byteLength(JSON.stringify(snapshot))},null,2));
if(q.length!==967||audit.approved!==916||audit.rejected!==51||Object.keys(snapshot.unavailable).length)process.exitCode=1;
