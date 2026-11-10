const {chromium}=require('C:/Users/talia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.goto('https://oisdesigns.com/',{waitUntil:'domcontentloaded'});
  console.log(JSON.stringify(await page.evaluate(()=>({
    bodyFont:getComputedStyle(document.body).fontFamily,
    headingFont:getComputedStyle(document.querySelector('h1')).fontFamily,
    colors:[...document.querySelectorAll('a,header,h1,section')].filter(e=>e.textContent.includes('Book Strategic')).slice(0,10).map(e=>({tag:e.tagName,color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor,font:getComputedStyle(e).fontFamily})),
    logo:document.querySelector('img[alt="OIS Designs logo"]').src
  })),null,2));
  await page.screenshot({path:path.join(__dirname,'ois-home.png')});
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
