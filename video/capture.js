// Capture real app screens (fictional demo data) + target boxes for the tutorial videos.
// Output: video/assets/<name>.png and video/assets/manifest.json (boxes in image px).
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const { guideState, reviewerState } = require('../scripts/demo-data');
const ROOT = path.resolve(__dirname, '..');
// 網頁版畫面：先執行 npm run serve（在 http://127.0.0.1:8765 提供 site/，網址結構和 Vercel 相同）
const BASE = process.env.SITE_BASE || 'http://127.0.0.1:8765';
const G = BASE + '/';
const R = BASE + '/review/';
// 網站要用測試通行碼建置：REVIEWER_CODE=測試通行碼 node scripts/build.mjs，錄影時用同一組
const CODE = process.env.REVIEWER_CODE || '';
if (!CODE) { console.error('請設定 REVIEWER_CODE（和建置網站時相同的測試通行碼）'); process.exit(2); }
const OUT = path.join(__dirname, 'assets'); fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(__dirname, 'tmp'); fs.mkdirSync(TMP, { recursive: true });
const VP = { width: 1440, height: 900 }, DPR = 1.6;
const manifest = { dpr: DPR, w: VP.width * DPR, h: VP.height * DPR, shots: {} };
const HIDE = '#toast{display:none!important} *{caret-color:transparent!important} .enter *{animation:none!important}';
(async () => {
  const browser = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8' } });
  async function open(url, seed) {
    const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: DPR, locale: 'zh-TW', timezoneId: 'Asia/Taipei', acceptDownloads: true, reducedMotion: 'reduce' });
    if (seed) await ctx.addInitScript(([k, s, act]) => { if (!localStorage.getItem('__seeded')) { if (k) localStorage.setItem(k, s); if (act) localStorage.setItem('startup-loan-review-activation', '{"at":"2026-10-09T00:00:00Z"}'); localStorage.setItem('__seeded', '1'); } }, seed);
    const p = await ctx.newPage(); p.on('dialog', d => d.accept()); p.on('pageerror', e => console.log('pageerror', e.message));
    await p.goto(url); await p.addStyleTag({ content: HIDE }); await p.waitForTimeout(400);
    return { ctx, p };
  }
  async function snap(p, name, targets = {}) {
    await p.addStyleTag({ content: HIDE }).catch(() => {});
    await p.mouse.move(2, 2);
    await p.waitForTimeout(300);
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
  const go = async (p, h) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(350); };
  const top = async p => { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(100); };
  const scrollTo = async (p, sel, off = 0) => { await p.evaluate(([s, o]) => { const e = document.querySelector(s); if (e) window.scrollTo(0, Math.max(0, e.getBoundingClientRect().top + window.scrollY - o)); }, [sel, off]); await p.waitForTimeout(150); };

  /* ===================== 引導員篇 ===================== */
  let { ctx, p } = await open(G);
  await snap(p, 'g-welcome', { tour: '[data-act=welcomeTour]', skip: '[data-act=welcomeSkip]', steps: '.wl-steps', privacy: '.welcome .privacy', title: '.welcome h1', web: '.wl-web', video: '.wl-web a', step2: '.wl-steps > li:nth-child(2)' });
  await p.click('[data-act=welcomeSkip]'); await p.waitForTimeout(400);
  const T0 = { seg: '.modebar .seg', segFirst: '.modebar .seg button:first-child', segLater: '.modebar .seg button:last-child', case: '#caseName', date: '#scopeDate', postmark: '#postmark', casecard: '.casecard', next: '.hero-next' };
  await snap(p, 'g-ov0', T0);
  const NAME = '陳小美（示範）';
  for (let i = 1; i <= NAME.length; i++) { await p.fill('#caseName', NAME.slice(0, i)); await snap(p, 'g-ov0-n' + i, i === NAME.length ? T0 : {}); }
  await p.locator('#caseName').blur();
  await p.fill('#scopeDate', '2026-10-28'); await p.locator('#scopeDate').dispatchEvent('change'); await p.waitForTimeout(300); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.waitForTimeout(150);
  await snap(p, 'g-ov0-date', T0);
  await ctx.close();

  ({ ctx, p } = await open(G + '#/overview', ['startup-loan-local-v3', JSON.stringify(guideState()), false]));
  await snap(p, 'g-ov', { postmark: '#postmark', next: '.hero-next', nextbtn: '.hero-next .btn, .hero-next button', donut: '.hero-progress', donutRing: '.hero-progress .donut', stats: '.stats', flow: '.flowcard', navDocs: '.nav a[data-route=docs]', navPlan: '.nav a[data-route=plan]', navIssues: '.nav a[data-route=issues]', navTools: '.nav a[data-route=tools]', help: '.helpbtn', side: '.side', nav: '.nav' });
  await go(p, '#/docs'); await top(p);
  await snap(p, 'g-docs', { list: '.group', navDocs: '.nav a[data-route=docs]', filter: '.toolbar .seg', head: '.pagehead' });
  await scrollTo(p, 'details[data-row="first:ref-24"]', 330);
  await snap(p, 'g-docs-s', { row24: 'details[data-row="first:ref-24"] summary', pill24: 'details[data-row="first:ref-24"] summary .pill' });
  await p.locator('details[data-row="first:ref-24"] summary').click(); await p.waitForTimeout(250);
  await scrollTo(p, 'details[data-row="first:ref-24"]', 330);
  const TD = { row: 'details[data-row="first:ref-24"]', c1: 'details[data-row="first:ref-24"] input[data-act=crit][data-c=ready]', c2: 'details[data-row="first:ref-24"] input[data-act=crit][data-c=send]', pill: 'details[data-row="first:ref-24"] summary .pill', how: 'details[data-row="first:ref-24"] a[href="#/item/ref-24"]', row23: 'details[data-row="first:ref-23"] summary' };
  await snap(p, 'g-docs-open', TD);
  await p.check(TD.c1); await p.waitForTimeout(200);
  await snap(p, 'g-docs-c1', TD);
  await p.check(TD.c2); await p.waitForTimeout(250);
  await snap(p, 'g-docs-c2', TD);
  await p.locator('details[data-row="first:ref-23"] summary').click(); await p.waitForTimeout(250);
  await scrollTo(p, 'details[data-row="first:ref-23"]', 300);
  await snap(p, 'g-docs-23', { row23: 'details[data-row="first:ref-23"] summary', body23: 'details[data-row="first:ref-23"]', link23: 'details[data-row="first:ref-23"] a[href="#/item/ref-23"]' });
  await go(p, '#/item/ref-23'); await top(p);
  await snap(p, 'g-item', { crit: '.critcard', guide: '.guidecard', title: '.itemhead h1', toollink: '.toollink', via: '.critcard .viatag' });
  await scrollTo(p, '.dodont', 140);
  await snap(p, 'g-item-dd', { dodont: '.dodont', do: '.dodont > *:first-child', dont: '.dodont > *:last-child' });
  await go(p, '#/tools'); await top(p);
  await snap(p, 'g-tools', { cards: '.toolcards', debt: '.toolcard[href="#/tools/debt"]', navTools: '.nav a[data-route=tools]' });
  await go(p, '#/tools/debt'); await top(p);
  const TT = { paste: 'textarea[data-bind=paste][data-tool=debt]', run: '[data-act=runDebt]', file: '.srcpick .filebtn', src: '.srcpick' };
  await snap(p, 'g-debt0', TT);
  await p.fill(TT.paste, ['債務人\t債權人\t債務總額\t借錢原因\t借錢時間\t利率\t每期還款數字\t目前還款狀況\t剩餘金額', '陳小美\t○○銀行\t100000\t週轉\t113/05/07\t\t3000\t本息償還\t60000', '\t親友\t20000\t生活\t112年\t\t1000\t\t15000', '\t\t\t\t\t每月付款總金額\t4000\t剩餘還款總金額\t75000'].join('\n'));
  await snap(p, 'g-debt1', TT);
  await p.click(TT.run); await p.waitForTimeout(300);
  await scrollTo(p, '#toolResult', 30);
  await snap(p, 'g-debt2', { result: '#toolResult', findings: '#toolResult .findings', tick: '#toolResult .ticknote', fix1: '#toolResult .findings li.fix', table: '#toolResult table', add: '[data-act=findingAll]' });
  await scrollTo(p, '#toolResult table', 120);
  await snap(p, 'g-debt3', { table: '#toolResult table', bad: '#toolResult td.flag', bad2: ':nth-match(#toolResult td.flag, 2)', soft: '#toolResult td.soft' });
  await ctx.close();

  // 計畫書與附件：示範資料都填好了，只差「毛利率」，現場填上後產生 Word、Excel
  const ps = guideState(); ps.plan.st.margin = ''; ps.issues = ps.issues.filter(i => !i.rid); // 計畫書在送審前完成：還沒有審查意見
  for (const id of ['ref-23', 'ref-25']) { ps.first.items[id].crit = {}; ps.first.items[id].via = {}; }
  ({ ctx, p } = await open(G + '#/plan/basic', ['startup-loan-local-v3', JSON.stringify(ps), false]));
  await top(p);
  await snap(p, 'g-pl-basic', { navPlan: '.nav a[data-route=plan]', plnav: '.plnav', head: '.pagehead', intro: '.intro', card: '.psec', doctags: '.psec-h .doctags .doctag', secTitle: '.psec-h h2', st: '.plnav [data-plnav=structure]', make: '.plnav [data-plnav=make]', money: '.plnav [data-plnav=money]', fields: '.psec-b' });
  await go(p, '#/plan/money');
  await scrollTo(p, '.debtorder', 640);
  const TM = { st: '.plnav [data-plnav=structure]', order: '.debtorder', sum: '.debtorder summary', card4: '.pcards > *:last-child', cards: '.pcards', sumline: '.debtorder ~ .sumline, .psec-b .sumline', add: '[data-act=plAdd]' };
  await snap(p, 'g-pl-money', TM);
  await p.locator('.debtorder summary').click(); await p.waitForTimeout(250);
  await scrollTo(p, '.debtorder', 470);
  await snap(p, 'g-pl-money-o', { ...TM, list: '.debtorder .dorder' });
  await go(p, '#/plan/structure');
  await scrollTo(p, 'table.calc.ops', 330);
  const TS = { make: '.plnav [data-plnav=make]', stNav: '.plnav [data-plnav=structure]', ops: 'table.calc.ops', margin: 'input[data-p="st.margin"]', marginRow: 'table.calc.ops tr:first-child', bep: 'output[data-out="st.bep"]', res: 'table.calc.ops tr.res', res3: 'table.calc.ops tr.res:last-child', resAll: 'table.calc.ops tbody', note: '.formula' };
  await snap(p, 'g-pl-st0', TS);
  await p.click(TS.margin);
  await p.locator(TS.margin).pressSequentially('5', { delay: 30 }); await p.waitForTimeout(250);
  await snap(p, 'g-pl-st1', TS);
  await p.locator(TS.margin).pressSequentially('5', { delay: 30 }); await p.waitForTimeout(250);
  await snap(p, 'g-pl-st2', TS);
  await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.waitForTimeout(200);
  await go(p, '#/plan/make'); await top(p);
  const TK = { cards: '.gencards', genPlan: '[data-act=plGen][data-what=plan]', genAttach: '[data-act=plGen][data-what=attach]', cardPlan: '.gencard:first-child', cardAttach: '.gencard:last-child', warn: '.psec .notice.warn', tick: '.ticknote', makeNav: '.plnav [data-plnav=make]', secTitle: '.psec-h h2' };
  await snap(p, 'g-pl-make', TK);
  const DOCS = path.join(TMP, 'docs'); fs.rmSync(DOCS, { recursive: true, force: true }); fs.mkdirSync(DOCS, { recursive: true });
  for (const [what, nm] of [['plan', 'g-pl-made1'], ['attach', 'g-pl-made2']]) {
    const [d] = await Promise.all([p.waitForEvent('download'), p.click('[data-act=plGen][data-what=' + what + ']')]);
    await d.saveAs(path.join(DOCS, d.suggestedFilename())); console.log('  saved', d.suggestedFilename());
    await p.waitForTimeout(350); await top(p);
    await snap(p, nm, TK);
  }
  await scrollTo(p, '.reflist-wrap', 260);
  await snap(p, 'g-pl-ticks', { list: '.reflist-wrap', first: '.reflist-wrap > li.refitem:nth-child(1)', second: '.reflist-wrap > li.refitem:nth-child(2)', ok1: '.reflist-wrap > li.refitem:nth-child(1) .reflist', pill1: '.reflist-wrap > li.refitem:nth-child(1) .pill', block: '.psec-block:has(.reflist-wrap)' });
  await ctx.close();

  // issues: start without reviewer items, then import a list
  const gs = guideState(); gs.issues = gs.issues.filter(i => !i.rid);
  ({ ctx, p } = await open(G + '#/issues', ['startup-loan-local-v3', JSON.stringify(gs), false]));
  await snap(p, 'g-is0', { exchange: '.exchange', import: '.exchange [data-act=xImport]', navIssues: '.nav a[data-route=issues]' });
  const rv = reviewerState().reviews[0];
  const issuesFile = { type: 'startup-loan-review-issues', v: 1, rid: rv.id, caseName: '陳小美（示範）', stage: 'first', sentAt: new Date().toISOString(), notesVer: '1.0', items: rv.findings.filter(f => f.decision === 'accept').map(f => ({ id: f.id, itemId: f.itemId, doc: f.doc, text: f.text, where: f.where, suggest: f.suggest || '請依說明修改', level: f.level, kind: 'fix', status: 'open', rnote: '', upd: f.upd })) };
  fs.writeFileSync(path.join(TMP, 'issues.json'), JSON.stringify(issuesFile));
  await p.setInputFiles('#xFile', path.join(TMP, 'issues.json')); await p.waitForTimeout(400);
  await top(p);
  const TI = { exchange: '.exchange', ring: '.exchange .donut', reply: '[data-act=xReply]', tabs: '.listbar .seg', tabFixed: '[data-act=issueFilter][data-f=fixed]', row1: '.ilist li.fromrv', det1: '.ilist li.fromrv .idetail summary', fixed1: '.ilist li.fromrv [data-act=issueSet][data-s=fixed]' };
  await snap(p, 'g-is1', TI);
  await p.locator(TI.det1).first().click(); await p.waitForTimeout(200);
  await snap(p, 'g-is2', { ...TI, detail: '.ilist li.fromrv .idetail' });
  await p.locator(TI.fixed1).first().click(); await p.waitForTimeout(250);
  await snap(p, 'g-is3', TI);
  await p.locator(TI.fixed1).first().click(); await p.waitForTimeout(200);
  await p.locator(TI.fixed1).first().click(); await p.waitForTimeout(250);
  await snap(p, 'g-is4', TI);
  await p.click(TI.tabFixed); await p.waitForTimeout(250);
  const TN = { ...TI, gnote: 'input[data-bind=gnote]', waiting: '.ilist .waiting' };
  await snap(p, 'g-is5', TN);
  await p.locator(TN.gnote).first().fill('已依借款時間重新排列'); await p.waitForTimeout(150);
  await snap(p, 'g-is6', TN);
  await top(p);
  await snap(p, 'g-bk', { backup: '.side-actions', save: '#saveState', help: '.helpbtn', exp: '.side-actions [data-act=export]' });
  await ctx.close();

  /* ===================== 審查人員篇 ===================== */
  ({ ctx, p } = await open(R));
  const TG = { card: '.gate-card', input: '#gateCode', btn: '#gateBtn', privacy: '.gate-card .privacy' };
  await snap(p, 'r-gate', TG);
  const DUMMY = 'DEMO-2026-AB';
  for (const n of [3, 6, 9, DUMMY.length]) { await p.fill('#gateCode', DUMMY.slice(0, n)); await snap(p, 'r-gate-' + n, n === DUMMY.length ? TG : {}); }
  await p.fill('#gateCode', CODE); await p.click('#gateBtn'); await p.waitForSelector('.welcome'); await p.waitForTimeout(400);
  await snap(p, 'r-welcome', { steps: '.wl-steps', title: '.welcome h1', tour: '[data-act=welcomeTour]', skip: '[data-act=welcomeSkip]' });
  await ctx.close();

  // one real case, end to end: create → AI import → decide → send → reply → confirm
  const rs0 = reviewerState(); rs0.reviews = rs0.reviews.filter(r => r.id !== 'rvdemoC');
  ({ ctx, p } = await open(R + '#/rv', ['startup-loan-review-v1', JSON.stringify(rs0), true]));
  const TC = { new: '.pagehead [data-act=rvNew]', grid: '.rvgrid', cardB: '.rvcard:has(a[href="#/rv/rvdemoB"])', cardA: '.rvcard:has(a[href="#/rv/rvdemoA"])', cardD: '.rvcard:has(a[href="#/rv/rvdemoD"])', navNotes: '.nav a[data-route=notes]', navCat: '.nav a[data-route=catalog]', navRv: '.nav a[data-route=rv]' };
  await snap(p, 'r-cases', TC);
  await p.click(TC.new); await p.waitForTimeout(250);
  const TDg = { dialog: '#rvDialog', name: '#rvDialog input[name=caseName]', stage: '#rvDialog select[name=stage]', ok: '#rvDialog button[type=submit]' };
  await snap(p, 'r-new0', TDg);
  const NM = '黃阿姨（示範）';
  for (let i = 1; i <= NM.length; i++) { await p.fill(TDg.name, NM.slice(0, i)); await snap(p, 'r-new-n' + i, i === NM.length ? TDg : {}); }
  await p.click(TDg.ok); await p.waitForTimeout(600); await top(p);
  const rid = await p.evaluate(() => location.hash.split('/').pop());
  const T1 = { steps: '.rvsteps', st1: '.rvsteps > *:nth-child(1)', st2: '.rvsteps > *:nth-child(2)', st3: '.rvsteps > *:nth-child(3)', st4: '.rvsteps > *:nth-child(4)', h1: '.howto > li:nth-child(1)', h2: '.howto > li:nth-child(2)', h3: '.howto > li:nth-child(3)', dl: '.howto [data-act=notesDl]', sentence: '#sentence', copy: '[data-act=sentenceCopy]', privacy: '.step .privacy', next: '.stepfoot button', title: '.pagehead h1' };
  await snap(p, 'r-s1', T1);
  await p.click('[data-act=rvStep][data-n="2"]'); await top(p);
  await snap(p, 'r-s2e', { drop: '.dropzone', steps: '.rvsteps', st2: '.rvsteps > *:nth-child(2)' });
  const ai = { type: 'ai-review-result', stage: 'first', notesVersion: '1.0', files: ['信扶專案創業計畫書.pdf', '創業計畫書附件.xlsx', '估價單.pdf', '戶籍謄本.pdf'], findings: [
    { code: 'ref-23', document: '債務現況盤點表', location: '第 5 列「借錢時間」', finding: '借款時間沒有由遠到近：113/05 排在 112/10 前面', basis: '債務現況盤點表：借款時間依先後順序排列', level: '需修改', suggestion: '依借款時間由遠到近重新排列' },
    { code: 'basic', document: '計畫書基本資料', location: '計畫書第 1 頁', finding: '出生日期和戶籍謄本不一致', basis: '計畫書的基本資料要和證明文件一致', level: '請核對', suggestion: '請核對戶籍謄本後更正' },
    { code: '', document: '估價單', location: '冷凍櫃估價單', finding: '沒有賣家聯絡方式', basis: '估價單要有賣家名稱與聯絡方式', level: '需修改', suggestion: '請賣家補上電話與統一編號' },
    { code: 'cross', document: '文件之間', location: '計畫書與設備購買表', finding: '設備總額 15 萬和計畫書寫的 12 萬不一致', basis: '計畫書的金額要和附件一致', level: '請核對', suggestion: '確認正確金額後兩邊一致' },
    { code: 'ref-25', document: '營運結構試算表', location: 'C6「其他收入」', finding: '其他收入空白', basis: '金額欄位沒有就填 0', level: '提醒', suggestion: '沒有其他收入請填 0' }] };
  fs.writeFileSync(path.join(TMP, 'AI審查結果.json'), JSON.stringify(ai));
  await p.setInputFiles('input[data-act=aiFile]', path.join(TMP, 'AI審查結果.json')); await p.waitForSelector('.fcard'); await p.waitForTimeout(300); await top(p);
  const T2 = { tally: '.tally', seg: '.step .seg', card1: '.fcard', acc1: '.fcard [data-act=fDecide][data-v=accept]', rej1: '.fcard [data-act=fDecide][data-v=reject]', accfix: '[data-act=fAcceptFix]', more1: '.fcard [data-act=fOpen]', lv1: '.fcard .lvbadge', decided: '.tally .decided-n', st2: '.rvsteps > *:nth-child(2)', groups: '.step .fgroup', list: '.step .flist' };
  await snap(p, 'r-s2', T2);
  await p.click(T2.accfix); await p.waitForTimeout(300); await top(p);
  await snap(p, 'r-s2a', T2);
  await p.locator('.fcard [data-act=fOpen]').first().click(); await p.waitForTimeout(250);
  await scrollTo(p, '.fcard.open', 300);
  await snap(p, 'r-s2d', { detail: '.fcard.open', fdetail: '.fcard.open .fdetail', text: '.fcard.open textarea', acc: '.fcard.open [data-act=fDecide][data-v=accept]', rej: '.fcard.open [data-act=fDecide][data-v=reject]' });
  await p.locator('.fcard.open [data-act=fDecide][data-v=accept]').click(); await p.waitForTimeout(250); await top(p);
  await snap(p, 'r-s2b', T2);
  await p.locator(T2.acc1).first().click(); await p.waitForTimeout(250); await top(p);
  await snap(p, 'r-s2c', T2);
  await p.locator(T2.rej1).first().click(); await p.waitForTimeout(300); await top(p);
  await snap(p, 'r-s2z', { tally: '.tally', decided: '.tally .decided-n', st2: '.rvsteps > *:nth-child(2)', next: '.stepfoot button', empty: '.step .empty' });
  await p.click('.stepfoot button'); await p.waitForTimeout(250); await top(p);
  const T3 = { sum: '.sendsum', dl: '.sendopts [data-act=sendDl]', copy: '.sendopts [data-act=sendCopy]', privacy: '.step .privacy', st3: '.rvsteps > *:nth-child(3)', opts: '.sendopts' };
  await snap(p, 'r-s3', T3);
  const dl = p.waitForEvent('download'); await p.click(T3.dl); await dl; await p.waitForTimeout(300); await top(p);
  await snap(p, 'r-s3d', { ...T3, ok: '.okline', next: '.stepfoot button' });
  // the guide's reply comes back
  const accepted = await p.evaluate(id => JSON.parse(localStorage.getItem('startup-loan-review-v1')).reviews.find(r => r.id === id).findings.filter(f => f.decision === 'accept').map(f => ({ id: f.id, text: f.text })), rid);
  const later = new Date(Date.now() + 120000).toISOString();
  const notes = { '借款時間': '已依借款時間重新排列', '出生日期': '已更正為 70/03/12', '賣家': '已請賣家補上電話', '設備總額': '計畫書已改為 15 萬' };
  const reply = { type: 'startup-loan-review-reply', v: 1, caseName: NM, stage: 'first', at: later, items: accepted.map(f => ({ id: f.id, rid, status: 'fixed', gnote: Object.entries(notes).find(([k]) => f.text.includes(k))?.[1] || '', upd: later })) };
  fs.writeFileSync(path.join(TMP, 'reply.json'), JSON.stringify(reply));
  await p.click('[data-act=rvStep][data-n="4"]'); await p.waitForTimeout(250); await top(p);
  const T4 = { imp: '.cardhead .filebtn', hero: '.confirmhero', ring: '.confirmhero .donut', confirm: '.clist [data-act=fStatus][data-v=done]', back: '.clist [data-act=fStatus][data-v=open]', gnote: '.clist .gnote', fixedRow: '.clist li.st-fixed', all: '[data-act=fConfirmAll]', list: '.clist', st4: '.rvsteps > *:nth-child(4)' };
  await snap(p, 'r-s4w', T4);
  await p.setInputFiles('input[data-act=replyFile]', path.join(TMP, 'reply.json')); await p.waitForTimeout(400); await top(p);
  await snap(p, 'r-s4', T4);
  await p.locator(T4.confirm).first().click(); await p.waitForTimeout(300); await top(p);
  await snap(p, 'r-s4b', T4);
  await p.click(T4.all); await p.waitForTimeout(900); await top(p);
  await snap(p, 'r-s4z', { seal: '.sealdone', hero: '.confirmhero', ring: '.confirmhero .donut', st4: '.rvsteps > *:nth-child(4)', list: '.clist' });
  await go(p, '#/notes'); await top(p);
  const TNo = { stats: '.notes-stats', edit: '[data-act=notesEdit]', dl: '.pagehead [data-act=notesDl]', copy: '.pagehead [data-act=notesCopy]', preview: '.notes-preview', stage: '.stagepick', navNotes: '.nav a[data-route=notes]' };
  await snap(p, 'r-no', TNo);
  await p.click('[data-act=notesEdit]'); await p.waitForTimeout(200);
  await scrollTo(p, 'textarea[data-bind=notesEd][data-f=extra]', 380);
  const TE = { extra: 'textarea[data-bind=notesEd][data-f=extra]', note: 'input[data-bind=notesEd][data-f=note]', save: '[data-act=notesSave]' };
  await snap(p, 'r-ne0', TE);
  await p.fill(TE.extra, '- 估價單要有統一編號'); await p.fill(TE.note, '補充估價單規則'); await p.waitForTimeout(150);
  await snap(p, 'r-ne1', TE);
  await p.click(TE.save); await top(p); await p.waitForTimeout(300);
  await snap(p, 'r-ns', { stats: '.notes-stats', ver: '.notes-stats .stat:first-child', notice: '.notice.news', exp: '.notice.news [data-act=maintExport][data-ed=reviewer]', expG: '.notice.news [data-act=maintExport][data-ed=guide]' });
  await ctx.close();

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
  await browser.close();
  console.log('done', Object.keys(manifest.shots).length, 'shots');
})().catch(e => { console.error(e); process.exit(1); });
