async function grow(page,factor){return page.evaluate(factor=>{
 window.__qaTextBases??=new WeakMap();const changes=[];
 for(const el of document.querySelectorAll('body *')){
  if(['STYLE','SCRIPT','NOSCRIPT','PATH'].includes(el.tagName))continue;
  const direct=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()),input=['INPUT','TEXTAREA'].includes(el.tagName);if(!direct&&!input)continue;
  const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')continue;
  const base=window.__qaTextBases.get(el)??{size:parseFloat(cs.fontSize),line:cs.lineHeight==='normal'?parseFloat(cs.fontSize)*1.25:parseFloat(cs.lineHeight)};
  if(!Number.isFinite(base.size)||!Number.isFinite(base.line))continue;window.__qaTextBases.set(el,base);
  el.style.setProperty('font-size',base.size*factor+'px','important');el.style.setProperty('line-height',base.line*factor+'px','important');
  changes.push({text:(el.textContent||el.getAttribute('aria-label')||'').slice(0,70),before:base.size,after:parseFloat(getComputedStyle(el).fontSize)});
 }
 return {nodes:changes.length,actuallyGrew:changes.some(v=>v.after>v.before*1.4),samples:changes.slice(0,15)};
},factor);}
async function actionGeometry(locator){await locator.scrollIntoViewIfNeeded();return locator.evaluate(el=>{
 const r=el.getBoundingClientRect(),clip={left:0,top:0,right:innerWidth,bottom:innerHeight};
 for(let parent=el.parentElement;parent;parent=parent.parentElement){const cs=getComputedStyle(parent),b=parent.getBoundingClientRect();if(['auto','scroll','hidden','clip'].includes(cs.overflowX)){clip.left=Math.max(clip.left,b.left);clip.right=Math.min(clip.right,b.right);}if(['auto','scroll','hidden','clip'].includes(cs.overflowY)){clip.top=Math.max(clip.top,b.top);clip.bottom=Math.min(clip.bottom,b.bottom);}}
 const visible=Math.max(0,Math.min(r.right,clip.right)-Math.max(r.left,clip.left))*Math.max(0,Math.min(r.bottom,clip.bottom)-Math.max(r.top,clip.top))/(r.width*r.height||1);
 const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),textBoxes=[],splitWords=[];let node;while(node=walker.nextNode())if(node.textContent.trim()){const range=document.createRange();range.selectNodeContents(node);for(const b of range.getClientRects())textBoxes.push({text:node.textContent.trim(),x:b.x,y:b.y,width:b.width,height:b.height,outsideControl:b.left<r.left-2||b.right>r.right+2||b.top<r.top-2||b.bottom>r.bottom+2,outsideClip:b.left<clip.left-2||b.right>clip.right+2||b.top<clip.top-2||b.bottom>clip.bottom+2});for(const word of node.textContent.matchAll(/\S+/g)){range.setStart(node,word.index);range.setEnd(node,word.index+word[0].length);const boxes=[...range.getClientRects()].filter(b=>b.width>0);if(boxes.length>1)splitWords.push({word:word[0],fragments:boxes.length});}}
 return {label:el.getAttribute('aria-label'),box:{x:r.x,y:r.y,width:r.width,height:r.height},visibleFraction:visible,textBoxes,splitWords};
});}

module.exports={grow,actionGeometry};
