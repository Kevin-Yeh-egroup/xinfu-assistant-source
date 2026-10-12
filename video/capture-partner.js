// 「夥伴修改篇」用的畫面：示意畫面（video/partner/mock.html）＋本機預覽的準備助手（虛構示範資料）。
// 先在另一個終端機執行 npm run preview（http://127.0.0.1:8765），再執行：node capture-partner.js
// 輸出到 video/assets/，並把框選位置併入 assets/manifest.json（不會刪掉其他影片的畫面）。
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const { guideState } = require('../scripts/demo-data');
const BASE = process.env.SITE_BASE || 'http://127.0.0.1:8765';
const MOCK = 'file://' + path.join(__dirname, 'partner', 'mock.html');
const OUT = path.join(__dirname, 'assets'); fs.mkdirSync(OUT, { recursive: true });
const VP = { width: 1440, height: 900 }, DPR = 1.6;
const MAN = path.join(OUT, 'manifest.json');
const manifest = fs.existsSync(MAN) ? JSON.parse(fs.readFileSync(MAN, 'utf8')) : { dpr: DPR, w: VP.width * DPR, h: VP.height * DPR, shots: {} };
const HIDE = '#toast{display:none!important} *{caret-color:transparent!important} .enter *{animation:none!important}';

(async () => {
  const browser = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8' } });
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: DPR, locale: 'zh-TW', timezoneId: 'Asia/Taipei', reducedMotion: 'reduce' });
  async function snap(p, name, targets = {}) {
    await p.mouse.move(2, 2); await p.waitForTimeout(250);
    const boxes = {};
    for (const [k, sel] of Object.entries(targets)) {
      const loc = p.locator(sel).first();
      if (await loc.count()) { const b = await loc.boundingBox(); if (b) boxes[k] = [Math.round(b.x * DPR), Math.round(b.y * DPR), Math.round(b.width * DPR), Math.round(b.height * DPR)]; }
      else console.log('  ! missing target', name, k, sel);
    }
    await p.screenshot({ path: path.join(OUT, name + '.png') });
    manifest.shots[name] = boxes;
    console.log('captured', name, Object.keys(boxes).join(','));
  }

  // 1. 本機預覽：計畫書與附件「核對與產生」，改之前／改之後
  const app = await ctx.newPage();
  const gs = guideState(); gs.issues = gs.issues.filter(i => !i.rid);
  await app.addInitScript(s => { if (!localStorage.getItem('__seeded')) { localStorage.setItem('startup-loan-local-v3', s); localStorage.setItem('__seeded', '1'); } }, JSON.stringify(gs));
  await app.goto(BASE + '/#/plan/make'); await app.addStyleTag({ content: HIDE }); await app.waitForTimeout(500);
  const TK = { cards: '.gencards', genPlan: '[data-act=plGen][data-what=plan]', genAttach: '[data-act=plGen][data-what=attach]', cardPlan: '.gencard:first-child', cardAttach: '.gencard:last-child', head: '.psec-h' };
  await snap(app, 'pv-before', TK);
  await app.evaluate(() => {
    const swap = (sel, txt) => { const b = document.querySelector(sel); const t = [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t) t.textContent = txt; };
    swap('[data-act=plGen][data-what=plan]', '產生 Word 計畫書'); swap('[data-act=plGen][data-what=attach]', '產生 Excel 附件');
  });
  await snap(app, 'pv-after', TK);
  // PR 留言裡的截圖縮圖
  const cb = await app.locator('.gencards').boundingBox();
  await app.screenshot({ path: path.join(__dirname, 'partner', 'after-thumb.png'), clip: { x: cb.x - 16, y: cb.y - 16, width: cb.width + 32, height: cb.height + 32 } });

  // 2. 示意畫面
  const m = await ctx.newPage();
  await m.goto(MOCK); await m.waitForTimeout(300);
  const C = { comp: '#comp', send: '#send', mark: '#compin mark', newchat: '#newchat', proj: '#proj', body: '#body' };
  const plan = [
    ['c1-empty', C], ['c1-paste', C], ['c1-work', C], ['c1-done', { ...C, r: '#r1', m: '#m1', mark: '#r1 mark', code: '#r1 code' }],
    ['c1-open', { dlg: '#dlg', sel: '#dlgsel', ok: '#dlgok' }],
    ['c2-empty', C], ['c2-paste', C], ['c2-done', { ...C, r: '#r2', mark: '#r2 mark', wt: '#wtchip' }],
    ['c3-paste', C], ['c3-work', C], ['c3-done', { ...C, r: '#r3', m: '#m3', url: '#r3 mark' }],
    ['c4-paste', C],
    ['c5-paste', C], ['c5-done', { ...C, r: '#r5', m: '#m5', mark: '#r5 mark' }],
    ['c6-paste', C], ['c6-done', { ...C, r: '#r6', m: '#m6', url: '#r6 mark' }],
    ['gh-signup', { gbtn: '#gbtn' }], ['gh-home', { av: '#av' }], ['gh-menu', { menu: '#menu', uname: '#uname', av: '#av' }],
    ['pr', { title: '#prt', draft: '#draft', desc: '#desc', checks: '#checks', cmt: '#cmt', ta: '#ta', cbtn: '#cbtn' }],
    ['pr-pasted', { cmt: '#cmt', ta: '#ta', cbtn: '#cbtn', shot: '#ta .shot' }],
    ['pr-posted', { posted: '#posted', checks: '#checks', shot: '#posted .shot' }],
    ['im', { msg: '#tokevin' }], ['im-reply', { msg: '#tokevin', reply: '#kreply' }],
  ];
  for (const [name, targets] of plan) {
    await m.evaluate(n => window.setState(n), name); await m.waitForTimeout(150);
    await snap(m, name, targets);
  }
  fs.writeFileSync(MAN, JSON.stringify(manifest, null, 1));
  await browser.close();
  console.log('done', plan.length + 2, 'partner shots');
})().catch(e => { console.error(e); process.exit(1); });
