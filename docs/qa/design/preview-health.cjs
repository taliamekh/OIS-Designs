const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const response=await fetch('http://127.0.0.1:8081',{signal:AbortSignal.timeout(20000)}),body=await response.text();
 const match=body.match(/<script id="_expo-static-error" type="application\/json">([\s\S]*?)<\/script>/);
 const report={timestamp:new Date().toISOString(),url:'http://127.0.0.1:8081',scope:'Web root only. This request cannot establish the independent Expo native manifest/bundle route.',status:response.status,error:match?JSON.parse(match[1]):body.slice(0,400)};
 fs.writeFileSync(path.join(__dirname,'preview-health.json'),JSON.stringify(report,null,2)+'\n');
 const selected=report.error?.selectedLog;process.stdout.write(JSON.stringify({...report,error:selected?{message:selected.message,category:selected.category,componentStack:selected.componentStack}:report.error},null,2).slice(0,6000)+'\n');
})().catch(e=>{process.stderr.write(String(e)+'\n');process.exitCode=1});
