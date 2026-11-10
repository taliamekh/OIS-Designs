const {chromium}=require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {load,mobile}=require('./probe-domain.cjs'),g=load('src/domain/geometry.ts');
const {readLibrary,waitForLibrary,oracleInfo}=require('./web-storage.cjs');
const report={timestamp:new Date().toISOString(),evidence:'Actual isolated Expo web creation UI; no native or physical-device claim',runs:[]};
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{for(const shape of['Square','L-shape','Draw walls','Invalid draw']){
  const run={shape,checks:[],errors:[],consoleErrors:[]};report.runs.push(run);const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
  page.on('pageerror',e=>run.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')run.consoleErrors.push(m.text().slice(0,1200));});const check=(id,pass,observed)=>run.checks.push({id,pass:!!pass,observed});
  try{
   const response=await page.goto('http://localhost:8081',{waitUntil:'domcontentloaded',timeout:45000});if(response.status()>=500)throw Error('Preview HTTP'+response.status());await page.getByRole('button',{name:'Create room or floor plan',exact:true}).click({timeout:45000});await page.getByRole('button',{name:'Bedroom',exact:true}).click();await page.getByRole('button',{name:shape==='Invalid draw'?'Draw walls':shape,exact:true}).click();
   const fields=await page.getByRole('textbox').evaluateAll(list=>list.map(el=>({name:el.getAttribute('aria-label'),value:el.value})));check('dimensions-together',fields.some(f=>f.name==='Width (m)')&&fields.some(f=>f.name==='Depth (m)')&&fields.some(f=>f.name==='Ceiling height (m)'),fields);
   if(shape.includes('draw')||shape==='Draw walls'){
    const grid=await page.getByLabel('Draw room outline',{exact:true}).boundingBox(),points=shape==='Invalid draw'?[[25,25],[225,175],[25,225],[175,25]]:[[25,25],[225,25],[225,200],[25,200]];
    for(const [x,y]of points)await page.touchscreen.tap(grid.x+x,grid.y+y);
    run.taps={grid,points};
   }
   await page.getByRole('button',{name:'Create room',exact:true}).click();
   if(shape==='Invalid draw'){
    const body=await page.locator('body').innerText();check('crossing-outline-rejected-in-ui',/closed outline|crossing walls|distinct corners/.test(body)&&await page.getByRole('button',{name:'Create room',exact:true}).count()===1,body);await page.screenshot({path:path.join(__dirname,'creation-invalid-draw.png')});
   }else{
    await page.getByRole('button',{name:'Build',exact:true}).waitFor();const l=await waitForLibrary(page,l=>l.projects.some(h=>h.present.id===l.activeId&&h.present.name==='Untitled project'));
    const project=l.projects.find(h=>h.present.id===l.activeId).present,r=project.floors[0].rooms[0],b=g.bounds(r.polygon),expectedArea=shape==='Square'?16:shape==='L-shape'?4.8*3.8*.775:4.8*3.8;
    check('created-room-valid',g.validPolygon(r.polygon)&&r.kind==='bedroom',{kind:r.kind,polygon:r.polygon});check('expected-template-area',Math.abs(Math.abs(g.area(r.polygon))-expectedArea)<.002,{actualArea:Math.abs(g.area(r.polygon)),expectedArea});check('expected-outline-vertex-count',r.polygon.length===(shape==='L-shape'?6:4),r.polygon.length);
    if(shape==='Square')check('square-starting-dimensions-match',Math.abs(b.maxX-b.minX-(b.maxZ-b.minZ))<1e-8,b);
    await page.screenshot({path:path.join(__dirname,'creation-'+shape.replaceAll(' ','-')+'.png')});
   }
   run.completed=true;
  }catch(e){run.failure=String(e);run.body=(await page.locator('body').innerText().catch(()=>'')).slice(0,3000);}
  await context.close();
 }}finally{await browser.close();}
 report.storageOracle=oracleInfo;report.currentCreateSourceSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile,'src/screens/Create.tsx'))).digest('hex');
 fs.writeFileSync(path.join(__dirname,'creation-web.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify(report,null,2)+'\n');
})().catch(e=>{report.harnessError=String(e);fs.writeFileSync(path.join(__dirname,'creation-web.json'),JSON.stringify(report,null,2)+'\n');process.stderr.write(e.stack+'\n');process.exitCode=1;});
