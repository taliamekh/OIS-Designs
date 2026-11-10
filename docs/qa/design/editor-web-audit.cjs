const { chromium } = require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {mobile}=require('./probe-domain.cjs');
const {readLibrary,waitForLibrary,oracleInfo}=require('./web-storage.cjs');
const report={timestamp:new Date().toISOString(),evidence:'Isolated Expo web preview with mobile-sized viewport; NOT native/device evidence',cases:[],pageErrors:[],consoleErrors:[],snapshots:[]};
const sources=['src/screens/Editor.tsx','src/screens/Build.tsx','src/screens/Catalogue.tsx','src/ui/Sheet.tsx','src/state/Studio.tsx'];
const hashes=()=>Object.fromEntries(sources.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile,f))).digest('hex')]));
const check=(id,pass,observed)=>report.cases.push({id,pass:!!pass,observed});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'light'}),page=await context.newPage();
  report.sourceBefore=hashes();page.on('pageerror',e=>report.pageErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text().slice(0,2000));});
  const shot=async name=>{const file=name+'.png';await page.screenshot({path:path.join(__dirname,file)});report.snapshots.push(file);};
  const read=()=>readLibrary(page);
  try{
   await page.goto('http://localhost:8081',{waitUntil:'domcontentloaded',timeout:45000});
   await page.getByRole('button',{name:/^Open /}).first().click({timeout:45000});
   await page.getByRole('button',{name:'View 3D',exact:true}).waitFor({timeout:30000});
   await page.locator('canvas').first().waitFor({timeout:30000});
   // Wait for the source's error boundary or a renderer frame; this pause isn't proof of GLB quality.
   await page.waitForTimeout(1800);
   const body=await page.locator('body').innerText();check('editor-no-error-boundary',!/3D could not load|Something went wrong/.test(body),body.slice(0,1500));
   const canvas=page.locator('canvas').first(),element=await canvas.elementHandle(),canvasBox=await canvas.boundingBox();
   check('editor-canvas-visible',!!canvasBox,canvasBox);await shot('editor-web-390');
   const roomBefore=await page.getByRole('button',{name:/^Choose room, current /}).getAttribute('aria-label');
   await page.getByRole('button',{name:'Furnish',exact:true}).click();
   await page.getByRole('button',{name:'Close Furniture',exact:true}).waitFor();
   const sheet=await page.getByRole('button',{name:'Close Furniture',exact:true}).evaluate(el=>{const root=el.parentElement.parentElement,r=root.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};});
   check('catalogue-preserves-canvas',await element.evaluate(el=>el.isConnected),{sheet,canvasBox});
   const roomAfter=await page.getByRole('button',{name:/^Choose room, current /}).getAttribute('aria-label');
   check('catalogue-preserves-room',roomBefore===roomAfter,{roomBefore,roomAfter});
   const visible=canvasBox?Math.max(0,Math.min(sheet.y,canvasBox.y+canvasBox.height)-canvasBox.y)/canvasBox.height:0;
   check('compact-catalogue-keeps-room-visible',visible>=.35,{unobscuredRendererFraction:visible,sheet});
   check('catalogue-has-search',await page.getByRole('textbox',{name:'Search furniture',exact:true}).isVisible());
   await shot('catalogue-web-390');await page.getByRole('button',{name:'Close Furniture',exact:true}).click();
   await page.getByRole('button',{name:'Build',exact:true}).click();await page.getByRole('button',{name:'Room dimensions',exact:true}).click();
   const widthM=await page.getByRole('textbox',{name:'Width (m)',exact:true}).inputValue();
   await waitForLibrary(page,()=>true);
   const before=await read();
   await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'ft',exact:true}).click();
   await page.getByRole('button',{name:'Back',exact:true}).click();
   const widthFT=await page.getByRole('textbox',{name:'Width (ft)',exact:true}).inputValue();
   check('open-dimensions-convert-on-unit-change',Math.abs(Number(widthFT)-Number(widthM)/.3048)<.002,{widthM,widthFT,expected:Number(widthM)/.3048});
   await waitForLibrary(page,l=>l.settings.unit==='ft');
   const after=await read();
   check('unit-setting-preserves-exact-geometry',JSON.stringify(before.projects)===JSON.stringify(after.projects));
   check('settings-return-keeps-room',roomBefore===await page.getByRole('button',{name:/^Choose room, current /}).getAttribute('aria-label'));
   await shot('dimensions-feet-web-390');
   await page.getByRole('button',{name:'Close Room dimensions',exact:true}).click();
   await page.getByRole('button',{name:'Build',exact:true}).click();await page.getByRole('button',{name:'Add room',exact:true}).click();
   const labels=await page.getByRole('textbox').evaluateAll(list=>list.map(el=>el.getAttribute('aria-label')));
   check('add-room-follows-settings-units',labels.some(s=>/^Width \(ft\)$/.test(s))&&!labels.some(s=>/\(m\)$/.test(s)),labels);
   await shot('add-room-feet-web-390');
   report.completed=true;
  }catch(e){report.failure=String(e);report.body=(await page.locator('body').innerText().catch(()=>'')).slice(0,7000);await shot('editor-web-failure-390').catch(()=>{});}
  report.storageOracle=oracleInfo;report.sourceAfter=hashes();report.sourceChangedDuringRun=JSON.stringify(report.sourceBefore)!==JSON.stringify(report.sourceAfter);
  await context.close();
 }finally{await browser.close();}
 report.passed=report.cases.filter(c=>c.pass).length;report.failed=report.cases.filter(c=>!c.pass).length;
 fs.writeFileSync(path.join(__dirname,'editor-web-audit.json'),JSON.stringify(report,null,2)+'\n');
 process.stdout.write(JSON.stringify({...report,sourceBefore:undefined,sourceAfter:undefined},null,2)+'\n');
})().catch(e=>{report.harnessError=String(e);fs.writeFileSync(path.join(__dirname,'editor-web-audit.json'),JSON.stringify(report,null,2)+'\n');process.stderr.write(e.stack+'\n');process.exitCode=1;});
