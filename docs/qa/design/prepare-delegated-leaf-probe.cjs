const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'door-leaf-clearance-audit.cjs');let source=fs.readFileSync(file,'utf8');
source=source.replace("new Function('module','leaf','h','module.exports={position:'+position+',size:'+size+'};')(mod,leaf,o.height)","new Function('module','leaf','h','DOOR_LEAF_THICKNESS','module.exports={position:'+position+',size:'+size+'};')(mod,leaf,o.height,g.DOOR_LEAF_THICKNESS)");
fs.writeFileSync(file,source);
