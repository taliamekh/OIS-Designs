/* Independent hand-calculated display examples; production sources remain read-only. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createLoader}=require('./source-loader.cjs');
const root=path.resolve(__dirname,'../../../mobile'),file=path.join(root,'src/domain/geometry.ts');
const sha=()=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before=sha(),{load}=createLoader(root),g=load('src/domain/geometry.ts');
const cases=[
 ['negative legacy corner',-.05,'-0′ 2″'],['negative metre',-1,'-3′ 3″'],['negative 37 inches',-.9398,'-3′ 1″'],
 ['positive legacy corner',.05,'0′ 2″'],['positive metre',1,'3′ 3″'],['positive 37 inches',.9398,'3′ 1″'],
 ['zero',0,'0′ 0″'],['negative zero',-0,'0′ 0″'],['negative tiny',-.001,'0′ 0″'],['positive tiny',.001,'0′ 0″'],
 ['half inch',.0127,'0′ 1″'],['negative half inch',-.0127,'-0′ 1″'],
 ['below half inch',.0127-1e-8,'0′ 0″'],['negative below half inch',-.0127+1e-8,'0′ 0″'],
 ['above half inch',.0127+1e-8,'0′ 1″'],['negative above half inch',-.0127-1e-8,'-0′ 1″'],
 ['foot carry',.2921,'1′ 0″'],['negative foot carry',-.2921,'-1′ 0″'],
 ['whole foot',.3048,'1′ 0″'],['negative whole foot',-.3048,'-1′ 0″'],
 ['three feet carry',.9017,'3′ 0″'],['negative three feet carry',-.9017,'-3′ 0″'],
 ['fractional foot',4.3434,'14′ 3″'],['negative fractional foot',-4.3434,'-14′ 3″']
];
const checks=cases.map(([id,value,expected])=>({id,metres:value,expected,actual:g.measure(value,'ft'),pass:g.measure(value,'ft')===expected}));
for(const value of[-1,-.05,0,.05,1,4.3434]){const expected=value.toFixed(2)+' m',actual=g.measure(value,'m');checks.push({id:'metres unchanged '+value,expected,actual,pass:actual===expected});}
for(const value of[-1,-.05,0,.05,1,4.3434]){const actual=g.toMetres(g.toDisplay(value,'ft'),'ft');checks.push({id:'numeric unit roundtrip '+value,expected:value,actual,pass:Math.abs(value-actual)<1e-12});}
const after=sha(),report={timestamp:new Date().toISOString(),evidence:'Direct production formatter execution against hand-calculated examples, signed tie/carry/zero and metre/numeric-unit invariants. CPU only; actual inspector is a separate UI check.',geometryBefore:before,geometryAfter:after,sourceStable:before===after,checks,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length};
fs.writeFileSync(path.join(__dirname,'signed-imperial.json'),JSON.stringify(report,null,2)+'\n');process.stdout.write(JSON.stringify({...report,checks:checks.filter(c=>!c.pass)},null,2)+'\n');
