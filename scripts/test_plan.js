// 計畫書與附件：填寫、核對、產生 Word / Excel。請用 npm test 執行。
// 直接執行：DIST=建置好的 dist 資料夾 REVIEWER_CODE=建置時用的通行碼 node scripts/test_plan.js
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const DIST = process.env.DIST || path.join(ROOT, 'dist');
const G = 'file://' + path.join(DIST, '創業貸款準備助手-引導員版.html');
const R = 'file://' + path.join(DIST, '創業貸款準備助手-審查人員版.html');
const CODE = process.env.REVIEWER_CODE || '';
if (!CODE) { console.error('請設定 REVIEWER_CODE（和建置時相同的測試通行碼），建議直接執行 npm test'); process.exit(2); }
const OUT = path.join(process.env.TEST_OUT || path.join(ROOT, '.test-output'), 'plan'); fs.mkdirSync(OUT, { recursive: true });
const SAMPLE = JSON.parse(fs.readFileSync(path.join(ROOT, 'testdata', 'plan-sample.json'), 'utf8'));
const results = [], errors = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  → ' + String(detail).slice(0, 400))); };
const go = (p, h) => p.evaluate(x => { location.hash = x; }, h);
const stored = p => p.evaluate(() => JSON.parse(localStorage.getItem('startup-loan-local-v3') || 'null'));
async function ctxPage(b, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, locale: 'zh-TW', timezoneId: 'Asia/Taipei', acceptDownloads: true, ...opts });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  return { ctx, p };
}
async function dl(p, sel) { const [d] = await Promise.all([p.waitForEvent('download'), p.click(sel)]); const f = path.join(OUT, d.suggestedFilename()); await d.saveAs(f); return f; }
function sampleState() {
  const plan = JSON.parse(JSON.stringify(SAMPLE)); const fm = plan._forecast; delete plan._forecast; delete plan._note;
  return { version: 3, role: 'guide', welcomed: true, tour: { guide: true, reviewer: false }, seenNews: '3', caseName: '王小美', program: '', mode: 'first', round: '2',
    first: { date: '2026-11-10', legacyMonth: '', operation: 'started', flows: {}, items: {}, forecast: { months: fm } }, rounds: {}, issues: [], tasks: [], writing: [], meetingNotes: '', reviewNotes: '',
    tools: { breakeven: {} }, legacy: { docs: [], flows: [], others: [] }, reviews: [], upgradedFrom: 0, plan };
}

(async () => {
  const b = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });

  /* ===== P1 空白開始：導覽、填寫、即時計算 ===== */
  let { ctx, p } = await ctxPage(b);
  await p.goto(G); await p.click('[data-act=welcomeSkip]');
  check('P1 側欄有「計畫書與附件」', (await p.locator('.nav a[data-route=plan] .lbl-l').innerText()) === '計畫書與附件');
  await go(p, '#/writing'); await p.waitForTimeout(150);
  check('P2 舊網址 #/writing 會打開計畫書與附件', (await p.locator('h1').innerText()) === '計畫書與附件' && (await p.locator('.nav a[data-route=plan]').getAttribute('aria-current')) === 'page');
  check('P3 首次動撥有 9 段', (await p.locator('.plnav li').count()) === 9, await p.locator('.plnav li').count());
  check('P4 每段標出會寫進哪份文件', (await p.locator('.psec-h .doctag').innerText()).includes('計畫書'));
  await p.fill('#pl-p-name', '王小美');
  let st = await stored(p);
  check('P5 填寫姓名即時保存', st.plan && st.plan.p.name === '王小美', JSON.stringify(st && st.plan && st.plan.p));
  await p.fill('#pl-secret-idno', 'A223456789');
  st = await stored(p);
  check('P6 身分證字號不寫進瀏覽器', !JSON.stringify(st).includes('A223456789'));
  await go(p, '#/plan/structure'); await p.waitForTimeout(150);
  await p.fill('#pl-st-margin', '55'); await p.fill('#pl-st-days', '26'); await p.fill('#pl-st-price', '75');
  await p.fill('#pl-st-biz-rent-amt', '18000'); await p.fill('#pl-st-home-food-amt', '40000'); await p.fill('#pl-st-inc-salary-amt', '25000');
  const bep = await p.locator('[data-out="st.bep"]').first().innerText();
  // (18000+40000-25000)/0.55 = 60000
  check('P7 損益平衡即時計算（不重畫頁面）', bep === '60,000', bep);
  check('P8 每天最低營業額、來客數', (await p.locator('[data-out="st.daily"]').first().innerText()) === '2,308' && (await p.locator('[data-out="st.cust"]').first().innerText()) === '31 人');
  check('P9 輸入時焦點留在原欄位', await p.evaluate(() => document.activeElement && document.activeElement.id === 'pl-st-inc-salary-amt'));
  st = await stored(p);
  check('P10 營運結構同步到損益平衡工具', st.tools.breakeven.fixed === '18000' && st.tools.breakeven.before === '40000' && st.tools.breakeven.income === '25000', JSON.stringify(st.tools.breakeven));
  await p.fill('#pl-st-home-other-amt', '2000');
  await go(p, '#/plan/make'); await p.waitForTimeout(150);
  const finds = await p.locator('.plfind li').allInnerTexts();
  check('P11 「其他」有金額沒寫內容 → 需修改', finds.some(t => t.includes('家庭支出「其他」有金額')), finds.slice(0, 5).join(' | '));
  await go(p, '#/plan/money'); await p.waitForTimeout(150);
  await p.click('[data-act=plAdd][data-list=debts]');
  check('P12 新增債務卡片，焦點移到第一個欄位', (await p.locator('.pcard').count()) === 1 && await p.evaluate(() => (document.activeElement.dataset.fk || '').startsWith('pl:debts.')));
  const did = (await stored(p)).plan.debts[0].id;
  await p.fill('#pl-debts-' + did + '-creditor', '銀行');
  await go(p, '#/plan/make'); await p.waitForTimeout(150);
  const f2 = await p.locator('.plfind li').allInnerTexts();
  check('P13 債權人只寫「銀行」→ 需修改', f2.some(t => t.includes('債權人只寫「銀行」')), f2.slice(0, 6).join(' | '));
  await p.locator('.plfind li', { hasText: '債權人只寫' }).locator('[data-act=plGo]').click(); await p.waitForTimeout(250);
  check('P14 「去填寫」跳到該欄位', await p.evaluate(id => document.activeElement && document.activeElement.id === 'pl-debts-' + id + '-creditor', did));
  await p.click('[data-act=plDel][data-list=debts]');
  check('P15 移除債務可復原', (await p.locator('.pcard').count()) === 0 && await p.locator('#toastUndo').isVisible());
  await p.click('#toastUndo'); await p.waitForTimeout(100);
  check('P16 復原後債務回來', (await p.locator('.pcard').count()) === 1);
  await ctx.close();

  /* ===== P2 完整範例：產生 Word、Excel，並對照進度表打勾 ===== */
  ({ ctx, p } = await ctxPage(b));
  await p.goto(G);
  await p.evaluate(s => localStorage.setItem('startup-loan-local-v3', JSON.stringify(s)), sampleState());
  await p.goto(G + '#/plan/basic'); await p.reload(); await p.waitForTimeout(250);
  await p.fill('#pl-secret-idno', 'A223456789');
  await go(p, '#/plan/loan'); await p.waitForTimeout(150);
  await p.fill('#pl-secret-account', '123540123456');
  const navTxt = await p.locator('.plnav').innerText();
  check('Q1 範例資料：各段顯示完成', (await p.locator('.plnav .pn-done').count()) === 8, navTxt.replace(/\n/g, ' '));
  await go(p, '#/plan/make'); await p.waitForTimeout(150);
  const f3 = await p.locator('.plfind li').allInnerTexts();
  check('Q2 範例資料沒有「需修改」或「未填」', !f3.some(t => /^(需修改|未填)/.test(t.trim())), f3.join(' | '));
  const docx = await dl(p, '[data-act=plGen][data-what=plan]');
  check('Q3 下載計畫書 .docx', /信扶專案創業計畫書_王小美_\d{8}\.docx$/.test(docx) && fs.statSync(docx).size > 50000, docx);
  const xlsx = await dl(p, '[data-act=plGen][data-what=attach]');
  check('Q4 下載附件 .xlsx', /創業計畫書附件_王小美_\d{8}\.xlsx$/.test(xlsx) && fs.statSync(xlsx).size > 20000, xlsx);
  st = await stored(p);
  const it = st.first.items;
  check('Q5 計畫書完成條件自動勾選（工具判斷）', it['ref-21'] && it['ref-21'].crit.ready && it['ref-21'].via.ready === 'tool', JSON.stringify(it['ref-21']));
  check('Q6 債務盤點表 5 項條件自動勾選', it['ref-23'] && ['debtor', 'creditor', 'date', 'status', 'total'].every(k => it['ref-23'].crit[k] && it['ref-23'].via[k] === 'tool'), JSON.stringify(it['ref-23']));
  check('Q7 營運結構：毛利率、沒有空白自動勾選', it['ref-25'] && it['ref-25'].crit.margin && it['ref-25'].crit.blank && !it['ref-25'].crit.household, JSON.stringify(it['ref-25']));
  check('Q8 營運財務預估：試算與一致自動勾選', it['ref-26'] && it['ref-26'].crit.ready && it['ref-26'].crit.match, JSON.stringify(it['ref-26']));
  check('Q9 設備購買表與估價單自動勾選', it['ref-27'] && it['ref-27'].crit.ready && it['ref-27'].crit.quote && it['ref-28'] && it['ref-28'].crit.match, JSON.stringify([it['ref-27'], it['ref-28']]));
  check('Q10 寄出、上傳不會自動勾', !it['ref-23'].crit.send && !it['ref-21'].crit.send && !it['ref-21'].crit.advisor);
  check('Q11 身分證、帳號仍不保存', !JSON.stringify(st).includes('A223456789') && !JSON.stringify(st).includes('123540123456'));
  check('Q12 產生後顯示已下載與勾選說明', (await p.locator('.ticknote').innerText()).includes('已下載'));
  const refTxt = await p.locator('.reflist-wrap').innerText();
  check('Q13 對照進度表列出第 21～28 列', ['第 21 列', '第 23 列', '第 25 列', '第 26 列', '第 27 列', '第 28 列'].every(x => refTxt.includes(x)), refTxt.slice(0, 200));
  await p.screenshot({ path: path.join(OUT, 'make.png'), fullPage: true });
  for (const s of ['basic', 'biz', 'money', 'structure', 'forecast', 'needs', 'loan']) { await go(p, '#/plan/' + s); await p.waitForTimeout(120); await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: path.join(OUT, 'sec-' + s + '.png'), fullPage: true }); }
  // 「去繳交資料」看到工具勾選
  await go(p, '#/item/ref-23'); await p.waitForTimeout(150);
  check('Q14 繳交資料標示「工具檢查通過」', (await p.locator('.viatag').count()) >= 5);
  check('Q15 繳交資料頁有「計畫書與附件」連結', (await p.locator('a.planlink').getAttribute('href')) === '#/plan/money');
  // 變更：申請金額超過所需總額
  await go(p, '#/plan/loan'); await p.waitForTimeout(150);
  await p.fill('#pl-loan-amount', '250000'); await p.fill('#pl-loan-years', '8');
  await go(p, '#/plan/make'); await p.waitForTimeout(150);
  const f4 = await p.locator('.plfind li').allInnerTexts();
  check('Q16 申請金額超過所需總額 → 請核對', f4.some(t => t.includes('比所需貸款總額')), f4.join(' | '));
  check('Q17 貸款期限超過 7 年 → 需修改', f4.some(t => t.includes('須小於或等於 7 年')));
  await go(p, '#/plan/loan'); await p.waitForTimeout(100); await p.fill('#pl-loan-amount', '150000'); await p.fill('#pl-loan-years', '5');
  // 備份、還原保留計畫書資料
  const [bk] = await Promise.all([p.waitForEvent('download'), p.click('.side [data-act=export]')]); const bkf = path.join(OUT, 'backup.json'); await bk.saveAs(bkf);
  const bj = JSON.parse(fs.readFileSync(bkf, 'utf8'));
  check('Q18 備份含計畫書資料、不含身分證', bj.plan && bj.plan.debts.length === 4 && !JSON.stringify(bj).includes('A223456789'));
  await ctx.close();

  /* ===== P2b 列數超過範本預設、千分位 ===== */
  ({ ctx, p } = await ctxPage(b));
  await p.goto(G);
  const big = sampleState();
  big.plan.owned = Array.from({ length: 10 }, (_, i) => ({ id: 'ow' + i, item: '設備' + (i + 1) + '號', price: '1000', qty: '2', paid: i % 2 ? 'inst' : 'paid', unpaid: i % 2 ? '500' : '' }));
  big.plan.buy = Array.from({ length: 5 }, (_, i) => ({ id: 'bu' + i, item: '新機' + (i + 1) + '號', use: '生產', spec: '標準', price: '2000', qty: '1', when: '115/11', pay: 'once', periods: '', perPay: '', source: '廠商', quote: true }));
  await p.evaluate(s => localStorage.setItem('startup-loan-local-v3', JSON.stringify(s)), big);
  await p.goto(G + '#/plan/needs'); await p.reload(); await p.waitForTimeout(250);
  check('S1 10 筆現有設備都顯示', (await p.locator('.ltable .lt-row').count()) >= 10);
  await go(p, '#/plan/make'); await p.waitForTimeout(150);
  const docx2 = await dl(p, '[data-act=plGen][data-what=plan]');
  const raw2 = fs.readFileSync(docx2).toString('utf8');
  check('S2 計畫書表格自動加列：10 筆現有設備、5 項購置設備', ['設備1號', '設備10號', '新機1號', '新機5號'].every(x => raw2.includes(x)) && (raw2.match(/設備\d+號/g) || []).length === 10, (raw2.match(/設備\d+號/g) || []).length);
  check('S3 金額小計正確（10 × 2,000 ＝ 20,000；未繳清 5 × 500 ＝ 2,500）', raw2.includes('20,000') && raw2.includes('2,500'));
  await go(p, '#/plan/money'); await p.waitForTimeout(150);
  await p.fill('#pl-inv-self', '80000'); await p.locator('#pl-inv-self').dispatchEvent('change');
  st = await stored(p);
  check('S4 金額離開欄位後加上千分位', (await p.inputValue('#pl-inv-self')) === '80,000' && st.plan.inv.self === '80,000', await p.inputValue('#pl-inv-self'));
  await go(p, '#/plan/structure'); await p.waitForTimeout(150);
  await p.fill('#pl-st-margin', '55'); await p.locator('#pl-st-margin').dispatchEvent('change');
  check('S5 毛利率不加千分位、不改格式', (await p.inputValue('#pl-st-margin')) === '55');
  await ctx.close();

  /* ===== P3 第 2～5 次動撥：只產生債務、營運結構 ===== */
  ({ ctx, p } = await ctxPage(b));
  await p.goto(G);
  const s2 = sampleState(); s2.mode = 'later'; s2.round = '3'; s2.plan.debts[0].status = '已還清';
  await p.evaluate(s => localStorage.setItem('startup-loan-local-v3', JSON.stringify(s)), s2);
  await p.goto(G + '#/plan'); await p.reload(); await p.waitForTimeout(250);
  check('R1 第 2～5 次動撥只有 3 段', (await p.locator('.plnav li').count()) === 3 && (await p.locator('.psec-h h2').innerText()) === '債務現況');
  await go(p, '#/plan/make'); await p.waitForTimeout(150);
  check('R2 只提供附件產生', (await p.locator('[data-act=plGen]').count()) === 1);
  const x2 = await dl(p, '[data-act=plGen][data-what=attach]');
  check('R3 下載第 3 次動撥附件', /創業計畫書附件_第3次動撥_王小美_\d{8}\.xlsx$/.test(x2), x2);
  st = await stored(p);
  const r3 = st.rounds['3'].items;
  check('R4 第 3 次動撥：債務、營運結構完成條件自動勾選', r3['later-debt'] && r3['later-debt'].crit.file && r3['later-debt'].crit.debtor && r3['later-structure'] && r3['later-structure'].crit.latest && r3['later-structure'].crit.margin, JSON.stringify(r3));
  fs.writeFileSync(path.join(OUT, 'later-file.txt'), x2);
  await ctx.close();

  /* ===== P4 手機版、審查人員版 ===== */
  ({ ctx, p } = await ctxPage(b, { viewport: { width: 390, height: 844 }, hasTouch: true }));
  await p.goto(G);
  await p.evaluate(s => localStorage.setItem('startup-loan-local-v3', JSON.stringify(s)), sampleState());
  for (const s of ['basic', 'money', 'structure', 'forecast', 'needs', 'make']) {
    await p.goto(G + '#/plan/' + s); if (s === 'basic') await p.reload(); await p.waitForTimeout(150);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('M ' + s + ' 手機沒有整頁水平捲動', over <= 1, over);
    if (s === 'money' || s === 'structure' || s === 'make') await p.screenshot({ path: path.join(OUT, 'm-' + s + '.png'), fullPage: true });
  }
  check('M 手機底部分頁顯示「計畫書」', (await p.locator('.nav a[data-route=plan] .lbl-s').isVisible()) && !(await p.locator('.nav a[data-route=plan] .lbl-l').isVisible()));
  await ctx.close();
  ({ ctx, p } = await ctxPage(b));
  await p.goto(R); await p.fill('#gateCode', CODE); await p.click('#gateBtn'); await p.waitForTimeout(400);
  await go(p, '#/plan'); await p.waitForTimeout(150);
  check('V 審查人員版看不到計畫書頁（導回審查案件）', (await p.locator('h1').innerText()) !== '計畫書與附件' && !(await p.locator('.nav a[data-route=plan]').isVisible()));
  await ctx.close();

  check('Z 全程沒有 JavaScript 錯誤', errors.length === 0, errors.join(' | '));
  fs.writeFileSync(path.join(OUT, 'files.json'), JSON.stringify({ docx, xlsx, later: x2 }));
  console.log('\n' + results.filter(r => r.ok).length + '/' + results.length + ' passed');
  await b.close();
  process.exit(results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
