const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..','apps-script');let scripts=0;
for(const name of fs.readdirSync(root)){
 const text=fs.readFileSync(path.join(root,name),'utf8');
 if(name.endsWith('.gs')){new vm.Script(text,{filename:name});scripts++;assert.doesNotMatch(text,/\.(setValue|setValues|appendRow|deleteRow)\(/);}
 if(name.endsWith('.html'))for(const [i,m]of [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].entries()){new vm.Script(m[1],{filename:name+':'+i});scripts++;}
}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'appsscript.json')));assert.equal(manifest.runtimeVersion,'V8');assert.deepEqual(manifest.oauthScopes,['https://www.googleapis.com/auth/spreadsheets']);
const index=fs.readFileSync(path.join(root,'Index.html'),'utf8'),code=fs.readFileSync(path.join(root,'Code.gs'),'utf8');
for(const m of index.matchAll(/include_\('([A-Za-z]+)'\)/g)){assert.ok(fs.existsSync(path.join(root,m[1]+'.html')));assert.ok(code.includes("'"+m[1]+"'"));}
console.log('PASS: '+scripts+' JavaScript units parse; includes resolved; required SpreadsheetApp scope verified; read-only operations checked.');
