const MARKER = 'data-carte-viewer-mobile-pan="1"';
const COMPATIBLE_SIGNATURES = [
  "map.addEventListener('pointerdown'",
  "map.addEventListener('pointermove'",
  'function render()'
];

const OPTIMIZER = `
<style data-carte-viewer-mobile-pan="1">
#map{touch-action:none;overscroll-behavior:contain}
</style>
<script data-carte-viewer-mobile-pan="1">
(()=>{
  try{
    if(typeof map==='undefined'||typeof state==='undefined'||typeof world!=='function'||typeof lonLat!=='function'||typeof render!=='function')return;
    const panLayers=[];
    if(typeof tiles!=='undefined'&&tiles)panLayers.push(tiles);
    if(typeof svg!=='undefined'&&svg)panLayers.push(svg);
    const cvPointers=new Map();
    let cvDrag=null,cvPinch=null,cvFrame=0,cvPending=null;
    const clampZoom=z=>Math.max(2,Math.min(24,z));
    const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const paint=()=>{
      cvFrame=0;if(!cvPending)return;
      const {dx=0,dy=0,scale=1,originX=0,originY=0}=cvPending;cvPending=null;
      for(const layer of panLayers){layer.style.transformOrigin=originX+'px '+originY+'px';layer.style.transform='translate3d('+dx+'px,'+dy+'px,0) scale('+scale+')';}
    };
    const queuePaint=p=>{cvPending=p;if(!cvFrame)cvFrame=requestAnimationFrame(paint);};
    const resetLayers=()=>{for(const layer of panLayers){layer.style.transform='';layer.style.transformOrigin='';layer.style.willChange='';}};
    const beginPinch=()=>{
      if(cvPointers.size<2)return;
      const [a,b]=[...cvPointers.values()].slice(0,2),mid=midpoint(a,b),rect=map.getBoundingClientRect();
      cvDrag=null;
      cvPinch={distance:Math.max(1,distance(a,b)),mid,centerWorld:world(state.center[0],state.center[1],state.zoom),zoom:state.zoom,originX:mid.x-rect.left,originY:mid.y-rect.top};
      for(const layer of panLayers)layer.style.willChange='transform';
    };
    map.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      e.stopImmediatePropagation();cvPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      try{map.setPointerCapture(e.pointerId)}catch{}
      if(cvPointers.size>=2){beginPinch();return;}
      cvDrag={x:e.clientX,y:e.clientY,centerWorld:world(state.center[0],state.center[1],state.zoom),pointerId:e.pointerId};
      for(const layer of panLayers)layer.style.willChange='transform';map.classList.add('dragging');
    },true);
    map.addEventListener('pointermove',e=>{
      if(!cvPointers.has(e.pointerId))return;
      e.preventDefault();e.stopImmediatePropagation();cvPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(cvPinch&&cvPointers.size>=2){
        const [a,b]=[...cvPointers.values()].slice(0,2),mid=midpoint(a,b),ratio=Math.max(.25,Math.min(4,distance(a,b)/cvPinch.distance));
        queuePaint({dx:mid.x-cvPinch.mid.x,dy:mid.y-cvPinch.mid.y,scale:ratio,originX:cvPinch.originX,originY:cvPinch.originY});return;
      }
      if(cvDrag)queuePaint({dx:e.clientX-cvDrag.x,dy:e.clientY-cvDrag.y});
    },true);
    const finish=e=>{
      if(!cvPointers.has(e.pointerId))return;
      e.preventDefault();e.stopImmediatePropagation();
      const ended=cvPointers.get(e.pointerId);cvPointers.delete(e.pointerId);
      if(cvPinch){
        const remaining=[...cvPointers.values()];
        const other=remaining[0]||ended;
        const endDistance=Math.max(1,distance(ended,other));
        const ratio=Math.max(.25,Math.min(4,endDistance/cvPinch.distance));
        const newZoom=clampZoom(cvPinch.zoom+Math.log2(ratio));
        const endMid=midpoint(ended,other),dx=endMid.x-cvPinch.mid.x,dy=endMid.y-cvPinch.mid.y;
        const anchorWorld=[cvPinch.centerWorld[0]+cvPinch.originX-map.clientWidth/2,cvPinch.centerWorld[1]+cvPinch.originY-map.clientHeight/2];
        const factor=2**(newZoom-cvPinch.zoom);
        const newCenterWorld=[anchorWorld[0]*factor-(cvPinch.originX+dx-map.clientWidth/2),anchorWorld[1]*factor-(cvPinch.originY+dy-map.clientHeight/2)];
        state.zoom=newZoom;state.center=lonLat(newCenterWorld[0],newCenterWorld[1],newZoom);cvPinch=null;cvDrag=null;
      }else if(cvDrag){
        const dx=ended.x-cvDrag.x,dy=ended.y-cvDrag.y,nw=[cvDrag.centerWorld[0]-dx,cvDrag.centerWorld[1]-dy];state.center=lonLat(nw[0],nw[1],state.zoom);cvDrag=null;
      }
      cvPending=null;if(cvFrame){cancelAnimationFrame(cvFrame);cvFrame=0;}resetLayers();map.classList.remove('dragging');
      try{map.releasePointerCapture(e.pointerId)}catch{}render();
      if(cvPointers.size===1){const [id,p]=cvPointers.entries().next().value;cvDrag={x:p.x,y:p.y,centerWorld:world(state.center[0],state.center[1],state.zoom),pointerId:id};}
    };
    map.addEventListener('pointerup',finish,true);map.addEventListener('pointercancel',finish,true);
    document.documentElement.dataset.carteViewerMobilePan='1';
  }catch(error){console.warn('Optimisation tactile de la carte non appliquée',error);}
})();
<\/script>`;

export function enhanceMapHtml(html) {
  if (typeof html !== 'string' || html.includes(MARKER)) return html;
  if (!COMPATIBLE_SIGNATURES.every(signature => html.includes(signature))) return html;
  const bodyClose = html.toLowerCase().lastIndexOf('</body>');
  if (bodyClose === -1) return html + OPTIMIZER;
  return html.slice(0, bodyClose) + OPTIMIZER + '\n' + html.slice(bodyClose);
}
