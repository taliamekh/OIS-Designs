from pathlib import Path
folder=Path(__file__).resolve().parent
p=folder/'phone-mockups.html'
s=p.read_text(encoding='utf-8')
s=s.replace("doorOffset:1.4,", "doorOffset:1.0,")
s=s.replace("aRight:4-o-w,bLeft:o-.4,bRight:4-o-w", "aRight:3-o-w,bLeft:o-.6,bRight:3-o-w")
s=s.replace("k=65.5", "k=87.333333")
s=s.replace("bStart=66.2", "bStart=92.4")
s=s.replace('x="66.2" y="141" width="235.8"', 'x="92.4" y="141" width="209.6"')
s=s.replace('Living room · 4.00 m wall face', 'Living room · 3.00 m wall face')
s=s.replace('Kitchen · 3.60 m wall face', 'Kitchen · 2.40 m wall face')
s=s.replace('min=".6" max="${(3.7-state.doorWidth)', 'min=".75" max="${(2.85-state.doorWidth)')
s=s.replace('3.7-state.doorWidth', '2.85-state.doorWidth')
s=s.replace('Math.max(.6,Math.min(2.85-state.doorWidth,state.doorOffset))', 'Math.max(.75,Math.min(2.85-state.doorWidth,state.doorOffset))')
s=s.replace("state.doorType==='double'?1.6:['sliding','pocket'].includes(state.doorType)?1.2:.9", "state.doorType==='double'?1.6:.9")
s=s.replace('<button class="link-btn" data-go="heights">Room properties</button></div>`}', '${state.screen===\'heights\'?\'<span class="tiny">Ground floor</span>\':\'<button class="link-btn" data-go="heights">Room properties</button>\'}</div>`}')
# Only append the new product-font correction; the rest of the stylesheet already exists.
if '.entry .copy strong,#ois-phone-review .entry .copy small{font-family:Arial' not in s:
    s+='\n<style>#ois-phone-review .entry .copy,#ois-phone-review .entry .copy strong,#ois-phone-review .entry .copy small{font-family:Arial,Helvetica,sans-serif}</style>\n'
p.write_text(s,encoding='utf-8')
print('Aligned door diagram with the selected rooms and cleaned product typography.')
