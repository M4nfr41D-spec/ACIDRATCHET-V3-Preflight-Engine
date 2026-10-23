const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=new Function(fs.readFileSync(process.env.CONTROLS_PATH||path.join(__dirname,'../acidratchet-controls.js'),'utf8')+';return globalThis.ARControls;')();
test('Direct preserves the raw parameter scale and Sweetspot preserves endpoints',()=>{
  for(const k of ['reso','overdrive','filterFM']){
    let prior=-1;
    for(let i=0;i<=1000;i++){
      const direct=C.toVoice({[k]:i/10,response:0})[k];assert.ok(Math.abs(direct-i/1000)<1e-12);
      const v=C.toVoice({[k]:i/10,response:100})[k];assert.ok(v>=prior-1e-12&&v>=0&&v<=1+1e-12);prior=v;
    }
    assert.ok(Math.abs(prior-1)<1e-12);
  }
});
test('Sweetspot drive gives unity at 20 and 5x at 80, with fine FM at mid travel',()=>{
  const gain=x=>Math.expm1(Math.log(67.6)*C.toVoice({response:100,overdrive:x}).overdrive);
  assert.ok(Math.abs(gain(20)-1)<1e-12);assert.ok(Math.abs(gain(80)-5)<1e-12);
  assert.equal(C.toVoice({response:100,filterFM:50}).filterFM,.25);
});
test('legacy preview conversion retains its cutoff, resonance and envelope laws',()=>{
  const p=C.fromTranslator({cutoff:58,resonance:68,env_mod:72,decay:44,accent:70,distortion:32});
  const v=C.toVoice(p);
  assert.equal(p.response,0);
  assert.ok(Math.abs(36*Math.pow(150,v.cutoff)-55*Math.pow(115,.58))<1e-9);
  assert.ok(Math.abs(v.reso-Math.pow(.68,1.18))<1e-12);
  assert.ok(Math.abs(v.env-Math.pow(.72,1.05))<1e-12);
});
test('all tone presets round-trip through translator storage without parameter loss',()=>{
  for(const preset of C.PRESETS){const c=C.toTranslator(preset.values,{drum_level:73,custom:'keep'});assert.equal(c.custom,'keep');assert.equal(c.drum_level,73);assert.deepEqual(C.toVoice(C.fromTranslator(c)),C.toVoice(preset.values));}
});
test('response anchors have continuous slopes',()=>{
  for(const k of ['reso','overdrive'])for(const x of k==='reso'?[35,85]:[20,80]){
    const f=v=>C.toVoice({response:100,[k]:v})[k],h=.0001;
    assert.ok(Math.abs((f(x)-f(x-h))/h-(f(x+h)-f(x))/h)<.0001);
  }
});
test('all starting tones render audible, finite audio without filter resets',()=>{
  const make=new Function(fs.readFileSync(process.env.VOICE_PATH||path.join(__dirname,'../acidratchet-voice.js'),'utf8')+';return makeVoice;')();
  for(const preset of C.PRESETS){
    const v=make(48000,2);Object.entries(C.toVoice(preset.values)).forEach(([k,x])=>v.setP(k,x));
    v.note(0,36,1,1);v.note(.12,48,0,0);v.off(.24);
    const b=new Float32Array(128);let energy=0;
    for(let frame=0;frame<16000;frame+=128){v.process(b,b.length,frame);for(const x of b){assert.ok(Number.isFinite(x)&&Math.abs(x)<1.2);energy+=x*x;}}
    assert.ok(energy/16000>1e-6,preset.name+' audible');assert.equal(v.getState().stabilityResets,0);
  }
});
