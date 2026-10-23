const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(process.env.APP_ROOT||path.join(__dirname,'..'));
const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;const f=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!f.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/acidratchet-voice.js*',route=>{
      const src=fs.readFileSync(path.join(root,'acidratchet-voice.js'),'utf8');
      const spy=route.request().frame().url().includes('TRANSLATOR')?`;const originalVoice=makeVoice;window.makeVoice=function(...args){const v=originalVoice(...args),set=v.setP.bind(v),off=v.off.bind(v);window.__params={};window.__offs=0;window.__voice=v;v.setP=(k,x)=>{window.__params[k]=x;set(k,x)};v.off=t=>{window.__offs++;off(t)};return v;};`:'';
      return route.fulfill({contentType:'application/javascript',body:src+spy});
    });
    const base='http://127.0.0.1:'+server.address().port;
    await page.goto(base+'/ACIDRATCHET_TD3MO_TRANSLATOR.html');
    assert.equal(await page.locator('input[type=range]:visible').count(),0);
    assert.ok(await page.locator('.ar-rotary').count()>=20);
    const cut=page.locator('[data-input="previewCutoff"]');
    await cut.press('Home');await cut.press('ArrowUp');assert.equal(await page.inputValue('#previewCutoff'),'1');
    await page.locator('#previewFine').click();await cut.press('ArrowUp');assert.equal(await page.inputValue('#previewCutoff'),'1.1');
    await page.locator('#previewFine').click();await cut.press('Home');
    async function dragKnob(){const b=await cut.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2-44,{steps:6});await page.mouse.up();}
    await dragKnob();assert.equal(await page.inputValue('#previewCutoff'),'20');
    await page.locator('#previewFine').click();await cut.press('Home');await dragKnob();assert.equal(await page.inputValue('#previewCutoff'),'2');
    const before=await page.locator('#steps').innerHTML();
    await page.getByRole('button',{name:'FM EDGE',exact:true}).click();
    assert.equal(await page.inputValue('#previewResponse'),'100');assert.equal(await page.inputValue('#previewFilterFM'),'38');
    assert.equal(await page.locator('#steps').innerHTML(),before);
    await page.locator('#previewPlay').click();
    await page.waitForFunction(()=>window.__params?.filterFM>0);
    assert.ok(Math.abs(await page.evaluate(()=>__params.filterFM)-.38*.38)<1e-12);
    await page.waitForFunction(()=>window.__offs>0);
    await page.waitForFunction(()=>window.__voice.getState().volumeEnvelope>0);
    const expected=await page.evaluate(()=>({...__params}));
    await page.locator('#previewPlay').click();
    await page.waitForTimeout(220);
    await page.reload();
    assert.equal(await page.inputValue('#previewFilterFM'),'38');assert.equal(await page.inputValue('#previewMuffler'),'50');
    await page.locator('#targetBank').fill('49');
    const popupPromise=page.waitForEvent('popup');await page.locator('#installBank').click();const synth=await popupPromise;
    synth.on('pageerror',e=>errors.push(e.message));await synth.waitForLoadState();
    assert.equal(await synth.evaluate(()=>UI.filterFM),38);assert.equal(await synth.evaluate(()=>UI.response),100);
    const actual=await synth.evaluate(()=>{const p={};pushVoiceSettings((k,v)=>p[k]=v,vpA);return p;});
    for(const [key,value] of Object.entries(expected))assert.ok(Math.abs(actual[key]-value)<1e-12,key+' forwarded unchanged');
    // A bank switch and persistence must retain the transferred tone metadata.
    await synth.evaluate(()=>{gotoBank(49);gotoBank(48);});assert.equal(await synth.evaluate(()=>UI.filterFM),38);
    await synth.reload();assert.equal(await synth.evaluate(()=>UI.filterFM),38);
    const bank=await synth.evaluate(()=>{setParamLive('filterFM',51);persistBank();return banks[48];});
    await synth.close();
    await page.locator('#importFile').setInputFiles({name:'tone-roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({banks:[bank],names:['Tone roundtrip']}))});
    await page.waitForFunction(()=>document.getElementById('previewFilterFM').value==='51');
    assert.equal(await page.inputValue('#previewResponse'),'100');
    await page.getByRole('button',{name:'Dub-Preset',exact:true}).click();
    assert.equal(await page.inputValue('#fxDelayMix'),'42');
    assert.match(await page.locator('[data-input="fxDelayMix"]').getAttribute('style'),/angle/);
    for(const id of ['previewOverdrive','previewFilterFM']){const b=await page.locator('[data-input="'+id+'"]').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=390);}
    if(process.env.QA_SCREENSHOT){await page.locator('#previewPlay').scrollIntoViewIfNeeded();await page.screenshot({path:process.env.QA_SCREENSHOT});await page.setViewportSize({width:1280,height:960});await page.locator('#previewPlay').scrollIntoViewIfNeeded();await page.screenshot({path:process.env.QA_SCREENSHOT.replace('.png','-desktop.png')});}
    assert.deepEqual(errors,[]);console.log('Translator: rotary controls, fine keys, new audio parameters, gate-off, persistence and synth handoff passed');
  }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
