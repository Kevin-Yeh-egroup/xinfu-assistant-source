// Screenshots of the 計畫書與附件 page (desktop + phone) with the fictional sample case.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const G = 'file://' + path.join(process.env.DIST || path.join(ROOT, 'dist'), '創業貸款準備助手-引導員版.html');
const OUT = process.argv[2] || path.join(ROOT, '.test-output', 'plan-ui'); fs.mkdirSync(OUT, { recursive: true });
const SAMPLE = JSON.parse(fs.readFileSync(path.join(ROOT, 'testdata', 'plan-sample.json'), 'utf8'));
function state(mode) {
  const plan = JSON.parse(JSON.stringify(SAMPLE)); const fm = plan._forecast; delete plan._forecast; delete plan._note;
  return { version: 3, role: 'guide', welcomed: true, tour: { guide: true, reviewer: false }, seenNews: '3', caseName: '王小美', program: '', mode: mode || 'first', round: '3',
    first: { date: '2026-11-10', legacyMonth: '', operation: 'started', flows: {}, items: {}, forecast: { months: fm } }, rounds: {}, issues: [], tasks: [], writing: [], meetingNotes: '', reviewNotes: '',
    tools: { breakeven: {} }, legacy: { docs: [], flows: [], others: [] }, reviews: [], upgradedFrom: 0, plan };
}
(async () => {
  const b = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8' } });
  const only = process.argv[3] ? process.argv[3].split(',') : null;
  for (const [tag, vp] of [['d', { width: 1366, height: 900 }], ['m', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, locale: 'zh-TW', timezoneId: 'Asia/Taipei', reducedMotion: 'reduce', deviceScaleFactor: tag === 'm' ? 2 : 1 });
    const p = await ctx.newPage();
    await p.goto(G); await p.evaluate(s => localStorage.setItem('startup-loan-local-v3', JSON.stringify(s)), state());
    await p.reload();
    for (const s of ['basic', 'biz', 'story', 'money', 'structure', 'forecast', 'needs', 'loan', 'make']) {
      if (only && !only.includes(s)) continue;
      await p.evaluate(x => { location.hash = x; }, '#/plan/' + s); await p.waitForTimeout(250);
      await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); window.scrollTo(0, 0); });
      await p.screenshot({ path: path.join(OUT, tag + '-' + s + '.png'), fullPage: true });
    }
    await ctx.close();
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
