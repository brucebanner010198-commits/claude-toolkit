// Persistent recorded browser driver: one headed, video-recorded Chromium session that
// takes one command at a time over local HTTP, so a human-in-the-loop run (where each
// next action depends on what the app shows) can be driven step by step and still
// produce one continuous video plus a screenshot and text dump per step.
//
// Usage: PW=<path to node_modules/playwright> node driver-daemon.mjs <out_dir> [port]
// Commands: curl -s localhost:<port>/cmd -d '{"op":"goto","url":"http://127.0.0.1:8000"}'
//   ops: goto{url} click{sel} fill{sel,value} select{sel,value} check{sel} press{sel,key}
//        upload{sel,path} download{sel,dir} wait{sel,state,timeout} sleep{ms}
//        shot{name} text{sel?} eval{js} url{} close{}
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const { chromium } = await import(path.join(process.env.PW, 'index.mjs'));
const out = process.argv[2];
const port = Number(process.argv[3] || 9333);
// Always a fresh run: refuse a reused output folder, and require an empty or absent app data
// folder (FRESH_DATA_DIR = the isolated stack's database/uploads/keys folder).
if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Error(`Not a fresh run: ${out} is not empty`);
if (!process.env.FRESH_DATA_DIR) throw new Error('Set FRESH_DATA_DIR to the isolated stack data folder');
if (fs.existsSync(process.env.FRESH_DATA_DIR) && fs.readdirSync(process.env.FRESH_DATA_DIR).length)
  throw new Error(`Not a fresh run: ${process.env.FRESH_DATA_DIR} is not empty. Start a new stack on a new folder.`);
fs.mkdirSync(out, { recursive: true });
const notes = [];
const note = (m) => { notes.push(`${new Date().toISOString()} ${m}`); fs.writeFileSync(`${out}/NOTES.txt`, notes.join('\n')); };
let n = 0, step = 'start';

const browser = await chromium.launch({ headless: false, slowMo: 150 });
// First-time user: a brand-new, empty context (no storageState, service workers blocked, no
// permissions). Never reuse a persistent profile.
const ctx = await browser.newContext({
  storageState: undefined, serviceWorkers: 'block', permissions: [],
  acceptDownloads: true, viewport: { width: 1360, height: 900 },
  recordVideo: { dir: out, size: { width: 1360, height: 900 } },
});
const page = await ctx.newPage();
page.on('console', m => ['error', 'warning'].includes(m.type()) && note(`[${step}] console ${m.type()}: ${m.text().slice(0, 300)}`));
page.on('pageerror', e => note(`[${step}] page error: ${e.message}`));
page.on('response', r => r.status() >= 400 && note(`[${step}] HTTP ${r.status()} ${r.request().method()} ${r.url()}`));
page.on('dialog', d => { note(`[${step}] dialog ${d.type()}: ${d.message()}`); d.dismiss().catch(() => {}); });

const BAD = [/\bundefined\b/, /\bNaN\b/, /\[object/, /Traceback/, /Internal server error/i, /Field required/];
async function shot(name) {
  step = name; n += 1;
  await page.waitForTimeout(800);
  const file = `${String(n).padStart(3, '0')}_${name}`;
  await page.screenshot({ path: `${out}/${file}.png`, fullPage: true });
  const text = await page.innerText('body').catch(() => '');
  fs.writeFileSync(`${out}/${file}.txt`, text);
  const bad = BAD.filter(re => re.test(text)).map(String);
  if (bad.length) note(`[${name}] screen text matches ${bad.join(', ')}`);
  return { file, bad };
}

async function run(c) {
  const t = c.timeout ?? 30000;
  switch (c.op) {
    case 'goto': await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: t }); return {};
    case 'click': await page.click(c.sel, { timeout: t }); return {};
    case 'fill': await page.fill(c.sel, c.value, { timeout: t }); return {};
    case 'select': return { selected: await page.selectOption(c.sel, c.value, { timeout: t }) };
    case 'check': await page.check(c.sel, { timeout: t }); return {};
    case 'press': await page.press(c.sel, c.key, { timeout: t }); return {};
    case 'upload': await page.setInputFiles(c.sel, c.path, { timeout: t }); return {};
    case 'download': {
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: t }), page.click(c.sel)]);
      const target = path.join(c.dir, dl.suggestedFilename());
      await dl.saveAs(target);
      return { saved: target, size: fs.statSync(target).size };
    }
    case 'wait': await page.waitForSelector(c.sel, { state: c.state || 'visible', timeout: t }); return {};
    case 'sleep': await page.waitForTimeout(c.ms); return {};
    case 'shot': return await shot(c.name);
    case 'text': return { text: c.sel ? await page.innerText(c.sel, { timeout: t }) : await page.innerText('body') };
    case 'eval': return { value: await page.evaluate(c.js) };
    case 'url': return { url: page.url() };
    case 'note': note(c.text); return {};
    case 'close': {
      await ctx.close(); await browser.close();
      setTimeout(() => process.exit(0), 200);
      return { video_dir: out };
    }
    default: throw new Error(`unknown op ${c.op}`);
  }
}

http.createServer((req, res) => {
  let body = '';
  req.on('data', d => { body += d; });
  req.on('end', async () => {
    let reply;
    try {
      const c = JSON.parse(body || '{}');
      fs.appendFileSync(`${out}/commands.log`, `${new Date().toISOString()} ${JSON.stringify(c).slice(0, 400)}\n`);
      reply = { ok: true, ...(await run(c)) };
    } catch (e) {
      reply = { ok: false, error: String(e.message || e).slice(0, 800) };
      note(`[${step}] driver error: ${reply.error.slice(0, 200)}`);
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(reply));
  });
}).listen(port, '127.0.0.1', () => console.log(`driver ready on ${port}, out ${out}`));
