import test from 'node:test';
import assert from 'node:assert/strict';
import { enhanceMapHtml } from '../mobile-pan.mjs';

const mapHtml = `<!doctype html><html><body><div id="map"></div><script>
const map=document.getElementById('map'),tiles=document.getElementById('tiles'),svg=document.getElementById('overlay');
const state={center:[2,48],zoom:16};
function world(){} function lonLat(){} function render(){}
let drag=null;map.addEventListener('pointerdown',e=>{});map.addEventListener('pointermove',e=>{render()});map.addEventListener('pointerup',e=>{});
</script></body></html>`;

test('injects mobile pan optimization into compatible generated maps', () => {
  const out = enhanceMapHtml(mapHtml);
  assert.match(out, /data-carte-viewer-mobile-pan="1"/);
  assert.match(out, /touch-action:none/);
  assert.match(out, /stopImmediatePropagation/);
  assert.match(out, /translate3d/);
});

test('does not alter unrelated html', () => {
  const plain = '<!doctype html><html><body>Hello</body></html>';
  assert.equal(enhanceMapHtml(plain), plain);
});

test('is idempotent', () => {
  const once = enhanceMapHtml(mapHtml);
  assert.equal(enhanceMapHtml(once), once);
});
