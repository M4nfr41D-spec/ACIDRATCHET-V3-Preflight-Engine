/* ACIDRATCHET Voice-Engine — EINE Quelle fuer ACIDRATCHET und das Pattern Studio.
   Lag die Engine zweimal im Code, driftete sie auseinander: der Studio-Vorhoerer
   hatte eine naive Einpol-Kaskade mit tanh statt der ZDF-Diodenleiter, erreichte
   die Selbstoszillation nie und klang messbar dumpfer (Energie ueber 2 kHz 1,3%
   gegen 7,2%). Seither holen sich beide Werkzeuge makeVoice() von hier.
   index.html baut daraus zusaetzlich den AudioWorklet per makeVoice.toString().
   v7.5 candidate: tied-gate envelopes, pitch-CV slides, independent Devil Fish
   paths and full-chain oversampling. This is a functional virtual-analog model,
   not a measured component-level reproduction of a particular hardware unit. */
function makeVoice(sr,os){
  os=os===1?1:(os===4?4:2);
  var dspRate=sr*os;
  // Windowed-sinc anti-alias FIR. Audio is generated at dspRate, then decimated.
  // 24 base-rate frames of group delay for both 2x and 4x (0.5 ms at 48 kHz).
  var taps=os===1?1:48*os+1, fir=new Float64Array(taps), history=new Float64Array(taps),write=0;
  var sum=0,cut=.45/os;
  for(var j=0;j<taps;j++){
    var x=j-(taps-1)/2;
    var w=taps===1?1:.42-.5*Math.cos(2*Math.PI*j/(taps-1))+.08*Math.cos(4*Math.PI*j/(taps-1));
    fir[j]=taps===1?1:(x===0?2*cut:Math.sin(2*Math.PI*cut*x)/(Math.PI*x))*w;sum+=fir[j];
  }
  for(var j=0;j<taps;j++)fir[j]/=sum;
  var raw={tune:0,cutoff:0.42,reso:0.74,env:0.62,decay:0.55,accent:0.62,dist:0.20,tone:0.55,level:0.82,slide:0.40,wave:0,dirty:0,body:0.45,squelch:0.0,lfoRate:0.30,lfoDepth:0.0,lfoWave:0,sub:0.0,detune:0.0,pwm:0.5,attack:0.0,release:0.0,lfoTarget:0,bpm:132,lfoSync:0,reference:1,overdrive:0.1645,filterFM:0,muffler:0};
  var sm=Object.assign({},raw);
  var phase=0,phase2=0,subPhase=0,shPhase=0,shVal=0,freq=110,target=110,gliding=false,syncP=0;
  var stabilityResets=0;
  var gate=false,pitch=45,targetPitch=45,fmSignal=0,fmDC=0,mufflerLP=0,lastFilterOutput=0;
  var envF=0,vca=0,vcaStage='off',prevSlide=false,peak=0.8,sus=0.6;
  var accCharge=0,accSweep=0,accFast=0,lp2=0;   /* TB-303 accent sweep circuit state */
  var superPhases=new Float64Array(4),superRatios=new Float64Array(4);
  var s0=0,s1=0,s2=0,s3=0,lp=0,dcx=0,dcy=0,lfoPhase=0,bodyLP=0,events=[];
  function mtof(m){return 440*Math.pow(2,(m-69)/12);}
  function wsClean(x,k){ return Math.tanh(x*k)/Math.tanh(k); }
  function diodeSat(x){ return x>=0 ? Math.tanh(x*0.36)*2.7778 : Math.tanh(x*0.486)*2.0576; } // Phase2: unity Kleinsignal-Gain beidseitig, asym. Saettigungsdecke (+2.78/-2.06) = Dioden-Charakter
  function wsDirty(x,k){ return Math.tanh(x*k*1.7+0.10)-0.0997; }
  function blep(t,dt){ if(t<dt){t/=dt;return t+t-t*t-1;} else if(t>1-dt){t=(t-1)/dt;return t*t+t+t+1;} return 0; }
  function trig(ev){
    targetPitch=ev.note+sm.tune; target=mtof(targetPitch);
    var tied=gate&&prevSlide,acc=ev.acc>0.5;
    if(tied){
      // A tied step changes pitch only: the gate and envelopes remain continuous.
      gliding=true;
    } else {
      pitch=targetPitch; freq=target; gliding=false; envF=1; vcaStage='att';
      if(acc){ accCharge+=0.95*sm.accent; if(accCharge>2.0)accCharge=2.0; accFast=1; }
      else { accFast=0; }
      peak=0.78+(acc?0.22*sm.accent:0); sus=peak*(0.70+(acc?0.12*sm.accent:0));
    }
    gate=true; prevSlide=ev.sld>0.5;
  }
  return {
    getState:function(){ return {gate:gate,pitch:pitch,targetPitch:targetPitch,filterEnvelope:envF,volumeEnvelope:vca,accentSweep:accSweep,filterOutput:lastFilterOutput,filterFM:fmSignal,oversampling:os,latencyFrames:(taps-1)/(2*os),stabilityResets:stabilityResets}; },
    setP:function(k,v){ raw[k]=v; },
    note:function(at,note,acc,sld){ events.push({s:Math.round(at*sr),k:'n',note:note,acc:acc,sld:sld}); events.sort(function(a,b){return a.s-b.s;}); if(events.length>256)events.splice(0,events.length-256); },
    off:function(at){ events.push({s:Math.round(at*sr),k:'o'}); events.sort(function(a,b){return a.s-b.s;}); if(events.length>256)events.splice(0,events.length-256); },
    panic:function(){ gate=false; prevSlide=false; gliding=false; events.length=0; accCharge=0; accSweep=0; accFast=0; if(vcaStage!=='off')vcaStage='rel'; },
    process:function(ch,n,frame0){
      var r=raw,kk,sc=1-Math.exp(-n/(0.010*sr));
      for(kk in r){ sm[kk]+=(r[kk]-sm[kk])*sc; }
      var wave=Math.round(r.wave),dirty=r.dirty>0.5,lfoWave=Math.round(r.lfoWave);
      var baseHz=36*Math.pow(150,sm.cutoff);   /* MF88.2-Kalibrierung: 36..5400 Hz = 7.2 Oktaven. Mit 200..4400 (4.5 Okt) fehlte unten der dunkle Bereich ganz, der Regler spannte nur Faktor 2 statt 9. */              // 200..4400Hz = 303-Sweetspot ueber den GANZEN Knopfweg (20..20k verbriet halben Weg im Subbass)
      var envDepth=sm.env*4.0;                            // OCTAVES of env filter sweep (the 303 grip)
      var resoK=Math.pow(sm.reso,0.88)*4.5;   /* Exponent 0.88 aus MF88.2: verteilt die Resonanz ueber den ganzen Reglerweg. Mit 1.25 passierte bis Reso 85 fast nichts und dann sprang es. Skala 4.5 statt 3.95, weil diese ZDF-Leiter die Selbstoszillation sonst nicht mehr erreicht — das Zirpen setzt jetzt ab Reso 90 ein. Keine Daempfung. */               // Self-Osc-Onset ~94%: davor steigendes Zirpen, ab Anschlag Pfeifen (statt Dauer-Brutalton ab 85%)
      var coefF=Math.exp(-1/((0.05*Math.pow(40,sm.decay))*dspRate));   // normal filter-env decay 0.05..2.0s
      var coefFacc=Math.exp(-1/(0.11*dspRate));                       // ACCENT = fastest filter decay (~110ms)
      /* --- TB-303 ACCENT SWEEP CIRCUIT (modeled after Devilfish reverse-engineering) --- */
      var accDrain=Math.exp(-1/((0.22+sm.decay*0.10)*dspRate));       // cap drains slowly -> fast accents climb
      var accLagTau=0.002+sm.reso*sm.reso*0.020;                 // reso sets sweep speed: low=pulse, high=wow
      var accLagCoef=1-Math.exp(-1/(accLagTau*dspRate));
      var accFiltDepth=0.55+sm.reso*1.05;                       // accent->filter depth scaled by resonance
      var coefG=1-Math.exp(-1/((0.020+sm.slide*0.30)*dspRate));
      var attCoef=1-Math.exp(-1/((0.0006+sm.attack*0.12)*dspRate)),decCoef=1-Math.exp(-1/(0.016*dspRate)),relCoef=1-Math.exp(-1/(((0.008+sm.decay*0.06)+sm.release*0.5)*dspRate));
      // Oscillator drive is independent of the post-VCA distortion control.
      var preDrive=1.4*Math.expm1(Math.log(67.6)*sm.overdrive),distA=sm.dist;
      var fmCoupling=1-Math.exp(-2*Math.PI*5/dspRate),mufflerCoef=1-Math.exp(-2*Math.PI*120/dspRate);
      var lfoTarget=Math.round(r.lfoTarget||0);
      /* Tempo-Sync: der Rate-Regler waehlt dann eine Notenlaenge statt freier Hertz. */
      var LFODIV=[4,2,1,0.5,1/3,0.25,1/6,0.125];
      var lfoHz; if(r.lfoSync>0.5){ var di=Math.round(sm.lfoRate*(LFODIV.length-1)); if(di<0)di=0; if(di>LFODIV.length-1)di=LFODIV.length-1;
        lfoHz=1/((60/Math.max(40,Math.min(260,sm.bpm)))*LFODIV[di]); } else { lfoHz=0.1*Math.pow(160,sm.lfoRate); }
      var lfoAmt=sm.lfoDepth, lfoOct=(lfoTarget===0?sm.lfoDepth*2.0:0), lfoInc=lfoHz/dspRate;
      var toneLpCoef=1-Math.exp(-2*Math.PI*800/dspRate), toneT=sm.tone, level=sm.level;
      var deScrCoef=1-Math.exp(-2*Math.PI*6800/dspRate);   // gentle de-scratch corner ~6.8kHz
      var bodyAmt=sm.body*0.55*(1-sm.reference);                                   // echter Koerper (kein Reso-Coupling)
      var bodyCoef=1-Math.exp(-2*Math.PI*260/dspRate);                 // Body = Oszillator tiefpass ~260Hz
      var detAmt=sm.detune*0.9, detRatio=Math.pow(2,(sm.detune*24)/1200), subAmt=sm.sub*0.95, pw=sm.pwm<0.06?0.06:(sm.pwm>0.94?0.94:sm.pwm);
      var spread=.003+detAmt*.022;
      superRatios[0]=1+spread;superRatios[1]=1-spread*.97;superRatios[2]=1+spread*2.05;superRatios[3]=1-spread*1.98;
      var dcPole=Math.pow(.9985,1/os);
      var TWO_PI=6.283185307179586, fcMax=Math.min(12000,dspRate*.45)  /* v5.5-Wert. Mit 6800 lief fc beim Notenanschlag ab Cutoff 59 in die Decke, darueber aenderte der Regler nichts mehr. Die Resonanz wird NICHT gedaempft — nur die Frequenz bekommt wieder Platz. */;           // Sweep-Endpunkt wie Hardware (~303-Bereich). Self-Osc bleibt HOERBAR statt 10k-Traeger der nur den Comp duckt
      for(var i=0;i<n;i++){
        while(events.length && events[0].s<=frame0+i){ var ev=events.shift(); if(ev.k==='n')trig(ev); else { gate=false; prevSlide=false; gliding=false; if(vcaStage!=='off')vcaStage='rel'; } }
        for(var ov=0;ov<os;ov++){
        if(gliding){ pitch+=(targetPitch-pitch)*coefG; if(Math.abs(targetPitch-pitch)<0.0001){pitch=targetPitch;gliding=false;} freq=mtof(pitch); }
        envF*=(accFast?coefFacc:coefF);
        accCharge*=accDrain; accSweep+=(accCharge-accSweep)*accLagCoef;   /* lagged climb = wow */
        if(vcaStage==='att'){ vca+=(peak-vca)*attCoef; if(vca>=peak*0.98)vcaStage='dec'; }
        else if(vcaStage==='dec'){ vca+=(sus-vca)*decCoef; }
        else if(vcaStage==='rel'){ vca+=(0-vca)*relCoef; if(vca<0.0003){vca=0;vcaStage='off';} }
        lfoPhase+=lfoInc; if(lfoPhase>=1)lfoPhase-=1; var lfoVal=0; if(lfoAmt>0){ lfoVal = lfoWave===1?(1-2*lfoPhase) : lfoWave===2?(2*lfoPhase-1) : lfoWave===3?(lfoPhase<0.5?1:-1) : Math.sin(TWO_PI*lfoPhase); }
        var f=freq; if(lfoTarget===1){ f=freq*Math.pow(2,lfoAmt*lfoVal*0.5); } var dt=Math.min(.45,f/dspRate); phase+=dt; if(phase>=1)phase-=1;
        var pwM=pw; if(lfoTarget===2){ pwM=pw+lfoVal*lfoAmt*0.4; if(pwM<0.06)pwM=0.06; if(pwM>0.94)pwM=0.94; }
        var osc;
        if(wave===2){ shPhase+=dt; if(shPhase>=1){shPhase-=1;shVal=Math.random()*2-1;} osc=shVal; }
        else if(wave===1){ var sq=phase<pwM?1:-1; sq+=blep(phase,dt); var p2=phase+(1-pwM); if(p2>=1)p2-=1; sq-=blep(p2,dt); osc=sq*0.72; }
        else if(wave===3){ var sw0=2*phase-1; sw0-=blep(phase,dt); var ac2=sw0; for(var u=0;u<4;u++){ var du=dt*superRatios[u]; superPhases[u]+=du; if(superPhases[u]>=1)superPhases[u]-=1; var sx=2*superPhases[u]-1; sx-=blep(superPhases[u],du); ac2+=sx; } osc=ac2*0.40; }
        else if(wave===4){ var ratio=1.5+detAmt*2.6; if(phase<dt){ syncP=phase*ratio; if(syncP>=1)syncP-=Math.floor(syncP); } else { syncP+=dt*ratio; if(syncP>=1)syncP-=1; } var ss=2*syncP-1; ss-=blep(syncP,dt*ratio); osc=ss; }
        else { var sw=2*phase-1; sw-=blep(phase,dt); osc=sw; }
        if(detAmt>0 && wave<3){ phase2+=dt*detRatio; if(phase2>=1)phase2-=1; var sw2=2*phase2-1; sw2-=blep(phase2,dt*detRatio); osc=(osc+sw2*detAmt)/(1+detAmt*0.75); }
        if(subAmt>0){ subPhase+=dt*0.5; if(subPhase>=1)subPhase-=1; var subv=Math.tanh(2.5*Math.sin(TWO_PI*subPhase)); osc=(osc+subv*subAmt)/(1+subAmt*0.55); }
        var fc=baseHz*Math.pow(2, envDepth*envF + accSweep*accFiltDepth + lfoOct*lfoVal + sm.filterFM*2*Math.max(-3,Math.min(3,fmSignal)));   // env sweep + accent WOW + LFO
        if(fc<20)fc=20; if(fc>fcMax)fc=fcMax;
        var gt=Math.tan(Math.PI*fc/dspRate),G=gt/(1+gt),G2=G*G,G3=G2*G,G4=G3*G,dn=1/(1+gt); var k=resoK+sm.squelch*0.45+accSweep*0.14; if(lfoTarget===3){ k+=lfoVal*lfoAmt*0.85; } if(k<0)k=0;  // Tiefe hardware-plausibel: bis knapp ueber Self-Osc, nicht k=6.6   // Phase1: kein Ceiling, keine fc-Daempfung
        var pd=preDrive; if(lfoTarget===4){ pd=preDrive*(1+lfoVal*lfoAmt*0.8); if(pd<0)pd=0; }
        var accInputDrive=1+accSweep*0.10;                 // Accents also push the filter input slightly harder.
        var inSig=osc*pd*accInputDrive*(1+k*0.03),fout=0;
          /* TPT ladder approximation with feedback estimate and per-stage saturation. */
          var Ssum=(G3*s0+G2*s1+G*s2+s3)*dn;
          var u=diodeSat((inSig-k*diodeSat(Ssum))/(1+k*G4));   // sat im fb-Pfad: hungert parasitaeren Nyquist-Mode bei k>4 aus
          var y1=(gt*u +s0)*dn; s0=2*y1-s0; y1=diodeSat(y1);
          var y2=(gt*y1+s1)*dn; s1=2*y2-s1; y2=diodeSat(y2);
          var y3=(gt*y2+s2)*dn; s2=2*y3-s2; y3=diodeSat(y3);
          var y4=(gt*y3+s3)*dn; s3=2*y4-s3;
          fout=y4;
        if(s3!==s3||s3>8||s3<-8){s0=s1=s2=s3=0;fout=0;stabilityResets++;}   /* stability guard */
        lastFilterOutput=fout;
        var filt=fout*(1+k*0.09);
        bodyLP+=(osc-bodyLP)*bodyCoef;                    // ECHTER Body: tiefe Oszillator-Anteile (harmonisch verbunden)
        var body=bodyLP*bodyAmt;
        var trem=1; if(lfoTarget===5){ trem=1-lfoAmt*0.5*(1-lfoVal); if(trem<0)trem=0; }   // LFO-Ziel 5 = VCA (Tremolo), additiv
        var v=(filt+body)*vca*trem;
        // Functional Muffler approximation: clip upper-band peaks, preserve bass.
        mufflerLP+=(v-mufflerLP)*mufflerCoef;
        if(sm.muffler>0){
          var mh=v-mufflerLP,soft=Math.tanh(mh*1.6)/1.6,strong=Math.tanh(mh*3.2)/3.2;
          v=mufflerLP+(sm.muffler<=.5?mh*(1-2*sm.muffler)+soft*2*sm.muffler:soft*(2-2*sm.muffler)+strong*(2*sm.muffler-1));
        }
        // AC-coupled post-VCA/Muffler audio, before output level, drives filter FM.
        fmDC+=(v-fmDC)*fmCoupling; fmSignal=v-fmDC;
        var shaped=(dirty?wsDirty(v,1+distA*5.5):wsClean(v,1+distA*5.5))*(1/(1+distA*2.6));
        var y=v*(1-distA)+shaped*distA;                   // distortion = character, loudness-normalized
        lp+=(y-lp)*toneLpCoef; var bright=y-lp;
        y=lp*(1.0+(0.5-toneT)*0.9)+bright*(0.30+toneT*2.5);   // tone = tilt, not gain
        lp2+=(y-lp2)*deScrCoef; y=y*0.86+lp2*0.14;            // gentle de-scratch (subtle, output-dependent)
        y=y*level;
        var dyv=y-dcx+dcPole*dcy; dcx=y; dcy=dyv; y=dyv;
        history[write]=Math.tanh(y*0.9);if(++write===taps)write=0;
        }
        var out=0,idx=write;
        for(var tap=0;tap<taps;tap++){if(--idx<0)idx=taps-1;out+=fir[tap]*history[idx];}
        ch[i]=out;
      }
    }
  };
}
if(typeof window!=='undefined')window.makeVoice=makeVoice;
