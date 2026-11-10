from pathlib import Path
p=Path(__file__).resolve().parent/'phone-review-v3.js'
s=p.read_text(encoding='utf-8')
s=s.replace("${state.doors.map(d=>{", "${furniturePlanArt()}${state.doors.map(d=>{")
s=s.replace("const box=canvas.getBoundingClientRect(),x=(e.clientX-box.left)/box.width*342,y=(e.clientY-box.top)/box.height*340;", "if(e.target.closest('button'))return;const svg=canvas.querySelector('svg'),pt=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse()),x=pt.x,y=pt.y;")
s=s.replace("if(!state.doorTool)return;if(Math.abs(x-220)", "if(!state.doorTool){const pending=state.items.find(i=>i.pending&&(i.room||'living')===state.room);if(pending){pending.pending=false;bridge.move(pending.id,(x-20)/50,(y-220)/50,true)}return}if(Math.abs(x-220)")
extra="""
function furniturePlanArt(){return state.items.filter(i=>(i.room||'living')===state.room).map(i=>{const a=asset(i.asset),w=a.width*50,d=a.depth*50;return `<g data-plan-item="${i.id}" transform="translate(${20+i.x*50} ${220+i.z*50}) rotate(${-i.yaw*180/Math.PI})"><rect x="${-w/2}" y="${-d/2}" width="${w}" height="${d}" rx="3" fill="${i.locked?'#c4c6c1':'#d6c5a5'}" stroke="${i.id===state.selected?'#926b34':'#938b7d'}" stroke-width="${i.id===state.selected?2:1}" ${i.pending?'stroke-dasharray="4 2"':''}/>${i.locked?'<text x="0" y="4" text-anchor="middle" font-size="10" fill="#43505a">L</text>':''}</g>`}).join('')}
let planDrag=null;
root.addEventListener('pointerdown',e=>{const g=e.target.closest('[data-plan-item]'),canvas=e.target.closest('[data-plan]');if(!g||!canvas||state.doorTool||state.drawMode||state.view!=='2d')return;const item=state.items.find(i=>i.id===g.dataset.planItem);if(!item||item.locked||(!state.quickMove&&item.id!==state.selected))return;checkpoint();state.selected=item.id;planDrag={id:item.id,px:e.clientX,py:e.clientY,x:item.x,z:item.z,canvas};canvas.setPointerCapture(e.pointerId)});
root.addEventListener('pointermove',e=>{if(!planDrag)return;const d=planDrag,svg=d.canvas.querySelector('svg'),matrix=svg.getScreenCTM().inverse(),a=new DOMPoint(d.px,d.py).matrixTransform(matrix),b=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix);bridge.move(d.id,d.x+(b.x-a.x)/50,d.z+(b.y-a.y)/50,false);const item=state.items.find(i=>i.id===d.id),g=svg.querySelector(`[data-plan-item="${d.id}"]`);g?.setAttribute('transform',`translate(${20+item.x*50} ${220+item.z*50}) rotate(${-item.yaw*180/Math.PI})`)});
root.addEventListener('pointerup',()=>{if(planDrag){const item=state.items.find(i=>i.id===planDrag.id);planDrag=null;bridge.move(item.id,item.x,item.z,true)}});
"""
if 'function furniturePlanArt' not in s:s=s.replace("window.addEventListener('ois:3dready'",extra+"\nwindow.addEventListener('ois:3dready'")
p.write_text(s,encoding='utf-8')
