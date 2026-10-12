// Storyboards: 引導員篇、審查人員篇、夥伴修改篇. Plain words for frontline social workers.
const { Screen, Custom, assemble, union, raw } = require('./lib');

const title = (sub, tag) => new Custom('title', { props: { kick: '信扶專案', main: '創業貸款準備助手', sub, tag }, tin: { type: 'cut', d: 0 } })
  .sound('stamp', { dt: 1.95 }).sound('swell', { dt: 0.2 }).wait(6.0);
const chapter = (num, t, sub, ring) => new Custom('chapter', { props: { num, title: t, sub, ring: ring + ring }, tin: { type: 'leak', d: 1.1 } })
  .sound('stamp', { dt: 0.72 }).wait(4.6);
const ending = (props, hold = 8.6) => new Custom('end', { props, tin: { type: 'leak', d: 1.2 } })
  .sound('chime', { dt: 1.2 }).wait(hold);
const seq = (pfx, n) => Array.from({ length: n }, (_, i) => pfx + (i + 1));

/* ============================== 引導員篇 ============================== */
function guide() {
  const TT = '創業貸款準備助手－引導員版';
  const RING = '創業貸款準備助手　★　引導員篇　★　';
  const shots = [title('引導員篇', '陪小老闆，把資料一次準備好')];

  // 開始：打開網址、建立案件、總覽
  const A = new Screen({ title: TT, tin: { type: 'leak', d: 1.2 } });
  A.show('g-welcome', 0).wait(0.7)
    .cap('打開網址就能用', '不用安裝、不用登入；資料只存在你的瀏覽器')
    .cam('g-welcome.steps', { zoom: 1.3, d: 2.6 }).wait(0.6)
    .spot('g-welcome.privacy', { dt: 0.4, pad: 14 }).wait(1.4).unspot({ dt: 0.6 })
    .full({ dt: 0.4, d: 1.0 }).wait(0.4)
    .move('g-welcome.skip', { d: 0.9 }).click()
    .show('g-ov0', 0.5).wait(0.4)
    .cap('選好階段，填上個案名稱和審查日期', '首次動撥，或第 2～5 次動撥')
    .cam('g-ov0.seg', { zoom: 2.0, cx: 0.42, d: 1.1 }).spot('g-ov0.seg', { dt: 0.4 })
    .move('g-ov0.segFirst', { d: 1.0 }).wait(0.5).unspot({ d: 0.4 })
    .cam('g-ov0.casecard', { zoom: 1.75, cx: 0.48, d: 1.1 }).move('g-ov0.case', { d: 1.0, ox: 0.2 }).click()
    .typeIn(seq('g-ov0-n', 7), 0.15).wait(0.2)
    .move('g-ov0.date', { d: 0.8, ox: 0.2 }).click().show('g-ov0-date', 0.35).wait(0.3)
    .cap('右上角的郵戳，會算好寄達期限', '要在審查日前 10 天寄到公司')
    .cam('g-ov0-date.postmark', { zoom: 2.5, cx: 0.56, cy: 0.42 }).spot('g-ov0-date.postmark', { dt: 0.6, pad: 18 })
    .away({ d: 1.0 }).tag('g-ov0-date.postmark', '自動倒數', { side: 'left', dt: 0.6, d: 2.8, tone: 'honey' }).wait(2.6)
    .unspot().capEnd().full({ d: 1.1 })
    .veil('幾天後', 2.3).wait(0.9).show('g-ov', 0.2).wait(1.3)
    .cap('總覽一眼看懂進度', '「下一步」告訴你現在最該做的事')
    .cam(union('g-ov.donut', 'g-ov.next'), { zoom: 1.35, cy: 0.42 }).spot('g-ov.next', { dt: 0.7 }).move('g-ov.nextbtn', { d: 1.2 }).wait(1.0)
    .unspot({ dt: 1.0 }).capEnd(0.3).end(1.0);
  shots.push(A);

  shots.push(chapter('1', '準備資料', '一項一項來，做完就打勾', RING));

  const B = new Screen({ title: TT, chip: { n: '1', t: '準備資料' }, tin: { type: 'zoom', d: 1.0 } });
  B.show('g-docs', 0).wait(0.5)
    .cap('「繳交資料」列出這次要交的文件', '標籤的顏色，就是每一項的狀態')
    .cam('g-docs.list', { zoom: 1.45, cy: 0.47, d: 2.2 }).wait(1.6)
    .show('g-docs-s', 0.5).cam('g-docs-s.row24', { zoom: 1.55 }).wait(0.6)
    .cap('點開一項，做完一個條件就勾一個')
    .move('g-docs-s.row24', { d: 1.0, ox: 0.28 }).click().show('g-docs-open', 0.35)
    .cam('g-docs-open.row', { zoom: 1.6, cy: 0.45 }).spot('g-docs-open.row', { dt: 0.3 }).wait(0.7)
    .move('g-docs-open.c1', { d: 0.9 }).click().show('g-docs-c1', 0.15).wait(0.4)
    .move('g-docs-c1.c2', { d: 0.7 }).click().show('g-docs-c2', 0.15).wait(0.3)
    .cap('條件都勾完，就變成「完成」')
    .spot('g-docs-c2.pill', { pad: 14 }).cam('g-docs-c2.pill', { zoom: 2.4, cx: 0.42 })
    .sound('chime', { dt: 0.25 }).wait(2.4)
    .unspot()
    .cap('不確定怎麼做？打開「作業說明」', '範例和常見錯誤都在裡面')
    .cam('g-docs-c2.row23', { zoom: 1.5 }).move('g-docs-c2.row23', { d: 0.9, ox: 0.3 }).click().show('g-docs-23', 0.35).wait(0.2)
    .cam('g-docs-23.link23', { zoom: 2.0 }).move('g-docs-23.link23', { d: 0.8 }).click()
    .show('g-item-dd', 0.55).away({ d: 1.0 }).cam('g-item-dd.dodont', { zoom: 1.45, cy: 0.45 }).spot('g-item-dd.dodont', { dt: 0.5 }).wait(1.6)
    .unspot({ dt: 1.4 }).end(1.2);
  shots.push(B);

  shots.push(chapter('2', '計畫書與附件', '填一次，Word 和 Excel 都有', RING));

  const P = new Screen({ title: TT, chip: { n: '2', t: '計畫書與附件' }, tin: { type: 'zoom', d: 1.0 } });
  P.show('g-pl-basic', 0).wait(0.5)
    .cap('和小老闆一起填一次', '就能產生 Word 計畫書和 Excel 附件')
    .cam('g-pl-basic.plnav', { zoom: 1.45, cx: 0.4, d: 1.6 }).spot('g-pl-basic.plnav', { dt: 0.5 }).wait(1.2)
    .spot('g-pl-basic.doctags', { pad: 10 }).cam('g-pl-basic.secTitle', { zoom: 1.7, cx: 0.45 }).tag('g-pl-basic.doctags', '會寫進計畫書第壹段', { side: 'right', dt: 0.5, d: 2.2, tone: 'honey' }).wait(1.6)
    .unspot({ d: 0.4 }).full({ d: 1.0 })
    .move('g-pl-basic.money', { d: 0.9, ox: 0.3 }).click().show('g-pl-money', 0.4)
    .cap('債務照規定的順序自動排好', '本人在前、親屬在後，時間由遠到近')
    .cam('g-pl-money.order', { zoom: 1.6, cy: 0.38, d: 1.1 }).move('g-pl-money.sum', { d: 0.9, ox: 0.2 }).click().show('g-pl-money-o', 0.35)
    .cam('g-pl-money-o.list', { zoom: 1.7, cy: 0.42 }).spot('g-pl-money-o.list', { dt: 0.3, pad: 12 }).away({ d: 1.0 }).wait(1.6).unspot({ d: 0.4 })
    .full({ d: 1.0 }).move('g-pl-money-o.st', { d: 0.9, ox: 0.3 }).click().show('g-pl-st0', 0.4)
    .cap('數字自動計算', '損益平衡、每天最低營業額，馬上算好')
    .cam('g-pl-st0.ops', { zoom: 1.7, cy: 0.42, d: 1.1 }).move('g-pl-st0.margin', { d: 0.9, ox: 0.4 }).click()
    .typeIn(['g-pl-st1', 'g-pl-st2'], 0.28).wait(0.2).away({ d: 0.9 })
    .spot(union('g-pl-st2.res', 'g-pl-st2.res3'), { dt: -0.5, pad: 10 }).wait(1.4).unspot({ d: 0.4 })
    .full({ d: 1.0 }).move('g-pl-st2.make', { d: 0.9, ox: 0.3 }).click().show('g-pl-make', 0.4)
    .cap('最後一段，按一下就產生檔案')
    .cam('g-pl-make.cards', { zoom: 1.5, cy: 0.42, d: 1.1 }).move('g-pl-make.genPlan', { d: 0.9 }).click().show('g-pl-made1', 0.25)
    .fileOut('Word 計畫書', 'g-pl-made1.genPlan', { sub: '信扶專案創業計畫書' })
    .move('g-pl-made1.genAttach', { d: 0.9 }).click().show('g-pl-made2', 0.25)
    .fileOut('Excel 附件', 'g-pl-made2.genAttach', { sub: '四張表一次產生' })
    .cap('能確認的完成條件，自動打勾', '對照審查繳交進度表')
    .cam('g-pl-made2.tick', { zoom: 1.6, cy: 0.42 }).spot('g-pl-made2.tick', { dt: 0.3, pad: 10 }).away({ d: 1.0 }).wait(1.8)
    .unspot({ dt: 0.6 }).end(0.6);
  shots.push(P);

  const DOC = new Screen({ title: '打開產生的檔案（虛構示範資料）', chip: { n: '2', t: '計畫書與附件' }, tin: { type: 'zoom', d: 0.9 } });
  DOC.show('g-pl-doc', 0).wait(0.4)
    .cap('套用官方範本，內容都填好了')
    .cam('g-pl-doc.wordTop', { zoom: 1.6, cy: 0.4, dt: 0.6, d: 1.8 }).wait(1.8)
    .cam('g-pl-doc.debtOrder', { zoom: 1.7, cy: 0.4, d: 1.6 }).spot('g-pl-doc.debtRows', { dt: 0.6, pad: 8 }).wait(1.4)
    .unspot({ d: 0.4 }).full({ d: 1.3 })
    .cap('印出來，讓小老闆照著手寫', '要直接用打字版，先問過顧問')
    .wait(1.2).spot('g-pl-doc.wordPage', { dt: 0.2, pad: 10 }).wait(2.0).unspot({ d: 0.5 }).end(0.8);
  shots.push(DOC);

  shots.push(chapter('3', '自己先檢查', '送件前，讓工具先看一遍', RING));

  const C = new Screen({ title: TT, chip: { n: '3', t: '自己先檢查' }, tin: { type: 'zoom', d: 1.0 } });
  C.show('g-tools', 0).wait(0.5)
    .cap('「檢核工具」幫你抓出常見的錯')
    .cam('g-tools.cards', { zoom: 1.3, d: 1.8 }).wait(0.8)
    .move('g-tools.debt', { d: 1.0, ox: 0.25, oy: 0.35 }).click().show('g-debt0', 0.45).full({ d: 0.9 }).wait(0.4)
    .cap('把債務盤點表的內容貼進來', '也可以直接選 Excel 檔')
    .cam('g-debt0.paste', { zoom: 1.45 }).move('g-debt0.paste', { d: 1.0, ox: 0.35 }).click().show('g-debt1', 0.3).sound('paste').wait(1.2)
    .move('g-debt1.run', { d: 0.9 }).click().show('g-debt2', 0.5)
    .cap('哪裡要改、怎麼改，直接告訴你')
    .cam('g-debt2.findings', { zoom: 1.4, cy: 0.46 }).spot('g-debt2.fix1', { dt: 0.6 }).away({ d: 1.2 }).wait(1.6)
    .unspot()
    .cap('檢查通過的條件，會自動幫你打勾')
    .cam('g-debt2.tick', { zoom: 1.5, cy: 0.42 }).spot('g-debt2.tick', { dt: 0.6 }).tag('g-debt2.tick', '自動勾選', { side: 'bottom', tone: 'sage', dt: 0.9, d: 2.4 }).wait(1.2)
    .unspot({ dt: 1.4 }).end(1.4);
  shots.push(C);

  shots.push(chapter('4', '處理修改意見', '收到清單，改好再回傳', RING));

  const F = new Custom('flow', { props: { ta: 0.9, tb: 4.4 }, tin: { type: 'zoom', d: 1.0 } });
  F.wait(0.8).cap('審查人員會給你一份「需修改清單」').sound('whoosh', { dt: 0.2, soft: true }).wait(3.0)
    .cap('改好之後，你回傳一份「修改回覆」').sound('whoosh', { dt: 0.3, soft: true }).end(1.0);
  shots.push(F);

  const E = new Screen({ title: TT, chip: { n: '4', t: '處理修改意見' }, tin: { type: 'zoom', d: 1.0 } });
  E.show('g-is0', 0).wait(0.5)
    .cap('打開「需修改事項」，按「匯入」', '選審查人員給你的檔案')
    .cam('g-is0.exchange', { zoom: 1.35 }).spot('g-is0.import', { dt: 0.8 }).move('g-is0.import', { d: 1.2 }).click()
    .fileIn('需修改清單', 'g-is0.import', { d: 1.5, sub: '審查人員給的檔案' }).unspot({ d: 0.3 }).show('g-is1', 0.45).wait(0.3)
    .cap('每一項都列出來，也會標在對應的資料上')
    .cam(union('g-is1.ring', 'g-is1.row1'), { zoom: 1.2, cy: 0.45 }).away({ d: 1.0 }).wait(1.4)
    .cap('點「位置與建議」，看要改哪裡')
    .cam('g-is1.row1', { zoom: 1.65 }).move('g-is1.det1', { d: 1.0, ox: 0.3 }).click().show('g-is2', 0.3)
    .cam('g-is2.detail', { zoom: 1.6 }).spot('g-is2.detail', { dt: 0.3 }).wait(1.6).unspot()
    .cap('改好一項，就按「標記已修改」')
    .move('g-is2.fixed1', { d: 1.0 }).click().show('g-is3', 0.35)
    .cam('g-is3.ring', { zoom: 1.8, cx: 0.55 }).spot('g-is3.ring', { dt: 0.4 }).tag('g-is3.ring', '1/3 已改好', { side: 'right', dt: 0.7, d: 2.0, tone: 'honey' }).wait(2.0).unspot()
    .move('g-is3.fixed1', { d: 0.9 }).click().show('g-is4', 0.35).cam('g-is4.ring', { zoom: 1.8, cx: 0.55 }).wait(0.8)
    .cap('都改好了，按「回傳修改進度」', '把下載的檔案交給審查人員')
    .cam('g-is4.reply', { zoom: 1.9, cx: 0.62 }).spot('g-is4.reply', { dt: 0.4 }).move('g-is4.reply', { d: 1.1 }).click()
    .fileOut('修改回覆', 'g-is4.reply', { sub: '交給審查人員' }).wait(0.8).unspot()
    .show('g-bk', 0.3)
    .cap('換電腦或換瀏覽器前，先按「備份」', '資料只存在這個瀏覽器')
    .cam('g-bk.backup', { zoom: 2.1, cx: 0.4 }).spot('g-bk.backup', { dt: 0.5 }).move('g-bk.exp', { d: 1.1 }).wait(1.4)
    .unspot({ dt: 0.4 }).away({ d: 1.2 }).full({ dt: 0.6, d: 1.4 }).capEnd(0.4).end(1.3);
  shots.push(E);

  shots.push(ending({ head: '記住這四件事', brandSub: '引導員篇', line: '資料只存在這台電腦的瀏覽器，不會上傳', tiles: [
    { icon: 'docs', title: '照清單準備', text: '做完一個條件，就勾一個' },
    { icon: 'plan', title: '計畫書一次產生', text: '填一次，Word、Excel 都有' },
    { icon: 'tools', title: '送件前先檢查', text: '工具會圈出可能的錯' },
    { icon: 'inbox', title: '收到意見就處理', text: '改好標記，再回傳進度' }] }, 9.2));
  return assemble(shots, { name: 'guide', fadeOut: 1.6 });
}

/* ============================== 審查人員篇 ============================== */
function reviewer() {
  const TT = '創業貸款準備助手－審查人員版';
  const shots = [title('審查人員篇', '讓 AI 先看一遍，你來做判斷')];

  const A = new Screen({ title: TT, tin: { type: 'leak', d: 1.2 } });
  A.show('r-gate', 0).wait(0.6)
    .cap('第一次打開，輸入審查通行碼', '通行碼請向管理者索取')
    .cam('r-gate.card', { zoom: 1.4 }).move('r-gate.input', { d: 1.2, ox: 0.25 }).click()
    .typeIn(['r-gate-3', 'r-gate-6', 'r-gate-9', 'r-gate-12'], 0.32).wait(0.3)
    .move('r-gate-12.btn', { d: 0.9 }).click().show('r-welcome', 0.6).full({ d: 1.2 }).wait(0.4)
    .cap('同一個瀏覽器只要開通一次', '之後打開就能直接用')
    .wait(0.6)
    .cap('審查分成四步，跟著做就好')
    .cam('r-welcome.steps', { zoom: 1.35 }).spot('r-welcome.steps', { dt: 0.6 }).wait(2.2).unspot()
    .move('r-welcome.skip', { d: 1.0 }).click()
    .show('r-cases', 0.6).full({ d: 1.0 }).wait(0.4)
    .cap('每個案子一張卡片，圓圈是進度')
    .cam('r-cases.grid', { zoom: 1.35 }).wait(1.2)
    .cap('按「新增審查案件」，填上個案名稱')
    .move('r-cases.new', { d: 1.1 }).click().show('r-new0', 0.3).cam('r-new0.dialog', { zoom: 1.6 })
    .move('r-new0.name', { d: 0.9, ox: 0.2 }).click().typeIn(seq('r-new-n', 7), 0.17).wait(0.3)
    .spot('r-new-n7.stage', { pad: 10 }).move('r-new-n7.stage', { d: 0.8, ox: 0.3 }).wait(0.9).unspot()
    .move('r-new-n7.ok', { d: 0.8 }).click().show('r-s1', 0.55).full({ d: 1.1 }).end(1.0);
  shots.push(A);

  shots.push(chapter('1', '準備 AI 初審', '一個資料夾、一份注意事項、一句話', '創業貸款準備助手　★　審查人員篇　★　'));

  const B = new Screen({ title: TT, chip: { n: '1', t: '準備 AI 初審' }, tin: { type: 'zoom', d: 1.0 } });
  B.show('r-s1', 0).wait(0.4)
    .cap('建一個資料夾，放這個案子的文件')
    .cam('r-s1.h1', { zoom: 1.6 }).spot('r-s1.h1', { dt: 0.5 }).wait(1.2)
    .cap('下載「AI 審核注意事項」，放進同一個資料夾')
    .cam('r-s1.h2', { zoom: 1.6 }).spot('r-s1.h2').move('r-s1.dl', { d: 1.1 }).click().wait(1.2)
    .cap('打開 AI 助手，貼上這句話', 'Claude Code 或 Codex 都可以')
    .cam('r-s1.h3', { zoom: 1.45 }).spot('r-s1.h3').move('r-s1.copy', { d: 1.0 }).click()
    .tag('r-s1.copy', '已複製', { side: 'right', tone: 'sage', dt: 0.2, d: 2.2 }).wait(1.6)
    .unspot({ dt: 0.6 }).end(1.2);
  shots.push(B);

  const files = [
    { name: '信扶專案創業計畫書.pdf', type: 'pdf', at: 0.55, read: 6.6 },
    { name: '創業計畫書附件.xlsx', type: 'xls', at: 0.8, read: 7.4 },
    { name: '估價單.pdf', type: 'pdf', at: 1.05, read: 8.2 },
    { name: '戶籍謄本.pdf', type: 'pdf', at: 1.3, read: 9.0 },
    { name: 'AI審核注意事項_首次動撥.md', type: 'md', at: 2.3, drop: true, hl: 'honey', hlDur: 2.6 },
    { name: 'AI審查結果.json', type: 'json', at: 11.4, drop: true, hl: 'sage', hlDur: 4 }];
  const AI = new Custom('ai', { tin: { type: 'zoom', d: 1.0 }, props: {
    folder: '黃阿姨（示範）', files, title: 'AI 助手',
    ask: '請先完整閱讀這個資料夾裡的「AI審核注意事項_首次動撥.md」，再依照它審查同一個資料夾裡的所有文件。完成後把結果存成「AI審查結果.json」，並用條列簡短告訴我重點。',
    reply1: '好的，先讀注意事項，再一份一份檢查', reads: ['創業計畫書', '附件：債務表、營運結構等 4 張表', '估價單', '戶籍謄本'], readAt: [6.6, 7.4, 8.2, 9.0],
    reply2: '<b>檢查完成</b>，結果存在「AI審查結果.json」<ul><li>需修改 2 項、請核對 2 項、提醒 1 項</li><li>最重要：債務表的借款時間順序</li></ul>',
    t: { win: 3.3, ask: 4.2, reply1: 5.6, reply2: 10.6 } } });
  AI.sfxAt('drop', 2.75).sfxAt('pop', 4.25).sfxAt('pop', 5.65).sfxAt('tick', 7.2).sfxAt('tick', 8.0).sfxAt('tick', 8.8).sfxAt('tick', 9.6).sfxAt('pop', 10.65).sfxAt('drop', 11.9).sfxAt('chime', 12.0)
    .wait(0.6).cap('文件和注意事項，放在同一個資料夾')
    .cap('AI 會照注意事項，一份一份檢查', '請用公司規定的帳號').wait(1.0)
    .wait(Math.max(0, 10.6 - 1.0 - 4.5))
    .cap('看完會多一個結果檔，交給你判斷').wait(1.0).end(2.0);
  shots.push(AI);

  shots.push(chapter('2', '確認 AI 結果', '採用或不採用，由你決定', '創業貸款準備助手　★　審查人員篇　★　'));

  const D = new Screen({ title: TT, chip: { n: '2', t: '確認 AI 結果' }, tin: { type: 'zoom', d: 1.0 } });
  D.show('r-s2e', 0).wait(0.4)
    .cap('把結果檔拖進來')
    .cam('r-s2e.drop', { zoom: 1.45 }).spot('r-s2e.drop', { dt: 0.5 }).wait(0.4)
    .fileIn('AI審查結果', 'r-s2e.drop', { d: 1.6, sub: 'AI 存好的結果檔' }).unspot({ d: 0.3 }).show('r-s2', 0.5).full({ d: 0.9 }).wait(0.4)
    .cap('AI 找到的問題，依文件分好、標好等級')
    .cam('r-s2.tally', { zoom: 1.7, cx: 0.5 }).spot('r-s2.tally', { dt: 0.5 }).wait(1.0).unspot()
    .cam(union('r-s2.card1', 'r-s2.lv1'), { zoom: 1.45, cy: 0.45 }).spot('r-s2.card1', { dt: 0.4 }).wait(1.4).unspot()
    .cap('「需修改」可以一鍵全部採用')
    .cam('r-s2.accfix', { zoom: 1.8, cx: 0.4 }).move('r-s2.accfix', { d: 1.1, ox: 0.3 }).click().show('r-s2a', 0.4)
    .cam('r-s2a.decided', { zoom: 1.7, cx: 0.62 }).tag('r-s2a.decided', '2/5 已決定', { side: 'bottom', dt: 0.4, d: 2.0, tone: 'sage' }).wait(1.4)
    .cap('其他的逐項看：點開看位置、依據和建議')
    .cam('r-s2a.card1', { zoom: 1.5 }).move('r-s2a.more1', { d: 1.0, ox: 0.3 }).click().show('r-s2d', 0.45)
    .cam('r-s2d.fdetail', { zoom: 1.35, cy: 0.45 }).spot('r-s2d.fdetail', { dt: 0.5 }).away({ d: 1.0 }).wait(1.8).unspot()
    .cap('文字可以修改，再決定「採用」或「不採用」')
    .cam('r-s2d.fdetail', { zoom: 1.12, cy: 0.45 }).spot('r-s2d.text', { dt: 0.3 }).wait(1.6).unspot()
    .cam('r-s2d.acc', { zoom: 1.9, cx: 0.6 }).move('r-s2d.acc', { d: 1.0 }).click().show('r-s2b', 0.35).full({ d: 1.0 }).wait(0.5)
    .move('r-s2b.acc1', { d: 0.9 }).click().show('r-s2c', 0.3).wait(0.5)
    .move('r-s2c.rej1', { d: 0.8 }).click().show('r-s2z', 0.35).wait(0.4)
    .cap('都決定好，就到下一步')
    .cam(union('r-s2z.decided', 'r-s2z.next'), { zoom: 1.4, cy: 0.42 }).spot('r-s2z.next', { dt: 0.8 }).move('r-s2z.next', { d: 1.1 }).click()
    .unspot({ d: 0.3 }).show('r-s3', 0.5).full({ d: 1.0 }).capEnd(0.25).end(0.6);
  shots.push(D);

  shots.push(chapter('3', '傳回引導員', '用檔案往返，不怕漏掉', '創業貸款準備助手　★　審查人員篇　★　'));

  const S3 = new Screen({ title: TT, chip: { n: '3', t: '傳回引導員' }, tin: { type: 'zoom', d: 1.0 } });
  S3.show('r-s3', 0).wait(0.4)
    .cap('下載「需修改清單」，交給引導員', '建議上傳到審查事件，不要傳到群組')
    .cam('r-s3.opts', { zoom: 1.35, cy: 0.45 }).spot('r-s3.dl', { dt: 0.6 }).move('r-s3.dl', { d: 1.2 }).click()
    .fileOut('需修改清單', 'r-s3.dl', { sub: '交給引導員' }).wait(0.6).unspot().show('r-s3d', 0.4)
    .cap('引導員改好，會回傳「修改回覆」')
    .cam('r-s3d.ok', { zoom: 1.6, cy: 0.45 }).spot('r-s3d.ok', { dt: 0.4 }).wait(1.4).unspot()
    .move('r-s3d.next', { d: 1.0 }).click().show('r-s4w', 0.45).full({ d: 1.0 }).end(0.6);
  shots.push(S3);

  shots.push(chapter('4', '確認修改', '看過就確認，有問題就退回', '創業貸款準備助手　★　審查人員篇　★　'));

  const S4 = new Screen({ title: TT, chip: { n: '4', t: '確認修改' }, tin: { type: 'zoom', d: 1.0 } });
  S4.show('r-s4w', 0).wait(0.4)
    .cap('收到「修改回覆」，按「匯入修改回覆」')
    .cam('r-s4w.imp', { zoom: 1.9, cx: 0.6 }).spot('r-s4w.imp', { dt: 0.5 }).move('r-s4w.imp', { d: 1.1 }).click()
    .fileIn('修改回覆', 'r-s4w.imp', { d: 1.5, sub: '引導員回傳的檔案' }).unspot({ d: 0.3 }).show('r-s4', 0.45).full({ d: 1.0 }).wait(0.4)
    .cap('看引導員改了什麼，沒問題就「確認」', '有問題就「退回」，再傳一次清單')
    .cam('r-s4.fixedRow', { zoom: 1.45, cy: 0.45 }).spot('r-s4.fixedRow', { dt: 0.5 }).move('r-s4.confirm', { d: 1.1 }).click().show('r-s4b', 0.3).wait(1.2).unspot()
    .cap('其他的也沒問題？一次全部確認')
    .cam('r-s4b.all', { zoom: 1.8, cx: 0.45 }).move('r-s4b.all', { d: 1.0 }).click().show('r-s4z', 0.5)
    .cam('r-s4z.hero', { zoom: 1.3, cy: 0.42 }).sound('stamp', { dt: 0.5 }).sound('chime', { dt: 0.7 }).wait(0.8)
    .cap('全部確認，這個案子就審查完成')
    .tag('r-s4z.seal', '審查完成', { side: 'left', tone: 'sage', dt: 0.3, d: 2.4, sound: false }).away({ d: 1.0 }).wait(1.6)
    .unspot().end(1.0);
  shots.push(S4);

  const N = new Screen({ title: TT, chip: { n: '＋', t: '讓 AI 越用越準' }, tin: { type: 'zoom', d: 1.0 } });
  N.show('r-no', 0).wait(0.4)
    .cap('審查標準寫在「AI 審核注意事項」')
    .cam('r-no.stats', { zoom: 1.5, cy: 0.42 }).spot('r-no.stats', { dt: 0.5 }).wait(1.2).unspot()
    .cap('發現 AI 常漏看的地方，直接補充')
    .cam('r-no.edit', { zoom: 2.0, cx: 0.55 }).move('r-no.edit', { d: 1.0 }).click().show('r-ne0', 0.45)
    .cam('r-ne0.extra', { zoom: 1.5, cy: 0.42 }).move('r-ne0.extra', { d: 0.9, ox: 0.2 }).click().show('r-ne1', 0.6).wait(1.0)
    .move('r-ne1.save', { d: 0.9 }).click().show('r-ns', 0.45)
    .cap('存成新版本，再匯出新檔案', '交給負責網站的同仁換上，大家就用新版')
    .cam('r-ns.notice', { zoom: 1.45, cy: 0.42 }).spot('r-ns.notice', { dt: 0.4 }).move('r-ns.exp', { d: 1.1 }).wait(1.4)
    .unspot({ dt: 1.0 }).away({ d: 1.2 }).full({ dt: 1.0, d: 1.4 }).capEnd(0.4).end(1.4);
  shots.push(N);

  shots.push(ending({ head: 'AI 幫你找，你來決定', brandSub: '審查人員篇', line: '請用公司規定的帳號；AI 結果不寫完整身分證字號、電話、地址', tiles: [
    { icon: 'folder', title: '準備資料夾', text: '文件和注意事項放一起' },
    { icon: 'check', title: '逐項決定', text: '採用或不採用，由你判斷' },
    { icon: 'send', title: '用檔案往返', text: '傳回清單，確認修改' }] }));
  return assemble(shots, { name: 'reviewer', fadeOut: 1.6 });
}

/* ============================== 夥伴修改篇 ============================== */
// 畫面：video/partner/mock.html 的示意畫面（capture-partner.js 截圖）＋本機預覽的準備助手（虛構示範資料）
function partner() {
  const RING = '創業貸款準備助手　★　夥伴修改篇　★　';
  const CX = 'Codex（示意畫面）', GH = 'GitHub（示意畫面）';
  const shots = [title('夥伴修改篇', '你提建議，AI 動手，Kevin 把關')];

  // 開場：誰做什麼
  const I = new Custom('pipe', { tin: { type: 'leak', d: 1.2 }, props: {
    y: 440,
    nodes: [
      { x: 330, icon: 'user', badge: 'writing', color: '#F2A93B', title: '你', sub: '說清楚想改什麼', t: 0.9 },
      { x: 770, icon: 'spark', badge: 'edit', color: '#3D7C8A', title: 'Codex', sub: '動手修改、自己測試', t: 2.5 },
      { x: 1210, icon: 'user', badge: 'check', color: '#4F8A5B', title: '你', sub: '看過畫面再送出', t: 6.4 },
      { x: 1650, icon: 'user', badge: 'shield', color: '#C7402D', title: 'Kevin', sub: '看過才上線', t: 11.0 }],
    arrows: [{ a: 0, b: 1, t: 1.8 }, { a: 1, b: 2, t: 5.8 }, { a: 2, b: 3, t: 10.4 }],
    back: { a: 2, b: 1, t: 7.6, label: '不對再改' },
    site: { t: 12.6, label: '網站自動更新' } } });
  I.sfxAt('pop', 0.95).sfxAt('whoosh', 1.8, { soft: true }).sfxAt('pop', 2.55).sfxAt('whoosh', 5.8, { soft: true }).sfxAt('pop', 6.45)
    .sfxAt('whoosh', 7.6, { soft: true }).sfxAt('pop', 8.1).sfxAt('whoosh', 10.4, { soft: true }).sfxAt('pop', 11.05).sfxAt('chime', 12.7)
    .wait(0.8).cap('你說清楚想改什麼，Codex 幫你動手')
    .wait(4.75).cap('改好先給你看，不對就再改')
    .wait(4.0).cap('滿意了才送出，Kevin 看過才上線', '改錯也不會影響大家')
    .wait(5.6).end(0.6);
  shots.push(I);

  shots.push(chapter('1', '準備', '只要做一次', RING));

  const G = new Screen({ title: GH, chip: { n: '1', t: '準備' }, tin: { type: 'zoom', d: 1.0 } });
  G.show('gh-signup', 0).wait(0.6)
    .cap('先免費註冊 GitHub', '電腦也要先裝好 Codex')
    .cam('gh-signup.gbtn', { zoom: 1.5, cy: 0.45, d: 1.8 }).wait(1.0)
    .cap('一律點「Continue with Google」', '選自己要用來協作的 Google 帳號', { min: 5.6 })
    .spot('gh-signup.gbtn', { pad: 14 }).move('gh-signup.gbtn', { d: 1.1, ox: 0.32 }).wait(0.8).click().wait(0.8).unspot({ d: 0.5 })
    .cap('密碼和驗證碼，只在這些畫面輸入', '不要貼給 Codex').away({ d: 1.1 }).wait(1.2)
    .full({ d: 1.2 })
    .show('gh-home', 0.5)
    .cap('完成後點右上角的頭像', '記下自己的使用者名稱')
    .cam(union('gh-menu.menu', 'gh-menu.av'), { zoom: 1.9, cx: 0.58, cy: 0.42, d: 1.4 })
    .move('gh-home.av', { d: 1.1 }).click().show('gh-menu', 0.25).wait(0.5)
    .spot('gh-menu.uname', { pad: 12 }).tag('gh-menu.uname', '記下這個名字', { side: 'left', tone: 'honey', dt: 0.3, d: 2.8 }).away({ d: 1.0 }).wait(2.0)
    .unspot().end(0.6);
  shots.push(G);

  const C1 = new Screen({ title: CX, chip: { n: '1', t: '準備' }, tin: { type: 'zoom', d: 1.0 } });
  C1.show('c1-empty', 0).wait(0.5)
    .cap('打開 Codex，開一個新對話')
    .cam('c1-empty.newchat', { zoom: 2.0, cx: 0.36, cy: 0.36, d: 1.3 }).spot('c1-empty.newchat', { dt: 0.4, pad: 10 })
    .move('c1-empty.newchat', { d: 1.1, ox: 0.3 }).click().wait(0.5).unspot({ d: 0.4 })
    .full({ d: 1.1 })
    .cap('貼上操作說明「第 1 步」的文字', '先把使用者名稱換成你的')
    .move('c1-empty.comp', { d: 1.0, ox: 0.3 }).click().show('c1-paste', 0.3).sound('paste')
    .cam('c1-paste.comp', { cy: 0.46, d: 1.3 }).wait(0.3)
    .spot('c1-paste.mark', { pad: 10 }).tag('c1-paste.mark', '換成你的', { side: 'top', tone: 'honey', dt: 0.3, d: 2.6 }).wait(2.6).unspot()
    .move('c1-paste.send', { d: 0.9 }).click().show('c1-work', 0.35).full({ d: 1.1 })
    .cap('Codex 會把準備助手，複製一份到你的電腦').away({ d: 1.0 }).untilCap(0.3)
    .show('c1-done', 0.4).cam(union('c1-done.m', 'c1-done.r'), { cy: 0.45, d: 1.3 }).spot('c1-done.code', { dt: 0.6, pad: 8 }).wait(1.2)
    .cap('打開它回覆的這個資料夾', '按「開啟資料夾」，選 xinfu-assistant-source').wait(0.9)
    .unspot({ d: 0.4 }).show('c1-open', 0.45).cam('c1-open.dlg', { zoom: 1.5, cy: 0.44, d: 1.2 })
    .move('c1-open.sel', { d: 1.0, ox: 0.3 }).click().wait(0.4).move('c1-open.ok', { d: 0.9 }).click().wait(0.4)
    .away({ d: 1.0 }).end(0.4);
  shots.push(C1);

  shots.push(chapter('2', '修改', '說清楚，再看清楚', RING));

  const C2 = new Screen({ title: CX, chip: { n: '2', t: '修改' }, tin: { type: 'zoom', d: 1.0 } });
  C2.show('c2-empty', 0).wait(0.5)
    .cap('每次要改，先開一個「修改空間」')
    .wait(1.0).move('c2-empty.comp', { d: 1.1, ox: 0.3 }).click().show('c2-paste', 0.3).sound('paste')
    .cam('c2-paste.comp', { cy: 0.46, d: 1.3 })
    .cap('貼上「第 2 步」，填好名字和這次的主題')
    .spot('c2-paste.mark', { dt: 0.3, pad: 10 }).tag('c2-paste.mark', '名字＋主題', { side: 'top', tone: 'honey', dt: 0.6, d: 2.6 }).wait(2.8).unspot()
    .move('c2-paste.send', { d: 0.9 }).click().show('c2-done', 0.4).full({ d: 1.0 }).wait(0.3)
    .cap('在修改空間裡怎麼改，都不會影響大家')
    .cam('c2-done.wt', { zoom: 2.2, cx: 0.45, cy: 0.32, d: 1.3 }).spot('c2-done.wt', { dt: 0.4, pad: 10 })
    .tag('c2-done.wt', '你的修改空間', { side: 'bottom', tone: 'sage', dt: 0.7, d: 2.6 }).away({ d: 1.0 }).wait(2.2)
    .unspot().end(0.6);
  shots.push(C2);

  const crop = [840, 462, 1420, 548];
  const SG = new Custom('sugg', { tin: { type: 'zoom', d: 1.0 }, props: {
    img: 'pv-before', crop, lw: 900, shotTop: 318, shotTitle: '準備助手：計畫書與附件', title: '把建議說清楚',
    rows: [
      { label: '在哪裡', text: '引導員版 →「計畫書與附件」\n→「核對與產生」', t: 1.3 },
      { label: '現在', text: '按鈕寫「產生計畫書」「產生附件」', t: 3.0 },
      { label: '希望', text: '改成「產生 Word 計畫書」\n　　「產生 Excel 附件」', t: 4.7 },
      { label: '原因', text: '社工比較清楚會拿到哪一種檔案', t: 6.4 }],
    lastHold: 8.6,
    marks: [{ r: raw('pv-before.head'), t0: 1.45, t1: 2.95 }, { r: raw('pv-before.genPlan'), t0: 3.1, t1: 6.2 }, { r: raw('pv-before.genAttach'), t0: 3.1, t1: 6.2 }] } });
  SG.sfxAt('tick', 1.35).sfxAt('tick', 3.05).sfxAt('tick', 4.75).sfxAt('tick', 6.45)
    .wait(0.6).cap('接著，用四句話把建議說清楚', '在哪裡、現在、希望、原因')
    .wait(5.4).cap('寫得越清楚，Codex 改得越準')
    .wait(3.6).end(0.8);
  shots.push(SG);

  const C3 = new Screen({ title: CX, chip: { n: '2', t: '修改' }, tin: { type: 'zoom', d: 1.0 } });
  C3.show('c3-paste', 0).wait(0.4)
    .cap('把四句話放進「第 3 步」，貼給 Codex')
    .cam('c3-paste.comp', { cy: 0.46, d: 1.3 }).spot('c3-paste.mark', { dt: 0.5, pad: 10 }).wait(2.6).unspot()
    .move('c3-paste.send', { d: 1.0 }).click().show('c3-work', 0.4).full({ d: 1.1 })
    .cap('Codex 會照規則修改，再自己測試一遍', '確認原本的功能沒有被改壞').away({ d: 1.0 }).untilCap(0.3)
    .show('c3-done', 0.4).cam(union('c3-done.m', 'c3-done.r'), { cy: 0.44, d: 1.3 })
    .cap('改好了，它會給你一個網址')
    .spot('c3-done.url', { dt: 0.5, pad: 8 }).tag('c3-done.url', '點開來看', { side: 'right', tone: 'honey', dt: 0.8, d: 2.4 }).wait(2.6)
    .unspot().end(0.5);
  shots.push(C3);

  const PV = new Screen({ title: '本機預覽　http://127.0.0.1:8765', chip: { n: '2', t: '修改' }, tin: { type: 'zoom', d: 1.0 } });
  PV.show('pv-after', 0).wait(0.5)
    .cap('打開網址，自己點點看', '這個畫面只有你的電腦看得到')
    .cam('pv-after.cards', { zoom: 1.45, cy: 0.44, d: 1.8 }).wait(0.5)
    .spot(union('pv-after.genPlan', 'pv-after.genAttach'), { pad: 14 }).tag('pv-after.genPlan', '改好了', { side: 'top', tone: 'sage', dt: 0.4, d: 2.6 }).wait(2.6).unspot()
    .cap('哪裡不對，貼上「第 4 步」再請它修正').wait(0.6)
    .cap('滿意了，就截圖存起來', '鍵盤按 Win＋Shift＋S')
    .spot('pv-after.cards', { dt: 0.6, pad: 18 }).sound('click', { dt: 1.1 }).tag('pv-after.cards', '截圖存起來', { side: 'top', tone: 'cocoa', dt: 1.1, d: 2.4, sound: false }).wait(2.8)
    .unspot().full({ d: 1.2 }).end(0.4);
  shots.push(PV);

  shots.push(chapter('3', '送交', 'Kevin 看過才上線', RING));

  const C5 = new Screen({ title: CX, chip: { n: '3', t: '送交' }, tin: { type: 'zoom', d: 1.0 } });
  C5.show('c5-paste', 0).wait(0.4)
    .cap('送出前，請 Codex 再檢查一次', '貼上「第 5 步」')
    .cam('c5-paste.comp', { cy: 0.47, d: 1.3 }).wait(2.2)
    .move('c5-paste.send', { d: 1.0 }).click().show('c5-done', 0.4)
    .cam(union('c5-done.m', 'c5-done.r'), { cy: 0.45, d: 1.3 })
    .cap('看清楚改了哪些地方、測試有沒有通過')
    .spot('c5-done.r', { dt: 0.5, pad: 12 }).away({ d: 1.0 }).untilCap(0.2).unspot()
    .show('c6-paste', 0.45).cam('c6-paste.comp', { cy: 0.47, d: 1.3 })
    .cap('沒問題，就用你的帳號送出「草稿」', '貼上「第 6 步」').wait(1.2)
    .move('c6-paste.send', { d: 1.0 }).click().show('c6-done', 0.4)
    .cam(union('c6-done.m', 'c6-done.r'), { cy: 0.45, d: 1.3 })
    .cap('它會回傳一個連結', '送出的是草稿，還不會上線')
    .spot('c6-done.url', { dt: 0.5, pad: 8 }).tag('c6-done.url', '草稿連結', { side: 'right', tone: 'honey', dt: 0.8, d: 2.4 }).away({ d: 1.0 }).wait(1.8)
    .unspot().end(0.5);
  shots.push(C5);

  const PR = new Screen({ title: GH, chip: { n: '3', t: '送交' }, tin: { type: 'zoom', d: 1.0 } });
  PR.show('pr', 0).wait(0.5)
    .cap('打開連結，把第 4 步存的截圖拖進留言框', '再按「Comment」')
    .cam('pr.cmt', { zoom: 1.4, cy: 0.45, d: 1.5 }).wait(0.8)
    .fileIn('改好的畫面.png', 'pr.ta', { d: 1.6, sub: '第 4 步存的截圖' }).show('pr-pasted', 0.3).wait(1.0)
    .move('pr-pasted.cbtn', { d: 1.0 }).click().show('pr-posted', 0.4).wait(0.4)
    .cap('Kevin 一看就知道改了什麼')
    .spot('pr-posted.shot', { pad: 10 }).away({ d: 1.0 }).wait(1.8).unspot()
    .end(0.5);
  shots.push(PR);

  const IM = new Screen({ title: '傳訊息給 Kevin（示意畫面）', chip: { n: '3', t: '送交' }, tin: { type: 'zoom', d: 1.0 } });
  IM.show('im', 0).wait(0.4)
    .cap('最後，把連結傳給 Kevin')
    .cam('im.msg', { zoom: 1.5, cy: 0.42, d: 1.5 }).spot('im.msg', { dt: 0.6, pad: 12 }).untilCap(0.2).unspot()
    .show('im-reply', 0.4).sound('pop')
    .cap('Kevin 合併後，網站約 1 分鐘自動更新', '下次要改別的，從「第 2 步」開始')
    .cam(union('im-reply.msg', 'im-reply.reply'), { zoom: 1.3, cy: 0.42, d: 1.5 }).wait(4.3)
    .full({ d: 1.5 }).end(0.8);
  shots.push(IM);

  shots.push(ending({ head: '記住這三件事', brandSub: '夥伴修改篇', line: '密碼和驗證碼只在 Google、GitHub 的畫面輸入；不貼真實個案資料', tiles: [
    { icon: 'folder', title: '在修改空間改', text: '每次都從第 2 步開始' },
    { icon: 'check', title: '先看畫面再送出', text: '自己點過，截圖貼上' },
    { icon: 'shield', title: 'Kevin 把關才上線', text: '你送出的是草稿' }] }, 9.0));
  return assemble(shots, { name: 'partner', fadeOut: 1.6 });
}

module.exports = { guide, reviewer, partner };
