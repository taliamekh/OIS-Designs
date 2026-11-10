const {chromium}=require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),tag=process.argv[2]||'r1',out=path.join(root,'evidence/browser-'+tag);
if(fs.existsSync(out))throw Error('Use a new immutable evidence revision');fs.mkdirSync(out,{recursive:true});
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let browser;
(async()=>{
 browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:8772');await page.waitForFunction(()=>window.spatialReview?.ready,{timeout:90000});
 async function check(name,expected,photo=true){
  await page.waitForTimeout(160);
  const result=await page.evaluate(()=>{
   const qa=window.spatialReview,s=qa.snapshot(),box=s.plan.displayBounds,cam=qa.camera;
   const corners=box?[box.min.x,box.max.x].flatMap(x=>[box.min.y,box.max.y].flatMap(y=>[box.min.z,box.max.z].map(z=>({x,y,z})))):[];
   const projection=corners.map(p=>{const v=cam.position.clone().set(p.x,p.y,p.z).project(cam);return [v.x,v.y,v.z]});
   // Independent real vertex bounds, skipping every hidden ancestor (Box3 itself does not do that).
   let vertexCount=0;const minimum=[Infinity,Infinity,Infinity],maximum=[-Infinity,-Infinity,-Infinity];
   qa.scene.traverse(o=>{if(!o.isMesh||!o.userData.itemId)return;let visible=true;for(let p=o;p;p=p.parent)if(!p.visible)visible=false;if(!visible)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=cam.position.clone().set(a.getX(i),a.getY(i),a.getZ(i)).applyMatrix4(o.matrixWorld);vertexCount++;for(const [k,value] of [v.x,v.y,v.z].entries()){minimum[k]=Math.min(minimum[k],value);maximum[k]=Math.max(maximum[k],value)}}});
   const vertexBounds=vertexCount?{min:minimum,max:maximum,vertexCount}:null;
   return {state:s.state,projectUnchanged:s.projectUnchanged,loadedModels:s.loadedModels,visibleModels:s.visibleModels,memory:s.memory,render:s.render,bank:{uniqueTextures:s.bank.uniqueTextures,rootLeases:s.bank.rootLeases},canEdit:s.plan.canEdit,readOnlyReason:s.plan.readOnlyReason,displayBounds:box,canonicalBounds:s.plan.canonicalBounds,projection,vertexBounds,camera:s.camera,wallCounts:s.plan.floors.map(f=>({floor:f.id,visible:f.walls.filter(w=>w.visible).length,total:f.walls.length})),roomSelectValue:document.querySelector('#room').value,horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(result.roomSelectValue,result.state.roomId,name+' room context selector');assert.equal(result.projectUnchanged,true,name+' project bytes');assert.equal(result.loadedModels,40,name+' model load');assert.equal(result.horizontalOverflow,false,name+' horizontal overflow');
  for(const [k,v] of Object.entries(expected))assert.deepEqual(result[k],v,name+' '+k);
  if(!result.state.interior)for(const p of result.projection)assert.ok(Math.abs(p[0])<.99&&Math.abs(p[1])<.99&&p[2]>-1&&p[2]<1,name+' frustum containment '+p);
  if(result.vertexBounds){const b=result.displayBounds;for(const [i,k] of ['x','y','z'].entries()){assert.ok(result.vertexBounds.min[i]>=b.min[k]-.0001,name+' conservative min '+k);assert.ok(result.vertexBounds.max[i]<=b.max[k]+.0001,name+' conservative max '+k)}}
  checks.push({name,...result});if(photo)await page.screenshot({path:path.join(out,name+'.png')});
 }
 await check('desktop-room',{visibleModels:8,canEdit:true});
 await page.getByRole('button',{name:'Views',exact:true}).click();await page.getByRole('button',{name:'Floor',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click();await check('desktop-floor',{visibleModels:21,canEdit:true});
 await page.getByRole('button',{name:'Views',exact:true}).click();await page.getByRole('button',{name:'House',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click();await check('desktop-house',{visibleModels:40,canEdit:false,readOnlyReason:'house-overview'});
 for(const preset of ['top','front','perspective']){await page.getByRole('button',{name:'Views',exact:true}).click();await page.getByRole('button',{name:preset==='top'?'Top':preset==='front'?'Front':'Perspective',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click();await check('desktop-house-'+preset,{visibleModels:40,canEdit:false})}
 await page.getByRole('button',{name:'Views',exact:true}).click();await page.getByLabel('Separate floors',{exact:true}).check();await page.getByRole('button',{name:'Done',exact:true}).click();await check('desktop-separated',{visibleModels:40,canEdit:false});
 await page.getByRole('button',{name:'Views',exact:true}).click();await page.getByLabel('Separate floors',{exact:true}).uncheck();await page.getByRole('button',{name:'Solid',exact:true}).click();await page.getByLabel('Show ceilings',{exact:true}).check();await page.getByRole('button',{name:'Done',exact:true}).click();await check('desktop-solid-ceilings',{visibleModels:40,canEdit:false});
 await page.getByLabel('Current floor',{exact:true}).selectOption('upper');await page.getByLabel('Current room',{exact:true}).selectOption('bedroom');await page.evaluate(()=>window.spatialReview.update({shell:'cutaway',ceilings:false}));await check('desktop-upstairs-bedroom',{visibleModels:9,canEdit:true});
 await page.getByLabel('Current floor',{exact:true}).selectOption('ground');await page.getByLabel('Current room',{exact:true}).selectOption('kitchen');await check('desktop-return-kitchen',{visibleModels:7,canEdit:true});
 await page.getByRole('button',{name:'Interior',exact:true}).click();await check('desktop-interior',{visibleModels:21,canEdit:false,readOnlyReason:'walk'});await page.getByRole('button',{name:'Exit interior',exact:true}).click();
 await page.evaluate(()=>window.spatialReview.update({scope:'house',shell:'cutaway',ceilings:false}));await check('warm-all-models',{visibleModels:40,canEdit:false},false);
 const before=checks.at(-1).memory;
 await page.evaluate(async()=>{const qa=window.spatialReview;for(let i=0;i<40;i++){qa.update({scope:i%3===0?'room':i%3===1?'floor':'house',activeFloorId:i%2?'upper':'ground',roomId:i%2?'bedroom':'living',separated:i%3===2&&i%2===1});await new Promise(r=>requestAnimationFrame(r))}qa.update({scope:'house',separated:false})});
 await check('after-forty-view-switches',{visibleModels:40,canEdit:false},false);assert.deepEqual(checks.at(-1).memory,before,'Resource counters stay bounded after warm-up');
 for(const [w,h] of [[390,844],[320,640]]){
  await page.setViewportSize({width:w,height:h});await check(`phone-${w}-house`,{visibleModels:40,canEdit:false});
  await page.getByRole('button',{name:'Views',exact:true}).click();await page.getByLabel('Large text review',{exact:true}).check();await check(`phone-${w}-large-menu`,{canEdit:false});
  const layout=await page.evaluate(()=>{const s=document.querySelector('#sheet').getBoundingClientRect();return {x:s.x,y:s.y,right:s.right,bottom:s.bottom,width:innerWidth,height:innerHeight,scrollable:document.querySelector('#sheet').scrollHeight>document.querySelector('#sheet').clientHeight}});
  assert.ok(layout.x>=0&&layout.y>=0&&layout.right<=w&&layout.bottom<=h,'Large-text sheet stays inside screen');checks.at(-1).sheet=layout;
  await page.getByLabel('Large text review',{exact:true}).uncheck();await page.getByRole('button',{name:'Done',exact:true}).click();
 }
 await page.evaluate(()=>window.spatialReview.disposeAll());const disposed=await page.evaluate(()=>window.spatialReview.snapshot());
 assert.equal(disposed.bank.uniqueTextures,0);assert.equal(disposed.bank.rootLeases,0);assert.equal(disposed.memory.textures,0);assert.equal(disposed.memory.geometries,0);assert.deepEqual(errors,[]);
 const report={visibilityMeaning:'visibleModels counts enabled scene roots; walls/floors may physically occlude their pixels',timeUtc:new Date().toISOString(),sourceSha256:{viewPlan:sha(path.join(root,'src/viewPlan.ts')),viewer:sha(path.join(root,'review/viewer.js')),html:sha(path.join(root,'review/index.html')),fixture:sha(path.join(root,'fixtures/six-room-house.json'))},checks,errors,disposed:{memory:disposed.memory,bank:disposed.bank},scope:'Actual installed Edge browser WebGL/DOM review. Authored six-room/two-floor/40-model fixture; not Expo/native integration or physical phone validation.'};
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:checks.length,errors,disposed:report.disposed},null,2));await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
