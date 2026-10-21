// Baut das WordPress-Plugin: Suite verkleinert + Namen verschleiert, Plugin-PHP dazu.
// Aufruf:  cd wp && npm install && npm run build   ->  wp/dist/acidratchet/ (+ ZIP, falls "zip" vorhanden)
import { minify as minifyHtml } from 'html-minifier-terser';
import { minify as minifyJs } from 'terser';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(HERE, 'dist', 'acidratchet');
const APP = path.join(OUT, 'app');

const YEAR = 2026;
const NOTICE = `© ${YEAR} Manfred Foissner · ACIDRATCHET · Alle Rechte vorbehalten. Proprietär – Kopieren, Weitergeben oder Wiederverwenden, ganz oder in Teilen, ist untersagt.`;

const HTML = ['index.html', 'ACIDRATCHET_TD3MO_TRANSLATOR.html', 'ACIDRATCHET_FX_LAB.html', 'ACIDRATCHET_SONGBOOK.html'];
const JS = ['acidratchet-voice.js', 'acidratchet-patterns.js', 'acidratchet-fx-core.js', 'sw.js'];
const COPY = ['manifest.webmanifest', 'acidratchet-fx-preset.schema.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

// Lokale Namen kürzen, Kommentare weg, Rechenreihenfolge NICHT anfassen (kein unsafe_math):
// die Klang-Engine muss bitgleich rechnen. Top-Level-Namen bleiben, weil die Dateien sich
// gegenseitig darüber finden (makeVoice, ARFX ...).
const TERSER = {
  ecma: 2020,
  compress: { passes: 2, unsafe: false, unsafe_math: false, keep_fargs: true, drop_console: false },
  mangle: { toplevel: false },
  format: { comments: false, ascii_only: false },
};

fs.rmSync(path.join(HERE, 'dist'), { recursive: true, force: true });
fs.mkdirSync(APP, { recursive: true });

let before = 0, after = 0;
for (const f of JS) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const r = await minifyJs(src, TERSER);
  const out = `/*! ${NOTICE} */\n` + r.code;
  fs.writeFileSync(path.join(APP, f), out);
  before += src.length; after += out.length;
}
for (const f of HTML) {
  const raw = fs.readFileSync(path.join(ROOT, f), 'utf8');
  // Data-URIs vor dem Verkleinern herausnehmen und danach unverändert zurücksetzen:
  // der CSS-Minifier liest sonst Teile des Base64 als Einheiten ("0ex" -> "0").
  const keep = [];
  const src = raw.replace(/data:[a-z]+\/[a-z0-9+.-]+;base64,[A-Za-z0-9+\/=]+/g, (m) => `ARDATA${keep.push(m) - 1}X`);
  const min = await minifyHtml(src, {
    collapseWhitespace: true, conservativeCollapse: true, removeComments: true,
    minifyCSS: true, minifyJS: TERSER, decodeEntities: false,
    removeAttributeQuotes: false, keepClosingSlash: true, caseSensitive: true,
  });
  const out = min.replace(/ARDATA(\d+)X/g, (_, i) => keep[+i]);
  if (keep.some((d) => !out.includes(d))) throw new Error('Data-URI verloren in ' + f);
  const res = out.replace(/^<!doctype html>/i, `<!DOCTYPE html><!-- ${NOTICE} -->`);
  fs.writeFileSync(path.join(APP, f), res);
  before += raw.length; after += res.length;
}
for (const f of COPY) fs.copyFileSync(path.join(ROOT, f), path.join(APP, f));

for (const f of fs.readdirSync(path.join(HERE, 'plugin'))) {
  fs.copyFileSync(path.join(HERE, 'plugin', f), path.join(OUT, f));
}
// Version aus index.html ins Plugin übernehmen
const ver = (fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/var VER="([^"]+)"/) || [, '0'])[1];
const php = path.join(OUT, 'acidratchet.php');
fs.writeFileSync(php, fs.readFileSync(php, 'utf8').replaceAll('{{APPVER}}', ver));

console.log(`App ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB, Version ${ver}`);
try {
  execSync('rm -f acidratchet-wp.zip && zip -qr -X acidratchet-wp.zip acidratchet', { cwd: path.join(HERE, 'dist') });
  console.log('ZIP: wp/dist/acidratchet-wp.zip');
} catch { console.log('zip nicht gefunden – Ordner wp/dist/acidratchet selbst zippen'); }
