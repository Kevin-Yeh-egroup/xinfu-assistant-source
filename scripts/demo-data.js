// Demo states (fictional people) for previews and tutorial videos.
const iso = d => d.toISOString().slice(0, 10);
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const stamp = (n = 0) => new Date(Date.now() + n * 60000).toISOString();
const allCrit = (ids) => Object.fromEntries(ids.map(k => [k, true]));
// 計畫書與附件：虛構的示範資料（沿用 testdata/plan-sample.json，改成影片裡的「陳小美（示範）」）
function planDemo() {
  const s = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'testdata', 'plan-sample.json'), 'utf8'));
  const months = s._forecast; delete s._forecast; delete s._note;
  s.p.name = '陳小美'; s.p.emName = '陳大明';
  s.debts.forEach(d => { if (d.name) d.name = d.name.replace('王大明', '陳大明'); });
  return { plan: s, months };
}
function guideState() {
  const items = {
    'ref-11': { crit: allCrit(['ic-contact', 'ic-personal', 'ic-done']) },
    'ref-12': { crit: allCrit(['open', 'submit']) },
    'ref-13': { crit: allCrit(['open', 'upload']) },
    'ref-14': { crit: allCrit(['ready', 'send']) },
    'ref-15': { crit: allCrit(['ready', 'send']) },
    'ref-16': { crit: allCrit(['ready', 'upload']) },
    'ref-17': { crit: allCrit(['ready', 'sign', 'upload']) },
    'ref-19': { crit: allCrit(['ready', 'record']) },
    'ref-21': { crit: allCrit(['ready', 'advisor']) },
    'ref-22': { crit: allCrit(['latest', 'cumulative']) },
    'ref-23': { crit: allCrit(['debtor', 'creditor', 'date', 'total']), via: { debtor: 'tool', creditor: 'tool', date: 'tool', total: 'tool' } },
    'ref-25': { crit: allCrit(['margin', 'household', 'blank']) },
    'ref-9': { na: true }
  };
  for (const k of Object.keys(items)) items[k] = { crit: {}, via: {}, na: false, legacyDone: false, note: '', fields: {}, ...items[k] };
  const pd = planDemo();
  return {
    version: 3, role: 'guide', welcomed: true, tour: { guide: true, reviewer: false }, seenNews: '4',
    caseName: '陳小美（示範）', program: '', mode: 'first', round: '2',
    first: { date: day(19), legacyMonth: '', operation: 'started', flows: { f1: true }, items, forecast: { months: pd.months } },
    plan: pd.plan,
    rounds: {},
    issues: [
      { id: 'demo1', scope: 'first', itemId: 'ref-23', text: '借款時間沒有由遠到近排列', source: '公司書面審查', kind: 'fix', status: 'open', created: day(-1), closed: '', rid: 'rvdemoA', where: '第 5 列「借錢時間」', suggest: '依借款時間由遠到近重新排列', level: 'fix', gnote: '', rnote: '', upd: stamp(-60) },
      { id: 'demo2', scope: 'first', itemId: 'ref-28', text: '冷凍櫃的估價單沒有賣家聯絡方式', source: '公司書面審查', kind: 'fix', status: 'open', created: day(-1), closed: '', rid: 'rvdemoA', where: '估價單第 1 頁', suggest: '請賣家補上電話與統一編號', level: 'fix', gnote: '', rnote: '', upd: stamp(-60) },
      { id: 'demo3', scope: 'first', itemId: 'ref-21', text: '計畫書的出生日期和戶籍謄本不一致', source: '公司書面審查', kind: 'fix', status: 'fixed', created: day(-1), closed: '', rid: 'rvdemoA', where: '計畫書第 1 頁基本資料', suggest: '請核對後更正', level: 'check', gnote: '已更正為 70/03/12', rnote: '', upd: stamp(-30) },
      { id: 'demo4', scope: 'first', itemId: 'ref-30', text: '謄本超過三個月', source: '自我檢核', kind: 'fix', status: 'open', created: day(-2), closed: '' }
    ],
    tasks: [{ id: 't1', text: '寄出紙本（信扶專案收）', date: day(9), done: false }, { id: 't2', text: '請小老闆到銀行送聯徵同意書', date: day(3), done: false }],
    writing: [], meetingNotes: '', reviewNotes: '', tools: { breakeven: {} }, legacy: { docs: [], flows: [], others: [] }, reviews: [], upgradedFrom: 0
  };
}
function finding(id, itemId, doc, where, text, level, decision, status, extra = {}) {
  return { id, itemId, doc, where, text, basis: extra.basis || '', suggest: extra.suggest || '', level, origin: 'ai', decision, status, gnote: extra.gnote || '', rnote: '', upd: stamp(extra.min || -100) };
}
function reviewerState() {
  return {
    version: 3, role: 'reviewer', welcomed: true, tour: { guide: false, reviewer: true }, seenNews: '4',
    caseName: '', mode: 'first', round: '2', first: { items: {} }, rounds: {}, issues: [], tasks: [], writing: [], legacy: { docs: [], flows: [], others: [] }, upgradedFrom: 0,
    reviews: [
      { id: 'rvdemoA', caseName: '陳小美（示範）', stage: 'first', created: day(-3), updated: stamp(-20), notesVer: '1.0', aiAt: stamp(-200), sentAt: stamp(-150), replyAt: stamp(-20), findings: [
        finding('demo1', 'ref-23', '債務現況盤點表', '第 5 列「借錢時間」', '借款時間沒有由遠到近排列', 'fix', 'accept', 'open', { suggest: '依借款時間由遠到近重新排列', basis: '借款時間依先後順序排列' }),
        finding('demo2', 'ref-28', '估價單', '估價單第 1 頁', '冷凍櫃的估價單沒有賣家聯絡方式', 'fix', 'accept', 'done', { suggest: '請賣家補上電話與統一編號' }),
        finding('demo3', 'ref-21', '信扶專案創業計畫書(共3頁)', '計畫書第 1 頁基本資料', '計畫書的出生日期和戶籍謄本不一致', 'check', 'accept', 'fixed', { gnote: '已更正為 70/03/12', min: -25 }),
        finding('demo5', 'ref-25', '營運結構試算表', 'C6', '其他收入空白', 'hint', 'reject', 'open'),
        finding('demo6', '', '文件之間', '計畫書與設備購買表', '設備總額 15 萬和計畫書寫的 12 萬不一致', 'check', 'reject', 'open')
      ] },
      { id: 'rvdemoB', caseName: '林大明（示範）', stage: 'r3', created: day(-1), updated: stamp(-10), notesVer: '1.0', aiAt: stamp(-10), sentAt: '', replyAt: '', findings: [
        finding('b1', 'later-usage', '前期動撥款貸款使用狀況總表', '第 3 列', '寫了「拿去還款」30,000 元', 'fix', 'pending', 'open', { suggest: '計畫性還款請改列為週轉金', basis: '不要寫拿去還款，計畫性還款列為週轉金' }),
        finding('b2', 'later-usage', '前期動撥款貸款使用狀況總表', '總數', '總數 210,000 元，比前一期款 200,000 元多 10,000 元', 'fix', 'pending', 'open', { suggest: '週轉金改為 50,000 元，總數等於前一期款', basis: '總數等於前一期款' }),
        finding('b3', 'later-registration', '營業登記', '整份文件', '找不到這份文件', 'fix', 'pending', 'open', { suggest: '第 3 次動撥要附營業登記', basis: '第 3 次動撥一定要附營業登記' }),
        finding('b4', 'later-future', '創業貸款動撥附件－未來營運說明', '第 2 頁', '超過一頁', 'check', 'pending', 'open', { suggest: '濃縮成一頁，詳細內容改成附件' }),
        finding('b5', 'later-journal', '小老闆日誌', '9 月支出', '購買冷凍櫃沒有呈現在支出中', 'hint', 'pending', 'open', { suggest: '把設備購買記在支出' })
      ] },
      { id: 'rvdemoC', caseName: '黃阿姨（示範）', stage: 'first', created: day(0), updated: stamp(-5), notesVer: '1.0', aiAt: '', sentAt: '', replyAt: '', findings: [] },
      { id: 'rvdemoD', caseName: '張先生（示範）', stage: 'r2', created: day(-12), updated: stamp(-3000), notesVer: '1.0', aiAt: stamp(-5000), sentAt: stamp(-4800), replyAt: stamp(-3000), findings: [
        finding('d1', 'later-debt', '債務現況盤點表', '第 2 列', '列入已清償的債務', 'fix', 'accept', 'done'),
        finding('d2', 'later-apply', '動撥申請表', '第 1 頁', '只簽了 1 張正本', 'fix', 'accept', 'done')
      ] }
    ]
  };
}
module.exports = { guideState, reviewerState, planDemo, day };
