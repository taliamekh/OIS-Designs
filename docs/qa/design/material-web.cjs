const {chromium}=require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {readLibrary,waitForLibrary,oracleInfo}=require('./web-storage.cjs');
const report={timestamp:new Date().toISOString(),evidence:'Actual Expo web map rendering and durable production IndexedDB reads; NOT physical EXGL validation',storageOracle:oracleInfo,checks:[],errors:[],consoleErrors:[],frames:[]};
const check=(id,pass,observed)=>report.checks.push({id,pass:!!pass,observed});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text().slice(0,1800));});
  const frame=async name=>{await page.waitForTimeout(400);const data=await page.locator('canvas').first().screenshot(),file='material-'+name+'.png';fs.writeFileSync(path.join(__dirname,file),data);const value={name,file,sha256:crypto.createHash('sha256').update(data).digest('hex'),bytes:data.length};report.frames.push(value);return value;};
  try{
   const response=await page.goto('http://localhost:8081',{waitUntil:'domcontentloaded',timeout:45000});if(response.status()>=500)throw Error('Preview HTTP'+response.status());await page.getByRole('button',{name:'Open Maple House',exact:true}).click({timeout:45000});await page.locator('canvas').first().waitFor();await page.waitForFunction(()=>!!window.__oisSceneProbe);
   const initial=await waitForLibrary(page,()=>true),beforeNeighbour=initial.projects[0].present.floors[0].rooms[1].floorFinish;
   await page.getByRole('button',{name:'Surfaces',exact:true}).click();await page.getByRole('button',{name:'Floor',exact:true}).click();
   const choices=await page.getByRole('button',{name:/^Apply /}).evaluateAll(list=>list.map(el=>el.getAttribute('aria-label')).filter(name=>name!=='Apply scale and direction'));check('ten-floor-choices',choices.length===10,choices);
   const names=['White oak planks','Oak herringbone','Slate tile'];let previous;
   for(const name of names){await page.getByRole('button',{name:'Apply '+name,exact:true}).click();const frameResult=await frame(name.replaceAll(' ','-').toLowerCase());if(previous)check('render-changes-'+name,previous.sha256!==frameResult.sha256,{before:previous.sha256,after:frameResult.sha256});previous=frameResult;}
   let l=await waitForLibrary(page,l=>l.projects[0].present.floors[0].rooms[0].floorFinish.id==='slate');check('floor-change-stays-in-room',JSON.stringify(l.projects[0].present.floors[0].rooms[1].floorFinish)===JSON.stringify(beforeNeighbour));
   await page.getByRole('button',{name:'Apply Oak herringbone',exact:true}).click();const repeat=page.getByRole('textbox',{name:'Texture repeat (m)',exact:true});await repeat.fill('1.5');await page.getByRole('textbox',{name:'Direction (degrees)',exact:true}).fill('45');await page.getByRole('button',{name:'Apply scale and direction',exact:true}).click();
   l=await waitForLibrary(page,l=>{const f=l.projects[0].present.floors[0].rooms[0].floorFinish;return f.repeat===1.5&&Math.abs(f.angle-Math.PI/4)<1e-8;});check('physical-repeat-and-angle-persist',true,l.projects[0].present.floors[0].rooms[0].floorFinish);await frame('herringbone-rotation45-repeat1.5');
   await page.getByRole('button',{name:'Walls',exact:true}).click();await page.getByRole('textbox',{name:'HEX colour',exact:true}).fill('#92a8bf');await page.getByRole('button',{name:'Exposed brick',exact:true}).click();await page.getByRole('button',{name:'gloss',exact:true}).click();await page.getByRole('button',{name:'Paint selected wall',exact:true}).click();
   l=await waitForLibrary(page,l=>Object.values(l.projects[0].present.floors[0].rooms[0].wallFaces).some(f=>f.colour==='#92a8bf'&&f.texture==='brick'&&f.sheen==='gloss'));
   check('wall-texture-colour-sheen-persist',true,l.projects[0].present.floors[0].rooms[0].wallFaces);check('wall-paint-does-not-recolour-neighbour',Object.keys(l.projects[0].present.floors[0].rooms[1].wallFaces).length===0);await frame('brick-gloss-wall');
   report.scene=await page.evaluate(()=>window.__oisSceneProbe());check('maps-no-error-boundary',!/3D could not load/.test(await page.locator('body').innerText()));report.completed=true;
  }catch(e){report.failure=String(e);report.body=(await page.locator('body').innerText().catch(()=>'')).slice(0,4500);}
  await context.close();
 }finally{await browser.close();}
 fs.writeFileSync(path.join(__dirname,'material-web.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify(report,null,2)+'\n');
})().catch(e=>{report.harnessError=String(e);fs.writeFileSync(path.join(__dirname,'material-web.json'),JSON.stringify(report,null,2)+'\n');process.stderr.write(e.stack+'\n');process.exitCode=1;});
