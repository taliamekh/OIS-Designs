const {chromium}=require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {load,mobile}=require('./probe-domain.cjs'),p=load('src/domain/project.ts'),g=load('src/domain/geometry.ts'),s=load('src/domain/persistence.ts'),t=load('src/domain/types.ts'),assets=load('src/catalogue/assets.json');
const {readLibrary,waitForLibrary,oracleInfo}=require('./web-storage.cjs');
const report={timestamp:new Date().toISOString(),evidence:'Isolated real Expo web UI seeded with validated QA projects; no production files or user browser/storage modified',runs:[]};
const sourceHashes=()=>Object.fromEntries(['src/screens/Surfaces.tsx','src/screens/Editor.tsx','src/scene/Plan.tsx','src/scene/Viewport.tsx','src/scene/RoomScene.tsx'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile,f))).digest('hex')]));
report.sourceBefore=sourceHashes();
function setup(name){let project=p.makeProject('living',6,5);project.name=name;let floor=project.floors[0];const added=p.makeRoom('kitchen','Kitchen',g.shapePolygon('rectangle',4,5,{x:6,z:0}));const result=p.execute({past:[],present:project,future:[]},{type:'add-room',floorId:floor.id,room:added},'2d',assets);if(result.error)throw Error(result.error);project=result.history.present;floor=project.floors[0];return{project,floor,room:floor.rooms[0],neighbour:floor.rooms[1]};}
const library=project=>({version:1,projects:[{past:[],present:project,future:[]}],activeId:project.id,favourites:[],recent:[],settings:{unit:'m',grid:true,quickMove:true,appearance:'system'},lastDoor:{type:'single',width:.9,height:2.1,hinge:'left',flip:false,repeat:true}});
const item=(room,a,id='qa-item')=>({id,roomId:room.id,assetId:a.id,assetVersion:a.version,assetHash:a.sha256,x:1,z:1,yaw:0,locked:true,materialOverrides:{}});
const read=page=>readLibrary(page);
async function open(browser,project,run){const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),raw=s.encode(library(project));s.decode(raw);await context.addInitScript(({key,raw})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,raw);},{key:s.PRIMARY,raw});page.on('pageerror',e=>(run.pageErrors??=[]).push(String(e)));page.on('console',m=>{if(m.type()==='error')(run.consoleErrors??=[]).push(m.text().slice(0,1500));});const response=await page.goto('http://localhost:8081',{waitUntil:'domcontentloaded',timeout:45000});if(response.status()>=500)throw Error('Preview HTTP'+response.status());await page.getByRole('button',{name:'Open '+project.name,exact:true}).click({timeout:45000});await page.getByRole('button',{name:'View 3D',exact:true}).waitFor();return{context,page};}
const screenshot=async(page,name)=>{const file='seeded-'+name+'.png';await page.screenshot({path:path.join(__dirname,file)});return file;};
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  {
   const run={name:'selected-wall-inspectors',checks:[]};report.runs.push(run);let context;
   try{
    const fixture=setup('QA wall inspector'),{project,floor,room}=fixture,walls=floor.walls.filter(w=>w.faces.some(f=>f.roomId===room.id));
    room.trimOverrides[walls[0].id]={...t.defaultTrim,profile:'stepped',height:.18,projection:.025,colour:'#abcdef',sheen:'gloss'};
    room.trimOverrides[walls[1].id]={...t.defaultTrim,profile:'bevel',height:.07,projection:.008,colour:'#aabbcc',sheen:'matte'};
    room.wallFaces[walls[0].id]={colour:'#445566',texture:'paint',sheen:'satin'};room.wallFaces[walls[1].id]={colour:'#aaccbb',texture:'paint',sheen:'matte'};
    const opened=await open(browser,project,run);context=opened.context;const page=opened.page;
    const check=(id,pass,observed)=>run.checks.push({id,pass:!!pass,observed});
    await page.getByRole('button',{name:'Surfaces',exact:true}).click();await page.getByRole('button',{name:'Trim',exact:true}).click();await page.getByRole('button',{name:'Selected wall',exact:true}).click();
    const inspect=async()=>({height:await page.getByRole('textbox',{name:'Height (cm)',exact:true}).inputValue(),projection:await page.getByRole('textbox',{name:'Projection (mm)',exact:true}).inputValue(),colour:await page.getByRole('textbox',{name:'Trim HEX',exact:true}).inputValue()});
    let values=await inspect();check('wall1-trim-hydrates',Number(values.height)===18&&Number(values.projection)===25&&values.colour==='#abcdef',values);
    await page.getByRole('button',{name:'Wall 2',exact:true}).click();values=await inspect();check('wall2-trim-hydrates',Number(values.height)===7&&Number(values.projection)===8&&values.colour==='#aabbcc',values);run.trimScreenshot=await screenshot(page,'wall-trim');
    await page.getByRole('button',{name:'Walls',exact:true}).click();const currentColour=await page.getByRole('textbox',{name:'HEX colour',exact:true}).inputValue();check('wall-colour-hydrates-after-trim-wall-change',currentColour==='#aaccbb',{expected:'#aaccbb',observed:currentColour});
    await page.getByRole('textbox',{name:'HEX colour',exact:true}).fill('#123abc');await page.getByRole('button',{name:'Paint selected wall',exact:true}).click();
    await waitForLibrary(page,l=>l.projects[0].present.floors[0].rooms[0].wallFaces[walls[1].id]?.colour==='#123abc');
    const after=await read(page),f=after.projects[0].present.floors[0];check('paint-one-shared-face-only',f.rooms[0].wallFaces[walls[1].id].colour==='#123abc'&&!f.rooms[1].wallFaces[walls[1].id],f.rooms.map(r=>({name:r.name,wallFaces:r.wallFaces})));
    await page.getByRole('button',{name:'Apply to room',exact:true}).click();await waitForLibrary(page,l=>{const f=l.projects[0].present.floors[0];return Object.values(f.rooms[0].wallFaces).length===4&&Object.values(f.rooms[0].wallFaces).every(v=>v.colour==='#123abc');});
    const whole=(await read(page)).projects[0].present.floors[0];check('whole-room-paint-stays-scoped',Object.values(whole.rooms[0].wallFaces).every(v=>v.colour==='#123abc')&&Object.keys(whole.rooms[1].wallFaces).length===0);run.wallScreenshot=await screenshot(page,'one-wall-paint');
    run.completed=true;
   }catch(e){run.failure=String(e);}finally{await context?.close();}
  }
  {
   const run={name:'connected-room-walk',checks:[]};report.runs.push(run);let context;
   try{
    const {project,floor,room}=setup('QA connected Walk'),shared=floor.walls.find(w=>w.faces.length===2),a=assets.find(a=>a.dimensionsMetres.width<.8&&a.dimensionsMetres.depth<.8&&a.dimensionsMetres.height<1.2);floor.rooms[1].floorFinish.id='slate';
    floor.openings.push({id:'qa-open-portal',wallId:shared.id,type:'open',offset:2,width:1.4,height:2.1,sill:0,hinge:'left',flip:false});if(a)floor.items.push(item(room,a));
    const opened=await open(browser,project,run);context=opened.context;const page=opened.page,check=(id,pass,observed)=>run.checks.push({id,pass:!!pass,observed});
    await page.getByRole('button',{name:'View Walk',exact:true}).click();await page.waitForFunction(()=>window.__oisSceneProbe?.().mode==='walk');
    const before=await read(page),probeBefore=await page.evaluate(()=>window.__oisSceneProbe());
    const canvas=await page.locator('canvas').first().boundingBox();
    await page.mouse.move(canvas.x+300,canvas.y+canvas.height*.45);await page.mouse.down();await page.mouse.move(canvas.x+300,canvas.y+canvas.height*.45+80,{steps:16});await page.mouse.up();
    run.beforeCrossingScreenshot=await screenshot(page,'walk-living-floor');
    for(let n=0;n<3;n++){await page.mouse.move(canvas.x+150,canvas.y+canvas.height*.55);await page.mouse.down();await page.mouse.move(canvas.x+5,canvas.y+canvas.height*.55,{steps:20});await page.mouse.up();}
    const probeAfter=await page.evaluate(()=>window.__oisSceneProbe()),label=await page.getByRole('button',{name:/^Choose room, current /}).getAttribute('aria-label');
    check('walk-crosses-real-portal-and-tracks-room',probeAfter.camera[0]>6&&label.includes('Kitchen'),{before:probeBefore.camera,after:probeAfter.camera,label});
    check('walk-hides-editor-actions',await page.getByRole('button',{name:'Furnish',exact:true}).count()===0&&await page.getByRole('button',{name:'Undo',exact:true}).count()===0);
    run.walkScreenshot=await screenshot(page,'walk-kitchen');
    await page.getByRole('button',{name:'View 3D',exact:true}).click();const after=await read(page);check('walk-preserves-project-and-lock-bytes',JSON.stringify(before.projects)===JSON.stringify(after.projects));
    run.completed=true;
   }catch(e){run.failure=String(e);}finally{await context?.close();}
  }
  {
   const run={name:'missing-revision-recovery',checks:[]};report.runs.push(run);let context;
   try{
    const {project,floor,room}=setup('QA missing revision'),a=assets[0],missing={...item(room,a,'qa-missing-model'),assetHash:'0'.repeat(64),x:2.5,z:2};floor.items.push(missing);
    const opened=await open(browser,project,run);context=opened.context;const page=opened.page,check=(id,pass,observed)=>run.checks.push({id,pass:!!pass,observed});
    await page.waitForFunction(()=>window.__oisSceneProbe?.().items.some(i=>i.id==='qa-missing-model'));
    const body=await page.locator('body').innerText();check('missing-revision-visible-notice',/needs its saved model revision/.test(body),body);
    const scene=await page.evaluate(()=>window.__oisSceneProbe()),target=scene.items.find(i=>i.id==='qa-missing-model'),canvas=await page.locator('canvas').first().boundingBox();await page.touchscreen.tap(canvas.x+target.x,canvas.y+target.y);
    check('missing-marker-selects-in-3d',await page.getByRole('button',{name:'Missing furniture details',exact:true}).count()===1);run.missingScreenshot=await screenshot(page,'missing-revision-3d');
    await page.getByRole('button',{name:'Missing furniture details',exact:true}).click();check('missing-recovery-has-intentional-delete',await page.getByRole('button',{name:'Delete unavailable furniture',exact:true}).count()===1);await page.getByRole('button',{name:'Close Furniture properties',exact:true}).click();
    await page.getByRole('button',{name:'View 2D',exact:true}).click();await page.waitForFunction(()=>!!window.__oisPlanProbe);
    const plan=await page.evaluate(()=>window.__oisPlanProbe()),point=plan.items.find(i=>i.id==='qa-missing-model'),box=(await page.locator('svg').evaluateAll(list=>list.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}))).sort((a,b)=>b.width*b.height-a.width*a.height)[0];
    await page.touchscreen.tap(box.x+point.x,box.y+point.y);const selected=await page.getByRole('button',{name:'Missing furniture details',exact:true}).count();check('missing-placement-selectable-in-2d',selected===1,{selected,gesture:await page.evaluate(()=>window.__oisPlanProbe().gesture)});run.planScreenshot=await screenshot(page,'missing-revision-2d');
    const saved=(await read(page)).projects[0].present.floors[0].items[0];check('missing-placement-preserves-transform-lock',saved.x===missing.x&&saved.z===missing.z&&saved.yaw===missing.yaw&&saved.locked===missing.locked&&saved.assetHash===missing.assetHash,saved);
    run.completed=true;
   }catch(e){run.failure=String(e);}finally{await context?.close();}
  }
 }finally{await browser.close();}
 report.storageOracle=oracleInfo;report.sources=sourceHashes();report.sourceChangedDuringRun=JSON.stringify(report.sourceBefore)!==JSON.stringify(report.sources);
 fs.writeFileSync(path.join(__dirname,'seeded-ui-web.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify(report,null,2)+'\n');
})().catch(e=>{report.harnessError=String(e);fs.writeFileSync(path.join(__dirname,'seeded-ui-web.json'),JSON.stringify(report,null,2)+'\n');process.stderr.write(e.stack+'\n');process.exitCode=1;});
