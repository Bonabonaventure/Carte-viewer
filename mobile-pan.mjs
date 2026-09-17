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
    let cvDrag=null,cvFrame=0,cvPending=null;
    const paint=()=>{
      cvFrame=0;
      if(!cvPending)return;
      const [dx,dy]=cvPending;cvPending=null;
      for(const layer of panLayers)layer.style.transform='translate3d('+dx+'px,'+dy+'px,0)';
    };
    const queuePaint=(dx,dy)=>{cvPending=[dx,dy];if(!cvFrame)cvFrame=requestAnimationFrame(paint);};
    const resetLayers=()=>{for(const layer of panLayers){layer.style.transform='';layer.style.willChange='';}};
    map.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      e.stopImmediatePropagation();
      cvDrag={x:e.clientX,y:e.clientY,centerWorld:world(state.center[0],state.center[1],state.zoom),pointerId:e.pointerId};
      for(const layer of panLayers)layer.style.willChange='transform';
      try{map.setPointerCapture(e.pointerId)}catch{}
      map.classList.add('dragging');
    },true);
    map.addEventListener('pointermove',e=>{
      if(!cvDrag)return;
      e.preventDefault();e.stopImmediatePropagation();
      queuePaint(e.clientX-cvDrag.x,e.clientY-cvDrag.y);
    },true);
    const finish=e=>{
      if(!cvDrag)return;
      e.preventDefault();e.stopImmediatePropagation();
      const dx=e.clientX-cvDrag.x,dy=e.clientY-cvDrag.y;
      const nw=[cvDrag.centerWorld[0]-dx,cvDrag.centerWorld[1]-dy];
      state.center=lonLat(nw[0],nw[1],state.zoom);
      const pointerId=cvDrag.pointerId;cvDrag=null;cvPending=null;
      if(cvFrame){cancelAnimationFrame(cvFrame);cvFrame=0;}
      resetLayers();map.classList.remove('dragging');
      try{map.releasePointerCapture(pointerId)}catch{}
      render();
    };
    map.addEventListener('pointerup',finish,true);
    map.addEventListener('pointercancel',finish,true);
    document.documentElement.dataset.carteViewerMobilePan='1';
  }catch(error){console.warn('Optimisation du déplacement mobile non appliquée',error);}
})();
<\/script>`;

export function enhanceMapHtml(html) {
  if (typeof html !== 'string' || html.includes(MARKER)) return html;
  if (!COMPATIBLE_SIGNATURES.every(signature => html.includes(signature))) return html;
  const bodyClose = html.toLowerCase().lastIndexOf('</body>');
  if (bodyClose === -1) return html + OPTIMIZER;
  return html.slice(0, bodyClose) + OPTIMIZER + '\n' + html.slice(bodyClose);
}
