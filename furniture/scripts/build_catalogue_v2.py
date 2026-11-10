"""Blender production runner. Resume safely; publishes each valid batch atomically.
Example: blender --background --python furniture/scripts/build_catalogue_v2.py -- --limit 20
"""
import bpy,bmesh,sys,json,os,time,traceback,hashlib,argparse
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from catalogue_inventory import DESIGNS
import design_geometry as geo
from validate_library import inspect
ROOT=HERE.parent
parser=argparse.ArgumentParser();parser.add_argument('--start',type=int,default=0);parser.add_argument('--limit',type=int,default=999);parser.add_argument('--only');parser.add_argument('--force',action='store_true');parser.add_argument('--render-only',action='store_true');parser.add_argument('--asset-version',default='0.2.0');parser.add_argument('--textures',action='store_true');parser.add_argument('--staging',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
VERSION=args.asset_version
for p in (f'assets/v{VERSION}',f'previews/v{VERSION}',f'sources/v{VERSION}','catalogue-v2/records','catalogue-v2/history'): (ROOT/p).mkdir(parents=True,exist_ok=True)
RECORDS=ROOT/(f'catalogue-v2/staged/v{VERSION}' if args.staging else 'catalogue-v2/records');RECORDS.mkdir(parents=True,exist_ok=True)
geometry_source=(HERE/'design_geometry.py').read_bytes();geometry_source_hash=hashlib.sha256(geometry_source).hexdigest()
snapshot=ROOT/'sources'/f'pipeline-{geometry_source_hash[:16]}.py'
if not snapshot.exists():snapshot.write_bytes(geometry_source)
support_sources={}
for filename in ('signature_designs.py','material_finish.py','catalogue_inventory.py','finalize_glb.py','build_catalogue_v2.py','validate_library.py','support_checks.py'):
 content=(HERE/filename).read_bytes();sha=hashlib.sha256(content).hexdigest();target=ROOT/'sources'/(filename.removesuffix('.py')+'-'+sha[:16]+'.py')
 if not target.exists():target.write_bytes(content)
 support_sources[filename]={'snapshot':target.relative_to(ROOT).as_posix(),'sha256':sha}
def atomic(path,data):
 temp=path.with_suffix(path.suffix+'.tmp');temp.write_text(json.dumps(data,indent=2))
 for i in range(10):
  try:os.replace(temp,path);return
  except PermissionError:time.sleep(.1)
 raise RuntimeError('cannot atomically publish '+str(path))
def publish():
 legacy=json.loads((ROOT/'catalogue-v2/legacy-manifest-v0.1.0.json').read_text())
 for a in legacy['assets']:
  slug=a['geometryFamily'];family='legacy-platform-bed' if slug.startswith('bed-') and a.get('bedSize') in ('twin','full','queen','king') else slug
  a.update({'designId':'ois.legacy-design.'+family,'familyId':'ois.legacy-family.'+family,'variantOf':None if a['theme']=='calm-oak' else 'ois.calm-oak.'+slug,'countEligible':False,'countReason':'legacy assets retained; excluded from new 300-design target','qualityStatus':a['stage']})
 rows=[json.loads(p.read_text()) for p in sorted((ROOT/'catalogue-v2/records').glob('*.json'))]
 current={a['id']:a for a in DESIGNS}
 for row in rows:
  if row['id'] in current:
   for k in ('countEligible','variantOf','familyId','constructionKey','countExclusion'):
    if k in current[row['id']]:row[k]=current[row['id']][k]
 assets=legacy['assets']+rows
 counts={'glbFiles':len(assets),'legacyFiles':39,'newCandidates':len(rows),'plannedBriefs':len(DESIGNS),'countEligibleCandidates':sum(a['countEligible'] for a in rows),'visuallyReviewed':sum(a.get('visualReview',{}).get('status')=='pass' for a in rows),'internallyAcceptedDistinctDesigns':sum(a.get('qualityStatus')=='internally-accepted' and a['countEligible'] for a in rows),'phoneValidated':0,'userApproved':0}
 historical=[json.loads(p.read_text()) for p in sorted((ROOT/'catalogue-v2/history').glob('*.json'))]
 atomic(ROOT/'catalogue-v2/history.json',{'assets':historical,'rule':'resolve exact id/version/hash; never substitute silently'})
 atomic(ROOT/'manifest.json',{'schemaVersion':1,'catalogueVersion':VERSION,'assets':assets,'historicalAssets':historical,'counts':counts,'compatibility':{'legacyAssets':'all 39 original IDs, versions and files preserved','newFields':'additive designId/familyId/variantOf/qualityStatus/provenance','basePath':'furniture/','appValidation':'not established by Blender exports'}})
 manifest_hash=hashlib.sha256((ROOT/'manifest.json').read_bytes()).hexdigest()
 atomic(ROOT/'catalogue-v2/batch-ready.json',{'manifestSha256':manifest_hash,'catalogueVersion':VERSION,'counts':counts,'completedFilesOnly':True,'history':'catalogue-v2/history.json'})
 atomic(ROOT/'catalogue-v2/status.json',{'counts':counts,'lastUpdateUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'target':300,'countPolicy':'catalogue-v2/COUNTING.md','activeGoal':'at least 300 distinct internally reviewed designs, excluding colour/size variants'})
def render(path,back=False):
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16 if not back else 10
 scene.render.resolution_x=512 if not back else 320;scene.render.resolution_y=448 if not back else 280;scene.render.resolution_percentage=100
 scene.world.color=(.28,.28,.28)
 bpy.context.view_layer.update();pts=[o.matrix_world@v.co for o in scene.objects if o.type=='MESH' for v in o.data.vertices]
 low=Vector([min(p[i] for p in pts) for i in range(3)]);high=Vector([max(p[i] for p in pts) for i in range(3)]);centre=(low+high)/2;extent=max(high-low)
 direction=Vector((-1.25,-1.8,1.15)) if back else Vector((1.25,1.8,1.15))
 bpy.ops.object.camera_add(location=centre+direction*extent);cam=bpy.context.object;cam.rotation_euler=(centre-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent*1.55;scene.camera=cam
 helpers=[cam]
 for pos,power,size in (((-3,4,6),550,4),((4,1,4),400,3),((0,-4,5),450,3)):
  bpy.ops.object.light_add(type='AREA',location=centre+Vector(pos));l=bpy.context.object;l.data.energy=power;l.data.size=size;l.rotation_euler=(centre-l.location).to_track_quat('-Z','Y').to_euler();helpers.append(l)
 m=geo.mat('preview-ground',(.68,.70,.68,1),.95);bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.001));o=bpy.context.object;o.data.materials.append(m);helpers.append(o)
 scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
 for o in helpers:bpy.data.objects.remove(o,do_unlink=True)
def build(a):
 geo.reset(a['theme']);extra=geo.BUILDERS[a['builder']](a['parameters']) or {}
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=.0000001);bmesh.ops.triangulate(bm,faces=list(bm.faces),quad_method='FIXED',ngon_method='BEAUTY');bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
  if o.data.has_custom_normals:o.data.normals_split_custom_set([(0,0,0)]*len(o.data.loops))
 finish_info=None
 if args.textures:
  from material_finish import apply_finish
  finish_info=apply_finish()
 bpy.context.view_layer.update()
 from support_checks import check_supports
 support_info=check_supports()
 floor=min((o.matrix_world@v.co).z for o in bpy.context.scene.objects if o.type=='MESH' for v in o.data.vertices)
 for o in bpy.context.scene.objects:o.location.z-=floor
 bpy.context.view_layer.update()
 slug=a['id'].removeprefix('ois.design.');glb=ROOT/f'assets/v{VERSION}'/f'{slug}.glb';blend=ROOT/f'sources/v{VERSION}'/f'{slug}.blend'
 if glb.exists():raise RuntimeError('Immutable version path already exists; select a newer --asset-version: '+str(glb))
 bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
 bpy.context.scene['oisAssetId']=a['id'];bpy.context.scene['oisVersion']=VERSION;bpy.context.scene['oisUnits']='metres';bpy.context.scene['oisAuthoringFrame']='RH Z-up; +Y front'
 (blend.with_suffix('.parameters.json')).write_text(json.dumps({'id':a['id'],'version':VERSION,'builder':a['builder'],'parameters':a['parameters'],'sourceSnapshot':snapshot.relative_to(ROOT).as_posix(),'sourceSha256':geometry_source_hash},indent=2))
 # Save part-editable original, export a material-batched asset separately.
 bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(blend))
 for slot,m in geo.M.items():
  group=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==m]
  if not group:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=group[0]
  if len(group)>1:bpy.ops.object.join()
  bpy.context.object.name=slot+' geometry'
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_extras=True,export_tangents=args.textures)
 from finalize_glb import finalize_glb
 finalization=finalize_glb(glb)
 stats=inspect(glb)
 front=ROOT/f'previews/v{VERSION}'/f'{slug}.png';back=ROOT/f'previews/v{VERSION}'/f'{slug}-back.png'
 render(front);render(back,True)
 row={**a,**extra,**stats,'version':VERSION,'stage':'validated-candidate','qualityStatus':'validated-candidate','geometryFamily':a['familyId'],'file':glb.relative_to(ROOT).as_posix(),'sourceModel':blend.relative_to(ROOT).as_posix(),'thumbnail':front.relative_to(ROOT).as_posix(),'backThumbnail':back.relative_to(ROOT).as_posix(),'category':{'seating':'seating','table':'tables','case':'storage','bed':'beds','light':'lighting','bath':'bathroom-fixtures','appliance':'appliances','kitchen':'cabinetry','special':'specialty','sculptural':'sculptural-furniture','functional':'functional-furniture','signature':'signature-furniture'}[a['builder']],'subtype':a['parameters']['form'],'units':'metres','frame':'RH Y-up; +X right, -Z furniture front','pivot':'floor Y=0; centre of primary body XZ','textures':{'count':0,'bytes':0},'lod':{'delivered':['LOD0'],'planned':'LOD1 50% / LOD2 20% triangles, review silhouettes and device fixture before promotion'},'placement':{'anchor':'wall' if a['parameters']['form'] in ('rangehood','glass-wall','open-wall','wall-plate') else 'floor','allowArbitraryScale':False,'collision':'conservative oriented XZ bounds; clearance separate'},'visualReview':{'status':'pending','images':[front.relative_to(ROOT).as_posix(),back.relative_to(ROOT).as_posix()]},'favouriteStorage':'user set of stable catalogue IDs'}
 wood,fabric,metal=geo.PALETTES[a['theme']];row['colors']=[list(c[:3]) for c in (wood,fabric,metal)]
 tags={'calm-oak':['pale oak','ivory','oatmeal'],'walnut-form':['walnut','tobacco','brass'],'soft-japandi':['ash','flax','stone'],'city-loft':['charcoal','black','weathered wood'],'coastal-linen':['mist blue','sand','pale oak']}
 woodtag,textiletag,metaltag={'calm-oak':('pale oak','ivory','dark grey'),'walnut-form':('walnut brown','tobacco','muted brass'),'soft-japandi':('smoked ash','flax','charcoal'),'city-loft':('weathered brown','charcoal','black'),'coastal-linen':('pale oak','mist blue','sand')}[a['theme']]
 slotcolours={'wood':woodtag,'fabric':textiletag,'metal':metaltag,'linen':'warm ivory','ceramic':'warm white','stone':'warm grey','glass':'clear blue grey','dark':'near black','accent':'sage green','cane':'natural tan','mirror':'silver'}
 row['colourTags']=sorted({slotcolours[x] for x in row['variantSlots']});row['colors']=[list(geo.M[x].diffuse_color[:3]) for x in row['variantSlots']]
 row['materials']=sorted(set({'wood':'wood','fabric':'textile','metal':'metal','linen':'textile','ceramic':'ceramic','stone':'stone','glass':'tinted-glass','dark':'paint','accent':'paint','cane':'woven-fibre','mirror':'mirror'}[x] for x in row['variantSlots']))
 row['searchAliases']=[a['roomTags'][0].replace('-',' '),a['parameters']['form'].replace('-',' ')]+(['double','full size'] if row.get('bedSize')=='full' else [])
 row['materialSlots']=[{'id':name,'material':name,'recolourable':True} for name in row['variantSlots']]
 row['provenance'].update({'sourceSnapshot':snapshot.relative_to(ROOT).as_posix(),'sourceSha256':geometry_source_hash,'sourceModelSha256':hashlib.sha256(blend.read_bytes()).hexdigest(),'supportSources':support_sources,'parametersFile':blend.with_suffix('.parameters.json').relative_to(ROOT).as_posix()})
 row['textures']=stats['textures']
 row['finalization']=finalization
 row['supportChecks']=support_info
 if a['parameters']['form'] in ('floating-vanity','rangehood','glass-wall','open-wall','wall-plate','fold-wall'):
  row['placement'].update({'anchor':'wall','defaultElevationMetres':.30 if a['parameters']['form']=='floating-vanity' else (1.50 if a['parameters']['form']=='rangehood' else 1.40),'attachmentRequired':True,'note':'GLB base is Y=0; apply explicit mounting elevation, not floor-only placement'})
 if finish_info:row['materialFinish']=finish_info
 if 'fabric' in row['variantSlots']:
  row['appearanceVariants']=[{'id':a['id']+'.finish.sage','name':'Sage textile','materialOverrides':{'fabric':{'baseColorFactor':[.25,.37,.28,1]}}},{'id':a['id']+'.finish.clay','name':'Clay textile','materialOverrides':{'fabric':{'baseColorFactor':[.45,.23,.15,1]}}}]
  row['variantColourTags']=['sage green','clay brown'];row['variantCountNote']='appearance overrides share this one design; do not increase distinct count'
 return row

from catalogue_manifest import publish_catalogue
def publish():
 if args.staging:
  files=list(RECORDS.glob('*.json'));atomic(ROOT/'catalogue-v2'/f'staged-v{VERSION}-status.json',{'version':VERSION,'completeStagedRecords':len(files),'published':False,'quality':'pending staged review; current catalogue retained','path':RECORDS.relative_to(ROOT).as_posix()});return
 return publish_catalogue(ROOT,VERSION)

chosen=DESIGNS[args.start:args.start+args.limit]
if args.only:chosen=[a for a in DESIGNS if any(part in a['id'] for part in args.only.split(','))]
errors=[];publish()
for i,a in enumerate(chosen):
 record=RECORDS/(a['id']+'.json')
 if record.exists() and not args.force:continue
 if record.exists() and json.loads(record.read_text())['version']==VERSION:continue
 try:
  row=build(a)
  if record.exists() and not args.staging:
   old=json.loads(record.read_text());archive=ROOT/'catalogue-v2/history'/(old['id']+'@'+old['version']+'@'+old['sha256'][:12]+'.json');atomic(archive,old)
  atomic(record,row);publish();print('PRODUCED',a['id'],i+1,'/',len(chosen),flush=True)
 except Exception as e:
  errors.append({'id':a['id'],'error':str(e),'traceback':traceback.format_exc()});atomic(ROOT/'catalogue-v2/build-errors.json',errors);print('BUILD FAILED',a['id'],str(e),flush=True)
atomic(ROOT/'catalogue-v2'/f'build-result-v{VERSION}.json',{'version':VERSION,'staged':args.staging,'selected':len(chosen),'errors':errors,'completeRecords':len(list(RECORDS.glob('*.json'))),'finishedAtUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())})
publish();print('BATCH COMPLETE',len(chosen),'errors',len(errors),flush=True)

