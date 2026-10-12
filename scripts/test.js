// 端對端測試（引導員版、審查人員版）。請用 npm test 執行：會先用測試通行碼建置到 .test-output/。
// 直接執行：DIST=建置好的 dist 資料夾 REVIEWER_CODE=建置時用的通行碼 node scripts/test.js
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const DIST = process.env.DIST || path.join(ROOT, 'dist');
const NEW = 'file://' + path.join(DIST, '創業貸款準備助手-引導員版.html');
const RVF = 'file://' + path.join(DIST, '創業貸款準備助手-審查人員版.html');
const CODE = process.env.REVIEWER_CODE || '';
if (!CODE) { console.error('請設定 REVIEWER_CODE（和建置時相同的測試通行碼），建議直接執行 npm test'); process.exit(2); }
// 舊版（v2）HTML 不放在 repo 裡；有的話可用 LEGACY_HTML 指定，沒有就用 testdata 裡錄好的舊版資料
const OLD_FILE = process.env.LEGACY_HTML || '';
const OLD = OLD_FILE ? 'file://' + path.resolve(OLD_FILE) : '';
const OUTDIR = process.env.TEST_OUT || path.join(ROOT, '.test-output');
const SHOTS = path.join(OUTDIR, 'test'); fs.mkdirSync(SHOTS, { recursive: true });
const TD = path.join(ROOT, 'testdata');           // 只讀：repo 裡的測試資料
const TW = path.join(OUTDIR, 'testdata'); fs.mkdirSync(TW, { recursive: true });  // 測試過程產生的檔案
const results = []; const errors = [];
function check(name, ok, detail = '') { results.push({ name, ok: !!ok, detail: String(detail).slice(0, 300) }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  → ' + detail)); }
const tz = 'Asia/Taipei';
function isoOffset(days, base) { const d = base ? new Date(base + 'T00:00:00') : new Date(new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()) + 'T00:00:00'); d.setDate(d.getDate() + days); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function addMonths(s, n) { const [y, m, d] = s.split('-').map(Number); const t = new Date(y, m - 1 + n, 1); const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); t.setDate(Math.min(d, last)); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }
const TODAY = isoOffset(0);
async function newCtx(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'zh-TW', timezoneId: tz, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(page.url().slice(-40) + ' pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(page.url().slice(-40) + ' console: ' + m.text()); });
  page.dialogs = [];
  page.on('dialog', d => { page.dialogs.push(d.message()); d.accept(); });
  return { ctx, page };
}
const go = (page, h) => page.evaluate(x => { location.hash = x; }, h);
const txt = (page, sel) => page.locator(sel).first().innerText();
async function pill(page, id, scope = 'first') { return (await page.locator(`details[data-row="${scope}:${id}"] summary .pill`).innerText()).trim(); }
async function openRow(page, id, scope = 'first') { const d = page.locator(`details[data-row="${scope}:${id}"]`); if (!(await d.evaluate(e => e.open))) await d.locator('summary').click(); }
async function shot(page, name, full = true) { if (full) await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); window.scrollTo(0, 0); }); await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: full }); }
async function download(page, action) { const [dl] = await Promise.all([page.waitForEvent('download'), action()]); const p = path.join(SHOTS, dl.suggestedFilename()); await dl.saveAs(p); return p; }
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('startup-loan-local-v3') || 'null'));
const storedR = page => page.evaluate(() => JSON.parse(localStorage.getItem('startup-loan-review-v1') || 'null'));
async function skipWelcome(page) { const b = page.locator('[data-act=welcomeSkip]'); if (await b.count() && await b.isVisible()) { await b.click(); await page.waitForTimeout(80); } }
async function openG(page, url = NEW) { await page.goto(url); await skipWelcome(page); }
async function openR(page, url = RVF) { await page.goto(url); if (await page.locator('#gateCode').count()) { await page.fill('#gateCode', CODE); await page.click('#gateBtn'); await page.waitForSelector('[data-act=welcomeSkip], .pagehead', { timeout: 8000 }); } await skipWelcome(page); }


(async () => {
  const browser = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });

  /* ===== A. 新版：空白開啟、案件設定、寄達期限 ===== */
  let { ctx, page } = await newCtx(browser);
  await openG(page);
  check('A1 標題正確', (await page.title()).includes('創業貸款準備助手'));
  check('A2 繳交資料計數 0/24', (await txt(page, '#navDocs')) === '0/24', await txt(page, '#navDocs'));
  check('A3 未設定日期時郵戳提示設定', (await page.locator('#postmark').getAttribute('class')).includes('unset'));
  await shot(page, 's01-overview-empty');
  await page.fill('#caseName', '測試個案甲');
  check('A4 個案名稱即時顯示', (await txt(page, '#caseChip')) === '個案：測試個案甲');
  const review = isoOffset(20);
  await page.fill('input[data-act=scopeDate]', review); await page.locator('input[data-act=scopeDate]').dispatchEvent('change');
  const due = isoOffset(10);
  let aria = await page.locator('#postmark').getAttribute('aria-label');
  check('A5 寄達期限 = 審查日前 10 天', aria.includes(due.replace(/-/g, '/')) && aria.includes('剩 10 天'), aria);
  check('A6 期限充裕時為綠色（非 soon/late）', !/soon|late|unset/.test(await page.locator('#postmark').getAttribute('class')));
  await page.fill('input[data-act=scopeDate]', isoOffset(15)); await page.locator('input[data-act=scopeDate]').dispatchEvent('change');
  check('A7 7 天內轉為提醒色', (await page.locator('#postmark').getAttribute('class')).includes('soon'));
  await page.fill('input[data-act=scopeDate]', isoOffset(5)); await page.locator('input[data-act=scopeDate]').dispatchEvent('change');
  check('A8 已過寄達期限轉為紅色並顯示逾期', (await page.locator('#postmark').getAttribute('class')).includes('late') && (await page.locator('#postmark').getAttribute('aria-label')).includes('已逾期 5 天'));
  await page.fill('input[data-act=scopeDate]', review); await page.locator('input[data-act=scopeDate]').dispatchEvent('change');
  await page.click('[data-act=deadlineTask]');
  let st = await stored(page);
  check('A9 寄達期限加入待辦（日期正確）', st.tasks.some(t => t.date === due && t.text.includes('信扶專案收')), JSON.stringify(st.tasks));
  check('A10 資料寫入 v3 儲存位置', st && st.version === 3 && st.caseName === '測試個案甲' && st.first.date === review);

  /* ===== B. 完成條件自動判斷、不需要、鍵盤焦點 ===== */
  await go(page, '#/docs');
  await openRow(page, 'ref-11');
  await page.check('input[data-act=crit][data-id="ref-11"][data-c="ic-contact"]');
  check('B1 勾一項 → 進行中', (await pill(page, 'ref-11')) === '進行中', await pill(page, 'ref-11'));
  await page.check('input[data-act=crit][data-id="ref-11"][data-c="ic-personal"]');
  const cb = page.locator('input[data-act=crit][data-id="ref-11"][data-c="ic-done"]');
  await cb.focus(); await page.keyboard.press('Space');
  check('B2 全部勾選 → 完成', (await pill(page, 'ref-11')) === '完成');
  const fk = await page.evaluate(() => document.activeElement && document.activeElement.dataset.fk);
  check('B3 鍵盤勾選後焦點留在同一個核取方塊', fk === 'crit:ref-11:ic-done', fk);
  check('B4 側欄計數更新 1/24', (await txt(page, '#navDocs')) === '1/24', await txt(page, '#navDocs'));
  await openRow(page, 'ref-9');
  await page.check('input[data-act=na][data-id="ref-9"]');
  check('B5 不需要 → 不計入應備（1/23）', (await pill(page, 'ref-9')) === '不需要' && (await txt(page, '#navDocs')) === '1/23', await txt(page, '#navDocs'));
  await page.click('[data-act=docFilter][data-f=done]');
  check('B6 篩選「已完成」只剩 1 列', (await page.locator('details[data-row]').count()) === 1);
  await page.click('[data-act=docFilter][data-f=all]');
  await shot(page, 's02-docs-progress');

  /* ===== C. 戶籍謄本三個月自動判斷 ===== */
  await openRow(page, 'ref-30');
  const ap = page.locator('input[data-act=field][data-id="ref-30"]');
  await ap.fill(addMonths(review, -2)); await ap.dispatchEvent('change');
  let auto = await page.locator('details[data-row="first:ref-30"] .checks .auto').innerText();
  check('C1 申請日在三個月內 → 自動打勾', (await page.locator('details[data-row="first:ref-30"] .checks input[disabled]').isChecked()) && auto.includes('仍在期限內'), auto);
  await page.locator('input[data-act=field][data-id="ref-30"]').fill(addMonths(review, -4)); await page.locator('input[data-act=field][data-id="ref-30"]').dispatchEvent('change');
  auto = await page.locator('details[data-row="first:ref-30"] .checks .auto').innerText();
  check('C2 超過三個月 → 不打勾並提醒重新申請', !(await page.locator('details[data-row="first:ref-30"] .checks input[disabled]').isChecked()) && auto.includes('需要重新申請'), auto);

  /* ===== D. 需修改事項：加入、狀態、刪除與復原 ===== */
  await go(page, '#/item/ref-23');
  await page.click('[data-act=itemForm][data-id="ref-23"]');
  await page.click('[data-act=quickIssue][data-text="借款時間沒有依先後排列"]');
  check('D1 常見需修改一鍵加入 → 狀態需修改', (await txt(page, '.itemhead .pill')) === '需修改');
  check('D2 側欄需修改徽章 1', (await txt(page, '#navIssues')) === '1');
  await page.fill('form[data-form=issue] input[name=text]', '債權人寫「銀行」，請寫全名');
  await page.click('form[data-form=issue] button');
  check('D3 自行輸入的需修改事項加入', (await page.locator('.ilist li').count()) === 2);
  await shot(page, 's03-item-issues');
  await page.locator('[data-act=issueSet][data-s=fixed]').first().click();
  await page.locator('[data-act=issueSet][data-s=fixed]').first().click();
  check('D4 全部標記已修改 → 待確認', (await txt(page, '.itemhead .pill')) === '待確認');
  await page.locator('[data-act=issueSet][data-s=done]').first().click();
  await page.locator('[data-act=issueSet][data-s=done]').first().click();
  check('D5 全部確認 → 回到依完成條件判斷（未開始）', (await txt(page, '.itemhead .pill')) === '未開始');
  await page.locator('[data-act=issueDel]').first().click();
  check('D6 刪除後出現可復原提示', await page.locator('#toastUndo').isVisible());
  await page.click('#toastUndo');
  check('D7 按復原後事項回來', (await page.locator('.ilist li').count()) === 2);
  await go(page, '#/docs'); await openRow(page, 'ref-15');
  await page.click('[data-act=markMissing][data-id="ref-15"]');
  check('D8 標記缺件 → 缺件待補', (await pill(page, 'ref-15')) === '缺件待補');

  /* ===== E. 需修改事項頁：批次管理 ===== */
  await go(page, '#/issues');
  await page.click('[data-act=issueAdd]');
  for (const t of ['批次一', '批次二', '批次三']) { await page.fill('form[data-form=issue] input[name=text]', t); await page.click('form[data-form=issue] button'); }
  check('E1 待修改共 4 項（缺件 1 + 新增 3）', (await page.locator('.ilist li').count()) === 4, await page.locator('.ilist li').count());
  await page.click('[data-act=issueBatch]');
  await page.click('[data-act=issueSelAll]');
  check('E2 全選顯示已選數量', (await txt(page, '.batchbar strong')) === '已選 4 項');
  await page.locator('input[data-act=issueSel]').first().uncheck();
  check('E3 取消一項 → 已選 3 項', (await txt(page, '.batchbar strong')) === '已選 3 項');
  await shot(page, 's04-issues-batch');
  await page.click('[data-act=issueBatchSet][data-s=fixed]');
  check('E4 批次標記已修改後，待修改剩 1 項', (await page.locator('.ilist li').count()) === 1);
  await page.click('[data-act=issueFilter][data-f=fixed]');
  await page.click('[data-act=issueSelAll]');
  await page.click('[data-act=issueBatchDel]');
  check('E5 批次刪除後待確認清單為空', (await page.locator('.ilist li').count()) === 0);
  check('E6 標頭出現「復原」並註明動作', (await page.locator('#undoBtn').isVisible()) && (await txt(page, '#undoBtn')).includes('刪除 3 項需修改事項'), await txt(page, '#undoBtn'));
  await page.click('#undoBtn');
  check('E7 復原批次刪除', (await page.locator('.ilist li').count()) === 3);
  await page.click('[data-act=issueBatch]');

  /* ===== F. 待辦：新增、逾期、批次刪除與復原 ===== */
  await go(page, '#/tasks');
  const addTask = async (t, d) => { await page.fill('form[data-form=task] input[name=text]', t); if (d) await page.fill('form[data-form=task] input[name=date]', d); await page.click('form[data-form=task] button'); };
  await addTask('打電話確認謄本', isoOffset(-2)); await addTask('整理估價單', isoOffset(3)); await addTask('影印身分證', '');
  check('F1 新增 3 項待辦（含寄達期限共 4 項）', (await page.locator('.trow').count()) === 4);
  check('F2 逾期待辦顯示紅字', (await page.locator('.trow small.overdue').count()) === 1 && (await txt(page, '.trow small.overdue')).includes('已逾期 2 天'));
  await page.locator('input[data-act=taskDone]').nth(2).check();
  await page.click('[data-act=taskBatch]');
  await page.click('[data-act=taskSelDone]');
  check('F3 選取已完成 → 已選 1 項', (await txt(page, '.batchbar strong')) === '已選 1 項');
  await page.click('[data-act=taskSelAll]');
  await page.click('[data-act=taskBatchDel]');
  check('F4 批次刪除全部待辦', (await page.locator('.trow').count()) === 0);
  await shot(page, 's05-tasks-after-delete');
  await page.click('#undoBtn');
  check('F5 復原後 4 項待辦回來', (await page.locator('.trow').count()) === 4);
  await page.click('[data-act=taskBatch]');
  await page.locator('[data-act=taskDel]').nth(3).click();
  check('F7 刪除單一待辦後可復原', await page.locator('#undoBtn').isVisible());
  await page.fill('textarea[data-bind=meetingNotes]', '之後又改了別的內容');
  check('F8 之後有其他修改 → 不再提供復原（避免蓋掉新內容）', !(await page.locator('#undoBtn').isVisible()));
  if (await page.locator('#toastUndo').isVisible()) { await page.click('#toastUndo'); check('F9 過期的復原會說明原因', (await txt(page, '#toastText')).includes('無法復原')); }
  check('F10 過期復原沒有改動資料', (await page.locator('.trow').count()) === 3 && (await stored(page)).meetingNotes === '之後又改了別的內容');
  await go(page, '#/overview');
  check('F6 總覽「接下來」列出需修改與到期待辦', (await page.locator('.next .tag.fix').count()) >= 1 && (await page.locator('.next .tag.due').count()) >= 1);
  await shot(page, 's06-overview-working');

  /* ===== G. 第 2～5 次動撥 ===== */
  await page.click('.modebar [data-act=mode][data-mode=later]');
  check('G1 切換後出現第幾次選單', await page.locator('#roundSel').isVisible());
  check('G2 第 2 次：營業登記本次不需要', (await page.evaluate(() => { location.hash = '#/docs'; return 1; })) && (await pill(page, 'later-registration', 'r2')) === '本次不需要');
  await page.selectOption('#roundSel', '3');
  check('G3 第 3 次：營業登記需要', (await pill(page, 'later-registration', 'r3')) === '未開始');
  check('G4 第 3 次應備 10 項', (await txt(page, '#navDocs')) === '0/10', await txt(page, '#navDocs'));
  await go(page, '#/overview');
  const lateDate = isoOffset(45);
  await page.fill('input[data-act=scopeDate]', lateDate); await page.locator('input[data-act=scopeDate]').dispatchEvent('change');
  aria = await page.locator('#postmark').getAttribute('aria-label');
  check('G5 動撥寄達期限 = 截止日前 1 個月', aria.includes(addMonths(lateDate, -1).replace(/-/g, '/')), aria);
  await shot(page, 's07-later-overview');
  await page.selectOption('#roundSel', '2');
  check('G6 第 2 次與第 3 次分開記錄（第 2 次未設日期）', (await page.locator('#postmark').getAttribute('class')).includes('unset'));
  await page.selectOption('#roundSel', '3');

  /* ===== H. 未來三個月試算（文章範例） ===== */
  await go(page, '#/tools/forecast');
  await page.click('[data-act=fcExample]');
  const totals = [await txt(page, '#fc-total-0'), await txt(page, '#fc-total-1'), await txt(page, '#fc-total-2')];
  check('H1 範例盈餘 -86,389／-24,189／-29,989', totals.join('|') === '-86,389|-24,189|-29,989', totals.join('|'));
  check('H2 (c) = (a) × 成本率', (await txt(page, '#fc-c-0')) === '63,760', await txt(page, '#fc-c-0'));
  check('H3 與表上數字比對一致', (await page.locator('.diff-ok').count()) === 3);
  await page.fill('input[data-tool=forecast][data-f=written][data-m="1"]', '-24000');
  check('H4 數字不一致時顯示差額', (await txt(page, '#fc-diff-1')).includes('差'), await txt(page, '#fc-diff-1'));
  await shot(page, 's08-forecast');

  /* ===== I. 損益平衡試算（文章範例） ===== */
  await go(page, '#/tools/breakeven');
  await page.click('[data-act=beExample]');
  const be = await txt(page, '#beOut');
  check('I1 損益平衡點 170,048／149,215', be.includes('170,048') && be.includes('149,215'), be);
  check('I2 每日營業額 7,729／6,783，來客 52／46 人', be.includes('7,729') && be.includes('6,783') && be.includes('52 人') && be.includes('46 人'), be);
  await shot(page, 's09-breakeven');

  await page.fill('input[data-tool=breakeven][data-f=income]', '10000');
  check('I3 家庭收入要從損益平衡扣除（範本算法）', (await txt(page, '#beOut')).includes('153,382'), await txt(page, '#beOut'));
  await page.fill('input[data-tool=breakeven][data-f=income]', '3萬');
  check('I4 金額可寫「3萬」', (await txt(page, '#beOut')).includes('120,048'), await txt(page, '#beOut'));
  await page.fill('input[data-tool=breakeven][data-f=income]', '三萬');
  check('I5 看不懂的金額會提醒，不會默默當 0', (await txt(page, '#beOut')).includes('不是數字'), await txt(page, '#beOut'));
  await page.fill('input[data-tool=breakeven][data-f=income]', '110000');
  const neg = await txt(page, '#beOut');
  check('I6 家庭收入足以支付時，兩欄都說明並以 0 計', neg.includes('計畫性還款前、計畫性還款後') && neg.includes('以 0 計') && !neg.includes('-'), neg);
  await page.fill('input[data-tool=breakeven][data-f=income]', '0');

  /* ===== J. 前期動撥款使用加總 ===== */
  await go(page, '#/tools/usage');
  await page.fill('input[data-tool=usage][data-f=amount]', '200000');
  await page.click('[data-act=usageAdd]'); await page.locator('input[data-tool=usage][data-f=name]').last().fill('冷凍櫃'); await page.locator('input[data-tool=usage][data-f=amt]').last().fill('150,000');
  await page.click('[data-act=usageAdd]'); await page.locator('input[data-tool=usage][data-f=name]').last().fill('週轉金'); await page.locator('select[data-act=usageKind]').last().selectOption('週轉金'); await page.locator('input[data-tool=usage][data-f=amt]').last().fill('80000');
  let us = await txt(page, '#usOut');
  check('J1 總數 230,000 和前一期款不符 → 需修改', us.includes('230,000') && us.includes('多 30,000') && (await page.locator('#usOut li.fix').count()) >= 1, us);
  check('J2 設施設備沒有正本發票時提醒；週轉金應為 50,000', us.includes('需要正本發票或收據') && us.includes('50,000'), us);
  await page.locator('input[data-tool=usage][data-f=amt]').last().fill('50000');
  await page.locator('input[data-act=usageProof]').first().check();
  us = await txt(page, '#usOut');
  check('J3 週轉金補到總數等於前一期款、附了發票 → 沒有問題', us.includes('總數等於前一期款') && (await page.locator('#usOut li').count()) === 0, us);
  await page.click('[data-act=usageAdd]'); await page.locator('input[data-tool=usage][data-f=name]').last().fill('拿去還款'); await page.locator('input[data-tool=usage][data-f=amt]').last().fill('0');
  us = await txt(page, '#usOut');
  check('J4 列成設施設備卻寫「拿去還款」→ 需修改，要改列週轉金', us.includes('計畫性還款請改列為週轉金') && (await page.locator('#usOut li.fix').count()) >= 1, us);
  await page.locator('select[data-act=usageKind]').last().selectOption('週轉金');
  us = await txt(page, '#usOut');
  check('J4b 已列週轉金但名稱有「還款」→ 只提醒表上寫週轉金', us.includes('表上請寫「週轉金」') && (await page.locator('#usOut li.fix').count()) === 0, us);

  /* ===== K. 債務盤點表檢核：Excel 檔（三種寫法）與貼上 ===== */
  await page.click('.modebar [data-act=mode][data-mode=first]');
  for (const f of ['debt-sample.xlsx', 'debt-sample-sst.xlsx', 'debt-formula-lo.xlsx']) {
    await go(page, '#/tools/debt');
    await page.setInputFiles('input[data-act=xlsx][data-tool=debt]', path.join(TD, f));
    await page.waitForSelector('#toolResult .findings, #toolResult .notice', { timeout: 5000 });
    const out = await txt(page, '#toolResult');
    const ok = out.includes('讀到 6 筆債務、2 位債務人') && out.includes('比上一筆') && out.includes('繳款中') && out.includes('剩餘還款總金額寫 554,000，各列加總是 544,000') && out.includes('每月還款金額空白') && out.includes('只寫「銀行」') && !out.includes('每月付款總金額寫');
    check('K1 讀取 ' + f + ' 並找出預期問題', ok, out.slice(0, 600));
  }
  check('K2 自動選到「債務」工作表', (await page.locator('[data-act=pickSheet][aria-pressed=true]').innerText()).includes('債務'));
  check('K3 合併的債務人以「同上」顯示', (await page.locator('.preview td', { hasText: '（同上）' }).count()) >= 4);
  await page.fill('[data-bind=debtCase]', '王媽媽');
  await page.click('[data-act=runDebt]');
  check('K4 輸入個案本名 → 提醒個案要排第一', (await txt(page, '#toolResult')).includes('個案「王媽媽」的債務請排在第一'));
  await shot(page, 's10-debt-xlsx');
  const fixCount = await page.locator('#toolResult .findings li.fix').count();
  await page.click('[data-act=findingAll][data-tool=debt]');
  st = await stored(page);
  check('K5 「全部加入」把需修改項目寫入債務盤點表', st.issues.filter(i => i.itemId === 'ref-23' && i.status === 'open' && i.source === '自我檢核').length === fixCount, fixCount);
  // 貼上路徑（從 Excel 複製時合併儲存格會變成空白）
  const tsv = ['債務人\t債權人\t借款金額\t借款用途\t借款時間\t利率\t每月還款金額\t目前還款狀況(本息攤還/只繳息/未還)\t剩餘金額',
    '本人\t台新銀行\t"100,000"\t週轉\t113/05/07\t\t"3,000"\t本息攤還\t"60,000"', '\t親友\t20000\t生活\t112年\t\t0\t未還\t20000',
    '\t\t\t\t\t每月付款總金額\t3000\t剩餘還款總金額\t80000'].join('\n');
  await go(page, '#/tools/debt');
  await page.click('[data-act=clearTool][data-tool=debt]');
  await page.fill('textarea[data-bind=paste][data-tool=debt]', tsv);
  await page.click('[data-act=runDebt]');
  const p = await txt(page, '#toolResult');
  check('K6 貼上表格：抓到「本人」、借款時間順序；加總正確不報錯', p.includes('債務人寫「本人」') && p.includes('比上一筆') && !p.includes('總金額寫') && p.includes('讀到 2 筆債務'), p.slice(0, 500));
  await page.fill('textarea[data-bind=paste][data-tool=debt]', '隨便\t一些\n文字\t內容');
  await page.click('[data-act=runDebt]');
  check('K7 找不到表頭時給出修正方向', (await txt(page, '#toolResult')).includes('找不到表頭'));

  const tpl = ['債務人\t債權人\t債務總額\t借錢原因\t借錢時間\t利率\t每期還款數字\t目前還款狀況(本息償還/只還息/未還)\t剩餘金額', '王小明\tA銀行\t100000\t週轉\t113/05/07\t\t3000\t本息償還\t60000', '\t親友\t20000\t生活\t113年8月\t\t\t只還息\t20000', '\t\t\t\t\t每月付款總金額\t3000\t剩餘還款總金額\t80000'].join('\n');
  await page.fill('textarea[data-bind=paste][data-tool=debt]', tpl); await page.click('[data-act=runDebt]');
  const tres = await txt(page, '#toolResult');
  const twoRow = ['債務人\t債權人\t債務總額\t借錢原因\t借錢時間\t利率\t每期還款數字\t目前還款狀況\t剩餘金額', '\t\t（元）\t\t（民國年）\t\t（元）\t（本息償還／只還息／未還）\t（元）', '王小明\tA銀行\t100000\t週轉\t113/05/07\t\t3000\t本息償還\t60000', '\t\t\t\t\t每月付款總金額\t3000\t剩餘還款總金額\t60000'].join('\n');
  await page.fill('textarea[data-bind=paste][data-tool=debt]', twoRow); await page.click('[data-act=runDebt]');
  const two = await txt(page, '#toolResult');
  check('K9 表頭下一列是括號說明（單位、填法）時不算債務', two.includes('讀到 1 筆債務') && !two.includes('空白'), two.slice(0, 400));
  await page.fill('textarea[data-bind=paste][data-tool=debt]', tpl); await page.click('[data-act=runDebt]');
  check('K8 認得官方範本欄位與「本息償還／只還息」，訊息用表上的欄位名稱', tres.includes('讀到 2 筆債務') && !tres.includes('沒有寫明') && tres.includes('每期還款數字空白') && tres.includes('債務總額'), tres.slice(0, 500));

  /* ===== L. 表格空白與加總 ===== */
  await go(page, '#/tools/sheet');
  await page.setInputFiles('input[data-act=xlsx][data-tool=sheet]', path.join(TD, 'structure-sample.xlsx'));
  await page.waitForSelector('#toolResult .findings', { timeout: 5000 });
  const sh = await txt(page, '#toolResult');
  check('L1 找到公式錯誤 #DIV/0!（H11）', sh.includes('#DIV/0!') && sh.includes('H11'), sh.slice(0, 600));
  check('L2 找到空白金額（其他收入 C6）', sh.includes('其他收入') && sh.includes('C6'), sh.slice(0, 600));
  check('L3 找到小計對不上（家庭支出小計 66,250 vs 63,000）', sh.includes('家庭支出小計') && sh.includes('66,250') && sh.includes('63,000'), sh.slice(0, 600));
  check('L4 正確的小計不誤報（固定成本小計 27,800、計畫性還款後 50,500）', !sh.includes('27,800') && !sh.includes('50,500'), sh.slice(0, 800));
  await shot(page, 's11-sheet-check');

  await go(page, '#/tools/forecast');
  check('H5 首次動撥的試算用「營運財務預估分析表」範本欄位', (await txt(page, '.block h2')).includes('營運財務預估分析表') && (await page.locator('th', { hasText: '私帳額外支出' }).count()) === 1);
  await page.click('[data-act=fcExample]');
  check('H6 收入小計、支出小計、盈餘照範本計算', (await txt(page, '#fc-inc-0')) === '159,400' && (await txt(page, '#fc-exp-0')) === '245,789' && (await txt(page, '#fc-total-0')) === '-86,389', [await txt(page, '#fc-inc-0'), await txt(page, '#fc-exp-0'), await txt(page, '#fc-total-0')].join('|'));
  st = await stored(page);
  check('H7 首次動撥的試算存在首次動撥，不佔用第 2 次動撥', st.first.forecast.months[0].a === '159400');
  await page.fill('input[data-tool=forecast][data-f=b][data-m="0"]', '一萬五');
  check('H8 試算欄位看不懂時標示，不會默默當 0', (await txt(page, '#fc-diff-0')).includes('不是數字') && (await txt(page, '#fc-total-0')) === '—');
  await page.fill('input[data-tool=forecast][data-f=b][data-m="0"]', '1.5萬');
  check('H9 「1.5萬」算成 15,000', (await txt(page, '#fc-inc-0')) === '174,400', await txt(page, '#fc-inc-0'));
  await page.fill('input[data-tool=forecast][data-f=b][data-m="0"]', '0');
  await go(page, '#/tools/usage');
  check('J5 首次動撥時，前期動撥款工具提示切換', (await page.locator('[data-act=mode][data-mode=later]', { hasText: '切換到第 2～5 次動撥' }).count()) === 1);

  /* ===== M. 進度摘要、列印報告 ===== */
  await go(page, '#/overview');
  await page.click('[data-act=copySummary]');
  const sum = await page.locator('#summaryText').inputValue();
  check('M1 摘要含個案、寄達期限、需修改與未完成', sum.includes('測試個案甲') && sum.includes('寄達期限 ' + due.replace(/-/g, '/')) && sum.includes('需修改／缺件') && sum.includes('尚未完成'), sum.slice(0, 400));
  await page.click('[data-act=copySummaryNow]');
  const copied = await page.waitForFunction(() => document.getElementById('toastText').textContent.includes('複製'), null, { timeout: 5000 }).then(() => true, () => false);
  check('M2 複製後有結果提示', copied, await txt(page, '#toastText'));
  await shot(page, 's12-summary-dialog', false);
  await page.click('#summaryDialog [data-act=closeDialog]');
  await page.evaluate(() => { window.print = () => {}; });
  await page.click('[data-act=printReport]');
  await page.emulateMedia({ media: 'print' });
  const rep = await txt(page, '#printReport');
  check('M3 列印報告含繳交資料表、需修改事項、流程', rep.includes('創業貸款準備進度報告') && rep.includes('需修改事項（未完成') && rep.includes('□ ') && rep.includes('債務現況盤點表'), rep.slice(0, 300));
  await page.pdf({ path: path.join(SHOTS, 's13-report.pdf'), format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => document.body.classList.remove('report-mode'));

  /* ===== N. 備份與還原（新版） ===== */
  const backup = await download(page, () => page.click('.side [data-act=export]'));
  const bj = JSON.parse(fs.readFileSync(backup, 'utf8'));
  check('N1 備份為 v3 JSON 並含需修改事項', bj.version === 3 && bj.issues.length >= 4 && bj.caseName === '測試個案甲');
  await page.click('.foot [data-act=reset]');
  check('N2 清除此機進度後回到空白', (await txt(page, '#caseChip')) === '' && (await txt(page, '#navDocs')) === '0/24');
  await page.click('#undoBtn');
  check('N3 清除後仍可復原', (await txt(page, '#caseChip')) === '個案：測試個案甲');
  await page.click('.foot [data-act=reset]');
  await page.setInputFiles('#importFile', backup);
  await page.waitForTimeout(200);
  check('N4 從備份還原', (await txt(page, '#caseChip')) === '個案：測試個案甲' && (await stored(page)).issues.length === bj.issues.length);
  await page.reload();
  check('N5 重新整理後進度仍在', (await txt(page, '#caseChip')) === '個案：測試個案甲' && (await txt(page, '#navDocs')) === '1/23');
  await ctx.close();

  /* ===== O. 舊版（v2）產生資料 → 本機升級與備份還原 ===== */
  ({ ctx, page } = await newCtx(browser));
  if (OLD) {
  await page.goto(OLD);
  await page.fill('#caseName', '舊版個案乙'); await page.fill('#dueDate', '2026-11');
  await page.check('input[data-flow="0"]'); await page.check('input[data-flow="2"]');
  await page.click('button[data-tab=writing]'); await page.fill('textarea[data-writing="0"]', '舊版草稿內容'); await page.check('input[data-written="0"]');
  await page.click('button[data-tab=documents]');
  await page.selectOption('select[data-doc-status="ref-7"]', 'started');
  await page.selectOption('select[data-doc-status="ref-9"]', 'na');
  await page.selectOption('select[data-doc-status="ref-11"]', 'missing');
  await page.selectOption('select[data-doc-status="ref-23"]', 'completed');
  await page.fill('textarea[data-doc-note="ref-23"]', '舊版備註：已請個案補');
  await page.fill('#reviewNotes', '舊版審查紀錄');
  await page.click('button[data-tab="guide-infocenter"]'); await page.check('#infocenter-contact');
  await page.click('button[data-tab=reminders]');
  await page.fill('#newTask', '舊版待辦'); await page.fill('#newTaskDate', '2026-10-20'); await page.click('#addTaskForm button');
  await page.fill('#meetingNotes', '舊版會議紀錄');
  const v2file = await download(page, () => page.click('#exportBtn'));
  const v2 = JSON.parse(fs.readFileSync(v2file, 'utf8'));
  check('O1 舊版產生 v2 備份', v2.version === 2 && v2.docs.length === 25, v2.version);
  fs.copyFileSync(v2file, path.join(TW, 'v2-backup.json'));
  } else {
    // 沒有舊版 HTML：放入舊版存的資料（testdata/legacy-v1-storage.json，由舊版實際操作錄下），再打開新版
    const legacy = fs.readFileSync(path.join(TD, 'legacy-v1-storage.json'), 'utf8');
    await ctx.addInitScript(v => { if (!localStorage.getItem('startup-loan-local-v1') && !localStorage.getItem('startup-loan-local-v3')) localStorage.setItem('startup-loan-local-v1', JSON.stringify(JSON.parse(v))); }, legacy);
    fs.copyFileSync(path.join(TD, 'legacy-v2-backup.json'), path.join(TW, 'v2-backup.json'));
    const v2 = JSON.parse(fs.readFileSync(path.join(TW, 'v2-backup.json'), 'utf8'));
    check('O1 舊版 v2 備份（錄好的測試資料）', v2.version === 2 && v2.docs.length === 25, v2.version);
  }
  // 同一個瀏覽器設定檔打開新版 → 自動升級
  await openG(page);
  const notice = await page.locator('.notice.warn').first().innerText().catch(() => '');
  check('O2 同一瀏覽器打開新版會提示已轉入', notice.includes('已把舊版的進度轉入新版'), notice);
  st = await stored(page);
  const it = st && st.first.items;
  check('O3 舊版「完成」→ 沿用完成狀態（不偽造勾選）', it && it['ref-23'].legacyDone === true && Object.keys(it['ref-23'].crit).length === 0 && it['ref-23'].note.includes('舊版備註'));
  check('O4 舊版「不需要」→ 不需要', it && it['ref-9'].na === true);
  check('O5 舊版「缺件待補」→ 需修改事項（缺件）', st && st.issues.some(i => i.itemId === 'ref-11' && i.kind === 'missing' && i.status === 'open'));
  check('O6 Infocenter 圖片勾選 → 對應完成條件', it && it['ref-11'].crit['ic-contact'] === true && !it['ref-11'].crit['ic-personal']);
  check('O7 營運狀態、審查月份、草稿、待辦、紀錄都保留', st.first.operation === 'started' && st.first.legacyMonth === '2026-11' && st.writing[0].text === '舊版草稿內容' && st.writing[0].done && st.tasks.some(t => t.text === '舊版待辦' && t.date === '2026-10-20') && st.meetingNotes === '舊版會議紀錄' && st.reviewNotes === '舊版審查紀錄');
  check('O8 舊版通用流程勾選放進舊版紀錄', st.legacy.flows.join('|') === '確認方案與承辦窗口|撰寫計畫與整理依據', st.legacy.flows.join('|'));
  check('O9 舊版資料仍保留未刪除', await page.evaluate(() => !!localStorage.getItem('startup-loan-local-v1')));
  await shot(page, 's14-migrated-overview');
  await go(page, '#/docs');
  check('O10 升級後狀態：完成、不需要、缺件待補', (await pill(page, 'ref-23')) === '完成' && (await pill(page, 'ref-9')) === '不需要' && (await pill(page, 'ref-11')) === '缺件待補');
  await openRow(page, 'ref-23');
  check('O11 沿用舊版完成狀態有說明', (await page.locator('details[data-row="first:ref-23"] .legacy-tag').count()) === 1);
  await page.check('input[data-act=crit][data-id="ref-23"][data-c="debtor"]');
  check('O12 勾選任一條件後改依完成條件判斷', (await pill(page, 'ref-23')) === '進行中');
  await shot(page, 's15-migrated-docs');
  await page.reload();
  check('O13 升級後重新整理不會重複轉入', !(await page.locator('.notice.warn').count()) && (await stored(page)).issues.filter(i => i.itemId === 'ref-11').length === 1);
  await ctx.close();
  // 另一台電腦：用備份檔還原 v2、v1
  ({ ctx, page } = await newCtx(browser));
  await openG(page);
  await page.setInputFiles('#importFile', path.join(TW, 'v2-backup.json'));
  await page.waitForTimeout(200);
  st = await stored(page);
  check('O14 新版可還原舊版 v2 備份', st && st.caseName === '舊版個案乙' && st.first.items['ref-23'].legacyDone && st.issues.some(i => i.kind === 'missing'));
  const v1 = { version: 1, caseName: 'v1個案', program: '', dueDate: '2026-09-15', meetingNotes: '', flows: [true, false, false, false, false, false], writing: Array.from({ length: 7 }, () => ({ text: '', done: false })), docs: [{ id: 'd1', name: '營業計畫書', hint: '提示', status: 'ready', note: 'v1備註' }, { id: 'd2', name: '加入官方Line進行綁定', hint: '', status: 'todo', note: '' }], tasks: [] };
  fs.writeFileSync(path.join(TW, 'v1-backup.json'), JSON.stringify(v1));
  await page.setInputFiles('#importFile', path.join(TW, 'v1-backup.json'));
  await page.waitForTimeout(200);
  st = await stored(page);
  check('O15 新版可還原 v1 備份（舊清單保留、已移除項目不帶入）', st.caseName === 'v1個案' && st.legacy.docs.length === 1 && st.legacy.docs[0].note === 'v1備註' && st.first.legacyMonth === '2026-09');
  fs.writeFileSync(path.join(TW, 'bad.json'), '{"version":9}');
  await page.setInputFiles('#importFile', path.join(TW, 'bad.json'));
  await page.waitForTimeout(200);
  check('O16 無效備份不會覆蓋目前內容', (await stored(page)).caseName === 'v1個案');
  await ctx.close();

  /* ===== P. 維護內容（審查人員版）與匯出新版 HTML ===== */
  ({ ctx, page } = await newCtx(browser));
  await openR(page);
  check('P0 引導員版沒有維護按鈕，審查人員版才有', await page.locator('.foot [data-act=maint]').isVisible());
  await page.click('.foot [data-act=maint]');
  check('P1 進入維護模式顯示提示列', await page.locator('#maintBar').isVisible());
  await go(page, '#/item/ref-14');
  await page.fill('.editor textarea[data-f=guide]', '報名資料表請用最新版本。\n\n## 注意\n- 簽名欄不可空白\n✓ 簽名：本人簽全名\n✗ 簽名：空白');
  await page.click('[data-act=edCritAdd]');
  await page.locator('.editor input[data-f=crit]').last().fill('簽名欄已確認');
  await page.fill('.editor textarea[data-f=issues]', '簽名欄空白');
  await page.setInputFiles('.editor input[data-act=edImgAdd]', path.join(ROOT, 'src', 'images', 'img0.jpg'));
  await page.waitForSelector('.editor .imgedit li');
  await page.click('[data-act=edSave]');
  check('P2 儲存後作業說明、條件、審查重點、圖片立即生效', (await txt(page, '.guide')).includes('簽名欄不可空白') && (await page.locator('.guide .dodont li').count()) === 2 && (await page.locator('input[data-act=crit][data-id="ref-14"]').count()) === 3 && (await page.locator('.reviewpoints li', { hasText: '簽名欄空白' }).count()) === 1 && (await page.locator('.figure img').count()) === 1);
  await shot(page, 's16-maint-editor');
  const exported = await download(page, () => page.click('#maintBar [data-act=maintExport][data-ed=guide]'));
  const html = fs.readFileSync(exported, 'utf8');
  const contentOf = h => { const a = h.indexOf('<script id="contentData" type="application/json">') + '<script id="contentData" type="application/json">'.length; return JSON.parse(h.slice(a, h.indexOf('</script>', a))); };
  check('P3 匯出的引導員版保留安全設定、含新內容、不含通行碼', html.includes('Content-Security-Policy') && html.includes('簽名欄不可空白') && html.startsWith('<!doctype html>') && html.includes('data-edition="guide"') && !contentOf(html).gate);
  const exportedR = await download(page, () => page.click('#maintBar [data-act=maintExport][data-ed=reviewer]'));
  const htmlR = fs.readFileSync(exportedR, 'utf8');
  check('P3b 匯出的審查人員版含通行碼設定與新內容', htmlR.includes('data-edition="reviewer"') && !!contentOf(htmlR).gate && htmlR.includes('簽名欄不可空白'));
  await ctx.close();
  ({ ctx, page } = await newCtx(browser));
  await openG(page, 'file://' + exported);
  await go(page, '#/item/ref-14');
  await page.click('[data-act=itemForm][data-id="ref-14"]');
  check('P4 新的引導員版在乾淨的瀏覽器中顯示更新後內容（含審查重點）', (await txt(page, '.guide')).includes('簽名欄不可空白') && (await page.locator('.figure img').count()) === 1 && (await page.locator('[data-act=quickIssue]', { hasText: '簽名欄空白' }).count()) === 1);
  check('P5 新檔案未帶出任何個人填寫資料', (await stored(page)) === null || ((await stored(page)).caseName === '' && (await stored(page)).issues.length === 0));
  check('P6 引導員版看不到任何審查入口', (await page.locator('.nav a[data-route=rv]').isVisible()) === false && (await page.locator('.foot [data-act=maint]').isVisible()) === false);
  await page.goto('file://' + exported + '#/rv'); await page.waitForTimeout(150);
  check('P7 引導員版輸入審查網址也只會回到總覽', (await txt(page, 'h1')) === '總覽');
  await ctx.close();

  /* ===== S. 瀏覽器不允許保存 ===== */
  ({ ctx, page } = await newCtx(browser));
  await page.addInitScript(() => { Storage.prototype.getItem = function () { throw new Error('blocked'); }; Storage.prototype.setItem = function () { throw new Error('blocked'); }; });
  await openG(page);
  await page.fill('#caseName', '不能保存');
  check('S1 儲存被封鎖時仍可操作，並提示改用備份', (await txt(page, '#saveState')).includes('不允許保存') && (await txt(page, '#caseChip')) === '個案：不能保存');
  await ctx.close();
  ({ ctx, page } = await newCtx(browser));
  await page.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); }; });
  await openG(page);
  await page.fill('#caseName', '空間不足');
  check('S2 儲存空間不足時明確提示', (await txt(page, '#saveState')).includes('無法自動保存') && (await page.locator('#saveState.bad').count()) === 1);
  check('S3 桌面版不重複顯示手機用的備份按鈕', !(await page.locator('.foot [data-act=export]').isVisible()));
  await ctx.close();

  /* ===== R. 獨立審查發現的問題（回歸測試） ===== */
  ({ ctx, page } = await newCtx(browser));
  await openG(page);
  const evil = '"><img src=x onerror="localStorage.clear();window.__pwned=1">';
  fs.writeFileSync(path.join(TW, 'evil.json'), JSON.stringify({ version: 3, caseName: '注入測試', mode: 'first', round: '2', first: {}, rounds: { '2': { usage: { amount: '1', rows: [{ id: evil, name: 'x', kind: '設備', amount: '1', proof: false }] } } }, issues: [{ id: evil, scope: 'first', itemId: 'ref-23', text: '<b>粗體</b>', kind: 'fix', status: 'open' }], tasks: [{ id: evil, text: '<script>x</script>', date: '', done: false }] }));
  await page.setInputFiles('#importFile', path.join(TW, 'evil.json')); await page.waitForTimeout(200);
  await go(page, '#/tasks'); await go(page, '#/issues'); await go(page, '#/item/ref-23');
  await page.click('.modebar [data-act=mode][data-mode=later]'); await go(page, '#/tools/usage');
  await page.click('.modebar [data-act=mode][data-mode=first]'); await go(page, '#/issues');
  check('R1 備份裡夾帶的惡意 id 不會被執行', await page.evaluate(() => !window.__pwned && !!localStorage.getItem('startup-loan-local-v3') && !document.querySelector('img[src="x"]')));
  check('R1b 夾帶的標籤以純文字顯示', (await txt(page, '.ilist .itext')) === '<b>粗體</b>');
  await ctx.close();

  ({ ctx, page } = await newCtx(browser));
  await openG(page);
  const broken = '{"version":3,"caseName":"壞掉';
  await page.evaluate(b => localStorage.setItem('startup-loan-local-v3', b), broken);
  await page.reload();
  check('R2a 資料讀不到時暫停自動保存', (await txt(page, '#saveState')).includes('暫停自動保存'));
  await go(page, '#/tasks');
  await page.fill('form[data-form=task] input[name=text]', '暫存待辦'); await page.click('form[data-form=task] button');
  await page.locator('[data-act=taskDel]').first().click();
  await page.click('#undoBtn');
  check('R2 讀取失敗時按「復原」也不會覆蓋原本的資料', (await page.evaluate(() => localStorage.getItem('startup-loan-local-v3'))) === broken);
  await ctx.close();

  ({ ctx, page } = await newCtx(browser));
  await openG(page); await go(page, '#/issues');
  await page.click('[data-act=issueAdd]');
  for (const t of ['範圍一', '範圍二', '範圍三', '範圍四']) { await page.fill('form[data-form=issue] input[name=text]', t); await page.click('form[data-form=issue] button'); }
  await page.locator('[data-act=issueSet][data-s=fixed]').last().click();
  await page.click('[data-act=issueBatch]'); await page.click('[data-act=issueSelAll]');
  check('R3a 全選只選目前顯示的 3 項', (await txt(page, '.batchbar strong')) === '已選 3 項');
  await page.click('[data-act=issueFilter][data-f=fixed]');
  check('R3b 切換篩選後清除選取', (await txt(page, '.batchbar strong')) === '已選 0 項');
  await page.locator('input[data-act=issueSel]').first().check();
  await page.click('[data-act=issueBatchDel]');
  st = await stored(page);
  check('R3 批次刪除只刪畫面上選取的項目', st.issues.length === 3 && st.issues.every(i => i.status === 'open'), st.issues.length);
  await ctx.close();

  ({ ctx, page } = await newCtx(browser));
  await openG(page); await go(page, '#/tools/debt');
  const blanks = ['債務人\t債權人\t借款金額\t借款用途\t借款時間\t利率\t每月還款金額\t目前還款狀況\t剩餘金額', '王小明\t台新銀行\t100000\t週轉\t113/05/07\t\t3000\t本息攤還\t60000', '\t親友\t20000\t生活\t113年8月\t\t0\t未還\t20000', '\t\t\t\t\t\t\t\t', '\t\t\t\t\t\t\t\t', '\t\t\t\t\t\t\t\t', '\t\t\t\t\t\t\t\t', '\t\t\t\t\t每月付款總額\t3000\t剩餘還款總額\t80000'].join('\n');
  await page.fill('textarea[data-bind=paste][data-tool=debt]', blanks); await page.click('[data-act=runDebt]');
  let dres = await txt(page, '#toolResult');
  check('R4 空白範本列不算債務、隔幾列仍找得到「總額」加總', dres.includes('讀到 2 筆債務') && !dres.includes('找不到') && !dres.includes('空白') && !dres.includes('各列加總是') && dres.includes('沒有需修改'), dres.slice(0, 400));
  const roc = ['債務人\t債權人\t借款金額\t借款時間\t每月還款金額\t目前還款狀況\t剩餘金額', '王小明\tA銀行\t1000\t113.05\t100\t本息攤還\t500', '\tB銀行\t1000\t112.10\t100\t本息攤還\t500', '\t\t\t每月付款總金額\t200\t剩餘還款總金額\t1000'].join('\n');
  await page.fill('textarea[data-bind=paste][data-tool=debt]', roc); await page.click('[data-act=runDebt]');
  dres = await txt(page, '#toolResult');
  check('R5 「113.05」「112.10」讀成民國年月並檢查順序', !dres.includes('看不懂') && dres.includes('112年10月') && dres.includes('比上一筆'), dres.slice(0, 400));
  await go(page, '#/tools/sheet');
  const blocks = ['項目\t金額', '收入\t100000', '其他\t0', '\t', '固定成本\t', '水電\t3000', '租金\t30000', '固定成本小計\t33000'].join('\n');
  await page.fill('textarea[data-bind=paste][data-tool=sheet]', blocks); await page.click('[data-act=runSheet]');
  const sres = await txt(page, '#toolResult');
  check('R6 不同區塊的小計不會被誤判', !sres.includes('請確認公式') && sres.includes('1 個小計'), sres.slice(0, 300));
  check('R6b 區塊標題列（沒有金額）不算金額空白', !sres.includes('「固定成本」的金額空白'), sres.slice(0, 300));
  await go(page, '#/tools/debt');
  const zeros = ['債務人\t債權人\t借款金額\t借款用途\t借款時間\t利率\t每月還款金額\t目前還款狀況\t剩餘金額', '王小明\tA銀行\t1000\t週轉\t113/01/01\t\t100\t本息攤還\t500', '\t\t0\t\t\t\t0\t\t0', '\t\t0\t\t\t\t0\t\t0', '\t\t0\t\t\t\t0\t\t0', '\t\t\t\t\t每月付款總金額\t100\t剩餘還款總金額\t500'].join('\n');
  await page.fill('textarea[data-bind=paste][data-tool=debt]', zeros); await page.click('[data-act=runDebt]');
  dres = await txt(page, '#toolResult');
  check('R4b 只有 0 的範本列不算債務', dres.includes('讀到 1 筆債務') && !dres.includes('債權人空白'), dres.slice(0, 300));
  const note = ['債務人\t債權人\t借款金額\t借款時間\t每月還款金額\t目前還款狀況\t剩餘金額\t備註', '王小明\tA銀行\t1000\t113/01/01\t100\t本息攤還\t500\t利率16%', '\t\t\t每月付款總金額\t100\t剩餘還款總金額\t500'].join('\n');
  await page.fill('textarea[data-bind=paste][data-tool=debt]', note); await page.click('[data-act=runDebt]');
  dres = await txt(page, '#toolResult');
  check('R4c 第一筆的備註寫「利率」不會被當成表頭', dres.includes('讀到 1 筆債務'), dres.slice(0, 300));
  const quota = ['債務人\t債權人\t借款金額\t借款用途\t借款時間\t利率\t每月還款金額\t目前還款狀況\t剩餘金額', '王小明\tA銀行\t50000\t循環（總額度5萬）\t113/01/01\t\t2000\t本息攤還\t30000', '\tB銀行\t10000\t生活\t113/06/01\t\t2000\t本息攤還\t5000', '\t\t\t\t\t每月付款總金額\t4000\t剩餘還款總金額\t35000'].join('\n');
  await page.fill('textarea[data-bind=paste][data-tool=debt]', quota); await page.click('[data-act=runDebt]');
  dres = await txt(page, '#toolResult');
  check('R11 借款用途寫「總額度」不會被當成加總列', dres.includes('讀到 2 筆債務') && !dres.includes('各列加總是'), dres.slice(0, 300));
  await page.click('[data-act=clearTool][data-tool=debt]');
  await page.setInputFiles('input[data-act=xlsx][data-tool=debt]', path.join(TD, 'debt-numeric-dates.xlsx'));
  await page.waitForSelector('#toolResult .findings', { timeout: 5000 });
  dres = await txt(page, '#toolResult');
  check('R5b Excel 存成 112.1 時提醒可能是 1 月或 10 月', dres.includes('可能是 1 月或 10 月'), dres.slice(0, 300));
  await go(page, '#/tools/breakeven');
  await page.fill('input[data-tool=breakeven][data-f=margin]', '1'); await page.fill('input[data-tool=breakeven][data-f=fixed]', '100'); await page.fill('input[data-tool=breakeven][data-f=before]', '0');
  check('R9b 毛利率輸入「1」以 1% 計算', (await txt(page, '#beOut')).includes('÷ 1%'), await txt(page, '#beOut'));
  await page.goto(NEW + '#/item/%E0%A4%A'); await skipWelcome(page);
  check('R9a 網址參數格式錯誤也能正常顯示', (await txt(page, 'h1')).includes('找不到這個項目'));
  await ctx.close();

  ({ ctx, page } = await newCtx(browser));
  await openR(page); await page.click('.foot [data-act=maint]');
  await go(page, '#/item/ref-11');
  await page.fill('.editor textarea[data-f=guide]', 'Infocenter 欄位說明（維護測試）');
  await page.click('[data-act=edSave]');
  const ovSize = await page.evaluate(() => (localStorage.getItem('startup-loan-content-v1') || '').length);
  check('R10 只改文字時，不會把整張圖片再存一次', ovSize > 0 && ovSize < 5000, ovSize);
  await go(page, '#/item/ref-17');
  const crit17 = await page.locator('input[data-act=crit][data-id="ref-17"]').count();
  while (await page.locator('[data-act=edCritDel]').count()) await page.locator('[data-act=edCritDel]').first().click();
  await page.click('[data-act=edSave]');
  check('R8 不能存成沒有完成條件', (await txt(page, '#toastText')).includes('至少要保留一個完成條件') && (await page.locator('input[data-act=crit][data-id="ref-17"]').count()) === crit17 && crit17 > 0);
  await page.click('[data-act=edReset]');
  await go(page, '#/item/ref-14');
  await page.fill('.editor textarea[data-f=guide]', '未儲存就匯出的說明');
  check('R7a 未儲存時顯示提醒', (await txt(page, '#edState')).includes('尚未儲存'));
  await go(page, '#/item/ref-15'); await go(page, '#/item/ref-14');
  check('R7b 換頁再回來，未儲存的修改還在', (await page.locator('.editor textarea[data-f=guide]').inputValue()) === '未儲存就匯出的說明');
  const ex2 = await download(page, () => page.click('#maintBar [data-act=maintExport][data-ed=guide]'));
  check('R7 匯出前先儲存未儲存的修改', fs.readFileSync(ex2, 'utf8').includes('未儲存就匯出的說明'));
  await go(page, '#/item/ref-16');
  await page.fill('.editor textarea[data-f=guide]', '第二份草稿');
  await go(page, '#/item/ref-18');
  await page.locator('[data-act=edCritDel]').first().click(); await page.locator('[data-act=edCritDel]').first().click();
  const noDl = await Promise.race([page.waitForEvent('download', { timeout: 1500 }).then(() => true, () => false), page.click('#maintBar [data-act=maintExport][data-ed=guide]').then(() => new Promise(r => setTimeout(() => r(false), 1200)))]);
  check('R12 有草稿沒有完成條件時整批不匯出、也不動其他草稿', !noDl && (await txt(page, '#toastText')).includes('還沒有匯出') && !(await page.evaluate(() => (localStorage.getItem('startup-loan-content-v1') || '').includes('第二份草稿'))));
  await go(page, '#/item/ref-16');
  check('R12b 其他草稿仍保留未儲存狀態', (await page.locator('.editor textarea[data-f=guide]').inputValue()) === '第二份草稿' && (await txt(page, '#edState')).includes('尚未儲存'));
  let sawUnload = false;
  page.on('dialog', d => { if (d.type() === 'beforeunload') sawUnload = true; });
  await page.close({ runBeforeUnload: true });
  await new Promise(r => setTimeout(r, 500));
  check('R7c 有未儲存的修改時關閉分頁會先提醒', sawUnload);
  await ctx.close();

  ({ ctx, page } = await newCtx(browser));
  await openG(page);
  await page.evaluate(() => localStorage.setItem('startup-loan-local-v1', '{"version":2,"caseName":"舊資料"}'));
  await page.fill('#caseName', '重設測試');
  await page.click('.foot [data-act=reset]');
  const goneOld = await page.evaluate(() => localStorage.getItem('startup-loan-local-v1'));
  await page.click('#undoBtn');
  check('R13 清除後按復原，舊版資料也一起回來', goneOld === null && (await page.evaluate(() => localStorage.getItem('startup-loan-local-v1'))) === '{"version":2,"caseName":"舊資料"}' && (await txt(page, '#caseChip')) === '個案：重設測試');
  await ctx.close();

  ({ ctx, page } = await newCtx(browser));
  await openG(page);
  await page.evaluate(() => localStorage.setItem('startup-loan-local-v3', JSON.stringify({ version: 3, caseName: '舊存檔', mode: 'first', round: '2', first: { date: '', items: {} }, rounds: { '2': { forecast: { months: [{ label: '8月', a: '159400', b: '0', rate: '40', d: '50000', e: '35779', f: '66250', repay: '30000', written: '' }, {}, {}] } } }, issues: [], tasks: [], writing: [] })));
  await page.reload(); await go(page, '#/tools/forecast');
  check('R14 舊版存檔把首次試算放在第 2 次動撥，升級後首次仍看得到', (await txt(page, '#fc-total-0')) === '-86,389', await txt(page, '#fc-total-0'));
  await ctx.close();

  /* ===== T. 歡迎頁與導覽 ===== */
  ({ ctx, page } = await newCtx(browser));
  await page.goto(NEW);
  check('T1 第一次打開顯示歡迎頁（引導員內容）', (await page.locator('.welcome h1').innerText()).includes('準備好') && !(await page.locator('.side').isVisible()));
  await shot(page, 't01-welcome', false);
  await page.click('[data-act=welcomeTour]');
  await page.waitForSelector('#tour:not([hidden])');
  const steps = [];
  for (let i = 0; i < 10; i++) { steps.push(await txt(page, '#tourTitle')); if (i === 2) await shot(page, 't02-tour', false); const last = (await txt(page, '#tourNext')) === '開始使用'; await page.click('#tourNext'); if (last) break; }
  check('T2 導覽逐步說明 7 個重點後結束', steps.length === 7 && await page.locator('#tour').isHidden(), steps.join('|'));
  check('T3 導覽結束後回到總覽並記住', (await txt(page, 'h1')) === '總覽' && (await stored(page)).tour.guide === true);
  await page.reload();
  check('T4 重新打開不再出現歡迎頁', (await page.locator('.welcome').count()) === 0);
  await page.click('[data-act=tour]'); await page.waitForSelector('#tour:not([hidden])');
  await page.keyboard.press('Tab');
  const inCard = await page.evaluate(() => !!document.activeElement.closest('#tourCard'));
  await page.keyboard.press('Escape');
  check('T5 導覽的鍵盤焦點留在說明卡，按 Esc 可關閉', inCard && await page.locator('#tour').isHidden());
  await ctx.close();

  /* ===== U. 小改善：還款狀況、自動勾選、其他、標示 ===== */
  ({ ctx, page } = await newCtx(browser));
  await openG(page); await go(page, '#/tools/debt');
  const okDebt = ['債務人\t債權人\t債務總額\t借錢原因\t借錢時間\t利率\t每期還款數字\t目前還款狀況\t剩餘金額', '王小明\tA銀行\t100000\t週轉\t112/05/07\t\t3000\t已還12期\t60000', '\tB銀行\t20000\t生活\t113年8月\t\t1000\t只還息\t15000', '\t\t\t\t\t每月付款總金額\t4000\t剩餘還款總金額\t75000'].join('\n');
  await page.fill('textarea[data-bind=paste][data-tool=debt]', okDebt); await page.click('[data-act=runDebt]');
  let u = await txt(page, '#toolResult');
  check('U1 還款狀況寫「已還12期」不算錯', !u.includes('還款狀況「已還12期」') && u.includes('沒有需修改'), u.slice(0, 300));
  check('U2 檢查通過 → 自動勾選債務盤點表的完成條件並說明', u.includes('已自動勾選') && (await stored(page)).first.items['ref-23'].via.debtor === 'tool', u.slice(0, 400));
  await go(page, '#/item/ref-23');
  check('U3 項目頁標示「工具檢查通過」', (await page.locator('.viatag').count()) === 5 && (await txt(page, '.itemhead .pill')) === '進行中', await page.locator('.viatag').count());
  await shot(page, 'u01-item-viatag');
  await page.uncheck('input[data-act=crit][data-id="ref-23"][data-c="debtor"]');
  check('U4 手動取消後不再標示工具通過', (await page.locator('.viatag').count()) === 4);
  await go(page, '#/tools/debt');
  await page.fill('textarea[data-bind=paste][data-tool=debt]', okDebt.replace('已還12期', '正常')); await page.click('[data-act=runDebt]');
  st = await stored(page);
  check('U5 之後檢查不通過，工具勾的條件會取消', !st.first.items['ref-23'].crit.status && st.first.items['ref-23'].crit.creditor === true, JSON.stringify(st.first.items['ref-23']));
  await go(page, '#/tools/sheet');
  await page.fill('textarea[data-bind=paste][data-tool=sheet]', ['項目\t金額\t說明', '租金\t30000\t店面', '水電\t3000\t', '其他\t5000\t', '固定成本小計\t38000\t'].join('\n')); await page.click('[data-act=runSheet]');
  check('U6 「其他」有金額卻沒寫內容會提醒', (await txt(page, '#toolResult')).includes('有金額 5,000'), await txt(page, '#toolResult'));
  await go(page, '#/item/ref-25');
  check('U7 作業說明的螢光與紅字標示', (await page.locator('.guide mark').count()) >= 1 && (await page.locator('.guide strong.hl').count()) >= 1);
  await go(page, '#/tools/forecast'); await page.click('[data-act=fcExample]');
  check('U8 三個月都算好 → 自動勾選營運財務預估分析表', (await txt(page, '#fcTick')).includes('已自動勾選') && (await stored(page)).first.items['ref-26'].crit.ready === true);
  await go(page, '#/tools');
  check('U9 檢核工具首頁以卡片列出 5 種工具', (await page.locator('.toolcard').count()) === 5);
  await shot(page, 'u02-tools');
  await ctx.close();

  /* ===== V. 審查人員版：開通、AI 初審、需修改清單往返 ===== */
  ({ ctx, page } = await newCtx(browser));
  await page.goto(RVF);
  check('V1 審查人員版第一次打開要開通', (await page.locator('#gateCode').count()) === 1 && !(await page.locator('.side').isVisible()));
  await shot(page, 'v00-gate', false);
  await page.fill('#gateCode', 'WRONG-CODE-1234'); await page.click('#gateBtn'); await page.waitForTimeout(1500);
  check('V2 通行碼錯誤會提示且不開通', (await txt(page, '#gateErr')).includes('通行碼不對') && (await page.locator('#gateCode').count()) === 1);
  await page.fill('#gateCode', CODE.toLowerCase()); await page.click('#gateBtn');
  await page.waitForSelector('.welcome', { timeout: 8000 });
  check('V3 正確通行碼（不分大小寫）開通後進入歡迎頁', (await txt(page, '.welcome h1')).includes('AI'));
  await page.click('[data-act=welcomeSkip]');
  await page.reload();
  check('V4 開通後重新打開不用再輸入', (await page.locator('#gateCode').count()) === 0 && (await txt(page, 'h1')) === '審查案件');
  check('V5 審查人員版只顯示審查功能', (await page.locator('.nav a:visible').count()) === 3 && !(await page.locator('.modebar').isVisible()));
  await shot(page, 'v00-cases-empty');
  await page.click('.pagehead [data-act=rvNew]'); await page.fill('#rvDialog input[name=caseName]', '測試個案甲'); await page.click('#rvDialog button[type=submit]');
  await page.waitForSelector('.rvsteps');
  check('V6 新增審查案件後進到第 1 步', (await page.locator('.rvsteps li.current').innerText()).includes('準備 AI 初審'));
  const notesFile = await download(page, () => page.click('[data-act=notesDl]'));
  const notes = fs.readFileSync(notesFile, 'utf8');
  check('V7 下載的注意事項含基本資料、文件代號與結果格式', path.basename(notesFile) === 'AI審核注意事項_首次動撥.md' && notes.includes('## 計畫書的基本資料') && notes.includes('### ref-23｜') && notes.includes('"type": "ai-review-result"') && notes.includes('債務人未寫本名') && !notes.includes('ref-11'), notes.slice(0, 300));
  check('V8 給 AI 的一句話指向注意事項與結果檔', (await txt(page, '#sentence')).includes('AI審核注意事項_首次動撥.md') && (await txt(page, '#sentence')).includes('AI審查結果.json'));
  await shot(page, 'v01-step1');
  const ai = { type: 'ai-review-result', stage: 'first', notesVersion: '1.0', files: ['a.xlsx'], findings: [
    { code: 'ref-23', document: '債務現況盤點表', location: '第 5 列「借錢時間」', finding: '借款時間沒有由遠到近', basis: '借款時間依先後順序排列', level: '需修改', suggestion: '依時間重新排列' },
    { code: 'basic', document: '計畫書基本資料', location: '第 1 頁', finding: '出生日期與戶籍謄本不一致', basis: '基本資料一致', level: '待確認', suggestion: '請核對' },
    { code: '', document: '估價單', location: '冷凍櫃', finding: '沒有賣家聯絡方式', basis: '估價資訊完整', level: '需修改', suggestion: '補上電話' },
    { code: 'cross', document: '文件之間', location: '計畫書與設備購買表', finding: '設備總額 15 萬與計畫書 12 萬不一致', basis: '金額一致', level: '待確認', suggestion: '' },
    { code: 'ref-25', document: '營運結構表', location: 'C6', finding: '其他收入空白', basis: '沒有就填 0', level: '提醒', suggestion: '填 0' }] };
  fs.writeFileSync(path.join(TW, 'ai-result.json'), JSON.stringify(ai));
  await page.click('[data-act=rvStep][data-n="2"]');
  await page.setInputFiles('input[data-act=aiFile]', path.join(TW, 'ai-result.json'));
  await page.waitForSelector('.fcard');
  check('V9 匯入 AI 結果：5 項待決定，依文件分組', (await page.locator('.fcard').count()) === 5 && (await page.locator('.fgroup').count()) >= 4);
  let rs = await storedR(page);
  const fnd = rs.reviews[0].findings;
  check('V10 依代號與文件名稱對應到項目', fnd.find(x => x.text.includes('借款時間')).itemId === 'ref-23' && fnd.find(x => x.text.includes('出生日期')).itemId === 'ref-21' && fnd.find(x => x.text.includes('賣家')).itemId === 'ref-28' && fnd.find(x => x.text.includes('設備總額')).itemId === '', JSON.stringify(fnd.map(x => x.itemId)));
  await shot(page, 'v02-step2');
  await page.click('[data-act=fAcceptFix]');
  check('V11 「需修改」一鍵全部採用（2 項）', (await storedR(page)).reviews[0].findings.filter(x => x.decision === 'accept').length === 2);
  await page.locator('.fcard [data-act=fDecide][data-v=accept]').first().click();
  await page.locator('.fcard [data-act=fDecide][data-v=reject]').first().click();
  await page.locator('.fcard [data-act=fDecide][data-v=reject]').first().click();
  rs = await storedR(page);
  check('V12 逐項採用、不採用', rs.reviews[0].findings.filter(x => x.decision === 'accept').length === 3 && rs.reviews[0].findings.filter(x => x.decision === 'reject').length === 2, JSON.stringify(rs.reviews[0].findings.map(x => x.decision)));
  await page.click('[data-act=fFilter][data-f=accept]');
  await page.locator('[data-act=fOpen]').first().click();
  await page.locator('textarea[data-bind=fEdit][data-f=text]').first().fill('借款時間沒有由遠到近排列（第 5 列）');
  rs = await storedR(page);
  check('V13 可以修改要傳給引導員的文字', rs.reviews[0].findings.some(x => x.text === '借款時間沒有由遠到近排列（第 5 列）'));
  await page.click('[data-act=rvStep][data-n="3"]');
  const issuesPath = await download(page, () => page.click('.rvpanel [data-act=sendDl]'));
  const issuesJ = JSON.parse(fs.readFileSync(issuesPath, 'utf8'));
  check('V14 下載需修改清單：3 項、含個案與階段', issuesJ.type === 'startup-loan-review-issues' && issuesJ.items.length === 3 && issuesJ.caseName === '測試個案甲' && issuesJ.stage === 'first' && path.basename(issuesPath).startsWith('需修改清單_測試個案甲_首次動撥'), path.basename(issuesPath));
  await page.click('[data-act=sendCopy]');
  const tv = await page.locator('#summaryText').inputValue();
  check('V15 文字版含等級與建議', tv.includes('〔需修改〕') && tv.includes('建議：'), tv.slice(0, 200));
  await page.click('#summaryDialog [data-act=closeDialog]');
  await shot(page, 'v03-step3');
  const g = await newCtx(browser);
  await openG(g.page);
  await g.page.fill('#caseName', '測試個案甲');
  await go(g.page, '#/issues');
  await g.page.setInputFiles('#xFile', issuesPath);
  await g.page.waitForSelector('.ilist li.fromrv');
  let gs = await stored(g.page);
  check('W1 引導員匯入需修改清單：3 項出現在對應資料上', gs.issues.filter(i => i.rid).length === 3 && gs.issues.some(i => i.itemId === 'ref-23' && i.where.includes('第 5 列')) && (await g.page.locator('.ilist li.fromrv').count()) === 3);
  await g.page.locator('.idetail summary').first().click();
  check('W2 可展開看位置與建議', (await txt(g.page, '.idetail')).includes('位置'));
  await shot(g.page, 'w01-guide-issues');
  await g.page.locator('[data-act=issueSet][data-s=fixed]').first().click();
  await g.page.locator('[data-act=issueSet][data-s=fixed]').first().click();
  await g.page.click('[data-act=issueFilter][data-f=fixed]');
  await g.page.locator('input[data-bind=gnote]').first().fill('已依時間重新排列');
  check('W3 改好後顯示「等審查人員確認」，引導員不能自己確認', (await g.page.locator('.ilist .waiting').count()) === 2 && (await g.page.locator('.ilist [data-act=issueSet][data-s=done]').count()) === 0);
  const replyPath = await download(g.page, () => g.page.click('[data-act=xReply]'));
  const replyJ = JSON.parse(fs.readFileSync(replyPath, 'utf8'));
  check('W4 回傳修改進度：2 項已修改、含回覆', replyJ.type === 'startup-loan-review-reply' && replyJ.items.filter(i => i.status === 'fixed').length === 2 && replyJ.items.some(i => i.gnote === '已依時間重新排列'));
  await g.page.setInputFiles('#xFile', path.join(TW, 'ai-result.json')); await g.page.waitForTimeout(150);
  check('W5 引導員匯入錯的檔案會說明', g.page.dialogs.some(m => m.includes('要由審查人員匯入')), g.page.dialogs.join('|'));
  await page.click('[data-act=rvStep][data-n="4"]');
  await page.setInputFiles('input[data-act=replyFile]', replyPath); await page.waitForTimeout(200);
  rs = await storedR(page);
  check('V16 審查人員匯入回覆：2 項已修改、看得到引導員回覆', rs.reviews[0].findings.filter(x => x.status === 'fixed').length === 2 && (await txt(page, '.clist')).includes('已依時間重新排列'));
  await page.locator('.clist [data-act=fStatus][data-v=done]').first().click();
  await page.locator('.clist [data-act=fStatus][data-v=open]').first().click();
  rs = await storedR(page);
  check('V17 確認 1 項、退回 1 項', rs.reviews[0].findings.filter(x => x.status === 'done').length === 1 && rs.reviews[0].findings.filter(x => x.decision === 'accept' && x.status === 'open').length === 2);
  await shot(page, 'v04-step4');
  const issues2 = await download(page, () => page.click('.rvpanel .hint [data-act=sendDl]'));
  await g.page.setInputFiles('#xFile', issues2); await g.page.waitForTimeout(200);
  gs = await stored(g.page);
  check('W6 再次匯入：已確認的變已確認、退回的回到待修改', gs.issues.filter(i => i.rid && i.status === 'done').length === 1 && gs.issues.filter(i => i.rid && i.status === 'open').length === 2, JSON.stringify(gs.issues.map(i => i.status)));
  await g.ctx.close();
  await go(page, '#/rv');
  check('V18 案件卡片顯示目前進度', (await txt(page, '.rvcard')).includes('等引導員修改'));
  await shot(page, 'v05-cases');
  await go(page, '#/notes');
  await page.click('[data-act=notesEdit]');
  await page.fill('textarea[data-bind=notesEd][data-f=extra]', '估價單要有統一編號');
  await page.fill('input[data-bind=notesEd][data-f=note]', '補充估價單規則');
  await page.click('[data-act=notesSave]');
  check('V19 優化注意事項：版本 1.0 → 1.1，內容更新', (await txt(page, '.notes-stats')).includes('1.1') && (await txt(page, '.mdview')).includes('估價單要有統一編號'));
  const n2 = await download(page, () => page.click('.pagehead [data-act=notesDl]'));
  check('V20 下載的注意事項是新版本', fs.readFileSync(n2, 'utf8').includes('版本 1.1'));
  await shot(page, 'v06-notes');
  await go(page, '#/rv');
  await page.click('.pagehead [data-act=rvNew]'); await page.fill('#rvDialog input[name=caseName]', '貼上測試'); await page.selectOption('#rvDialog select[name=stage]', 'r3'); await page.click('#rvDialog button[type=submit]');
  await page.waitForSelector('.rvsteps');
  await page.click('[data-act=rvStep][data-n="2"]');
  await page.locator('details.disclose summary', { hasText: '貼上 AI 的回覆' }).click();
  await page.fill('textarea[data-bind=aiPaste]', '以下是結果：\n| 文件代號 | 文件 | 位置 | 發現 | 依據 | 等級 | 建議 |\n|---|---|---|---|---|---|---|\n| later-usage | 前期動撥款貸款使用狀況總表 | 第 3 列 | 寫了拿去還款 | 不要寫拿去還款 | 需修改 | 改列週轉金 |\n| | 營業登記 | 整份文件 | 找不到這份文件 | 第 3 次要附 | 需修改 | 補附 |');
  await page.click('[data-act=aiPasteGo]');
  rs = await storedR(page);
  const r2 = rs.reviews.find(r => r.caseName === '貼上測試');
  check('V21 貼上 AI 回覆的表格也能讀（第 3 次動撥）', r2 && r2.findings.length === 2 && r2.findings[0].itemId === 'later-usage' && r2.findings[1].itemId === 'later-registration', r2 && JSON.stringify(r2.findings.map(x => x.itemId)));
  await page.click('[data-act=rvDel]');
  check('V22 刪除案件可復原', (await storedR(page)).reviews.length === 1 && await page.locator('#toastUndo').isVisible());
  await page.click('#toastUndo');
  check('V23 復原後案件回來', (await storedR(page)).reviews.length === 2);
  await page.click('.foot [data-act=gateChange]');
  await page.fill('#gateDialog input[name=code]', 'new-code-2026'); await page.fill('#gateDialog input[name=code2]', 'NEW-CODE-2026');
  const newR = await download(page, () => page.click('#gateDialog button[type=submit]'));
  await ctx.close();
  ({ ctx, page } = await newCtx(browser));
  await page.goto('file://' + newR);
  await page.fill('#gateCode', CODE); await page.click('#gateBtn'); await page.waitForTimeout(1500);
  const oldRejected = (await page.locator('#gateCode').count()) === 1;
  await page.fill('#gateCode', 'New-Code-2026'); await page.click('#gateBtn'); await page.waitForSelector('.welcome', { timeout: 8000 });
  check('V24 變更通行碼：新檔案只接受新通行碼', oldRejected && (await page.locator('.welcome').count()) === 1);
  await ctx.close();

  /* ===== Q. 手機版 ===== */
  ({ ctx, page } = await newCtx(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }));
  await openG(page);
  await page.fill('#caseName', '手機測試');
  await page.fill('input[data-act=scopeDate]', isoOffset(12)); await page.locator('input[data-act=scopeDate]').dispatchEvent('change');
  await shot(page, 'm01-overview');
  await go(page, '#/docs'); await openRow(page, 'ref-11'); await shot(page, 'm02-docs');
  await go(page, '#/item/ref-11'); await shot(page, 'm03-item');
  await go(page, '#/tools/forecast'); await page.click('[data-act=fcExample]'); await shot(page, 'm04-forecast');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('Q1 手機版沒有整頁水平捲動', overflow <= 0, overflow);
  check('Q2 手機版看得到保存狀態與備份、還原', (await page.locator('#saveStateM').isVisible()) && (await txt(page, '#saveStateM')).includes('已保存') && (await page.locator('.foot [data-act=export]').isVisible()) && (await page.locator('.foot [data-act=import]').isVisible()));
  check('Q3 手機版底部有分頁列（6 個功能）', (await page.locator('.nav a:visible').count()) === 6);
  await go(page, '#/overview'); await shot(page, 'm05-overview-bottom', false);
  await ctx.close();
  ({ ctx, page } = await newCtx(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }));
  await openR(page);
  await page.click('.pagehead [data-act=rvNew]'); await page.fill('#rvDialog input[name=caseName]', '手機審查'); await page.click('#rvDialog button[type=submit]');
  await page.waitForSelector('.rvsteps'); await shot(page, 'm06-rv-step1');
  await go(page, '#/notes'); await shot(page, 'm07-rv-notes');
  const ov2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('Q4 審查人員版手機沒有整頁水平捲動', ov2 <= 0, ov2);
  await ctx.close();

  // X: 細節修正（影片製作時發現）
  ({ ctx, page } = await newCtx(browser));
  await openR(page);
  await page.evaluate(() => { const k = 'startup-loan-review-v1'; const s = JSON.parse(localStorage.getItem(k)); const now = new Date().toISOString(); s.reviews = [{ id: 'rx1', caseName: '測試個案丙', stage: 'first', created: '2026-10-09', updated: now, notesVer: '1.0', aiAt: now, sentAt: '', replyAt: '', findings: [{ id: 'fx1', itemId: 'ref-23', doc: '債務現況盤點表', where: '第 2 列', text: '測試發現', basis: '', suggest: '', level: 'check', origin: 'ai', decision: 'pending', status: 'open', gnote: '', rnote: '', upd: now }] }]; localStorage.setItem(k, JSON.stringify(s)); });
  await page.reload(); await go(page, '#/rv/rx1'); await page.waitForSelector('.fcard');
  check('X2 AI 等級用「請核對」，不和引導員的「待確認」混用', (await txt(page, '.tally')).includes('請核對') && !(await txt(page, '.tally')).includes('待確認'));
  await page.locator('.fcard [data-act=fDecide][data-v=accept]').click();
  check('X1 最後一項決定後仍停在第 2 步，由使用者按「下一步」', (await page.locator('.stepfoot [data-act=rvStep][data-n="3"]').count()) === 1 && (await txt(page, '.step h2')).includes('確認 AI 找到的問題'));
  await ctx.close();
  ({ ctx, page } = await newCtx(browser));
  await openG(page); await go(page, '#/docs'); await page.waitForSelector('.row .rname');
  const names = await page.locator('.row .rname').allInnerTexts();
  check('X3 繳交資料的名稱不重複顯示 ★', names.length > 10 && names.every(n => !n.trim().startsWith('★')), names.filter(n => n.trim().startsWith('★')).join('|'));
  await ctx.close();

  // Y: 網站影片與夥伴修改工具（只看檔案，不開瀏覽器）
  const buildSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'build.mjs'), 'utf8');
  const vids = JSON.parse(((buildSrc.match(/const VIDEOS = (\[[^\]]*\])/) || [])[1] || '[]').replace(/'/g, '"'));
  const vidOk = v => { const f = path.join(ROOT, 'videos', v); return fs.existsSync(f) && fs.statSync(f).size < 25 * 1024 * 1024; };
  check('Y1 網站上的三支教學影片都在 videos/，每支小於 25 MB', vids.length === 3 && vids.includes('partner-guide.mp4') && vids.every(vidOk), vids.filter(v => !vidOk(v)).join(',') || vids.join(','));
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const devSrc = fs.readFileSync(path.join(ROOT, 'scripts', 'dev.mjs'), 'utf8');
  check('Y2 npm run preview 存在，且預設用測試通行碼建置', /scripts\/dev\.mjs/.test(pkg.scripts.preview || '') && devSrc.includes("'TEST-CODE-2468'") && devSrc.includes("'.test-output'"));
  const guideMd = fs.readFileSync(path.join(ROOT, 'docs', 'partner-guide.md'), 'utf8');
  const imgs = [...guideMd.matchAll(/\]\((images\/[^)]+)\)/g)].map(m => m[1]);
  check('Y3 夥伴修改操作說明的圖片都在 docs/images/', imgs.length >= 5 && imgs.every(f => fs.existsSync(path.join(ROOT, 'docs', f))), imgs.filter(f => !fs.existsSync(path.join(ROOT, 'docs', f))).join(','));
  check('Y4 夥伴修改操作說明的指令都存在（preview、test）', guideMd.includes('npm run preview') && guideMd.includes('npm test') && !!pkg.scripts.preview && !!pkg.scripts.test);

  await browser.close();
  check('Z1 全程沒有 JavaScript 錯誤', errors.length === 0, errors.join(' | '));
  const failed = results.filter(r => !r.ok);
  fs.writeFileSync(path.join(SHOTS, 'results.json'), JSON.stringify({ when: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results, errors }, null, 1));
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
