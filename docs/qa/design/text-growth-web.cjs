const {chromium}=require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
const report={timestamp:new Date().toISOString(),evidence:'Explicit DOM font-size AND line-height growth in isolated Expo WEB contexts. This is browser layout stress, NOT native font scaling or an accessibility pass.',runs:[]};
async function grow(page,factor){return page.evaluate(factor=>{
 window.__qaTextBases??=new WeakMap();const changes=[];
 for(const el of document.querySelectorAll('body *')){
  if(['STYLE','SCRIPT','NOSCRIPT','PATH'].includes(el.tagName))continue;
  const direct=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()),input=['INPUT','TEXTAREA'].includes(el.tagName);if(!direct&&!input)continue;
  const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')continue;
  const base=window.__qaTextBases.get(el)??{size:parseFloat(cs.fontSize),line:cs.lineHeight==='normal'?parseFloat(cs.fontSize)*1.25:parseFloat(cs.lineHeight)};
  if(!Number.isFinite(base.size)||!Number.isFinite(base.line))continue;window.__qaTextBases.set(el,base);
  el.style.setProperty('font-size',base.size*factor+'px','important');el.style.setProperty('line-height',base.line*factor+'px','important');
  changes.push({text:(el.textContent||el.getAttribute('aria-label')||'').slice(0,70),before:base.size,after:parseFloat(getComputedStyle(el).fontSize)});
 }
 return {nodes:changes.length,actuallyGrew:changes.some(v=>v.after>v.before*1.4),samples:changes.slice(0,15)};
},factor);}
async function actionGeometry(locator){await locator.scrollIntoViewIfNeeded();return locator.evaluate(el=>{
 const r=el.getBoundingClientRect(),clip={left:0,top:0,right:innerWidth,bottom:innerHeight};
 for(let parent=el.parentElement;parent;parent=parent.parentElement){const cs=getComputedStyle(parent),b=parent.getBoundingClientRect();if(['auto','scroll','hidden','clip'].includes(cs.overflowX)){clip.left=Math.max(clip.left,b.left);clip.right=Math.min(clip.right,b.right);}if(['auto','scroll','hidden','clip'].includes(cs.overflowY)){clip.top=Math.max(clip.top,b.top);clip.bottom=Math.min(clip.bottom,b.bottom);}}
 const visible=Math.max(0,Math.min(r.right,clip.right)-Math.max(r.left,clip.left))*Math.max(0,Math.min(r.bottom,clip.bottom)-Math.max(r.top,clip.top))/(r.width*r.height||1);
 const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),textBoxes=[],splitWords=[];let node;while(node=walker.nextNode())if(node.textContent.trim()){const range=document.createRange();range.selectNodeContents(node);for(const b of range.getClientRects())textBoxes.push({text:node.textContent.trim(),x:b.x,y:b.y,width:b.width,height:b.height,outsideControl:b.left<r.left-2||b.right>r.right+2||b.top<r.top-2||b.bottom>r.bottom+2,outsideClip:b.left<clip.left-2||b.right>clip.right+2||b.top<clip.top-2||b.bottom>clip.bottom+2});for(const word of node.textContent.matchAll(/\S+/g)){range.setStart(node,word.index);range.setEnd(node,word.index+word[0].length);const boxes=[...range.getClientRects()].filter(b=>b.width>0);if(boxes.length>1)splitWords.push({word:word[0],fragments:boxes.length});}}
 return {label:el.getAttribute('aria-label'),box:{x:r.x,y:r.y,width:r.width,height:r.height},visibleFraction:visible,textBoxes,splitWords};
});}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const factors=process.argv[2]?[Number(process.argv[2])]:[1.5,2];if(factors.some(v=>![1.5,2].includes(v)))throw Error('Use text growth1.5 or2.');
 try{for(const factor of factors){
  const run={width:320,height:568,scheme:'dark',factor,cases:[],screens:[],pageErrors:[],consoleErrors:[]};report.runs.push(run);
  const context=await browser.newContext({viewport:{width:320,height:568},colorScheme:'dark',isMobile:true,hasTouch:true}),page=await context.newPage();let stage='boot';
  page.on('pageerror',e=>run.pageErrors.push({stage,message:String(e)}));page.on('console',m=>{if(m.type()==='error')run.consoleErrors.push({stage,message:m.text().slice(0,1500)});});
  const screen=async(name,actions=[])=>{stage=name;const growth=await grow(page,factor),geometry=[];for(const label of actions)try{geometry.push(await actionGeometry(page.getByRole('button',{name:label,exact:true})));}catch(e){geometry.push({label,error:String(e)});}
   const overflow=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth})),file='text-'+factor+'-'+name+'.png';await page.screenshot({path:path.join(__dirname,file)});run.screens.push(file);run.cases.push({name,growth,overflow,geometry});};
  try{
   await page.goto('http://localhost:8081',{timeout:45000,waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Create room or floor plan',exact:true}).waitFor({timeout:45000});
   await screen('projects',['Create room or floor plan','Upload floor plan','Scan Room']);
   await page.getByRole('button',{name:'Create room or floor plan',exact:true}).click();await page.getByRole('button',{name:'Bedroom',exact:true}).click();await page.getByRole('button',{name:'Rectangle',exact:true}).click();await screen('creation-dimensions',['Create room']);
   await page.getByRole('button',{name:'Create room',exact:true}).click();await page.getByRole('button',{name:'Build',exact:true}).waitFor();
   await page.getByRole('button',{name:'Build',exact:true}).click();await page.getByRole('button',{name:'Room dimensions',exact:true}).click();await screen('room-dimensions',['Apply dimensions','Close Room dimensions']);
   await page.getByRole('button',{name:'Close Room dimensions',exact:true}).click();await page.getByRole('button',{name:'Furnish',exact:true}).click();await page.getByRole('button',{name:'Furniture filters',exact:true}).click();await screen('catalogue-filters',['Show results','Close Furniture']);
   await page.getByRole('button',{name:'Close Furniture',exact:true}).click();await page.getByRole('button',{name:'Surfaces',exact:true}).click();await page.getByRole('button',{name:'Walls',exact:true}).click();await screen('wall-surfaces',['Paint selected wall','Apply to room','Close Surfaces']);
   await page.getByRole('button',{name:'Close Surfaces',exact:true}).click();await page.getByRole('button',{name:'Build',exact:true}).click();await page.getByRole('button',{name:'Doors and openings',exact:true}).click();await screen('door-picker',['Place on floor plan','Close Doors']);
   await page.getByRole('button',{name:'Place on floor plan',exact:true}).click();
   const svgBoxes=await page.locator('svg').evaluateAll(list=>list.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}));
   const plan=svgBoxes.sort((a,b)=>b.width*b.height-a.width*a.height)[0];
   await page.waitForFunction(()=>!!window.__oisPlanProbe,null,{timeout:5000});
   const camera=await page.evaluate(()=>window.__oisPlanProbe());
   const tap={x:plan.x+camera.ox+2.4*camera.scale,y:plan.y+camera.oz+3.8*camera.scale};
   await page.touchscreen.tap(tap.x,tap.y);
   const last=page.getByRole('button',{name:'Last opening',exact:true});
   try{await page.waitForFunction(()=>{const el=document.querySelector('[aria-label="Last opening"]');return el&&el.getAttribute('aria-disabled')!=='true';},null,{timeout:5000});}catch{}
   run.doorPlacement={tap,plan,camera,lastEnabled:await last.isEnabled(),gesture:await page.evaluate(()=>window.__oisPlanProbe?.().gesture),body:(await page.locator('body').innerText()).slice(-1800)};
   if(run.doorPlacement.lastEnabled){await last.click();await screen('door-properties',['Apply opening','Delete opening','Close Opening']);}
   run.completed=true;
  }catch(e){run.failure=String(e);run.body=(await page.locator('body').innerText().catch(()=>'')).slice(0,5000);await page.screenshot({path:path.join(__dirname,'text-'+factor+'-failure.png')}).catch(()=>{});}
  await context.close();
 }}finally{await browser.close();}
 for(const run of report.runs){run.findings=run.cases.flatMap(c=>[...(c.overflow.document>c.overflow.viewport+1?[{screen:c.name,type:'page-horizontal-overflow',observed:c.overflow}]:[]),...c.geometry.filter(g=>g.error||g.visibleFraction<.25||g.textBoxes?.some(t=>t.outsideControl||t.outsideClip)).map(g=>({screen:c.name,type:'critical-label-clipped-or-action-unreachable',observed:g})),...c.geometry.filter(g=>g.splitWords?.length).map(g=>({screen:c.name,type:'short-label-words-fragmented-by-narrow-layout',observed:g}))]);run.partialControlDiagnostics=run.cases.flatMap(c=>c.geometry.filter(g=>!g.error&&g.visibleFraction>=.25&&g.visibleFraction<.95&&!g.textBoxes.some(t=>t.outsideControl||t.outsideClip)).map(g=>({screen:c.name,label:g.label,visibleFraction:g.visibleFraction,note:'Control background partly outside scroll viewport, but labels visible/action reachable; not an inaccessible-control finding.'})));}
 fs.writeFileSync(path.join(__dirname,process.argv[2]?'text-growth-'+process.argv[2]+'-latest.json':'text-growth-web.json'),JSON.stringify(report,null,2)+'\n');
 process.stdout.write(JSON.stringify({timestamp:report.timestamp,evidence:report.evidence,runs:report.runs.map(r=>({factor:r.factor,completed:r.completed,failure:r.failure,cases:r.cases.length,findings:r.findings.map(f=>({screen:f.screen,type:f.type,label:f.observed?.label,splitWords:f.observed?.splitWords})),partialControlDiagnostics:r.partialControlDiagnostics,doorPlacement:r.doorPlacement,pageErrors:r.pageErrors,consoleErrors:r.consoleErrors}))},null,2)+'\n');
})().catch(e=>{report.harnessError=String(e);fs.writeFileSync(path.join(__dirname,'text-growth-web.json'),JSON.stringify(report,null,2)+'\n');process.stderr.write(e.stack+'\n');process.exitCode=1;});
