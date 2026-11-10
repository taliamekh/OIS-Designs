from pathlib import Path
import re

folder=Path(__file__).resolve().parent
p=folder/'phone-mockups.html'
s=p.read_text(encoding='utf-8')
updates=(folder/'review-updates.js').read_text(encoding='utf-8')
if 'const oisLogo=' not in s:
    assets=re.findall(r'src="(data:image/[^\"]+)"',s)
    assert len(assets)>=2
    s=s.replace("const screen=root.querySelector('#ois-screen');", "const screen=root.querySelector('#ois-screen');\nconst oisLogo='"+assets[0]+"';\nconst oisOffice='"+assets[1]+"';")
    s=s.replace('radius:14};', "radius:14,previewVersion:2,editorView:'plan',settingsReturn:'plan',floorHeight:2.6,roomHeights:{'Living room':2.6,Kitchen:2.4,Hall:2.6,Bedroom:2.6,Bathroom:2.4,Landing:2.6},doorType:'swing',doorWidth:.9,doorHeight:2.1,doorOffset:1.4,doorInto:'living'};")
    s=s.replace("let state={...defaults,...(window.openai?.widgetState?.privateContent||{})};", "const saved=window.openai?.widgetState?.privateContent||{};\nlet state={...defaults,...(saved.previewVersion===2?saved:{})};")
for match in re.finditer(r'^function (\w+)\(.*?(?=^function |\Z)',updates,re.M|re.S):
    name=match.group(1);body=match.group(0).rstrip()+'\n'
    pattern=rf'^function {name}\(.*?(?=^function |^root\.addEventListener|^render\(\);|^window\.addEventListener|^if\(globalThis|\Z)'
    if re.search(pattern,s,re.M|re.S):
        s=re.sub(pattern,lambda _:body,s,count=1,flags=re.M|re.S)
    else:
        s=s.replace('function constrain()',body+'function constrain()',1)
s=s.replace('function scene(type=\'finish\'){', "function scene(type='finish'){\n const roomWallHeight=62*(state.roomHeights[state.room]||state.floorHeight)/2.6;")
s=s.replace('0,-64 -133,2', '0,${-2-roomWallHeight} -133,${64-roomWallHeight}')
s=s.replace('0,-64 140,4', '0,${-2-roomWallHeight} 140,${66-roomWallHeight}')
s=s.replace("<h3>${state.floor==='all'?'Explore your house'", "<h3>${state.floor==='all'?'All floors'")
s=s.replace("${btn('Done placing '+icon('check'),'data-go=\"finishes\"','primary')}", "<div class=\"placement-actions\">${btn('Cancel','data-go=\"editor\"')}${btn('Done '+icon('check'),'data-go=\"editor\"','primary')}</div>")
s=s.replace("<div style=\"margin-top:21px\">${btn('Try furniture movement','data-go=\"placement\"','primary')}</div>", '')
s=s.replace("state.units=e.target.value;screen.querySelector('.setting-hint').textContent+=' Unit preference saved for this preview.'", "state.units=e.target.value;render()")
s=s.replace("const captions={projects:'Start with your floor plan',", "const captions={logos:'Logo integration options',doors:'Door placement · both room faces',heights:'Per-room ceiling heights',add:'Contextual Add menu',scan:'Planned scanning flow',projects:'Projects and creation options',")
s=s.replace('Plan upload</button>', 'Plan upload</button><button data-screen="doors">Doors</button><button data-screen="heights">Heights</button><button data-screen="logos">Logo options</button>') if 'data-screen="doors"' not in s else s
if 'id="ois-logo-studies"' not in s:
    studies='<div id="ois-logo-studies" hidden><div class="viz-carousel" aria-label="OIS logo integration options">'
    for idx,(label,variant) in enumerate([('Compact header','compact'),('Centered header','centered'),('Project cover','cover')]):
        studies+=f'<section data-variant="{label}" '+('hidden' if idx else '')+f'><div class="phone" aria-label="{label} logo treatment"><div class="status"><span>9:41</span><div class="island"></div><span>••• ▰</span></div><div data-brand-variant="{variant}"></div><div class="home-bar"></div></div></section>'
    studies+='</div></div>'
    s=s.replace('</div></div>\n  <div class="review-foot">', '</div>'+studies+'</div>\n  <div class="review-foot">',1)
if 'data-door-type' not in s[s.index("root.addEventListener('click'"):]:
    extra="""if(el.dataset.doorType){state.doorType=el.dataset.doorType;state.doorWidth=state.doorType==='double'?1.6:['sliding','pocket'].includes(state.doorType)?1.2:.9;state.doorOffset=Math.min(state.doorOffset,3.7-state.doorWidth);render();persist();return}
 if(el.dataset.doorInto){state.doorInto=el.dataset.doorInto;render();persist();return}
 """
    s=s.replace('const a=el.dataset.action;',extra+'const a=el.dataset.action;')
    s=s.replace("if(a==='undo'", "if(a==='commit-door'){let v=doorMeasurements();if(state.doorHeight>Math.min(state.roomHeights['Living room'],state.roomHeights.Kitchen)||(['pocket','sliding'].includes(state.doorType)&&v.aRight<state.doorWidth))return;go('plan');screen.querySelector('#plan-feedback').textContent='Door configuration preview: '+state.doorType+' · '+state.doorWidth.toFixed(2)+' m clear opening.';return}\n if(a==='undo'")
    event="""root.addEventListener('change',e=>{
 if(e.target.id==='ceiling-height'){let v=Number(e.target.value);if(v>=2&&v<=4){state.roomHeights={...state.roomHeights,[state.room]:v};render();persist()}}
 if(['door-width','door-height','door-offset'].includes(e.target.id)){const v=Number(e.target.value),key={'door-width':'doorWidth','door-height':'doorHeight','door-offset':'doorOffset'}[e.target.id];if(Number.isFinite(v)&&v>0){state[key]=v;state.doorWidth=Math.max(.6,Math.min(1.8,state.doorWidth));state.doorOffset=Math.max(.6,Math.min(3.7-state.doorWidth,state.doorOffset));render();persist()}}
});
root.addEventListener('input',e=>{if(e.target.id==='door-offset'){state.doorOffset=Number(e.target.value);screen.querySelector('.door-canvas').innerHTML=doorArt();let v=doorMeasurements();screen.querySelector('.door-offset-label').textContent='Position from living-room left corner · '+state.doorOffset.toFixed(2)+' m';screen.querySelector('.door-clearances').innerHTML='<span>Living room: '+v.aLeft.toFixed(2)+' | '+v.w.toFixed(2)+' | '+v.aRight.toFixed(2)+' m</span><span>Kitchen: '+v.bLeft.toFixed(2)+' | '+v.w.toFixed(2)+' | '+v.bRight.toFixed(2)+' m</span>'}});
"""
    s=s.replace('function bindDrag()',event+'function bindDrag()',1)
s=s.replace("const s=e.detail?.globals?.widgetState?.privateContent;if(s){", "const s=e.detail?.globals?.widgetState?.privateContent;if(s&&s.previewVersion===2){")
s=s.replace("if(globalThis.Tweak){const design={layout:state.layout};new Tweak({container:root.querySelector('.phone'),onChange:()=>{state.layout=design.layout;render();persist()}}).addSelect(design,'layout',{label:'Editor layout',options:['Studio','Guided']})}", '')
s=s.replace('\nrender();\n', '\ninitLogoStudies();\nrender();\n',1) if '\ninitLogoStudies();\n' not in s else s
css=(folder/'review-updates.css').read_text(encoding='utf-8')
if '<style id="review-update-styles">' in s:
    s=re.sub(r'<style id="review-update-styles">.*?</style>',lambda _:'<style id="review-update-styles">\n'+css+'\n</style>',s,flags=re.S)
else:
    s+='\n<style id="review-update-styles">\n'+css+'\n</style>\n'
p.write_text(s,encoding='utf-8')
print('Applied review-only UI updates.')
