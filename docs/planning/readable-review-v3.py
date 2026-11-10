from pathlib import Path
p=Path(__file__).resolve().parent/'phone-review-v3.js'
s=p.read_text(encoding='utf-8')
start=s.index('function doorDimensions(');end=s.index('\nfunction ',start+1)
s=s[:start]+"""function doorDimensions(d){let y=70+d.offset*50,end=y+d.width*50,a=[d.offset,d.width,3-d.offset-d.width],b=[d.offset-.6,d.width,3-d.offset-d.width];return `<g stroke="#7d6c51" fill="none"><path d="M194 70V220M190 70H198M190 ${y}H198M190 ${end}H198M190 220H198M241 100V220M237 100H245M237 ${y}H245M237 ${end}H245M237 220H245"/></g><g fill="#3e3c34" font-size="11"><text x="185" y="59">A</text><text x="236" y="90">B</text><text x="20" y="267">A · Living room</text><text x="137" y="267">${a.map(v=>measure(v)).join(' | ')}</text><text x="20" y="293">B · Kitchen</text><text x="137" y="293">${b.map(v=>measure(v)).join(' | ')}</text><text x="137" y="315" font-size="10">Corner | opening | corner</text></g>`}
"""+s[end:]
s=s.replace('<button class="secondary" data-view="3d">Exit walkthrough</button>', '')
s=s.replace('${list.length} results', '${list.length} ${list.length===1?\'result\':\'results\'}')
p.write_text(s,encoding='utf-8')
