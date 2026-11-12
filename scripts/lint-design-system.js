/**
 * Designvakt för Dejz – körs i `npm run lint` och stoppar bygget vid fel.
 *
 * Allt utseende ska komma från designsystemet (src/index.css), så att hela appen kan få
 * ny design genom att ändra på ett ställe. Den här kontrollen stoppar:
 *  1. Tailwind-standardfärger (t.ex. text-emerald-600) → använd text-positive / negative / caution
 *  2. Hex-färger i klassnamn (t.ex. bg-[#5B3DF5])       → använd en variabel (bg-brand, var(--…))
 *  3. Egna textstorlekar 10–15 px (t.ex. text-[13px])  → använd text-micro/caption/meta/footnote/callout/subhead
 *  4. Egna hörnradier ≥ 12 px (t.ex. rounded-[16px])   → använd rounded-card, rounded-modal …
 *
 * Undantag: illustrationer och temaförhandsvisningar där färgerna ÄR innehållet.
 * Se DESIGN_SYSTEM.md.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

/** Filer där färgerna är själva innehållet (konst, temaförhandsvisning, marknadsföring). */
const EXEMPT = new Set([
  'src/components/ui/VisualArtwork.tsx', // sparmålsillustrationer
  'src/components/settings/AppearanceSettingsView.tsx', // förhandsvisning av ljust/mörkt tema
  'src/components/WaitlistLanding.tsx', // marknadsföringssida med egna mockups
]);

const PALETTE =
  'red|rose|pink|fuchsia|purple|violet|indigo|blue|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|slate|gray|zinc|neutral|stone';
const RULES = [
  {
    re: new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(?:text|bg|border|ring|from|via|to|fill|stroke|divide|outline|decoration|shadow|placeholder)-(?:${PALETTE})-\\d{2,3}(?:/\\d+)?(?![\\w-])`, 'g'),
    msg: 'Tailwind-standardfärg – använd positive/negative/caution, brand eller var(--…)',
  },
  {
    re: /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border|ring|from|via|to|fill|stroke|outline|decoration|shadow)-\[[^\]]*#[0-9a-fA-F]{3,8}[^\]]*\]/g,
    msg: 'Hex-färg i klassnamn – lägg färgen som variabel i index.css',
  },
  {
    re: /(?<![\w-])(?:[a-z0-9-]+:)*text-\[(?:10|11|12|13|14|15)px\]/g,
    msg: 'Egen textstorlek – använd text-micro/caption/meta/footnote/callout/subhead',
  },
  {
    re: /(?<![\w-])(?:[a-z0-9-]+:)*rounded(?:-[trbl]{1,2})?-\[(?:1[2-9]|[2-9]\d)px\]/g,
    msg: 'Egen hörnradie – använd rounded-card, rounded-modal, rounded-pill …',
  },
];

const problems = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(tsx|ts)$/.test(e.name)) check(full);
  }
}
function check(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (EXEMPT.has(rel)) return;
  fs.readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      for (const rule of RULES) {
        for (const m of line.matchAll(rule.re)) problems.push(`${rel}:${i + 1}  ${m[0]}  → ${rule.msg}`);
      }
    });
}

walk(SRC);
if (problems.length) {
  console.error(`\x1b[31m✖ Designvakt: ${problems.length} avvikelse(r) från designsystemet\x1b[0m`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('\x1b[32m✔ Designvakt: allt följer designsystemet\x1b[0m');
