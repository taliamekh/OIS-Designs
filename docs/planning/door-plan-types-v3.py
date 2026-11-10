from pathlib import Path
p=Path(__file__).resolve().parent/'phone-review-v3.js'
s=p.read_text(encoding='utf-8')
begin=s.index('${state.doors.map(d=>{');end=s.index("}).join('')}",begin)+len("}).join('')}")
s=s[:begin]+"${state.doors.map(doorPlan).join('')}"+s[end:]
helper="""function doorPlan(d){const y=70+d.offset*50,h=d.width*50,c=d.id===state.selectedDoor?'#9d7138':'#8d8170';let mark='';if(d.type==='swing')mark=`<path d="M220 ${y}H${220-h}Q${220-h} ${y+h} 220 ${y+h}" fill="none" stroke="${c}" stroke-width="1.5"/>`;else if(d.type==='double')mark=`<path d="M220 ${y}H${220-h/2}Q${220-h/2} ${y+h/2} 220 ${y+h/2}M220 ${y+h}H${220-h/2}Q${220-h/2} ${y+h/2} 220 ${y+h/2}" fill="none" stroke="${c}" stroke-width="1.5"/>`;else if(d.type==='sliding')mark=`<rect x="209" y="${y}" width="4" height="${h}" fill="${c}"/><path d="M206 ${y}V${Math.min(220,y+1.8*h)}" stroke="${c}" stroke-dasharray="3 2"/>`;else if(d.type==='pocket')mark=`<rect x="216" y="${y+h}" width="8" height="${Math.min(h,220-y-h)}" fill="none" stroke="${c}" stroke-dasharray="3 2"/>`;else mark=`<path d="M215 ${y}H225M215 ${y+h}H225" stroke="${c}" stroke-width="2"/>`;return `<g data-door-kind="${d.type}"><path d="M220 ${y}V${y+h}" stroke="#e6dfd3" stroke-width="7"/>${mark}</g>`}
"""
if 'function doorPlan(' not in s:s=s.replace('function doorDimensions(',helper+'function doorDimensions(')
p.write_text(s,encoding='utf-8')
