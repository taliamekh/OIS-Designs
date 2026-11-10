import json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'manifest.json').read_text())
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',17)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',13)
def sheet(rows,name,cols=4):
 w,h=340,350;canvas=Image.new('RGB',(cols*w,math.ceil(len(rows)/cols)*h),(247,247,244));d=ImageDraw.Draw(canvas)
 for i,a in enumerate(rows):
  x=i%cols*w;y=i//cols*h
  im=Image.open(ROOT/a['thumbnail']).convert('RGB');im.thumbnail((w,260));canvas.paste(im,(x+(w-im.width)//2,y))
  d.text((x+12,y+260),a['name'],font=font,fill='black')
  dims=a['dimensionsMetres'];d.text((x+12,y+285),f"{dims['width']:.3f} × {dims['depth']:.3f} × {dims['height']:.3f} m",font=small,fill='#333333')
  d.text((x+12,y+307),a['stage'],font=small,fill='#555555')
  d.text((x+12,y+328),a['theme'].replace('-',' ').title(),font=small,fill='#333333')
 canvas.save(ROOT/'previews'/name)
sheet([a for a in data['assets'] if a['theme']=='calm-oak'],'all-room-contact-sheet.jpg')
sheet([a for a in data['assets'] if a['geometryFamily'] in ('sofa','lounge-chair','coffee-table','media-unit','floor-lamp')],'theme-material-studies.jpg',5)
print('contact sheets ready')
