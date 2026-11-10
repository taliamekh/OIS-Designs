"""Produce indexed front/back contact sheets and an offline review index."""
import json,math,textwrap,html,hashlib,argparse,shutil,re
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--stage');parser.add_argument('--unreviewed-only',action='store_true');parser.add_argument('--batch-label',default='');args=parser.parse_args();assert re.fullmatch('[a-z0-9-]*',args.batch_label)
RECORDS=ROOT/('catalogue-v2/staged/v'+args.stage if args.stage else 'catalogue-v2/records')
OUT=ROOT/('catalogue-v2/review-v'+args.stage if args.stage else 'catalogue-v2/review');OUT.mkdir(exist_ok=True)
HISTORY=ROOT/'catalogue-v2/sheet-history';HISTORY.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',16);small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',12)
rows=[json.loads(p.read_text()) for p in sorted(RECORDS.glob('*.json'))]
if args.unreviewed_only:
 from catalogue_manifest import review_matches
 ledger_path=ROOT/('catalogue-v2/visual-decisions-v'+args.stage+'.json' if args.stage else 'catalogue-v2/visual-decisions.json');decisions=json.loads(ledger_path.read_text()).get('decisions',{}) if ledger_path.exists() else {};cache={};rows=[a for a in rows if not review_matches(ROOT,a,decisions.get(a['id'],{}),cache)[0]]
byroom={}
for a in rows:byroom.setdefault(a['roomTags'][0],[]).append(a)
pages=[]
for room,group in sorted(byroom.items()):
 for start in range(0,len(group),12):
  batch=group[start:start+12];page=(args.batch_label+'-' if args.batch_label else '')+f'{room}-{start//12+1:02}.jpg';assert not args.batch_label or not (OUT/page).exists(),'Named review batch is immutable';can=Image.new('RGB',(1600,1250),(245,245,240));draw=ImageDraw.Draw(can)
  draw.text((16,8),f'{room} / {start+1}–{start+len(batch)} / candidates; review IDs below',font=font,fill='black')
  for i,a in enumerate(batch):
   x=(i%4)*400;y=(i//4)*400+42
   front=Image.open(ROOT/a['thumbnail']).convert('RGB');front.thumbnail((320,280));can.paste(front,(x,y))
   back=Image.open(ROOT/a['backThumbnail']).convert('RGB');back.thumbnail((150,132));can.paste(back,(x+248,y+148))
   slug=a['id'].removeprefix('ois.design.');draw.text((x+8,y+281),slug,font=small,fill='black')
   draw.text((x+8,y+300),a['theme']+' / '+a['subtype'],font=small,fill='#333333')
   dims=a['dimensionsMetres'];draw.text((x+8,y+320),f"{dims['width']:.2f} × {dims['depth']:.2f} × {dims['height']:.2f} m / {a['triangles']} tris",font=small,fill='#333333')
   for j,line in enumerate(textwrap.wrap(a['distinction'],width=54)[:3]):draw.text((x+8,y+340+j*15),line,font=small,fill='#444444')
  can.save(OUT/page,quality=90);sheet_hash=hashlib.sha256((OUT/page).read_bytes()).hexdigest();archive=HISTORY/(sheet_hash+'.jpg')
  if not archive.exists():shutil.copyfile(OUT/page,archive)
  members=[]
  for a in batch:
   members.append({'id':a['id'],'version':a['version'],'assetSha256':a['sha256'],'front':a['thumbnail'],'frontSha256':hashlib.sha256((ROOT/a['thumbnail']).read_bytes()).hexdigest(),'back':a['backThumbnail'],'backSha256':hashlib.sha256((ROOT/a['backThumbnail']).read_bytes()).hexdigest()})
  pages.append({'sheet':page,'sheetSha256':sheet_hash,'archive':archive.relative_to(ROOT).as_posix(),'room':room,'ids':[a['id'] for a in batch],'members':members})
(OUT/'index.json').write_text(json.dumps({'schemaVersion':2,'records':RECORDS.relative_to(ROOT).as_posix(),'sheets':pages},indent=2))
if args.batch_label:shutil.copyfile(OUT/'index.json',OUT/('index-'+args.batch_label+'.json'))
content='<!doctype html><meta charset="utf-8"><title>OIS furniture candidates</title><style>body{font:16px system-ui;margin:24px;background:#f2f1ed}img{max-width:100%}article{margin:30px 0}a{color:#245842}</style><h1>Furniture candidate review</h1><p>Real GLB geometry. Internal review status is in manifest.json. Images do not establish phone compatibility.</p>'
for p in pages:content+=f'<article><h2>{html.escape(p["room"])}</h2><a href="{p["sheet"]}"><img loading="lazy" src="{p["sheet"]}"></a></article>'
(OUT/'index.html').write_text(content);print('sheets',len(pages),'models',len(rows))
