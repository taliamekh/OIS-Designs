const {chromium}=require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'catalogue-v2/browser-texture-bank-v0.5.0');fs.mkdirSync(out,{recursive:true});
const assets=fs.readdirSync(path.join(root,'catalogue-v2/staged/v0.5.0')).filter(x=>x.endsWith('.json')).map(x=>JSON.parse(fs.readFileSync(path.join(root,'catalogue-v2/staged/v0.5.0',x)))).filter(a=>a.countEligible).slice(0,40);
if(assets.length!==40)throw Error('Requires forty actual staged models');
const manifest={assets,counts:{internallyAcceptedDistinctDesigns:0},scope:'Frozen desktop browser candidate fixture, no acceptance/native implication'};
const fixturePath=path.join(out,'fixture.json');if(fs.existsSync(fixturePath))throw Error('Frozen fixture already exists');fs.writeFileSync(fixturePath,JSON.stringify(manifest,null,2));
let browser;
(async()=>{browser=await chromium.launch({headless:true,channel:'msedge'});const reports=[];
 for(const bank of [false,true]){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('http://127.0.0.1:8768/?manifest=/catalogue-v2/browser-texture-bank-v0.5.0/fixture.json'+(bank?'&bank=1':''),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.oisAssetReview?.ready);
  await page.evaluate(async()=>{const qa=window.oisAssetReview;await qa.fixture()});await page.waitForTimeout(700);
  await page.screenshot({path:path.join(out,bank?'bank.png':'embedded.png')});
  const fixture=await page.evaluate(()=>({snapshot:window.oisAssetReview.snapshot(),bank:window.oisAssetReview.textureBank?.snapshot()}));
  const swaps=await page.evaluate(()=>{const qa=window.oisAssetReview;return qa.swapProbe(qa.manifest.assets.slice(0,8).map(a=>a.id),40)});
  await page.evaluate(()=>window.oisAssetReview.disposeCurrent());await page.waitForTimeout(100);
  const disposed=await page.evaluate(()=>({snapshot:window.oisAssetReview.snapshot(),bank:window.oisAssetReview.textureBank?.snapshot()}));reports.push({bank,errors,fixture,disposed,swaps});await page.close();
 }
 const report={timeUtc:new Date().toISOString(),scope:'Installed Edge headless WebGL browser-only; renderer counters are not GPU byte/device measurements',fixtureSha256:crypto.createHash('sha256').update(fs.readFileSync(fixturePath)).digest('hex'),models:assets.length,reports};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(reports.map(r=>({bank:r.bank,errors:r.errors,fixture:r.fixture.snapshot.memory,bankState:r.fixture.bank&&{uniqueTextures:r.fixture.bank.uniqueTextures,leases:r.fixture.bank.rootLeases},disposed:r.disposed}))));await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
