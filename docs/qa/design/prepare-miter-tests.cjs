const fs=require('node:fs'),path=require('node:path');
for(const name of['trim-collision-coverage','concave-trim-real-model']){
 const file=path.join(__dirname,name+'.cjs');let text=fs.readFileSync(file,'utf8');
 if(text.includes('const candidate='))continue;
 text=text.replace('const mobile=',"const candidate=process.env.OIS_QA_MITER_PROPOSAL?require('./trim-miter-proposal.cjs').proposal():null;\nconst mobile=");
 text=text.replace('createLoader(mobile)','createLoader(mobile,candidate?.options)');
 text=text.replace('const report={','const report={candidate:candidate?.metadata,');
 text=text.replaceAll("'"+name+".json'","(candidate?'"+name+".candidate.json':'"+name+".json')");
 fs.writeFileSync(file,text);
}
