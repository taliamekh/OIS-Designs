const fs=require('node:fs'),path=require('node:path'),file=path.join(__dirname,'concave-trim-real-model.cjs');let text=fs.readFileSync(file,'utf8');
text=text.replace("const candidate=process.env.OIS_QA_MITER_PROPOSAL?require('./trim-miter-proposal.cjs').proposal():null;","const candidate=process.env.OIS_QA_PRE_MITER?require('./historical-boundary.cjs').historical():process.env.OIS_QA_MITER_PROPOSAL?require('./trim-miter-proposal.cjs').proposal():null;");
text=text.replaceAll("(candidate?'concave-trim-real-model.candidate.json':'concave-trim-real-model.json')","(process.env.OIS_QA_PRE_MITER?'concave-trim-real-model.historical.json':candidate?'concave-trim-real-model.candidate.json':'concave-trim-real-model.json')");
fs.writeFileSync(file,text);
