const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),out=path.join(root,'.local','entrega');fs.mkdirSync(out,{recursive:true});
const code=['Schema.gs','DataService.gs','Code.gs'].map(name=>fs.readFileSync(path.join(root,'apps-script',name),'utf8')).join('\n\n');
const html=fs.readFileSync(path.join(root,'apps-script','Index.html'),'utf8').replace(/<\?!= include_\('([A-Za-z]+)'\);? \?>/g,(_,name)=>fs.readFileSync(path.join(root,'apps-script',name+'.html'),'utf8'));
if(html.includes('<?'))throw new Error('Unresolved template in delivery.');
fs.writeFileSync(path.join(out,'Code.gs'),code);fs.writeFileSync(path.join(out,'Index.html'),html);fs.copyFileSync(path.join(root,'apps-script','appsscript.json'),path.join(out,'appsscript.json'));fs.copyFileSync(path.join(root,'README.md'),path.join(out,'LEIA-ME.md'));fs.copyFileSync(path.join(root,'docs','VALIDATION.md'),path.join(out,'VALIDACAO.md'));
const zip=path.join(root,'.local','DashPRO-AppsScript.zip');
execFileSync('python3',['-c',"import zipfile,pathlib,sys\np=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED) as z:\n for f in sorted(p.iterdir()):z.write(f,f.name)",out,zip]);
console.log('Delivery generated: .local/DashPRO-AppsScript.zip (Code.gs, Index.html, manifest and instructions).');
