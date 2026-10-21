const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source=fs.readFileSync(process.env.VOICE_PATH||require('node:path').join(__dirname,'../acidratchet-voice.js'),'utf8');
const context = vm.createContext({});
vm.runInContext(source,context);
const SR=48000;
function fixture(os=2,sr=SR){
  const voice=context.makeVoice(sr,os); let frame=0;
  return {voice, render(count){ const out=new Float32Array(count); for(let i=0;i<count;i+=128){const block=out.subarray(i,Math.min(i+128,count));voice.process(block,block.length,frame);frame+=block.length;}return out;}};
}
test('same-pitch tied step is identical to one sustained note',()=>{
  const a=fixture(),b=fixture();
  a.voice.note(0,36,0,1);a.voice.note(.1,36,1,0);
  b.voice.note(0,36,0,0);
  assert.deepEqual(a.render(12000),b.render(12000));
});
test('slide slews pitch CV symmetrically upwards and downwards',()=>{
  const up=fixture(),down=fixture();
  up.voice.note(0,36,0,1);up.voice.note(.1,48,0,0);
  down.voice.note(0,48,0,1);down.voice.note(.1,36,0,0);
  up.render(7200);down.render(7200);
  const u=up.voice.getState(),d=down.voice.getState();
  assert.ok(u.pitch>36&&u.pitch<48);
  assert.ok(Math.abs(u.pitch+d.pitch-84)<1e-9);
});
test('a rest or panic breaks the previous slide connection',()=>{
  for(const panic of [false,true]){
    const f=fixture();f.voice.note(0,36,0,1);f.render(4800);
    if(panic)f.voice.panic();else {f.voice.off(.1);f.render(128);}
    f.voice.note(.11,48,0,0);f.render(1000);
    assert.equal(f.voice.getState().pitch,48);
    assert.equal(f.voice.getState().gate,true);
  }
});
test('accent at zero has no added sweep or volume boost, but retains accent decay',()=>{
  const a=fixture(),b=fixture();
  for(const f of [a,b]){f.voice.setP('accent',0);f.render(48000);}
  a.voice.note(1,36,1,0);b.voice.note(1,36,0,0);
  a.render(4800);b.render(4800);
  const accented=a.voice.getState(),normal=b.voice.getState();
  assert.ok(accented.accentSweep<1e-12);
  assert.ok(Math.abs(accented.volumeEnvelope-normal.volumeEnvelope)<1e-12);
  assert.ok(accented.filterEnvelope<normal.filterEnvelope);
});
test('consecutive accents retain charge and build a larger sweep',()=>{
  const f=fixture();f.voice.note(0,36,1,0);f.voice.off(.08);f.voice.note(.1,36,1,0);
  f.render(2400);const first=f.voice.getState().accentSweep;
  f.render(4800);assert.ok(f.voice.getState().accentSweep>first);
});
test('303 path removes the parallel body, extended path retains it',()=>{
  function audio(body,reference){const f=fixture();f.voice.setP('body',body);f.voice.setP('reference',reference);f.render(SR);f.voice.note(1,36,0,0);return f.render(4096);}
  const clean=audio(0,1),ref=audio(1,1),extended=audio(1,0);
  assert.deepEqual(clean,ref);
  assert.notDeepEqual(ref,extended);
});
test('post distortion does not change the filter input or FM source',()=>{
  function run(dist){const f=fixture();f.voice.setP('dist',dist);f.render(SR);f.voice.note(1,36,1,0);const audio=f.render(4096);return {audio,state:f.voice.getState()};}
  const clean=run(0),dirty=run(1);
  assert.equal(clean.state.filterOutput,dirty.state.filterOutput);
  assert.equal(clean.state.filterFM,dirty.state.filterFM);
  assert.notDeepEqual(clean.audio,dirty.audio);
});
test('drive, Muffler and audio filter FM each affect the sound independently',()=>{
  function run(params){const f=fixture();for(const [k,v] of Object.entries(params))f.voice.setP(k,v);f.render(SR);f.voice.note(1,36,1,0);return f.render(6000);}
  const baseline=run({overdrive:.3});
  for(const params of [{overdrive:.8},{overdrive:.3,muffler:.5},{overdrive:.3,muffler:1},{overdrive:.3,filterFM:.7}])assert.notDeepEqual(baseline,run(params));
});
test('zero filter drive removes the oscillator carrier from the reference path',()=>{
  const f=fixture();f.voice.setP('overdrive',0);f.voice.setP('reso',0);f.render(SR);f.voice.note(1,36,0,0);
  assert.ok(f.render(4096).every(x=>Math.abs(x)<1e-12));
});
test('oversampling preserves envelope and slide time constants',()=>{
  const states=[];
  for(const os of [1,2,4]){const f=fixture(os);f.voice.note(0,36,1,1);f.voice.note(.1,48,0,0);f.render(12000);states.push(f.voice.getState());}
  for(const s of states.slice(1))for(const key of ['pitch','filterEnvelope','accentSweep'])assert.ok(Math.abs(s[key]-states[0][key])<.0001,key);
  assert.equal(states[1].latencyFrames,24);
  assert.equal(states[2].latencyFrames,24);
});
test('extreme controls stay finite without filter resets at supported rates',()=>{
  const fastMake=new Function(source+';return makeVoice;')();
  for(const sr of [44100,48000,96000])for(const os of [1,2,4])for(let wave=0;wave<5;wave++){
    const v=fastMake(sr,os);
    for(const [k,x]of Object.entries({wave,cutoff:1,reso:1,env:1,accent:1,overdrive:1,filterFM:1,muffler:1,dist:1,squelch:1,sub:1,detune:1,reference:0}))v.setP(k,x);
    v.note(0,84,1,1);v.note(.04,36,1,0);v.off(.08);const b=new Float32Array(128);
    for(let frame=0;frame<sr*.12;frame+=128){v.process(b,128,frame);for(const x of b)assert.ok(Number.isFinite(x)&&Math.abs(x)<1.2);}
    assert.equal(v.getState().stabilityResets,0);
  }
});
test('2x decimation suppresses selected folded harmonics in a driven 3011 Hz tone',()=>{
  const make=new Function(source+';return makeVoice;')();
  function foldedEnergy(os){
    const v=make(SR,os),frequency=3011,n=16384;
    for(const [k,x]of Object.entries({cutoff:1,env:0,reso:0,accent:0,dist:1,dirty:1,overdrive:.25,tone:1}))v.setP(k,x);
    v.note(0,69+12*Math.log2(frequency/440),0,0);let frame=0,b=new Float32Array(128);
    while(frame<SR){v.process(b,128,frame);frame+=128;}
    const out=new Float32Array(n);for(let i=0;i<n;i+=128){v.process(out.subarray(i,i+128),128,frame);frame+=128;}
    function energy(f){let re=0,im=0;for(let i=0;i<n;i++){const w=.5-.5*Math.cos(2*Math.PI*i/(n-1)),p=2*Math.PI*f*i/SR;re+=out[i]*w*Math.cos(p);im+=out[i]*w*Math.sin(p);}return re*re+im*im;}
    let alias=0;for(let h=9;h<=15;h++)alias+=energy(Math.abs(SR-h*frequency));return alias/energy(frequency);
  }
  // Narrow regression case, not a claim about broadband or all-preset SNR.
  assert.ok(foldedEnergy(2)<foldedEnergy(1)*.01);
});
