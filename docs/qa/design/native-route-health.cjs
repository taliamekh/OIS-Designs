/* Read-only local manifest/development JS route check, never a device result. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const mobile=path.resolve(__dirname,'../../../mobile'),files=['src/catalogue/bundled.ts','src/catalogue/assets.json','metro.config.js','package.json'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(mobile,f))).digest('hex')]));
const report={timestamp:new Date().toISOString(),evidence:'Local actual Expo iOS manifest plus full advertised-path development JS request. No physical launch/linking/GL proof.',before:hashes()};
(async()=>{try{
 const manifest=await fetch('http://127.0.0.1:8081',{headers:{accept:'application/expo+json','expo-platform':'ios','expo-protocol-version':'0'},signal:AbortSignal.timeout(20000)});report.manifest={status:manifest.status,type:manifest.headers.get('content-type')};const data=await manifest.json();report.manifest.runtimeVersion=data.runtimeVersion;report.manifest.sdkVersion=data.extra?.expoClient?.sdkVersion;
 if(!manifest.ok||!data.launchAsset?.url)throw Error('No valid advertised launch URL');
 const target=new URL(data.launchAsset.url);report.advertisedLaunchHost=target.host;report.localPath=target.pathname+target.search;
 const bundle=await fetch('http://127.0.0.1:8081'+report.localPath,{signal:AbortSignal.timeout(60000)}),bytes=Buffer.from(await bundle.arrayBuffer());report.bundle={status:bundle.status,type:bundle.headers.get('content-type'),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 if(!bundle.ok)report.bundle.error=bytes.toString('utf8',0,Math.min(bytes.length,2000));report.pass=manifest.ok&&bundle.ok&&/javascript/.test(report.bundle.type??'')&&bytes.length>1000000;
 }catch(e){report.failure=String(e);}report.after=hashes();report.stableSourceSamples=JSON.stringify(report.before)===JSON.stringify(report.after);fs.writeFileSync(path.join(__dirname,'native-route-health.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify(report,null,2)+'\n');
})().catch(e=>{process.stderr.write(e.stack+'\n');process.exitCode=1});
