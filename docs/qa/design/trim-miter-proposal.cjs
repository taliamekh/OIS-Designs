/* Reviewable in-memory candidate. Never writes mobile source. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const mobile=path.resolve(__dirname,'../../../mobile'),ts=createRequire(path.join(mobile,'package.json'))('typescript'),sha=text=>crypto.createHash('sha256').update(text).digest('hex');
function proposal(){
 const source=fs.readFileSync(path.join(mobile,'src/scene/meshes.ts'),'utf8'),ast=ts.createSourceFile('meshes.ts',source,ts.ScriptTarget.Latest,true);let miter;
 for(const statement of ast.statements)if(ts.isFunctionDeclaration(statement)&&statement.name?.text==='trimCornerMiter')miter=statement.getText(ast).replace('function trimCornerMiter(','function physicalTrimMiter(').replace(': MiterPlane {',': { slope: number; offset: number } {');
 if(!miter)throw Error('Current pure miter function unavailable');
 const intervals=`
export function physicalTrimCollisionIntervals(wall: Wall, floor: Floor, room: Room): [number, number][] {
 const trim = room.trimOverrides[wall.id] ?? room.trim;
 const reversed = wall.faces.find(face => face.roomId === room.id)?.reversed ?? false;
 const start = physicalTrimMiter(floor, room, wall, true), end = physicalTrimMiter(floor, room, wall, false);
 const extension = (m: { slope: number; offset: number }) => Math.min(0, m.offset, m.offset + m.slope * trim.projection);
 const low = extension(reversed ? end : start), high = extension(reversed ? start : end), length = distance(wall.a, wall.b);
 return physicalTrimIntervals(wall, floor).map(([a, b]) => [a + (a < .001 ? low : 0), b - (b > length - .001 ? high : 0)]);
}
`;
 const metadata={kind:'In-memory-only miter candidate; production source untouched',baseGeometrySha256:null,derivedGeometrySha256:null,meshMiterSourceSha256:sha(source)};
 const transform=(absolute,text)=>{
  if(absolute!==path.join(mobile,'src/domain/geometry.ts'))return text;
  if(text.includes('export function physicalTrimCornerMiter('))throw Error('App owner already implemented the shared miter; this earlier in-memory candidate is superseded. Test production directly.');
  metadata.baseGeometrySha256=sha(text);
  if(!text.includes('physicalTrimIntervals(wall, floor)'))throw Error('Production call site changed; re-evaluate candidate');
  const derived=text.replace('physicalTrimIntervals(wall, floor)','physicalTrimCollisionIntervals(wall, floor, room)').replace('export function canPlace(',miter+'\n'+intervals+'\nexport function canPlace(');
  metadata.derivedGeometrySha256=sha(derived);return derived;
 };
 return{options:{transform},metadata,miter,intervals};
}
module.exports={proposal};
if(require.main===module){const p=proposal(),base=fs.readFileSync(path.join(mobile,'src/domain/geometry.ts'),'utf8'),derived=p.options.transform(path.join(mobile,'src/domain/geometry.ts'),base);fs.writeFileSync(path.join(__dirname,'trim-miter-candidate.ts'),p.miter+'\n'+p.intervals);fs.writeFileSync(path.join(__dirname,'concave-miter-before.geometry.ts'),base);fs.writeFileSync(path.join(__dirname,'concave-miter-after.geometry.ts'),derived);fs.writeFileSync(path.join(__dirname,'concave-miter-candidate-bindings.json'),JSON.stringify(p.metadata,null,2)+'\n');process.stdout.write(JSON.stringify(p.metadata,null,2)+'\n');}
