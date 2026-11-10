from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

folder=Path(__file__).resolve().parent
cells=[('projects','Start with a floor plan'),('plan','Create and connect rooms'),('finishes','Edit individual finishes'),('catalog','Five coordinated sets'),('placement','Grid or free movement'),('house','Multi-floor 3D · later'),('settings','Clear movement settings'),('upload','Actual plan → house · later')]
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',21)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
images=[Image.open(folder/'screens'/f'{name}.png').convert('RGB') for name,_ in cells]
cell_w=426
cell_h=max(i.height for i in images)+74
board=Image.new('RGB',(cell_w*4,cell_h*2+106),'#eeede8')
d=ImageDraw.Draw(board)
d.text((24,20),'OIS Designs · phone app design review',font=font,fill='#202a36')
d.text((24,53),'November 8, 2026 · illustrative data · planned uploads and scanning · no app features implemented',font=small,fill='#5e6670')
for idx,((name,title),im) in enumerate(zip(cells,images)):
    x=(idx%4)*cell_w+18;y=(idx//4)*cell_h+106
    d.text((x,y),title,font=font,fill='#202a36')
    board.paste(im,(x,y+39))
board.save(folder/'phone-review-board.png')
print('Review board created.')
