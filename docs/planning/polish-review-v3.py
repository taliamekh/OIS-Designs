from pathlib import Path
p=Path(__file__).resolve().parent/'phone-review-3d.js'
s=p.read_text(encoding='utf-8')
s=s.replace("const b=new THREE.Box3().setFromObject(group),helper=new THREE.Box3Helper(b,item.locked?0x606e77:0xa8824d);scene.add(helper);geometries.push(helper.geometry);materials.push(helper.material)", "const b=new THREE.Box3().setFromObject(group),g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(b.min.x,.018,b.min.z),new THREE.Vector3(b.max.x,.018,b.min.z),new THREE.Vector3(b.max.x,.018,b.max.z),new THREE.Vector3(b.min.x,.018,b.max.z)]),m=new THREE.LineBasicMaterial({color:item.locked?0x606e77:0xa8824d});scene.add(new THREE.LineLoop(g,m));geometries.push(g);materials.push(m)")
s=s.replace("if(!moved){const h=hit(e);if(s.view==='walk')", "if(!moved){const h=hit(e);const pending=s.items.find(i=>i.pending&&(i.room||'living')===s.room);if(pending&&s.view!=='walk'){pending.pending=false;bridge.move(pending.id,h.point.x,h.point.z,true);return}if(s.view==='walk')")
p.write_text(s,encoding='utf-8')
