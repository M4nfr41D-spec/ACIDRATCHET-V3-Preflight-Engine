/* Run after installing Playwright. CHROMIUM_PATH optionally selects a local binary. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=process.env.APP_ROOT?path.resolve(process.env.APP_ROOT):path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain','Cache-Control':'no-store'});res.end(fs.readFileSync(file));}
  catch{res.writeHead(404).end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const fallback of [false,true]){
      const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
      if(fallback)await context.addInitScript(()=>{window.AudioWorkletNode=undefined;});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base);
      await page.selectOption('#referencePath','0');
      await page.selectOption('#mufflerMode','50');
      await page.evaluate(()=>setParamLive('overdrive',42));
      await page.evaluate(()=>setFocus(1));
      assert.equal(await page.inputValue('#referencePath'),'100');
      await page.selectOption('#mufflerMode','100');
      await page.evaluate(()=>setParamLive('filterFM',63));
      await page.evaluate(()=>setFocus(0));
      assert.equal(await page.inputValue('#referencePath'),'0');
      assert.equal(await page.inputValue('#mufflerMode'),'50');
      assert.deepEqual(await page.evaluate(()=>[UI.overdrive,UI.filterFM]),[42,0]);
      await page.reload();
      assert.equal(await page.inputValue('#referencePath'),'0');
      assert.equal(await page.inputValue('#mufflerMode'),'50');
      assert.equal(await page.evaluate(()=>UI.overdrive),42);
      await page.evaluate(()=>setFocus(1));
      assert.deepEqual(await page.evaluate(()=>[UI.filterFM,UI.muffler]),[63,100]);
      // Start with B focused: A and B must still receive their own parameter snapshots.
      await page.locator('#playTop').click();
      await page.waitForFunction(()=>ready&&running);
      assert.match(await page.textContent('#engineBadge'),fallback?/ScriptProcessor/:/AudioWorklet/);
      await page.waitForFunction(()=>{const b=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(b);return b.some(x=>Math.abs(x)>.0001);},null,{timeout:10000});
      const pushed=await page.evaluate(()=>{
        const calls={a:{},b:{}},pa=P,pb=P2;
        P=(k,v)=>{calls.a[k]=v;pa(k,v);};P2=(k,v)=>{calls.b[k]=v;pb(k,v);};
        pushAll();P=pa;P2=pb;return calls;
      });
      assert.equal(pushed.a.overdrive,.42);assert.equal(pushed.a.filterFM,0);
      assert.ok(Math.abs(pushed.b.overdrive-.1645)<1e-12);assert.equal(pushed.b.filterFM,.63);
      await page.locator('#playTop').click();
      for(const id of ['referencePath','mufflerMode']){
        const rect=await page.locator('#'+id).boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=390,id+' mobile bounds');
      }
      await page.evaluate(()=>{applyVbChar('303 BASS',true);setFocus(1);});
      await page.selectOption('#responseMode','100');await page.reload();await page.evaluate(()=>setFocus(1));
      assert.equal(await page.inputValue('#responseMode'),'100');
      assert.deepEqual(errors,[]);
      console.log((fallback?'ScriptProcessor':'AudioWorklet')+': audio, voice routing, persistence and mobile controls passed');
      if(process.env.QA_SCREENSHOT&&!fallback){
        await page.screenshot({path:process.env.QA_SCREENSHOT,fullPage:true});
        await page.setViewportSize({width:1280,height:960});await page.evaluate(()=>window.scrollTo(0,0));
        await page.screenshot({path:process.env.QA_SCREENSHOT.replace('.png','-desktop.png')});
      }
      await context.close();
    }
  }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
