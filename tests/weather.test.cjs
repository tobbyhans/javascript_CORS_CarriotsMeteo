const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
function setup() {
  const nodes = {}, plots = [], handlers = {};
  function $(id) {
    if (!nodes[id]) nodes[id] = {
      value: '', text(v) { this.value = v; return this; },
      css() { return this; }, val(v) { this.value = v; return this; },
      knob() { return this; }, trigger() { return this; },
      show() { this.visible = true; return this; }, hide() { this.visible = false; return this; },
      empty() { this.value = ''; return this; },
      off(event) { delete handlers[id + event]; return this; },
      on(event, fn) { handlers[id + event] = fn; return this; }
    };
    return nodes[id];
  }
  $.plot = (...args) => plots.push(args);
  class XHR {
    constructor() { this.withCredentials = false; this.headers = {}; XHR.last = this; }
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(k,v) { this.headers[k] = v; }
    send() { this.sent = true; }
  }
  const charts = [];
  const context = { $, XMLHttpRequest: XHR, Charts: {initOtherCharts: (...args) => charts.push(args)} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'carriotsMeteo/js/corsTest.js'),'utf8'), context);
  return {context, nodes, charts, handlers, plots, XHR};
}
function rows(n) {
  return Array.from({length:n},(_,i)=>({at:1700000000-i*3600,
    data:{temp:-5,wind_speed:10,hum:50,wind_dir:90,uv_rad:1}}));
}
for (const n of [1, 2, 25, 26]) test(`supports ${n} records and preserves negative temperatures`,()=>{
  const s=setup(); s.context.decodeJson(JSON.stringify({result:rows(n)}));
  assert.equal(s.charts.length,4);
  assert.equal(s.charts[1][2][0][1],-5);
  assert.match(s.nodes['#nowTemp'].value, /-5 °C/);
  assert.equal(s.charts[1][2].length, Math.min(n,25));
});
for (const response of ['bad JSON','null','{}','{"result":[]}',JSON.stringify({result:[{at:1,data:{}}]})]) {
  test(`rejects invalid response ${response.slice(0,30)}`,()=>{
    const s=setup();assert.throws(()=>s.context.decodeJson(response)); assert.equal(s.charts.length,0);
  });
}
test('rejects HTML, blanks, nulls and non-finite values before rendering',()=>{
  for (const value of ['<img src=x onerror=alert(1)>','',null,'Infinity',true]) {
    const s=setup(), data=rows(1);data[0].data.temp=value;
    assert.throws(()=>s.context.decodeJson(JSON.stringify({result:data})));
    assert.equal(s.nodes['#nowTemp'],undefined);
  }
});
test('sorts data chronologically and restricts graphs to 24 hours',()=>{
  const s=setup(), data=rows(30).reverse();
  s.context.decodeJson(JSON.stringify({result:data}));
  const points=s.charts[0][2];assert.equal(points.length,25);
  assert.ok(points.every((p,i)=>!i || points[i-1][0] <= p[0]));
});
test('request uses only supported headers and handles success',()=>{
  const s=setup();s.context.makeCorsRequest('GET','https://example.invalid');
  const xhr=s.XHR.last;assert.deepEqual(Object.keys(xhr.headers).sort(),['Accept','carriots.apiKey']);
  assert.equal(xhr.timeout,15000);assert.equal(xhr.sent,true);
  xhr.status=200;xhr.responseText=JSON.stringify({result:rows(1)});xhr.onload();
  assert.equal(s.nodes['#weather-error'].visible,false);
});
for (const mode of ['http','json','empty','network','timeout']) test(`handles ${mode} failure and clears stale data`,()=>{
  const s=setup();s.context.makeCorsRequest('GET','https://example.invalid');const xhr=s.XHR.last;
  s.context.decodeJson(JSON.stringify({result:rows(1)}));
  if(mode==='network') xhr.onerror();
  else if(mode==='timeout') xhr.ontimeout();
  else {xhr.status=mode==='http'?503:200;xhr.responseText=mode==='empty'?'{}':'bad JSON';xhr.onload();}
  assert.equal(s.nodes['#weather-error'].visible,true);
  assert.equal(s.nodes['#nowTemp'].value,'—');assert.equal(s.nodes['#chart_grow1'].value,'');
});
test('binds only one hover handler per chart after repeated renders',()=>{
  const s=setup();vm.runInContext(fs.readFileSync(path.join(root,'carriotsMeteo/js/charts.js'),'utf8'),s.context);
  for(let repeat=0;repeat<3;repeat++) for(let id=1;id<=4;id++) s.context.Charts.initOtherCharts('°C',id,[[1,-5]]);
  assert.equal(Object.keys(s.handlers).length,4);
  assert.equal(s.nodes['.chart'],undefined);
});
test('HTML uses HTTPS, removes missing assets and avoids resize refetches',()=>{
  const html=fs.readFileSync(path.join(root,'carriotsMeteo/index.html'),'utf8');
  assert.ok(!html.includes('http://'));assert.ok(!html.includes("bind('resize'"));
  assert.ok(!html.includes('js/jquery-todo/css/styles.css'));assert.ok(!html.includes('js/fullcalendar/fullcalendar.min.css'));
  assert.equal((html.match(/src="js\/jQuery-slimScroll-1.3.0\/jquery.slimscroll.min.js"/g)||[]).length,1);
  assert.ok(html.includes('id="weather-error"'));assert.ok(html.includes('try { MapsGoogle.init(); } catch'));
});
