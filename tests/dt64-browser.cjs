/* Photo -> shared pack -> Songbook banks/chain -> synth, including bank 128. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  try {
    res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : 'text/html');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage']});
    const context = await browser.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const base = 'http://127.0.0.1:' + server.address().port;
    await page.goto(base);
    const before = await page.evaluate(() => ({ui: {...UI}, wave, dirty, drumPat: {...drumPat}, b: JSON.stringify(stepsB), banks: localStorage.getItem('ar_banks')}));
    const notes = [
      [40,40,40,40,40,40,47,40,40,40,40,40,40,40,40,59],
      [40,40,40,40,40,40,47,40,40,48,40,40,59,40,43,40],
      [40,40,40,40,40,40,40,40,36,40,40,47,40,40,43,40]
    ];
    const accents = [[16], [10,13], [3,6,9,12,15]], slides = [[16], [10,13], []];
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', {name: 'DT64 PATTERN ' + (i + 1), exact: true}).click();
      const actual = await page.evaluate(() => ({notes: steps.map(s => s.note), accents: steps.flatMap((s, i) => s.accent ? [i+1] : []), slides: steps.flatMap((s, i) => s.slide ? [i+1] : []), on: steps.every(s => s.on === 1), len: patLen}));
      assert.deepEqual(actual, {notes: notes[i], accents: accents[i], slides: slides[i], on: true, len: 16});
    }
    assert.deepEqual(await page.evaluate(() => ({ui: {...UI}, wave, dirty, drumPat: {...drumPat}, b: JSON.stringify(stepsB), banks: localStorage.getItem('ar_banks')})), before);
    await page.goto(base + '/ACIDRATCHET_SONGBOOK.html');
    assert.equal(await page.locator('.set').count(), 7);
    assert.equal(await page.locator('.set').first().locator('.part').count(), 3);
    assert.match(await page.locator('.set').first().textContent(), /Grundoktave E2 angenommen/);
    await page.locator('#target').fill('126');
    const saved = await page.evaluate(() => localStorage.getItem('ar_banks'));
    await page.locator('[data-go="dt64"]').click();
    const imported = await page.evaluate(() => ({banks: JSON.parse(localStorage.getItem('ar_banks')), chain: JSON.parse(localStorage.getItem('ar_chain'))}));
    assert.equal(imported.banks.banks.length, 128);
    assert.deepEqual(imported.banks.banks.slice(0,125), JSON.parse(saved).banks.slice(0,125));
    assert.deepEqual(imported.banks.names.slice(0,125), JSON.parse(saved).names.slice(0,125));
    assert.deepEqual(imported.chain, {chain: [125,126,127], on: true});
    assert.match(await page.locator('#st_dt64').textContent(), /126–128/);
    const popupPromise = page.waitForEvent('popup');
    await page.locator('[data-open="dt64"]').click();
    const synth = await popupPromise;
    synth.on('pageerror', e => errors.push(e.message));
    await synth.waitForLoadState();
    assert.match(synth.url(), /arBank=126/);
    assert.deepEqual(await synth.evaluate(() => steps.map(s => s.note)), notes[0]);
    assert.equal(await synth.evaluate(() => curBank), 125);
    assert.deepEqual(await synth.evaluate(() => chain), [125,126,127]);
    await synth.close();
    await page.locator('#target').fill('126');
    await page.locator('[data-go="nightfall"]').click();
    assert.equal(await page.inputValue('#target'), '124');
    assert.match(await page.locator('#st_nightfall').textContent(), /124–128/);
    assert.deepEqual(errors, []);
    console.log('DT64: all 48 notes, accents, slides, isolated synth loading, three-bank handoff, bank 128 and five-part regression passed');
    await context.close();
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; server.close(); });
