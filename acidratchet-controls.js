/* Shared knob values, response curves and tone-only presets. No DSP dependencies. */
(function(global){
  'use strict';
  const DEFAULTS={tune:0,cutoff:42,reso:74,env:62,decay:55,accent:62,dist:20,tone:55,level:82,gate:62,slide:40,body:45,squelch:0,lfoRate:30,lfoDepth:0,sub:0,detune:0,pwm:50,attack:0,release:0,reference:100,overdrive:16.45,filterFM:0,muffler:0,response:0,wave:0,dirty:0,lfoWave:0,lfoTarget:0};
  const ALIASES={tune:'frequency',reso:'resonance',env:'env_mod',dist:'distortion'};
  const bounded=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
  // Monotone cubic Hermite interpolation: continuous slope at every anchor.
  function curve(x,xs,ys){
    x=bounded(x,0,1);const n=xs.length,d=[],m=[];
    for(let i=0;i<n-1;i++)d[i]=(ys[i+1]-ys[i])/(xs[i+1]-xs[i]);
    m[0]=d[0];m[n-1]=d[n-2];
    for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:2/(1/d[i-1]+1/d[i]);
    let i=0;while(i<n-2&&x>xs[i+1])i++;
    const h=xs[i+1]-xs[i],t=(x-xs[i])/h,t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*m[i+1];
  }
  function normalize(p){
    const out={...DEFAULTS};
    for(const k of Object.keys(out))if(Number.isFinite(+p?.[k]))out[k]=bounded(+p[k],k==='tune'?-24:k==='gate'?10:0,k==='tune'?24:100);
    return out;
  }
  function toVoice(p){
    p=normalize(p);const out={};
    for(const k of Object.keys(p))if(k!=='response'&&k!=='gate')out[k]=['tune','wave','dirty','lfoWave','lfoTarget'].includes(k)?p[k]:p[k]/100;
    if(p.response>=50){
      out.reso=curve(p.reso/100,[0,.35,.85,1],[0,.70,.92,1]);
      const drive=curve(p.overdrive/100,[0,.20,.80,1],[0,1,5,66.6]);
      out.overdrive=Math.log1p(drive)/Math.log(67.6);
      out.filterFM=Math.pow(p.filterFM/100,2);
    }
    return out;
  }
  function format(k,value,p){
    if(k==='overdrive')return Math.expm1(Math.log(67.6)*toVoice({...p,overdrive:value}).overdrive).toFixed(2)+'×';
    if(k==='tune')return (value>0?'+':'')+Number(value.toFixed(1))+' st';
    return String(Number(value.toFixed(1)));
  }
  function fromTranslator(c={}){
    const p={...DEFAULTS,level:100};
    for(const k of Object.keys(p)){const v=c[ALIASES[k]||k];if(Number.isFinite(+v))p[k]=+v;}
    if(!c.controlVersion){
      // Reproduce the old preview's cutoff/resonance/envelope interpretation.
      p.cutoff=100*bounded(Math.log(55*Math.pow(115,p.cutoff/100)/36)/Math.log(150),0,1);
      p.reso=100*Math.pow(bounded(p.reso/100,0,1),1.18);
      p.env=100*Math.pow(bounded(p.env/100,0,1),1.05);
      p.attack=p.attack*Math.sqrt(1.5/31)/.22;
      p.response=0;p.gate=c.gate??(10+(.72-.06)*90/.94);
    }
    return normalize(p);
  }
  function toTranslator(p,extra={}){
    p=normalize(p);const out={...extra,controlVersion:1};
    for(const k of Object.keys(p))out[ALIASES[k]||k]=p[k];
    return out;
  }
  const PRESETS=[
    {id:'liquid',name:'303 LIQUID',values:{...DEFAULTS,response:100,overdrive:20,cutoff:38,reso:62,env:58,decay:48,accent:68,dist:10,level:72}},
    {id:'bite',name:'DEVIL BITE',values:{...DEFAULTS,response:100,overdrive:57,cutoff:43,reso:73,env:65,decay:40,accent:78,dist:16,muffler:50,level:68}},
    {id:'edge',name:'FM EDGE',values:{...DEFAULTS,response:100,overdrive:44,filterFM:38,cutoff:41,reso:76,env:60,decay:47,accent:74,muffler:50,dist:10,level:65}}
  ];
  function bindDial(el,opt){
    let drag=null;
    el.tabIndex=0;el.setAttribute('role','slider');
    el.style.touchAction='none';
    const min=()=>typeof opt.min==='function'?opt.min():opt.min;
    const max=()=>typeof opt.max==='function'?opt.max():opt.max;
    function paint(){const v=opt.get();el.setAttribute('aria-valuemin',min());el.setAttribute('aria-valuemax',max());el.setAttribute('aria-valuenow',v);if(opt.paint)opt.paint(v);}
    function set(v){const step=opt.step||.1;opt.set(bounded(Math.round(v/step)*step,min(),max()));paint();}
    el.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();el.focus();el.setPointerCapture(e.pointerId);drag={id:e.pointerId,y:e.clientY,value:opt.get()};});
    el.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const fine=e.shiftKey||e.altKey||opt.fine?.();set(drag.value+(drag.y-e.clientY)*(max()-min())/220*(fine ? .1 : 1));});
    const end=e=>{if(drag&&drag.id===e.pointerId)drag=null;};
    el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',()=>{drag=null;});
    el.addEventListener('dblclick',()=>set(typeof opt.reset==='function'?opt.reset():opt.reset));
    el.addEventListener('keydown',e=>{
      const fine=e.shiftKey||e.altKey||opt.fine?.(),amount=fine?(opt.step||.1):Math.max(1,opt.step||.1);
      const delta={ArrowUp:amount,ArrowRight:amount,ArrowDown:-amount,ArrowLeft:-amount,PageUp:amount*10,PageDown:-amount*10}[e.key];
      if(delta!==undefined||e.key==='Home'||e.key==='End'){e.preventDefault();e.stopPropagation();set(e.key==='Home'?min():e.key==='End'?max():opt.get()+delta);}
    });
    paint();return paint;
  }
  function upgradeRanges(root,options={}){
    const paints=[];
    root.querySelectorAll('.knob-field input[type=range]').forEach(input=>{
      input.step=input.id==='previewFreq'?'1':input.id==='previewOverdrive'?'.01':'.1';input.hidden=true;input.tabIndex=-1;
      const el=document.createElement('div');el.className='ar-rotary';el.dataset.input=input.id;
      const label=input.parentElement.querySelector('label');
      el.setAttribute('aria-label',label?.querySelector('span')?.textContent||input.id);
      input.before(el);
      const paint=bindDial(el,{get:()=>+input.value,set:v=>{input.value=v;input.dispatchEvent(new Event('input',{bubbles:true}));},min:+input.min,max:+input.max,step:+input.step,reset:+input.defaultValue,fine:options.fine,
        paint:v=>{el.style.setProperty('--angle',(-135+(v-input.min)/(input.max-input.min)*270)+'deg');}});
      input.addEventListener('input',paint);input.addEventListener('change',paint);paints.push(paint);
    });
    return ()=>paints.forEach(paint=>paint());
  }
  global.ARControls=Object.freeze({DEFAULTS,PRESETS,curve,normalize,toVoice,fromTranslator,toTranslator,format,bindDial,upgradeRanges});
})(typeof window!=='undefined'?window:globalThis);
