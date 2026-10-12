// Design preview screenshots for both editions (demo data, animations settled).
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const { guideState, reviewerState } = require('./demo-data');
const ROOT = path.resolve(__dirname, '..');
const G = 'file://' + path.join(process.env.DIST || path.join(ROOT, 'dist'), '創業貸款準備助手-引導員版.html');
const R = 'file://' + path.join(process.env.DIST || path.join(ROOT, 'dist'), '創業貸款準備助手-審查人員版.html');
const OUT = path.join(ROOT, '.test-output', 'preview'); fs.mkdirSync(OUT, { recursive: true });
const settle = p => p.waitForTimeout(950);
(async () => {
  const browser = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8' } });
  const errs = [];
  async function ctxWith(state, key, vp, extra = {}) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: vp.width < 500 ? 2 : 1, locale: 'zh-TW', timezoneId: 'Asia/Taipei', isMobile: vp.width < 500, hasTouch: vp.width < 500 });
    await ctx.addInitScript(([k, s, act]) => { if (!localStorage.getItem('__seeded')) { localStorage.setItem(k, s); if (act) localStorage.setItem('startup-loan-review-activation', '{"at":"2026-10-09T00:00:00Z"}'); localStorage.setItem('__seeded', '1'); } }, [key, JSON.stringify(state), !!extra.activate]);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    return { ctx, p };
  }
  const shot = async (p, name, full = false) => { await settle(p); await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: full }); };
  const go = async (p, h) => { await p.evaluate(x => { location.hash = x; }, h); };
  const D = { width: 1440, height: 900 };
  // ---- guide desktop
  let { ctx, p } = await ctxWith(guideState(), 'startup-loan-local-v3', D);
  await p.goto(G + '#/overview'); await shot(p, 'g1-總覽', true);
  await go(p, '#/docs'); await shot(p, 'g2-繳交資料');
  await go(p, '#/item/ref-23'); await shot(p, 'g3-項目-債務現況盤點表', true);
  await go(p, '#/issues'); await shot(p, 'g4-需修改事項', true);
  await go(p, '#/tools'); await shot(p, 'g5-檢核工具');
  await ctx.close();
  ({ ctx, p } = await ctxWith({ version: 3 }, '__none', D));
  await p.goto(G); await shot(p, 'g0-歡迎頁');
  await ctx.close();
  // ---- reviewer desktop
  ({ ctx, p } = await ctxWith(reviewerState(), 'startup-loan-review-v1', D, { activate: true }));
  await p.goto(R + '#/rv'); await shot(p, 'r1-審查案件');
  await go(p, '#/rv/rvdemoC'); await shot(p, 'r2-第1步-準備AI初審', true);
  await go(p, '#/rv/rvdemoB'); await p.locator('[data-act=fOpen]').first().click(); await shot(p, 'r3-第2步-確認AI結果', true);
  await go(p, '#/rv/rvdemoA'); await p.click('[data-act=rvStep][data-n="3"]'); await shot(p, 'r4-第3步-傳回引導員', true);
  await p.click('[data-act=rvStep][data-n="4"]'); await shot(p, 'r5-第4步-確認修改', true);
  await go(p, '#/notes'); await shot(p, 'r6-AI審核注意事項');
  await ctx.close();
  ({ ctx, p } = await ctxWith({ version: 3 }, '__none', D));
  await p.goto(R); await shot(p, 'r0-開通');
  await ctx.close();
  // ---- mobile
  const M = { width: 390, height: 844 };
  ({ ctx, p } = await ctxWith(guideState(), 'startup-loan-local-v3', M));
  await p.goto(G + '#/overview'); await shot(p, 'm1-引導員-總覽');
  await go(p, '#/issues'); await shot(p, 'm2-引導員-需修改事項');
  await ctx.close();
  ({ ctx, p } = await ctxWith(reviewerState(), 'startup-loan-review-v1', M, { activate: true }));
  await p.goto(R + '#/rv/rvdemoB'); await shot(p, 'm3-審查-確認AI結果');
  await ctx.close();
  await browser.close();
  console.log('errors:', errs.length ? errs.join(' | ') : 'none');
})().catch(e => { console.error(e); process.exit(1); });
