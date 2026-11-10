const {chromium}=require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {pathToFileURL}=require('node:url');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:736,height:1200},colorScheme:'light'});
 const errors=[];page.on('pageerror',e=>errors.push(e.stack||String(e)));
 await page.goto(pathToFileURL(path.join(__dirname,'phone-mockups-preview.html')).href);
 const frame=page.frameLocator('iframe');const phone=frame.locator('.preview-stage > .phone');await phone.waitFor();
 await fs.mkdir(path.join(__dirname,'screens'),{recursive:true});
 const checks=[];
 for(const name of ['projects','plan','finishes','catalog','placement','house','settings','upload','scan','doors','heights']){
  await frame.locator(`[data-screen="${name}"]`).click();
  await phone.screenshot({path:path.join(__dirname,'screens',name+'.png')});
  checks.push({screen:name,phone:await phone.boundingBox()});
 }
 await frame.locator('[data-screen="projects"]').click();
 const upload=phone.locator('[data-entry="upload"] .availability-badge'),scan=phone.locator('[data-entry="scan"] .availability-badge');
 const style=el=>{const s=getComputedStyle(el);return [el.textContent,s.padding,s.backgroundColor,s.fontSize,s.borderRadius].join('|')};
 if(await upload.evaluate(style)!==await scan.evaluate(style))throw Error('Coming soon badges are inconsistent');
 if(await phone.locator('.nav-bottom').count())throw Error('Old bottom navigation remains');
 if(/Build the plan|Make it yours|space, considered|Plan with clarity|belongs together|One look\. Your layout/.test(await frame.locator('#ois-phone-review').textContent()))throw Error('Rejected slogan remains');
 await phone.locator('[data-entry="plan"]').click();
 await phone.locator('[data-go="add"]').click();
 await phone.locator('[data-entry="catalog"]').click();
 if(!await phone.locator('h2').innerText().then(t=>t==='Furniture sets'))throw Error('Contextual furniture flow failed');
 await frame.locator('[data-screen="doors"]').click();
 for(const kind of ['swing','double','sliding','pocket','opening']){
  await phone.locator(`[data-door-type="${kind}"]`).click();
  if(await phone.locator(`[data-door-type="${kind}"]`).getAttribute('aria-pressed')!=='true')throw Error('Door type selection failed');
  const values=await phone.locator('.door-clearances').innerText();
  if(!values.includes('Living room:')||!values.includes('Kitchen:'))throw Error('Door dimensions missing a room face');
 }
 await phone.locator('#door-offset').fill('1.8');
 await phone.locator('#door-offset').dispatchEvent('input');
 if(!await phone.locator('.door-clearances').innerText().then(t=>t.includes('1.80')))throw Error('Live door dimension feedback failed');
 await frame.locator('[data-screen="heights"]').click();
 await phone.locator('#ceiling-height').fill('2.9');await phone.locator('#ceiling-height').dispatchEvent('change');
 if(!await phone.locator('.height-canvas').innerText().then(t=>t.includes('2.90 m')&&t.includes('2.40 m')))throw Error('Adjacent ceiling height changed unexpectedly');
 await phone.locator('#room-select').selectOption('Kitchen');
 if(await phone.locator('#ceiling-height').inputValue()!=='2.4')throw Error('Per-room ceiling value not retained');
 await phone.locator('#room-select').selectOption('Living room');
 await frame.locator('[data-screen="catalog"]').click();
 for(let i=0;i<5;i++){
  await frame.locator(`[data-set="${i}"]`).click();
  if(await frame.locator('.piece-row').count()!==5)throw Error('Missing furniture pieces');
  await frame.locator('[data-go="catalog"]').first().click();
 }
 await frame.locator('[data-screen="placement"]').click();
 const before=await frame.locator('.move-feedback').innerText();
 await frame.locator('[data-nudge="right"]').click();
 if(before===await frame.locator('.move-feedback').innerText())throw Error('Nudge did not update position');
 await frame.locator('[data-action="rotate"]').click();
 if(!await frame.locator('.move-feedback').innerText().then(t=>t.includes('15°')))throw Error('Grid rotation missing');
 await frame.locator('[data-screen="settings"]').click();
 await frame.locator('[data-mode="free"]').click();
 await frame.locator('[data-screen="placement"]').click();
 if(!await frame.locator('.pill').first().innerText().then(t=>t.includes('Free move')))throw Error('Movement preference not propagated');
 await frame.locator('[data-screen="finishes"]').click();
 await frame.locator('button[data-surface="floor"]').click();
 await frame.locator('[data-material="1"]').click();
 if(!await frame.locator('[data-material="1"]').getAttribute('aria-pressed').then(v=>v==='true'))throw Error('Finish selection failed');
 await frame.locator('button[data-surface="wall"]').click();
 await frame.locator('[data-material="2"]').click();
 await frame.locator('[data-action="next-wall"]').click();
 if(!await frame.locator('[data-material="0"]').getAttribute('aria-pressed').then(v=>v==='true'))throw Error('Wall finish leaked to adjacent wall');
 await frame.locator('[data-action="next-wall"]').click();
 if(!await frame.locator('[data-material="2"]').getAttribute('aria-pressed').then(v=>v==='true'))throw Error('Independent wall finish was not retained');
 await frame.locator('button[data-surface="floor"]').click();
 if(!await frame.locator('[data-material="1"]').getAttribute('aria-pressed').then(v=>v==='true'))throw Error('Floor finish was not retained');
 await frame.locator('[data-screen="placement"]').click();
 const dragBefore=await frame.locator('.move-feedback').innerText();
 const piece=await frame.locator('[data-sofa]').boundingBox();
 await page.mouse.move(piece.x+piece.width/2,piece.y+piece.height/2);
 await page.mouse.down();await page.mouse.move(piece.x+piece.width/2+20,piece.y+piece.height/2+16,{steps:4});await page.mouse.up();
 if(dragBefore===await frame.locator('.move-feedback').innerText())throw Error('Furniture drag did not update placement');
 for(const width of [320,390,736])for(const colorScheme of ['light','dark']){
  await page.setViewportSize({width,height:1250});await page.emulateMedia({colorScheme});
  for(const name of ['projects','plan','finishes','catalog','placement','house','settings','upload','scan','doors','heights']){
   await frame.locator(`[data-screen="${name}"]`).click();
   const over=await frame.locator('#ois-phone-review').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));
   if(over.scroll>over.width+1)throw Error(`Horizontal overflow ${name} ${width}: ${JSON.stringify(over)}`);
  }
  if(width===320)await phone.screenshot({path:path.join(__dirname,'screens','narrow-'+colorScheme+'.png')});
  await frame.locator('[data-screen="logos"]').click();
  for(const label of ['Compact header','Centered header','Project cover']){
   const variant=frame.locator(`[data-variant="${label}"]`);
   // The runtime owns carousel controls; selecting its named option exercises actual review navigation.
   await frame.locator('.viz-carousel-picker > summary').click();
   await frame.locator('.viz-carousel-options').getByRole('button',{name:label,exact:true}).click();
   await variant.locator('.phone').waitFor({state:'visible'});
   const bounds=await variant.locator('.phone').boundingBox();
   if(bounds.height>1100)throw Error('Logo variant has unintended excessive height');
   if(await variant.locator('.phone').evaluate(e=>e.scrollWidth>e.clientWidth+1))throw Error('Logo variant overflows horizontally');
   if(width===736&&colorScheme==='light')await variant.locator('.phone').screenshot({path:path.join(__dirname,'screens','logo-'+label.toLowerCase().replaceAll(' ','-')+'.png')});
  }
 }
 if(errors.length)throw Error(errors.join('\n'));
 await fs.writeFile(path.join(__dirname,'mockup-checks.json'),JSON.stringify({errors,checks,validated:['11 screens at 320/390/736 in light and dark','Matching availability badges and no rejected slogans','Contextual Add flow without old tab bar','5 door types with live dimensions on both wall faces','Independent per-room ceiling heights','3 logo treatments','All 5 furniture sets with 5 pieces each','Nudge, rotation and drag feedback','Grid/free preference propagation','Independent wall and floor material selection'],date:'2026-11-08'},null,2));
 await browser.close();console.log('Mockup interaction and responsive checks passed.');
})().catch(e=>{console.error(e);process.exit(1)});
