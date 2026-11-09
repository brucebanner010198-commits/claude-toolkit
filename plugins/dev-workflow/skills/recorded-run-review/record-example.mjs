// Reference recorder. Adapt the URLs, selectors and steps to the app under review.
// Usage: node record-example.mjs <mode>   (mode names the stack: e.g. noai | ai)
// Needs Playwright importable; point the import at the project's node_modules/playwright.
import { chromium } from 'PATH/TO/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const mode = process.argv[2];
const base = process.env.BASE_URL;                    // the isolated frontend for this mode
// Always a fresh run: the output folder is new for every run (timestamped), and the app's data
// folder (database, uploads, keys) must be empty or absent. Refuse to start otherwise.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = `/tmp/<project>_recorded_run/${mode}_${stamp}`;    // keep until the user says to delete it
if (fs.existsSync(out)) throw new Error(`Not a fresh run: ${out} already exists`);
const dataDir = process.env.FRESH_DATA_DIR;           // the isolated stack's data folder for this run
if (!dataDir) throw new Error('Set FRESH_DATA_DIR to the isolated stack data folder');
if (fs.existsSync(dataDir) && fs.readdirSync(dataDir).length)
  throw new Error(`Not a fresh run: ${dataDir} is not empty. Start a new stack on a new folder.`);
fs.mkdirSync(out, { recursive: true });
const notes = [];
const note = (m) => { notes.push(m); console.log('NOTE', m); };
let n = 0, step = 'start';

const browser = await chromium.launch({ slowMo: 250 });   // slow enough to follow in the video
// First-time user: a brand-new, empty context. No storageState (no cookies, local storage or
// saved login), no service workers, no permissions granted. Never reuse a persistent profile.
const ctx = await browser.newContext({
  storageState: undefined, serviceWorkers: 'block', permissions: [],
  acceptDownloads: true, viewport: { width: 1280, height: 900 },
  recordVideo: { dir: out, size: { width: 1280, height: 900 } },
});
const page = await ctx.newPage();
page.on('console', m => m.type() === 'error' && note(`[${step}] console error: ${m.text().slice(0, 160)}`));
page.on('pageerror', e => note(`[${step}] page error: ${e.message}`));
page.on('response', r => r.status() >= 400 && note(`[${step}] HTTP ${r.status()} ${r.request().method()} ${r.url()}`));

const BAD = [/undefined/, /NaN/, /\[object/, /Traceback/, /Internal server error/];
async function shot(name) {                              // call after every step
  step = name; n += 1;
  await page.waitForTimeout(1500);
  const file = `${String(n).padStart(2, '0')}_${name}`;
  await page.screenshot({ path: `${out}/${file}.png`, fullPage: true });
  const text = await page.innerText('body');
  fs.writeFileSync(`${out}/${file}.txt`, text);
  for (const re of BAD) if (re.test(text)) note(`[${name}] screen text matches ${re}`);
}

await page.goto(base, { waitUntil: 'networkidle' });
// Prove the start was empty: no cookies before the app set any.
const cookies = await ctx.cookies();
if (cookies.length) note(`[start] NOT a first-time start: ${cookies.length} cookie(s) present`);
await shot('first_screen');
// ... act as the real user: fill forms, upload the real files, use the assistant, wait for
// in-flight indicators to disappear, download generated files, share, reload ...

fs.writeFileSync(`${out}/NOTES.txt`, notes.length ? notes.join('\n') : 'No problems detected by the automatic checks.');
await ctx.close();   // the video is finalized when the context closes
await browser.close();
