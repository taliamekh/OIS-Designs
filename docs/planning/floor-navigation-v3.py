from pathlib import Path
p=Path(__file__).resolve().parent/'phone-review-v3.js'
s=p.read_text(encoding='utf-8')
s=s.replace('<h2>${title}</h2></div>${state.page', '${state.page===\'editor\'?`<button class="project-title" data-go="house" aria-label="Project floors"><h2>${title}</h2>${icon(\'chevron-down\')}</button>`:`<h2>${title}</h2>`}</div>${state.page')
s=s.replace("${option('Ground floor','Living room, kitchen and hall','layers','editor')}${option('First floor','Bedroom, bathroom and landing','layers','editor')}", "<button class=\"entry\" data-floor-level=\"0\">${icon('layers')}<span class=\"entry-copy\"><strong>Ground floor</strong><small>Living room, kitchen and hall</small></span></button><button class=\"entry\" data-floor-level=\"1\">${icon('layers')}<span class=\"entry-copy\"><strong>First floor</strong><small>Bedroom, bathroom and landing</small></span></button>")
s=s.replace("if(b.dataset.room){", "if(b.dataset.floorLevel!==undefined){state.floorLevel=Number(b.dataset.floorLevel);state.room=state.floorLevel?'bedroom':'living';state.selected=null;go('editor');return}\n if(b.dataset.room){")
p.write_text(s,encoding='utf-8')
