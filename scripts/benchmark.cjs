const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const {spawn}=require('node:child_process');const {chromium}=require('playwright');const {demo}=require('../tests/fixtures/large-snapshot.cjs');
(async()=>{
 fs.mkdirSync('.local',{recursive:true});let input=process.argv[2];if(!input){input='.local/benchmark-snapshot.json';fs.writeFileSync(input,JSON.stringify(demo({base:2851,production:37701,replacements:1352,audits:967,articles:960})));}
 const port=4188,server=spawn(process.execPath,['scripts/preview.cjs'],{env:{...process.env,PORT:String(port),DASH_SNAPSHOT:path.resolve(input)},stdio:['ignore','pipe','pipe']});let browser;
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(new Error('Validation server exited '+c)));});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const start=performance.now();await page.goto('http://127.0.0.1:'+port);await page.locator('#loading').waitFor({state:'hidden'});if(await page.locator('#fatal-error').isVisible())throw new Error('Snapshot failed to load.');const localLoadMs=performance.now()-start;
  await page.getByRole('navigation').getByRole('button',{name:'Produção',exact:true}).click();
  const samples=[];
  for(let i=0;i<24;i++){
   for(const selector of ['[data-chart="units"] button.chart-row','#reset']){
    const ms=await page.evaluate(selector=>{const start=performance.now();document.querySelector(selector).click();void document.body.offsetHeight;return performance.now()-start;},selector);
    if(i>=4)samples.push(ms);await page.evaluate(()=>new Promise(requestAnimationFrame));
   }
  }
  samples.sort((a,b)=>a-b);const p95=samples[Math.ceil(samples.length*.95)-1];
  const result={source:process.argv[2]?'uploaded workbook (local only)':'synthetic representative volume',runtime:process.version,browser:await browser.version(),platform:os.platform()+' '+os.arch(),cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,payloadBytes:fs.statSync(input).size,localLoadMs:Math.round(localLoadMs),samples:samples.length,filterP95Ms:Math.round(p95*10)/10,targetMs:200,networkLoads:await page.evaluate(()=>window.__loadCount),consoleErrors:errors};
  fs.writeFileSync(process.argv[2]?'.local/benchmark-real.json':'.local/benchmark.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(p95>200||errors.length)process.exitCode=1;
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
