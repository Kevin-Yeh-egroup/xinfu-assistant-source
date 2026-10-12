// Generate sample Word/Excel output from the fictional sample case (no ID number / bank account).
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const G = 'file://' + path.join(process.env.DIST || path.join(ROOT, 'dist'), '創業貸款準備助手-引導員版.html');
const OUT = path.join(ROOT, '.test-output', '範例輸出'); fs.mkdirSync(OUT, { recursive: true });
const SAMPLE = JSON.parse(fs.readFileSync(path.join(ROOT, 'testdata', 'plan-sample.json'), 'utf8'));
(async () => {
  const plan = JSON.parse(JSON.stringify(SAMPLE)); const fm = plan._forecast; delete plan._forecast; delete plan._note;
  const state = { version: 3, role: 'guide', welcomed: true, tour: { guide: true, reviewer: false }, seenNews: '4', caseName: '王小美', program: '', mode: 'first', round: '2',
    first: { date: '2026-11-10', legacyMonth: '', operation: 'started', flows: {}, items: {}, forecast: { months: fm } }, rounds: {}, issues: [], tasks: [], writing: [], meetingNotes: '', reviewNotes: '',
    tools: { breakeven: {} }, legacy: { docs: [], flows: [], others: [] }, reviews: [], upgradedFrom: 0, plan };
  const b = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
  const ctx = await b.newContext({ locale: 'zh-TW', timezoneId: 'Asia/Taipei', acceptDownloads: true });
  const p = await ctx.newPage();
  await p.goto(G); await p.evaluate(s => localStorage.setItem('startup-loan-local-v3', JSON.stringify(s)), state);
  await p.goto(G + '#/plan/make'); await p.reload(); await p.waitForTimeout(300);
  for (const [what, name] of [['plan', '範例-信扶專案創業計畫書（虛構個案）.docx'], ['attach', '範例-創業計畫書附件（虛構個案）.xlsx']]) {
    const [d] = await Promise.all([p.waitForEvent('download'), p.click('[data-act=plGen][data-what=' + what + ']')]);
    await d.saveAs(path.join(OUT, name)); console.log(path.join(OUT, name));
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
