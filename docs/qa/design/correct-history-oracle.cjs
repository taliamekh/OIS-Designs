const fs=require('node:fs'),path=require('node:path');
const target=path.join(__dirname,'boundary-repair-regression.cjs');let text=fs.readFileSync(target,'utf8');
text=text.replace("p.execute(edited.history,{type:'undo'},'2d',[])","p.travelHistory(edited.history,'undo','2d')");
text=text.replace("p.execute(moved.history,{type:'undo'},'3d',[asset])","p.travelHistory(moved.history,'undo','3d')");
text=text.replace("p.execute(moved.history,{type:'undo'},'walk',[asset])","p.travelHistory(moved.history,'undo','walk')");
fs.copyFileSync(path.join(__dirname,'boundary-repair-regression.json'),path.join(__dirname,'boundary-regression-before-history-oracle-correction.json'));
fs.writeFileSync(target,text);
