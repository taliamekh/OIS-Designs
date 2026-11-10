const fs=require('node:fs'),path=require('node:path'),file=path.join(__dirname,'wall-clearance-web.cjs');let source=fs.readFileSync(file,'utf8');
source=source.replace("{latestFrozenUI}=require('./frozen-ui-context.cjs');","{appFrozenUI}=require('./app-frozen-context.cjs');let ownedUI;");
source=source.replace('const frozen=await latestFrozenUI();','const frozen=ownedUI=await appFrozenUI();');
source=source.replace('wallInnerZ=.12/2;','wallInnerZ=.12/2,requiredGap=wallInnerZ+room.trim.projection;');
source=source.replace('pass:minZ>=wallInnerZ-1e-6','pass:minZ>=requiredGap-1e-6');
source=source.replace('finally{await browser.close();}','finally{await browser.close();await ownedUI.close();ownedUI=null;}');
source=source.replace('})().catch(e=>{report.harnessError=', '})().catch(async e=>{if(ownedUI)await ownedUI.close();report.harnessError=');
fs.writeFileSync(file,source);
