const {chromium}=require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
const {load}=require('./probe-domain.cjs'),p=load('src/domain/project.ts'),g=load('src/domain/geometry.ts'),s=load('src/domain/persistence.ts'),assets=load('src/catalogue/assets.json');
const {readLibrary,waitForLibrary,oracleInfo}=require('./web-storage.cjs');
const baseURL=process.env.OIS_QA_URL??'http://localhost:8081';
const report={timestamp:new Date().toISOString(),baseURL,storageOracle:oracleInfo,evidence:'Isolated Expo web UI; plan taps derive from actual rendered SVG edges',checks:[],errors:[],consoleErrors:[]};
const check=(id,pass,observed)=>report.checks.push({id,pass:!!pass,observed});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const project=p.makeProject('living',6,5);project.name='QA shared door workflow';const f=project.floors[0],neighbour=p.makeRoom('kitchen','Kitchen',g.shapePolygon('rectangle',4,5,{x:6,z:0}));f.rooms.push(neighbour);f.walls=g.rebuildWalls(f.rooms);
  const library={version:1,projects:[{past:[],present:project,future:[]}],activeId:project.id,favourites:[],recent:[],settings:{unit:'m',grid:true,quickMove:true,appearance:'light'},lastDoor:{type:'single',width:.9,height:2.1,hinge:'left',flip:false,repeat:true}},raw=s.encode(library);s.decode(raw);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();await context.addInitScript(raw=>{if(localStorage.getItem('ois.library.v1')===null)localStorage.setItem('ois.library.v1',raw);},raw);
  page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text().slice(0,1500));});
  const read=()=>readLibrary(page);
  const shot=async name=>{await page.screenshot({path:path.join(__dirname,'door-'+name+'.png')});};
  const tapEdge=async(index,fraction=.35)=>{const target=await page.locator('svg').evaluateAll((svgs,{index,fraction})=>{
   const svg=[...svgs].sort((a,b)=>b.getBoundingClientRect().width*b.getBoundingClientRect().height-a.getBoundingClientRect().width*a.getBoundingClientRect().height)[0],box=svg.getBoundingClientRect(),polygon=svg.querySelector('polygon');
   if(!polygon)throw Error('No actual room polygon found');const pts=polygon.getAttribute('points').trim().split(/[ ,]+/).map(Number),points=[];for(let n=0;n<pts.length;n+=2)points.push({x:pts[n],y:pts[n+1]});const a=points[index],b=points[(index+1)%points.length];return{x:box.x+a.x+(b.x-a.x)*fraction,y:box.y+a.y+(b.y-a.y)*fraction,points};
  },{index,fraction});await page.touchscreen.tap(target.x,target.y);await page.waitForTimeout(120);(report.tapEvents??=[]).push({target,probe:await page.evaluate(()=>window.__oisPlanProbe?.()),body:(await page.locator('body').innerText()).slice(-1300),openings:(await read()).projects[0].present.floors[0].openings.length});return target;};
  try{
   const response=await page.goto(baseURL,{waitUntil:'domcontentloaded',timeout:45000});if(response.status()>=500)throw Error('Preview HTTP'+response.status());await page.getByRole('button',{name:'Open '+project.name,exact:true}).click({timeout:45000});
   await page.getByRole('button',{name:'Build',exact:true}).click();await page.getByRole('button',{name:'Doors and openings',exact:true}).click();await page.getByRole('button',{name:'Pocket sliding',exact:true}).click();await page.getByRole('button',{name:'Place on floor plan',exact:true}).click();
   report.pocketTap=await tapEdge(1);await page.waitForTimeout(400);const pocketBody=await page.locator('body').innerText();
   const pocketCount=(await read()).projects[0].present.floors[0].openings.length,visibleActions=await page.getByRole('button').evaluateAll(list=>list.map(el=>el.getAttribute('aria-label')||el.textContent));
   check('pocket-precondition-has-in-place-resolution',pocketCount>0||visibleActions.some(label=>/wall.*(thick|15)|15.*wall/i.test(label)),{pocketCount,body:pocketBody,visibleActions});await shot('pocket-precondition');
   const thicken=page.getByRole('button',{name:'Use 15 cm thickness for this wall',exact:true});
   if(await thicken.count()){
    await thicken.click();await tapEdge(1);await waitForLibrary(page,l=>l.projects[0].present.floors[0].openings.some(o=>o.type==='pocket'));
    const body=await page.locator('body').innerText();check('pocket-contextual-resolution-places-real-opening',true);check('successful-pocket-correction-clears-stale-error',!/Pocket doors need a ≥15 cm/.test(body),body);
    await page.getByRole('button',{name:'Last opening',exact:true}).click();await page.getByRole('button',{name:'Delete opening',exact:true}).click();
   }else await page.getByRole('button',{name:'Done',exact:true}).click();
   if(await page.getByRole('button',{name:'Dismiss message',exact:true}).count())await page.getByRole('button',{name:'Dismiss message',exact:true}).click();
   await page.getByRole('button',{name:'Build',exact:true}).click();await page.getByRole('button',{name:'Doors and openings',exact:true}).click();await page.getByRole('button',{name:'Single swing',exact:true}).click();await page.getByRole('button',{name:'Place on floor plan',exact:true}).click();
   await tapEdge(1);await waitForLibrary(page,l=>l.projects[0].present.floors[0].openings.length===1);
   const first=(await read()).projects[0].present.floors[0],opening=first.openings[0],chains=g.openingDimensions(first,opening),expected=g.measure(chains[0].before,'m'),expectedAfter=g.measure(chains[0].after,'m');
   const svgText=await page.locator('svg text').allTextContents();check('both-face-corner-chains-present-during-placement',svgText.includes(expected)&&svgText.includes(expectedAfter)&&svgText.some(t=>t.includes('Kitchen')),{svgText,expected,expectedAfter,chains});await shot('shared-placement-dimensions');
   const annotationGeometry=await page.locator('svg').evaluateAll(svgs=>{const svg=[...svgs].sort((a,b)=>b.getBoundingClientRect().width*b.getBoundingClientRect().height-a.getBoundingClientRect().width*a.getBoundingClientRect().height)[0],b=svg.getBoundingClientRect(),texts=[];for(const group of svg.querySelectorAll('g')){const direct=[...group.children].filter(el=>el.tagName.toLowerCase()==='text');if(direct.length!==4)continue;for(const el of direct){const r=el.getBoundingClientRect();texts.push({text:el.textContent,box:{x:r.x,y:r.y,width:r.width,height:r.height},insideCanvas:r.left>=b.left-1&&r.top>=b.top-1&&r.right<=Math.min(b.right,innerWidth)+1&&r.bottom<=Math.min(b.bottom,innerHeight)+1});}}return{canvas:{x:b.x,y:b.y,width:b.width,height:b.height},texts};});check('both-face-annotations-fit-canvas',annotationGeometry.texts.length===8&&annotationGeometry.texts.every(t=>t.insideCanvas),annotationGeometry);
   await tapEdge(3);await waitForLibrary(page,l=>l.projects[0].present.floors[0].openings.length===2);
   check('repeat-door-stays-active',await page.getByRole('button',{name:'Done',exact:true}).count()===1);
   await page.getByRole('button',{name:'Undo',exact:true}).click();await waitForLibrary(page,l=>l.projects[0].present.floors[0].openings.length===1);check('undo-removes-one-repeat-door',true);
   const last=page.getByRole('button',{name:'Last opening',exact:true});
   if(await last.isEnabled()){await last.click();const body=await page.locator('body').innerText();check('last-opening-after-undo-points-to-existing-opening',await page.getByRole('textbox',{name:'Offset from wall start (m)',exact:true}).count()===1,{body});await shot('last-opening-after-undo');await page.getByRole('button',{name:'Close Opening',exact:true}).click();}else check('last-opening-after-undo-points-to-existing-opening',true,{disabledForRemovedSelection:true});
   await page.getByRole('button',{name:'Redo',exact:true}).click();await waitForLibrary(page,l=>l.projects[0].present.floors[0].openings.length===2);check('redo-restores-one-repeat-door',true);
   report.completed=true;
  }catch(e){report.failure=String(e);report.body=(await page.locator('body').innerText().catch(()=>'')).slice(0,5000);await shot('failure').catch(()=>{});}
  await context.close();
 }finally{await browser.close();}
 report.passed=report.checks.filter(c=>c.pass).length;report.failed=report.checks.filter(c=>!c.pass).length;
 fs.writeFileSync(path.join(__dirname,'door-ui-web.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify(report,null,2)+'\n');
})().catch(e=>{report.harnessError=String(e);fs.writeFileSync(path.join(__dirname,'door-ui-web.json'),JSON.stringify(report,null,2)+'\n');process.stderr.write(e.stack+'\n');process.exitCode=1;});
