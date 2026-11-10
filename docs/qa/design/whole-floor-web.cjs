const {chromium}=require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {mobile}=require('./probe-domain.cjs');
const report={timestamp:new Date().toISOString(),evidence:'Isolated real Expo web UI; no source/user data edits',observations:[],consoleErrors:[]};
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
  page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text().slice(0,1000));});
  report.createSourceSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile,'src/screens/Create.tsx'))).digest('hex');
  try{
   const response=await page.goto('http://localhost:8081',{waitUntil:'domcontentloaded',timeout:45000});report.httpStatus=response?.status();
   await page.getByRole('button',{name:'Create room or floor plan',exact:true}).click({timeout:45000});await page.getByRole('button',{name:'Whole floor plan',exact:true}).click();
   report.observations.push({step:'whole-floor-shape',body:await page.locator('body').innerText()});await page.screenshot({path:path.join(__dirname,'whole-floor-shape-web.png')});
   await page.getByRole('button',{name:'Rectangle',exact:true}).click();await page.getByRole('button',{name:'Create floor plan',exact:true}).click();
   await page.getByRole('button',{name:'Build',exact:true}).waitFor();
   report.observations.push({step:'whole-floor-editor',body:await page.locator('body').innerText()});await page.screenshot({path:path.join(__dirname,'whole-floor-editor-web.png')});
   await page.waitForFunction(()=>{const raw=localStorage.getItem('ois.library.v1');return raw&&JSON.parse(JSON.parse(raw).payload).projects.some(h=>h.present.name==='Untitled floor plan');});
   report.createdProject=await page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('ois.library.v1')).payload).projects.find(h=>h.present.name==='Untitled floor plan').present);
   await page.getByRole('button',{name:'Build',exact:true}).click();
   report.observations.push({step:'build-tools',body:await page.locator('body').innerText()});
   await page.getByRole('button',{name:'Add room',exact:true}).click();report.observations.push({step:'add-room-tools',body:await page.locator('body').innerText()});await page.screenshot({path:path.join(__dirname,'whole-floor-add-room-web.png')});
   report.completed=true;
  }catch(e){report.failure=String(e);report.body=(await page.locator('body').innerText().catch(()=>'')).slice(0,5000);}
  await context.close();
 }finally{await browser.close();}
 fs.writeFileSync(path.join(__dirname,'whole-floor-web.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify({...report,createdProject:report.createdProject?{name:report.createdProject.name,floors:report.createdProject.floors.map(f=>({rooms:f.rooms.map(r=>({name:r.name,kind:r.kind,polygon:r.polygon}))}))}:undefined},null,2)+'\n');
})().catch(e=>{process.stderr.write(e.stack+'\n');process.exitCode=1;});
