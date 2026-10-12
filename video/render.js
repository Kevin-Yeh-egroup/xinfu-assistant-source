// Render a storyboard to MP4 (video only) + events JSON for the soundtrack.
// usage: node render.js <guide|reviewer> [--stills 1.5,10,22] [--from s --to s] [--fps 30]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'); const fs = require('fs');
const STORIES = require('./story');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const name = args[0];
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const FPS = Number(opt('fps') || 30);
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });

function iconsFromApp() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'app.js'), 'utf8');
  const m = src.match(/const ICON=(\{[\s\S]*?\n\});/);
  if (!m) throw new Error('ICON block not found');
  const icons = Function('return ' + m[1])();
  // icons added by other parts, e.g. plan.js: ICON.plan='<path .../>';
  for (const f of fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js'))) {
    const js = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
    for (const x of js.matchAll(/^ICON\.(\w+)=('(?:[^'\\\n]|\\.)*');/gm)) icons[x[1]] = Function('return ' + x[2])();
  }
  return icons;
}

(async () => {
  if (!STORIES[name]) throw new Error('unknown story ' + name);
  const story = STORIES[name]();
  story.fps = FPS;
  if (story.warn.length) console.log('caption timing warnings:\n  ' + story.warn.join('\n  '));
  console.log(`${name}: ${story.dur.toFixed(2)} s, ${story.shots.length} shots, ${story.caps.length} captions`);
  const css = fs.readFileSync(path.join(__dirname, 'stage.css'), 'utf8');
  const eng = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8');
  const html = '<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><style>' + css + '</style></head><body><div id="stage"></div>'
    + '<script>window.STORY=' + JSON.stringify(story).replace(/</g, '\\u003c') + ';window.ICON=' + JSON.stringify(iconsFromApp()) + ';</script><script>' + eng + '</script></body></html>';
  const stageFile = path.join(__dirname, 'stage-' + name + '.html');
  fs.writeFileSync(stageFile, html);
  fs.writeFileSync(path.join(OUT, name + '-events.json'), JSON.stringify({ dur: story.dur, sfx: story.sfx, shots: story.shots.map(s => ({ type: s.type, t0: s.t0, t1: s.t1, tin: s.tin })), caps: story.caps.map(c => ({ t0: c.t0, t1: c.t1, text: c.text, sub: c.sub })) }, null, 1));

  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'], env: { ...process.env, LANG: 'C.UTF-8' } });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('pageerror', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
  await page.goto('file://' + stageFile);
  const info = await page.evaluate(() => window.READY);
  console.log('stage ready', JSON.stringify(info));
  const cdp = await ctx.newCDPSession(page);
  const grab = async (fmt = 'jpeg', q = 93) => Buffer.from((await cdp.send('Page.captureScreenshot', { format: fmt, quality: fmt === 'jpeg' ? q : undefined, optimizeForSpeed: true })).data, 'base64');

  const stills = opt('stills');
  if (stills) {
    const dir = path.join(OUT, 'stills-' + name); fs.mkdirSync(dir, { recursive: true });
    for (const s of stills.split(',').map(Number)) {
      await page.evaluate(t => window.seek(t), s);
      fs.writeFileSync(path.join(dir, `t${s.toFixed(2).padStart(7, '0')}.jpg`), await grab('jpeg', 90));
    }
    console.log('stills written to', dir);
    await browser.close(); return;
  }

  const from = Number(opt('from') || 0), to = Math.min(story.dur, Number(opt('to') || story.dur));
  const n0 = Math.round(from * FPS), n1 = Math.round(to * FPS);
  const outFile = path.join(OUT, name + (opt('from') || opt('to') ? `-part` : '') + '.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-tune', 'film', '-g', String(FPS * 2), '-movflags', '+faststart', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const write = buf => new Promise(res => { if (!ff.stdin.write(buf)) ff.stdin.once('drain', res); else res(); });
  const t0 = Date.now();
  for (let f = n0; f < n1; f++) {
    const t = f / FPS;
    await page.evaluate(x => window.seek(x), t);
    await write(await grab('jpeg', 94));
    if ((f - n0) % (FPS * 10) === 0) { const el = (Date.now() - t0) / 1000, done = f - n0 + 1; console.log(`  frame ${f}/${n1} (${t.toFixed(1)} s) ${(el / done * 1000).toFixed(0)} ms/frame, eta ${((n1 - f) * el / done / 60).toFixed(1)} min`); }
  }
  ff.stdin.end();
  await new Promise(res => ff.on('close', res));
  console.log('wrote', outFile, ((Date.now() - t0) / 60000).toFixed(1) + ' min');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
