/* ==========================================================
   審查人員版：審查案件、AI 初審、需修改清單往返、AI 審核注意事項
   ========================================================== */
const stageShort=k=>k==='first'?'首次動撥':'第'+k.slice(1)+'次動撥';
const safeName=s=>String(s||'').replace(/[\\/:*?"<>|\s]+/g,'_').slice(0,40)||'未命名';
const ymd=()=>todayISO().replace(/-/g,'');
function rvGet(id){return state.reviews.find(r=>r.id===id)||null;}
function rvAccepted(r){return r.findings.filter(f=>f.decision==='accept');}
function rvPhase(r){
 if(!r)return {key:'',step:1,label:''};
 const f=r.findings,pend=f.filter(x=>x.decision==='pending').length,acc=rvAccepted(r);
 if(!f.length)return {key:'prepare',step:1,label:'準備 AI 初審'};
 if(pend)return {key:'decide',step:2,label:'確認 AI 結果（'+pend+' 項待決定）'};
 if(!acc.length)return {key:'done',step:4,label:'沒有需修改'};
 if(!r.sentAt)return {key:'send',step:3,label:'傳回引導員'};
 const fixed=acc.filter(x=>x.status==='fixed').length,open=acc.filter(x=>x.status==='open').length;
 if(fixed)return {key:'confirm',step:4,label:fixed+' 項已修改，待確認'};
 if(open)return {key:'wait',step:4,label:'等引導員修改（'+open+' 項）'};
 return {key:'done',step:4,label:'審查完成'};
}
function pinStep(r){if(r&&!ui.rvStep[r.id])ui.rvStep[r.id]=rvPhase(r).step;}
const RV_STEPS=[['準備 AI 初審','spark'],['確認 AI 結果','check'],['傳回引導員','send'],['確認修改','inbox']];

/* ---------- AI 審核注意事項 ---------- */
function notesItem(id,stage){const d=CONTENT.items[id];if(!d||d.kind==='operation')return false;if(/系統|核銷|公司影本/.test(d.method||''))return false;if(isLocked(id,stage))return false;return true;}
function notesFileName(stage){return 'AI審核注意事項_'+stageShort(stage)+'.md';}
function aiSentence(stage){return '請先完整閱讀這個資料夾裡的「'+notesFileName(stage)+'」，再依照它審查同一個資料夾裡的所有文件。完成後把結果存成「AI審查結果.json」，並用條列簡短告訴我重點。';}
function notesMarkdown(stage){
 const R=CONTENT.review,mode=stage==='first'?'first':'later',L=[];
 const ex=mode==='first'?['ref-23','債務現況盤點表']:['later-debt','債務現況盤點表'];
 L.push('# AI 審核注意事項｜'+stageShort(stage),'','版本 '+R.version+(R.updated?'（'+fmt(R.updated)+' 更新）':'')+'｜信扶專案創業貸款｜書面初審用','');
 L.push('## 你要做的事',String(R.role||'').trim(),'');
 if(mode==='first'){L.push('## 計畫書的基本資料',String(R.basic||'').trim(),'');L.push('## 文件之間要一致',String(R.cross||'').trim(),'');}
 L.push('## '+(mode==='first'?'首次動撥':'第 2～5 次動撥')+'的規則',String(R[mode]||'').trim(),'');
 if(stage!=='first')L.push('這次是'+stageLabel(stage)+'。','');
 if(String(R.extra||'').trim())L.push('## 審查人員補充',String(R.extra).trim(),'');
 L.push('## 應備文件與審查重點','每一份文件都有代號，寫結果時請用這個代號。');
 itemIds(stage).filter(id=>notesItem(id,stage)).forEach(id=>{
  const d=CONTENT.items[id];L.push('','### '+id+'｜'+d.name.replace(/^★/,''),'- 收件方式：'+(d.method||'—'));
  const cr=(d.criteria||[]).map(c=>c.text.replace('（依下方申請日期自動判斷）','（以審查日判斷）'));
  if(cr.length){L.push('- 要符合：');cr.forEach(x=>L.push('  - '+x));}
  if(d.commonIssues&&d.commonIssues.length){L.push('- 常見問題：');d.commonIssues.forEach(x=>L.push('  - '+x));}
 });
 L.push('','## 結果檔格式','全部讀完後，請在同一個資料夾建立「AI審查結果.json」（UTF-8），內容照下面的格式，欄位名稱不要改：','','```json');
 L.push(JSON.stringify({type:'ai-review-result',stage,notesVersion:R.version,files:['你讀到的檔名'],findings:[{code:ex[0],document:ex[1],location:'第 5 列「借錢時間」',finding:'借款時間沒有由遠到近：113/05 排在 112/10 前面',basis:ex[1]+'：借款時間依先後順序排列',level:'需修改',suggestion:'依借款時間由遠到近重新排列'}]},null,2));
 L.push('```','','- code：用上面「應備文件」的代號'+(mode==='first'?'；計畫書基本資料用 basic，文件之間對不上用 cross':'')+'；其他整體問題用 general','- level：只能寫「需修改」「請核對」「提醒」','- 缺少文件時：code 寫那份文件的代號，finding 寫「找不到這份文件」，level 寫「需修改」','- 存好檔案後，用 5 行以內告訴審查人員最重要的幾件事');
 return L.join('\n')+'\n';
}
function mdLite(md){
 const out=[];let inCode=false,code=[],list=[];
 const flushList=()=>{if(list.length){out.push('<ul>'+list.map(([lv,t])=>'<li'+(lv?' class="sub"':'')+'>'+esc(t)+'</li>').join('')+'</ul>');list=[];}};
 String(md).split('\n').forEach(line=>{
  if(line.startsWith('```')){if(inCode){out.push('<pre>'+esc(code.join('\n'))+'</pre>');code=[];inCode=false;}else{flushList();inCode=true;}return;}
  if(inCode){code.push(line);return;}
  const m=line.match(/^(\s*)- (.*)$/);if(m){list.push([m[1].length>0,m[2]]);return;}
  flushList();
  if(line.startsWith('### '))out.push('<h4>'+esc(line.slice(4))+'</h4>');
  else if(line.startsWith('## '))out.push('<h3>'+esc(line.slice(3))+'</h3>');
  else if(line.startsWith('# '))out.push('<h2>'+esc(line.slice(2))+'</h2>');
  else if(line.trim())out.push('<p>'+esc(line)+'</p>');
 });
 flushList();if(inCode)out.push('<pre>'+esc(code.join('\n'))+'</pre>');
 return out.join('');
}

/* ---------- 讀取 AI 結果 ---------- */
const KEYMAP={code:['code','文件代號','代號','itemId'],doc:['document','doc','文件','文件名稱'],where:['location','where','位置'],text:['finding','text','issue','problem','發現','問題','內容'],basis:['basis','rule','依據'],level:['level','severity','等級'],suggest:['suggestion','suggest','建議','修改建議']};
function pickKey(o,keys){for(const k of keys)if(o[k]!=null&&String(o[k]).trim()!=='')return String(o[k]).trim();return '';}
function levelOf(v){v=String(v||'');if(/需修改|必須|錯誤|不符|fix|error|must/i.test(v))return 'fix';if(/提醒|建議|hint|info|suggest|minor/i.test(v))return 'hint';return 'check';}
function mapItem(code,doc,stage){
 const ids=itemIds(stage);
 if(code&&ids.includes(code))return code;
 if(/^basic$/i.test(code))return stage==='first'?'ref-21':'';
 if(/^(cross|general)$/i.test(code))return '';
 const name=String(doc||code||'').replace(/[★\s]/g,'');if(!name)return '';
 const hit=ids.find(id=>{const n=CONTENT.items[id].name.replace(/[★\s]/g,'').replace(/^信扶專案(創業計畫書附件-)?/,'').replace(/[（(].*$/,'');return n.length>1&&(name.includes(n)||n.includes(name));});
 if(hit)return hit;
 const F=stage==='first';
 const KW=[[/債務/,F?'ref-23':'later-debt'],[/營運結構|結構表/,F?'ref-25':'later-structure'],[/財務預估|預估分析/,'ref-26'],[/未來三個月|未來營運/,F?'ref-26':'later-future'],[/設備|資金需求/,'ref-27'],[/估價/,F?'ref-28':'later-quote'],[/計畫書|企劃書|基本資料/,'ref-21'],[/帳務|日誌|收支彙整|累積總表/,F?'ref-22':'later-journal'],[/戶籍|謄本/,'ref-30'],[/身分證/,'ref-31'],[/福利/,'ref-29'],[/推薦表/,F?'ref-32':'later-recommend'],[/聯徵|信用資料|查詢同意/,'ref-33'],[/申請表/,'later-apply'],[/使用狀況|前期動撥/,'later-usage'],[/發票/,'later-invoice'],[/營業登記/,'later-registration'],[/清冊/,'ref-24'],[/同意書/,'ref-15'],[/約定書|儲蓄/,'ref-18']];
 for(const [re,id] of KW)if(re.test(name)&&ids.includes(id))return id;
 return '';
}
function parseMdTable(t){
 const rows=String(t).split('\n').map(l=>l.trim()).filter(l=>l.startsWith('|')&&l.endsWith('|')).map(l=>l.slice(1,-1).split('|').map(c=>c.trim()));
 if(rows.length<2)return [];
 const head=rows[0];const body=rows.slice(1).filter(r=>!r.every(c=>/^:?-{2,}:?$/.test(c)));
 return body.map(r=>{const o={};head.forEach((h,i)=>{o[h]=r[i]||'';});return o;});
}
function aiToFindings(data,stage){
 const arr=Array.isArray(data)?data:Array.isArray(data.findings)?data.findings:Array.isArray(data['發現'])?data['發現']:[];
 return arr.slice(0,500).map(o=>{
  if(!o||typeof o!=='object')return null;
  const code=pickKey(o,KEYMAP.code),doc=pickKey(o,KEYMAP.doc),text=pickKey(o,KEYMAP.text);if(!text)return null;
  const itemId=mapItem(code,doc,stage);
  return normFinding({id:uid(),itemId,doc:doc||(itemId?CONTENT.items[itemId].name.replace(/^★/,''):/^basic$/i.test(code)?'基本資料':/^cross$/i.test(code)?'文件之間':'整體'),where:pickKey(o,KEYMAP.where),text,basis:pickKey(o,KEYMAP.basis),suggest:pickKey(o,KEYMAP.suggest),level:levelOf(pickKey(o,KEYMAP.level)),origin:'ai',decision:'pending',status:'open',upd:nowStamp()});
 }).filter(Boolean);
}
const KIND_MSG={issues:'這是審查人員給引導員的「需修改清單」，要在引導員版匯入。',reply:'這是引導員的「修改回覆」檔，請在第 4 步「確認修改」匯入。',ai:'這是 AI 審查結果，請在第 2 步「確認 AI 結果」匯入。',backup:'這是備份檔，請按「還原」匯入。',unknown:'看不懂這個檔案的內容。'};
function rvImportAI(r,text){
 const p=parseExchangeText(text);
 if(p.kind!=='ai'){alert(KIND_MSG[p.kind]+(p.kind==='unknown'?'請選擇 AI 產生的「AI審查結果.json」，或貼上 AI 依格式回覆的內容。':''));return false;}
 const fs=aiToFindings(p.data,r.stage);
 if(!fs.length){alert('沒有讀到任何發現。請確認 AI 有照注意事項最後的「結果檔格式」輸出。');return false;}
 snapshot('匯入 AI 結果');
 const k=f=>f.itemId+'|'+f.where+'|'+f.text,have=new Set(r.findings.map(k));let n=0;
 fs.forEach(f=>{if(!have.has(k(f))){r.findings.push(f);have.add(k(f));n++;}});
 r.aiAt=nowStamp();r.updated=nowStamp();if(p.data&&p.data.notesVersion)r.notesVer=String(p.data.notesVersion).slice(0,20);
 ui.rvStep[r.id]=2;ui.fFilter='pending';
 done('匯入 AI 結果','讀到 '+n+' 項發現'+(fs.length>n?'（'+(fs.length-n)+' 項重複，已略過）':'')+'，請逐項決定要不要採用');
 return true;
}
function issuesFile(r){
 const acc=rvAccepted(r);
 return {type:'startup-loan-review-issues',v:1,rid:r.id,caseName:r.caseName,stage:r.stage,sentAt:nowStamp(),notesVer:CONTENT.review.version,items:acc.map(f=>({id:f.id,itemId:f.itemId,doc:f.doc,text:f.text,where:f.where,suggest:f.suggest,level:f.level,kind:/找不到這份文件|缺少這份|缺件/.test(f.text)?'missing':'fix',status:f.status,rnote:f.rnote,upd:f.upd||nowStamp()}))};
}
function issuesText(r){
 const acc=rvAccepted(r).filter(f=>f.status!=='done'),cnt=k=>acc.filter(f=>f.level===k).length;
 const L=['【需修改清單】'+r.caseName+'｜'+stageLabel(r.stage)+'｜'+fmt(todayISO()),'共 '+acc.length+' 項（需修改 '+cnt('fix')+'、請核對 '+cnt('check')+'、提醒 '+cnt('hint')+'）',''];
 acc.forEach((f,i)=>{L.push((i+1)+'. 〔'+LEVELS[f.level]+'〕'+f.doc+(f.where?'（'+f.where+'）':''));L.push('   '+f.text);if(f.suggest)L.push('   建議：'+f.suggest);if(f.status==='open'&&f.rnote)L.push('   審查人員補充：'+f.rnote);});
 L.push('','請修改後在「創業貸款準備助手」標記已修改，並回傳修改進度。');
 return L.join('\n');
}
function rvImportReply(text){
 const p=parseExchangeText(text);
 if(p.kind!=='reply'){alert(KIND_MSG[p.kind]+(p.kind==='unknown'?'請選擇引導員回傳的「修改回覆」檔案。':''));return;}
 const items=Array.isArray(p.data.items)?p.data.items:[];
 snapshot('匯入修改回覆');
 let changed=0;const touched=new Set();
 items.slice(0,2000).forEach(x=>{
  if(!x||typeof x!=='object'||typeof x.id!=='string')return;
  const r=state.reviews.find(v=>v.id===x.rid&&v.findings.some(f=>f.id===x.id))||state.reviews.find(v=>v.findings.some(f=>f.id===x.id));if(!r)return;
  const f=r.findings.find(y=>y.id===x.id);if(!f||f.decision!=='accept')return;touched.add(r.id);
  const upd=isStamp(x.upd)?x.upd:'';
  if(['open','fixed'].includes(x.status)&&(!f.upd||(upd&&upd>f.upd))&&f.status!=='done'){if(f.status!==x.status){f.status=x.status;changed++;}f.upd=upd||f.upd;}
  if(typeof x.gnote==='string')f.gnote=x.gnote.slice(0,1000);
 });
 if(!touched.size){undoStack.pop();alert('找不到這份回覆對應的審查案件。請確認是這個案子的修改回覆，而且已經在這台電腦傳回過需修改清單。');return;}
 touched.forEach(id=>{const r=rvGet(id);r.replyAt=nowStamp();r.updated=nowStamp();ui.rvStep[id]=4;});
 const r0=rvGet([...touched][0]),acc=rvAccepted(r0);
 done('匯入修改回覆','已更新 '+changed+' 項；待確認 '+acc.filter(f=>f.status==='fixed').length+' 項、仍待修改 '+acc.filter(f=>f.status==='open').length+' 項');
}

/* ---------- 頁面：審查案件清單 ---------- */
function rvRing(r,size=64){
 const acc=rvAccepted(r),doneN=acc.filter(f=>f.status==='done').length,fixed=acc.filter(f=>f.status==='fixed').length;
 return '<div class="minidonut">'+ring([{v:doneN,cls:'k-done'},{v:fixed,cls:'k-verify'}],acc.length||1,size,7)+'<span class="tnum">'+(acc.length?doneN+'/'+acc.length:'—')+'</span></div>';
}
function pageRvList(){
 const list=state.reviews.slice().sort((a,b)=>(b.updated||b.created).localeCompare(a.updated||a.created));
 let h='<div class="pagehead"><div><p class="kicker">審查人員版</p><h1 tabindex="-1">審查案件</h1></div><div class="actions">'+(list.length?'<button type="button" class="small" data-act="rvBatch" aria-pressed="'+ui.rvBatch+'">'+(ui.rvBatch?'結束批次管理':'批次管理')+'</button>':'')+'<button type="button" class="primary" data-act="rvNew">'+ico('plus')+'新增審查案件</button></div></div>';
 if(loadIssue==='corrupt')h+='<div class="notice bad"><p>原本保存的審查資料無法讀取，為避免覆蓋，暫停自動保存。請按「還原」，或按頁尾「清除此機進度」重新開始。</p></div>';
 if(!list.length)return h+'<section class="card empty-hero">'+ico('folder','big')+'<h2>還沒有審查案件</h2><p>每個案子開一張審查卡，照四個步驟走：準備 AI 初審、確認 AI 結果、傳回引導員、確認修改。</p><button type="button" class="primary" data-act="rvNew">'+ico('plus')+'新增第一個審查案件</button></section>';
 if(ui.rvBatch){const n=[...ui.rvSel].filter(id=>list.some(r=>r.id===id)).length;h+='<div class="batchbar" role="region" aria-label="批次操作"><strong>已選 '+n+' 件</strong><button type="button" class="small" data-act="rvSelAll">全選 '+list.length+' 件</button><button type="button" class="small" data-act="rvSelNone">取消選取</button><button type="button" class="small danger" data-act="rvBatchDel"'+(n?'':' disabled')+'>刪除選取的 '+n+' 件</button></div>';}
 h+='<ul class="rvgrid">'+list.map(r=>{const ph=rvPhase(r);return '<li class="rvcard ph-'+ph.key+'">'+(ui.rvBatch?'<input type="checkbox" class="rvsel" data-act="rvSel" data-id="'+esc(r.id)+'" data-fk="rvsel:'+esc(r.id)+'" aria-label="選取：'+esc(r.caseName)+'"'+(ui.rvSel.has(r.id)?' checked':'')+'>':'')+'<a href="#/rv/'+esc(r.id)+'"><div class="rvc-top"><span class="stagechip">'+esc(stageLabel(r.stage))+'</span>'+rvRing(r)+'</div><h2>'+esc(r.caseName||'未命名')+'</h2><p class="rvc-phase"><span class="phdot"></span>'+esc(ph.label)+'</p><p class="rvc-meta">'+(r.updated?'更新 '+fmt(r.updated.slice(0,10)):'建立 '+fmt(r.created))+'</p></a></li>';}).join('')+'</ul>';
 return h;
}

/* ---------- 頁面：單一審查案件 ---------- */
function stepperHtml(r,cur,sel){
 return '<ol class="rvsteps">'+RV_STEPS.map(([t,ic],i)=>{const n=i+1,doneStep=n<cur||(rvPhase(r).key==='done'&&n<=4);return '<li class="'+(doneStep?'done':'')+(n===cur?' current':'')+'"><button type="button" data-act="rvStep" data-id="'+esc(r.id)+'" data-n="'+n+'" aria-pressed="'+(n===sel)+'"><span class="dot">'+(doneStep?ico('check'):ico(ic))+'</span><span class="st"><small>第 '+n+' 步</small>'+t+'</span></button></li>';}).join('')+'</ol>';
}
function pageRvCase(id){
 const r=rvGet(id);
 if(!r)return '<h1 tabindex="-1">找不到這個審查案件</h1><p><a href="#/rv">回到審查案件</a></p>';
 const ph=rvPhase(r),cur=ph.step,sel=ui.rvStep[id]||cur;
 let h='<nav class="crumbs" aria-label="位置"><a href="#/rv">'+ico('back')+'審查案件</a></nav>';
 h+='<div class="pagehead"><div><p class="kicker">'+esc(stageLabel(r.stage))+'</p><h1 tabindex="-1">'+esc(r.caseName||'未命名')+'</h1></div><div class="actions"><button type="button" class="small" data-act="rvEdit" data-id="'+esc(r.id)+'">'+ico('edit')+'修改名稱或階段</button><button type="button" class="small quiet danger" data-act="rvDel" data-id="'+esc(r.id)+'">刪除這個案件</button></div></div>';
 h+=stepperHtml(r,cur,sel);
 h+='<div class="rvpanel">'+[rvStep1,rvStep2,rvStep3,rvStep4][sel-1](r)+'</div>';
 return h;
}
function rvStep1(r){
 const fn=notesFileName(r.stage);
 let h='<section class="card step"><h2>讓 AI 先看一遍</h2><p class="muted">AI 只幫你找可能的問題；採用與否由你決定。</p><ol class="howto">';
 h+='<li><span class="hnum">1</span>'+ico('folder','hico')+'<div><h3>建一個資料夾</h3><p>把這個案子要審查的文件（計畫書、附件、證明文件）放進去。只放這個案子的文件。</p></div></li>';
 h+='<li><span class="hnum">2</span>'+ico('notes','hico')+'<div><h3>放入審核注意事項</h3><p>下載「'+esc(fn)+'」，放進同一個資料夾。</p><button type="button" class="primary" data-act="notesDl" data-stage="'+r.stage+'">'+ico('download')+'下載注意事項</button></div></li>';
 h+='<li><span class="hnum">3</span>'+ico('chat','hico')+'<div><h3>請 AI 開始審查</h3><p>用 Claude Code 或 Codex 打開這個資料夾，貼上這句話：</p><blockquote class="sentence" id="sentence">'+esc(aiSentence(r.stage))+'</blockquote><button type="button" data-act="sentenceCopy" data-stage="'+r.stage+'">'+ico('copy')+'複製這句話</button></div></li>';
 h+='</ol>';
 h+='<details class="disclose"><summary>用網頁版 AI 嗎？</summary><p>按「複製完整注意事項」，貼給 AI，再把這個案子的文件一起上傳。AI 回覆後，把回覆內容貼到第 2 步。</p><button type="button" class="small" data-act="notesCopy" data-stage="'+r.stage+'">'+ico('copy')+'複製完整注意事項</button></details>';
 h+='<p class="privacy">'+ico('shield')+'<span>AI 服務會讀到資料夾裡的文件。請用公司規定的帳號；AI 的結果不要寫出完整身分證字號、電話、地址。</span></p>';
 h+='<div class="stepfoot"><button type="button" class="primary" data-act="rvStep" data-id="'+esc(r.id)+'" data-n="2">AI 審查好了，下一步</button></div></section>';
 return h;
}
function findingCard(r,f){
 const open=ui.fOpen.has(f.id),def=f.itemId?CONTENT.items[f.itemId]:null;
 const dec=f.decision==='accept'?'<span class="decided ok">'+ico('check')+'已採用</span>':f.decision==='reject'?'<span class="decided no">'+ico('x')+'不採用</span>':'';
 let h='<li class="fcard lv-'+f.level+' dc-'+f.decision+(open?' open':'')+'">';
 if(ui.fBatch)h+='<input type="checkbox" class="fsel" data-act="fSel" data-id="'+esc(f.id)+'" data-fk="fsel:'+esc(f.id)+'" aria-label="選取：'+esc(short(f.text,30))+'"'+(ui.fSel.has(f.id)?' checked':'')+'>';
 h+='<div class="fmain"><div class="fhead"><span class="lvbadge">'+LEVELS[f.level]+'</span>'+(f.where?'<span class="fdoc">'+esc(f.where)+'</span>':'')+(f.origin==='manual'?'<span class="fdoc">自己新增</span>':'')+dec+'</div><p class="ftext">'+esc(f.text)+'</p>';
 h+='<button type="button" class="linkbtn fmore" data-act="fOpen" data-id="'+esc(f.id)+'" aria-expanded="'+open+'">'+(open?'收起':'看位置、依據與建議')+'</button>';
 if(open){
  h+='<div class="fdetail"><dl><dt>位置</dt><dd>'+esc(f.where||'—')+'</dd><dt>依據</dt><dd>'+esc(f.basis||'—')+'</dd></dl>';
  h+='<label class="field">內容（傳給引導員的文字）<textarea rows="2" data-bind="fEdit" data-f="text" data-r="'+esc(r.id)+'" data-id="'+esc(f.id)+'">'+esc(f.text)+'</textarea></label>';
  h+='<label class="field">建議怎麼改<input data-bind="fEdit" data-f="suggest" data-r="'+esc(r.id)+'" data-id="'+esc(f.id)+'" value="'+esc(f.suggest)+'"></label>';
  h+='<div class="fieldrow"><label class="field">等級<select data-act="fLevel" data-r="'+esc(r.id)+'" data-id="'+esc(f.id)+'">'+Object.entries(LEVELS).map(([k,v])=>'<option value="'+k+'"'+(f.level===k?' selected':'')+'>'+v+'</option>').join('')+'</select></label><label class="field">對應文件<select data-act="fItem" data-r="'+esc(r.id)+'" data-id="'+esc(f.id)+'"><option value="">整體／文件之間</option>'+itemIds(r.stage).filter(i=>CONTENT.items[i].kind!=='operation').map(i=>'<option value="'+i+'"'+(f.itemId===i?' selected':'')+'>'+esc(short(CONTENT.items[i].name.replace(/^★/,''),26))+'</option>').join('')+'</select></label></div>';
  h+='<button type="button" class="small quiet danger" data-act="fDel" data-r="'+esc(r.id)+'" data-id="'+esc(f.id)+'">刪除這一項</button></div>';
 }
 h+='</div>';
 if(!ui.fBatch)h+='<div class="fdecide" role="group" aria-label="要不要採用"><button type="button" class="yes" data-act="fDecide" data-v="accept" data-r="'+esc(r.id)+'" data-id="'+esc(f.id)+'" aria-pressed="'+(f.decision==='accept')+'" data-fk="fd:'+esc(f.id)+':a">'+ico('check')+'採用</button><button type="button" class="no" data-act="fDecide" data-v="reject" data-r="'+esc(r.id)+'" data-id="'+esc(f.id)+'" aria-pressed="'+(f.decision==='reject')+'" data-fk="fd:'+esc(f.id)+':r">'+ico('x')+'不採用</button></div>';
 return h+'</li>';
}
function shownFindings(r){const f=ui.fFilter;return r.findings.filter(x=>f==='all'||(f==='pending'&&x.decision==='pending')||(f==='accept'&&x.decision==='accept')||(f==='reject'&&x.decision==='reject'));}
function rvStep2(r){
 const all=r.findings;
 let h='<section class="card step">';
 if(!all.length){
  h+='<h2>匯入 AI 的結果</h2><label class="dropzone" data-drop="ai" data-id="'+esc(r.id)+'">'+ico('upload','big')+'<strong>把「AI審查結果.json」拖進來</strong><span>或按這裡選擇檔案</span><input type="file" accept=".json,.txt,.md,application/json,text/plain" data-act="aiFile" data-id="'+esc(r.id)+'"></label>';
  h+='<details class="disclose"><summary>用網頁版 AI？貼上 AI 的回覆</summary><textarea class="pastebox" data-bind="aiPaste" aria-label="貼上 AI 的回覆" placeholder="把 AI 依「結果檔格式」回覆的內容整段貼在這裡">'+esc(ui.aiPaste||'')+'</textarea><button type="button" data-act="aiPasteGo" data-id="'+esc(r.id)+'">讀取貼上的內容</button></details>';
  h+='<p class="muted small-text">也可以不用 AI，直接<button type="button" class="linkbtn" data-act="fAdd" data-id="'+esc(r.id)+'">自己新增一項</button>。</p></section>';
  return h;
 }
 const cnt=k=>all.filter(f=>f.decision===k).length,lv=k=>all.filter(f=>f.level===k).length;
 h+='<div class="cardhead"><h2>確認 AI 找到的問題</h2><div class="actions"><button type="button" class="small" data-act="fBatch" aria-pressed="'+ui.fBatch+'">'+(ui.fBatch?'結束批次':'批次處理')+'</button><button type="button" class="small" data-act="fAdd" data-id="'+esc(r.id)+'">'+ico('plus')+'自己新增</button><label class="small filebtn">'+ico('upload')+'再匯入一次<input type="file" accept=".json,.txt,.md,application/json,text/plain" data-act="aiFile" data-id="'+esc(r.id)+'"></label></div></div>';
 h+='<div class="tally"><span class="tl lv-fix"><b class="tnum">'+lv('fix')+'</b>需修改</span><span class="tl lv-check"><b class="tnum">'+lv('check')+'</b>請核對</span><span class="tl lv-hint"><b class="tnum">'+lv('hint')+'</b>提醒</span><span class="tl decided-n"><b class="tnum">'+(all.length-cnt('pending'))+'/'+all.length+'</b>已決定</span></div>';
 h+='<div class="seg" role="group" aria-label="篩選">'+[['pending','待決定'],['accept','已採用'],['reject','不採用'],['all','全部']].map(([k,l])=>'<button type="button" data-act="fFilter" data-f="'+k+'" aria-pressed="'+(ui.fFilter===k)+'">'+l+' '+(k==='all'?all.length:cnt(k))+'</button>').join('')+'</div>';
 const shown=shownFindings(r);
 if(ui.fBatch){const n=[...ui.fSel].filter(id=>shown.some(f=>f.id===id)).length;h+='<div class="batchbar" role="region" aria-label="批次操作"><strong>已選 '+n+' 項</strong><button type="button" class="small" data-act="fSelAll" data-id="'+esc(r.id)+'">全選目前顯示的 '+shown.length+' 項</button><button type="button" class="small" data-act="fSelNone">取消選取</button><button type="button" class="small" data-act="fBatchSet" data-v="accept" data-id="'+esc(r.id)+'"'+(n?'':' disabled')+'>採用</button><button type="button" class="small" data-act="fBatchSet" data-v="reject" data-id="'+esc(r.id)+'"'+(n?'':' disabled')+'>不採用</button><button type="button" class="small danger" data-act="fBatchDel" data-id="'+esc(r.id)+'"'+(n?'':' disabled')+'>刪除選取的 '+n+' 項</button></div>';}
 else if(cnt('pending')&&all.some(f=>f.decision==='pending'&&f.level==='fix'))h+='<p class="quickbar"><button type="button" class="small" data-act="fAcceptFix" data-id="'+esc(r.id)+'">'+ico('check')+'「需修改」的全部採用</button></p>';
 if(!shown.length)h+='<p class="empty">'+(ui.fFilter==='pending'?'都決定好了。':'這個篩選條件下沒有項目。')+'</p>';
 else{
  const groups=[];shown.forEach(f=>{const k=f.itemId||'_'+(f.doc||'整體');let g=groups.find(x=>x.k===k);if(!g){g={k,title:f.itemId?CONTENT.items[f.itemId].name.replace(/^★/,''):(f.doc||'整體'),list:[]};groups.push(g);}g.list.push(f);});
  h+=groups.map(g=>'<div class="fgroup"><h3>'+esc(g.title)+'<span class="sub">'+g.list.length+' 項</span></h3><ul class="flist">'+g.list.map(f=>findingCard(r,f)).join('')+'</ul></div>').join('');
 }
 if(!cnt('pending'))h+='<div class="stepfoot"><button type="button" class="primary" data-act="rvStep" data-id="'+esc(r.id)+'" data-n="3">'+(rvAccepted(r).length?'下一步：傳回引導員':'沒有要傳回的問題')+'</button></div>';
 return h+'</section>';
}
function rvStep3(r){
 const acc=rvAccepted(r),lv=k=>acc.filter(f=>f.level===k).length;
 let h='<section class="card step"><h2>把需修改清單傳回引導員</h2>';
 if(!acc.length)return h+'<p class="empty">還沒有採用任何一項。回到第 2 步決定要傳回哪些問題。</p></section>';
 h+='<div class="sendsum"><div class="big tnum">'+acc.length+'</div><div><p><strong>要傳回 '+acc.length+' 項</strong></p><p class="muted">需修改 '+lv('fix')+'、請核對 '+lv('check')+'、提醒 '+lv('hint')+'</p></div></div>';
 h+='<div class="sendopts"><div class="sendopt">'+ico('file','hico')+'<div><h3>傳檔案（建議）</h3><p>引導員在「需修改事項」按「匯入需修改清單」，每一項會直接出現在對應的資料上。</p><button type="button" class="primary" data-act="sendDl" data-id="'+esc(r.id)+'">'+ico('download')+'下載需修改清單</button></div></div>';
 h+='<div class="sendopt">'+ico('chat','hico')+'<div><h3>貼文字</h3><p>貼到 InfoCenter 審查事件的評論，或公司規定的聯絡方式。</p><button type="button" data-act="sendCopy" data-id="'+esc(r.id)+'">'+ico('copy')+'複製文字版</button></div></div></div>';
 h+='<p class="privacy">'+ico('shield')+'<span>清單裡有個案名稱。建議上傳到審查事件，不要在多人的 LINE 群組傳。</span></p>';
 h+='<details class="disclose"><summary>看要傳回的內容</summary><ol class="sendlist">'+acc.map(f=>'<li><span class="lvbadge sm lv-'+f.level+'">'+LEVELS[f.level]+'</span> <strong>'+esc(f.doc)+'</strong>'+(f.where?'（'+esc(f.where)+'）':'')+'：'+esc(f.text)+'</li>').join('')+'</ol></details>';
 if(r.sentAt)h+='<p class="okline">'+ico('check')+'已在 '+fmt(r.sentAt.slice(0,10))+' 傳回。引導員改好回傳後，到第 4 步匯入。</p><div class="stepfoot"><button type="button" class="primary" data-act="rvStep" data-id="'+esc(r.id)+'" data-n="4">下一步：確認修改</button></div>';
 return h+'</section>';
}
function rvStep4(r){
 const acc=rvAccepted(r),doneN=acc.filter(f=>f.status==='done').length,fixed=acc.filter(f=>f.status==='fixed').length,open=acc.length-doneN-fixed;
 let h='<section class="card step"><div class="cardhead"><h2>確認引導員的修改</h2><label class="small filebtn primary-lite">'+ico('upload')+'匯入修改回覆<input type="file" accept=".json,application/json" data-act="replyFile" data-id="'+esc(r.id)+'"></label></div>';
 if(!acc.length)return h+'<p class="empty">這個案子沒有傳回任何需修改的問題。</p></section>';
 const all=acc.length&&doneN===acc.length;
 h+='<div class="confirmhero">'+'<div class="donut sm">'+ring([{v:doneN,cls:'k-done'},{v:fixed,cls:'k-verify'}],acc.length,120,12)+'<div class="donut-c"><b class="tnum">'+doneN+'<span>/'+acc.length+'</span></b><small>已確認</small></div></div><div><p><strong>'+(all?'全部確認完成':fixed?'有 '+fixed+' 項等你確認':'等引導員修改')+'</strong></p><p class="muted">已修改待確認 '+fixed+'、仍待修改 '+open+'、已確認 '+doneN+'</p>'+(fixed>1?'<button type="button" class="small" data-act="fConfirmAll" data-id="'+esc(r.id)+'">'+ico('check')+'已修改的全部確認</button>':'')+'</div>'+(all?'<div class="sealdone" aria-hidden="true">審查<br>完成</div>':'')+'</div>';
 h+='<ul class="clist">'+acc.map(f=>'<li class="st-'+f.status+'"><span class="pill '+(f.status==='open'?'s-fix':f.status==='fixed'?'s-verify':'s-done')+'">'+(f.status==='open'?'待修改':f.status==='fixed'?'已修改':'已確認')+'</span><div><p class="ftext"><strong>'+esc(f.doc)+'</strong>'+(f.where?'（'+esc(f.where)+'）':'')+'：'+esc(f.text)+'</p>'+(f.gnote?'<p class="gnote">'+ico('chat')+'引導員：'+esc(f.gnote)+'</p>':'')+(f.status==='open'&&f.rnote?'<p class="rnote">你的補充：'+esc(f.rnote)+'</p>':'')+(f.status==='fixed'?'<label class="field inline">退回時補充說明（選填）<input data-bind="fEdit" data-f="rnote" data-r="'+esc(r.id)+'" data-id="'+esc(f.id)+'" value="'+esc(f.rnote)+'"></label>':'')+'</div><div class="iacts">'+(f.status==='fixed'?'<button type="button" class="small primary" data-act="fStatus" data-v="done" data-r="'+esc(r.id)+'" data-id="'+esc(f.id)+'">確認</button><button type="button" class="small" data-act="fStatus" data-v="open" data-r="'+esc(r.id)+'" data-id="'+esc(f.id)+'">退回</button>':f.status==='done'?'<button type="button" class="small quiet" data-act="fStatus" data-v="fixed" data-r="'+esc(r.id)+'" data-id="'+esc(f.id)+'">取消確認</button>':'')+'</div></li>').join('')+'</ul>';
 if(acc.some(f=>f.status==='open'&&f.upd&&r.sentAt&&f.upd>r.sentAt))h+='<p class="hint">有退回的項目，記得<button type="button" class="linkbtn" data-act="sendDl" data-id="'+esc(r.id)+'">再下載一次需修改清單</button>傳給引導員。</p>';
 return h+'</section>';
}

/* ---------- 頁面：AI 審核注意事項 ---------- */
function pageNotes(){
 const st=STAGES.includes(ui.notesStage)?ui.notesStage:'first',R=CONTENT.review,md=notesMarkdown(st);
 const items=itemIds(st).filter(id=>notesItem(id,st)),pts=items.reduce((n,id)=>n+(CONTENT.items[id].commonIssues||[]).length,0);
 let h='<div class="pagehead"><div><p class="kicker">給 AI 讀的審查標準</p><h1 tabindex="-1">AI 審核注意事項</h1></div><div class="actions"><button type="button" data-act="notesCopy" data-stage="'+st+'">'+ico('copy')+'複製全文</button><button type="button" class="primary" data-act="notesDl" data-stage="'+st+'">'+ico('download')+'下載檔案</button></div></div>';
 h+='<div class="seg stagepick" role="group" aria-label="階段">'+STAGES.map(k=>'<button type="button" data-act="notesStage" data-s="'+k+'" aria-pressed="'+(k===st)+'">'+stageLabel(k)+'</button>').join('')+'</div>';
 h+='<div class="stats notes-stats"><div class="stat"><b class="tnum">'+esc(R.version)+'</b><span>版本'+(R.updated?'｜'+fmt(R.updated)+' 更新':'')+'</span></div><div class="stat"><b class="tnum">'+items.length+'</b><span>份應備文件</span></div><div class="stat"><b class="tnum">'+pts+'</b><span>條審查重點</span></div></div>';
 if(ui.notesSaved)h+='<div class="notice news">'+ico('check')+'<div><p><strong>已儲存為 '+esc(R.version)+' 版</strong>（只在這台電腦）。要讓大家都用新版，請匯出新檔案'+(WEB?'，交給負責網站的同仁換上':'分享')+'。</p><div class="actions"><button type="button" class="small" data-act="maintExport" data-ed="guide">匯出引導員版</button><button type="button" class="small primary" data-act="maintExport" data-ed="reviewer">匯出審查人員版</button></div></div></div>';
 if(ui.notesEdit){
  const D0=ui.notesDraft;
  h+='<section class="card editor"><h2>優化注意事項</h2><p class="hint">每一行是一條規則；「- 」開頭是條列。各份文件的審查重點，請到「文件與審查重點」裡的各項目修改。</p>';
  [['role','你要做的事（AI 的角色與寫結果的規則）',8],['basic','計畫書的基本資料（首次動撥）',5],['cross','文件之間要一致（首次動撥）',5],['first','首次動撥的規則',8],['later','第 2～5 次動撥的規則',8],['extra','審查人員補充（選填，各階段都會放）',3]].forEach(([k,l,rows])=>{h+='<label class="field">'+l+'<textarea rows="'+rows+'" data-bind="notesEd" data-f="'+k+'">'+esc(D0[k])+'</textarea></label>';});
  h+='<label class="field">這次改了什麼（會記在修改紀錄）<input data-bind="notesEd" data-f="note" maxlength="200" value="'+esc(D0.note)+'" placeholder="例如：補充估價單要有統一編號"></label>';
  h+='<div class="actions"><button type="button" class="primary" data-act="notesSave">儲存並更新版本</button><button type="button" data-act="notesCancel">取消</button></div></section>';
 }else h+='<div class="actions" style="margin:4px 0 18px"><button type="button" data-act="notesEdit">'+ico('edit')+'優化注意事項</button><a class="btn" href="#/catalog">'+ico('docs')+'修改各文件的審查重點</a></div>';
 h+='<section class="card notes-preview"><h2>'+esc(notesFileName(st))+'</h2><div class="mdview" tabindex="0" role="region" aria-label="注意事項全文">'+mdLite(md)+'</div></section>';
 if(R.log&&R.log.length)h+='<details class="card more"><summary><h2>修改紀錄<span class="sub">'+R.log.length+' 筆</span></h2>'+CHEV+'</summary><ul class="loglist">'+R.log.slice().reverse().map(x=>'<li><b class="tnum">'+esc(x.v)+'</b><span>'+fmt(x.date)+'</span><span>'+esc(x.note)+'</span></li>').join('')+'</ul></details>';
 return h;
}
function bumpVersion(v){const m=String(v||'1.0').match(/^(\d+)\.(\d+)$/);return m?m[1]+'.'+(Number(m[2])+1):'1.1';}

/* ---------- 頁面：文件與審查重點（預覽引導員看到的內容） ---------- */
function pageCatalog(){
 const st=ui.catStage==='later'?'later':'first',key=st==='first'?'first':'r3';
 let h='<div class="pagehead"><div><p class="kicker">引導員看到的清單</p><h1 tabindex="-1">文件與審查重點</h1></div><div class="actions"><button type="button" data-act="maint" aria-pressed="'+ui.maint+'">'+ico('edit')+(ui.maint?'結束修改':'修改內容')+'</button></div></div>';
 h+='<p class="intro">每一項的「審查重點」會同時出現在引導員的常見問題，也會放進 AI 審核注意事項。改完記得匯出新檔案分享。</p>';
 h+='<div class="seg" role="group" aria-label="階段"><button type="button" data-act="catStage" data-s="first" aria-pressed="'+(st==='first')+'">首次動撥</button><button type="button" data-act="catStage" data-s="later" aria-pressed="'+(st==='later')+'">第 2～5 次動撥</button></div>';
 CONTENT.modes[st].groups.forEach(g=>{
  h+='<section class="group"><div class="grouphead"><h2>'+esc(g.title)+'</h2></div><ul class="catlist">'+g.items.filter(id=>CONTENT.items[id]).map(id=>{const d=CONTENT.items[id],n=(d.commonIssues||[]).length,ch=!!overrides.items[id];return '<li><a href="#/item/'+id+'"><span class="cname">'+esc(d.name.replace(/^★/,''))+'<small>'+esc(d.method||'—')+(d.rounds?'｜只有第 '+d.rounds.join('、')+' 次':'')+'</small></span><span class="cmeta">'+(ch?'<span class="pill s-verify">已修改</span>':'')+'<span class="ptchip">'+(n?n+' 條審查重點':'沒有審查重點')+'</span></span>'+CHEV+'</a></li>';}).join('')+'</ul></section>';
 });
 return h;
}

/* ---------- 開通（第一次使用） ---------- */
const hex2buf=h=>new Uint8Array(String(h).match(/.{2}/g).map(x=>parseInt(x,16)));
const buf2hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
const normCode=s=>String(s||'').replace(/\s+/g,'').toUpperCase();
async function codeHash(code,saltHex,iter){
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(normCode(code)),'PBKDF2',false,['deriveBits']);
 return buf2hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:hex2buf(saltHex),iterations:iter,hash:'SHA-256'},k,256));
}
const gateTry={n:0,until:0};
function pageGate(){
 const g=CONTENT.gate,can=typeof crypto!=='undefined'&&crypto.subtle;
 let h='<section class="gate"><div class="gate-card"><span class="seal big" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17.5"/><circle cx="20" cy="20" r="13.5"/><path d="M14 20.5l4 4 8-9"/></svg></span><p class="kicker">信扶專案｜審查人員版</p><h1 tabindex="-1">開通這台電腦</h1>';
 if(!g||!g.hash)return h+'<p>這個檔案沒有設定通行碼，無法開通。請向管理者索取正式的審查人員版檔案。</p></div></section>';
 if(!can)return h+'<p>這個瀏覽器無法驗證通行碼。請用 Chrome 或 Edge 打開'+(WEB?'這個網址':'這個檔案')+'。</p></div></section>';
 h+='<p class="muted">第一次在這台電腦使用，請輸入管理者給的審查通行碼。開通後，這台電腦的這個瀏覽器就能直接使用，不用每次輸入。</p>';
 h+='<form data-form="gate" class="gateform"><label class="field">審查通行碼<input name="code" type="password" autocomplete="off" required maxlength="64" id="gateCode" data-fk="gateCode"></label><p class="formerr" id="gateErr" role="alert">'+esc(ui.gateErr||'')+'</p><button class="primary wide" type="submit" id="gateBtn">開通</button></form>';
 h+='<p class="privacy">'+ico('shield')+'<span>審查資料只存在這台電腦。開通後，能使用這台電腦的人都看得到，請用自己的電腦帳號並設定螢幕鎖定。</span></p><p class="muted small-text">沒有通行碼？請洽管理者。'+(VIDEO_URL?'　<a href="'+VIDEO_URL+'" target="_blank" rel="noopener">看教學影片</a>':'')+'</p></div></section>';
 return h;
}
async function gateSubmit(form){
 const code=new FormData(form).get('code')||'',g=CONTENT.gate,err=$('gateErr'),btn=$('gateBtn');
 if(Date.now()<gateTry.until){err.textContent='嘗試太多次，請 '+Math.ceil((gateTry.until-Date.now())/1000)+' 秒後再試。';return;}
 btn.disabled=true;err.textContent='確認中…';
 let ok=false;try{ok=(await codeHash(code,g.salt,g.iter))===g.hash;}catch(e){ok=false;}
 btn.disabled=false;
 if(!ok){gateTry.n++;if(gateTry.n>=5){gateTry.until=Date.now()+30000;gateTry.n=0;}ui.gateErr='通行碼不對，請再確認一次（不分大小寫）。';err.textContent=ui.gateErr;const i=$('gateCode');if(i){i.value='';i.focus();}return;}
 try{localStorage.setItem(ACT_KEY,JSON.stringify({at:nowStamp()}));}catch(e){}
 activated=true;ui.gateErr='';ui.enter=true;render();toast('已開通這台電腦');
}
async function makeGate(code){
 const salt=crypto.getRandomValues(new Uint8Array(16)),iter=200000,sh=buf2hex(salt);
 return {v:2,salt:sh,iter,hash:await codeHash(code,sh,iter)};
}

/* ---------- 審查人員：動作 ---------- */
Object.assign(ACT,{
 rvNew(){const d=$('rvDialog'),f=d.querySelector('form');f.reset();f.elements.id.value='';$('rvDialogTitle').textContent='新增審查案件';f.querySelector('button[type=submit]').textContent='建立';d.showModal();f.elements.caseName.focus();},
 rvEdit(b){const r=rvGet(b.dataset.id);if(!r)return;const d=$('rvDialog'),f=d.querySelector('form');f.elements.caseName.value=r.caseName;f.elements.stage.value=r.stage;f.elements.id.value=r.id;$('rvDialogTitle').textContent='修改名稱或階段';f.querySelector('button[type=submit]').textContent='儲存';d.showModal();},
 rvDel(b){const r=rvGet(b.dataset.id);if(!r)return;snapshot('刪除審查案件');state.reviews=state.reviews.filter(x=>x!==r);location.hash='#/rv';done('','已刪除「'+short(r.caseName,16)+'」');},
 rvBatch(){ui.rvBatch=!ui.rvBatch;ui.rvSel.clear();render();},
 rvSelAll(){state.reviews.forEach(r=>ui.rvSel.add(r.id));render();},
 rvSelNone(){ui.rvSel.clear();render();},
 rvBatchDel(){const sel=state.reviews.filter(r=>ui.rvSel.has(r.id));if(!sel.length)return;const label='刪除 '+sel.length+' 件審查案件';snapshot(label);state.reviews=state.reviews.filter(r=>!ui.rvSel.has(r.id));ui.rvSel.clear();done(label,'已'+label);},
 rvStep(b){const n=Number(b.dataset.n);if(n>=1&&n<=4){ui.rvStep[b.dataset.id]=n;render();const p=document.querySelector('.rvpanel');if(p)p.scrollIntoView({block:'nearest'});}},
 notesDl(b){const st=b.dataset.stage||'first';download(notesMarkdown(st),notesFileName(st),'text/markdown;charset=utf-8');toast('已下載「'+notesFileName(st)+'」，放進案件資料夾');},
 async notesCopy(b){const st=b.dataset.stage||'first';$('summaryTitle').textContent='AI 審核注意事項';$('summaryHint').textContent='貼給網頁版 AI，再上傳這個案子的文件。';$('summaryText').value=notesMarkdown(st);$('summaryDialog').showModal();},
 async sentenceCopy(b){const t=aiSentence(b.dataset.stage||'first');const ok=await copyText(t);toast(ok?'已複製，貼給 Claude Code 或 Codex':'無法自動複製，請手動選取');},
 aiPasteGo(b){const r=rvGet(b.dataset.id);if(!r)return;if(!String(ui.aiPaste||'').trim()){toast('請先貼上 AI 的回覆');return;}if(rvImportAI(r,ui.aiPaste))ui.aiPaste='';},
 fOpen(b){const id=b.dataset.id;if(ui.fOpen.has(id))ui.fOpen.delete(id);else ui.fOpen.add(id);render();},
 fDecide(b){const r=rvGet(b.dataset.r),f=r&&r.findings.find(x=>x.id===b.dataset.id);if(!f)return;pinStep(r);f.decision=f.decision===b.dataset.v?'pending':b.dataset.v;r.updated=nowStamp();save();render();},
 fAcceptFix(b){const r=rvGet(b.dataset.id);if(!r)return;pinStep(r);const list=r.findings.filter(f=>f.decision==='pending'&&f.level==='fix');if(!list.length)return;snapshot('採用 '+list.length+' 項需修改');list.forEach(f=>{f.decision='accept';});r.updated=nowStamp();done('','已採用 '+list.length+' 項「需修改」');},
 fFilter(b){ui.fFilter=b.dataset.f;ui.fSel.clear();render();},
 fBatch(){ui.fBatch=!ui.fBatch;ui.fSel.clear();render();},
 fSelAll(b){const r=rvGet(b.dataset.id);if(!r)return;shownFindings(r).forEach(f=>ui.fSel.add(f.id));render();},
 fSelNone(){ui.fSel.clear();render();},
 fBatchSet(b){const r=rvGet(b.dataset.id);if(!r)return;pinStep(r);const sel=shownFindings(r).filter(f=>ui.fSel.has(f.id));if(!sel.length)return;const label=(b.dataset.v==='accept'?'採用 ':'不採用 ')+sel.length+' 項';snapshot(label);sel.forEach(f=>{f.decision=b.dataset.v;});ui.fSel.clear();r.updated=nowStamp();done(label,'已'+label);},
 fBatchDel(b){const r=rvGet(b.dataset.id);if(!r)return;pinStep(r);const sel=shownFindings(r).filter(f=>ui.fSel.has(f.id));if(!sel.length)return;const label='刪除 '+sel.length+' 項發現';snapshot(label);const ids=new Set(sel.map(f=>f.id));r.findings=r.findings.filter(f=>!ids.has(f.id));ui.fSel.clear();done(label,'已'+label);},
 fDel(b){const r=rvGet(b.dataset.r);if(!r)return;pinStep(r);const f=r.findings.find(x=>x.id===b.dataset.id);if(!f)return;snapshot('刪除 1 項發現');r.findings=r.findings.filter(x=>x!==f);done('','已刪除「'+short(f.text,18)+'」');},
 fAdd(b){const r=rvGet(b.dataset.id);if(!r)return;const f=normFinding({id:uid(),itemId:'',doc:'整體',text:'（請寫下要引導員修改的內容）',level:'fix',origin:'manual',decision:'accept',status:'open',upd:nowStamp()});r.findings.push(f);ui.fOpen.add(f.id);ui.rvStep[r.id]=2;ui.fFilter='all';r.updated=nowStamp();save();render();const ta=document.querySelector('textarea[data-id="'+CSS.escape(f.id)+'"][data-f=text]');if(ta){ta.focus();ta.select();}},
 sendDl(b){const r=rvGet(b.dataset.id);if(!r)return;pinStep(r);if(!rvAccepted(r).length){toast('還沒有採用任何一項');return;}download(JSON.stringify(issuesFile(r),null,1),'需修改清單_'+safeName(r.caseName)+'_'+stageShort(r.stage)+'_'+ymd()+'.json','application/json');r.sentAt=nowStamp();r.updated=nowStamp();save();render();toast('已下載需修改清單。請上傳到審查事件，或用公司規定的方式交給引導員。');},
 sendCopy(b){const r=rvGet(b.dataset.id);if(!r)return;pinStep(r);$('summaryTitle').textContent='需修改清單（文字版）';$('summaryHint').textContent='內容包含個案名稱，請確認傳送對象。';$('summaryText').value=issuesText(r);$('summaryDialog').showModal();if(!r.sentAt){r.sentAt=nowStamp();r.updated=nowStamp();save();}},
 fStatus(b){const r=rvGet(b.dataset.r),f=r&&r.findings.find(x=>x.id===b.dataset.id);if(!f)return;pinStep(r);f.status=b.dataset.v;f.upd=nowStamp();r.updated=nowStamp();save();render();toast(f.status==='done'?'已確認':f.status==='open'?'已退回，記得再傳一次需修改清單':'已改回待確認');},
 fConfirmAll(b){const r=rvGet(b.dataset.id);if(!r)return;pinStep(r);const list=rvAccepted(r).filter(f=>f.status==='fixed');if(!list.length)return;snapshot('確認 '+list.length+' 項');list.forEach(f=>{f.status='done';f.upd=nowStamp();});r.updated=nowStamp();done('','已確認 '+list.length+' 項');},
 notesStage(b){if(STAGES.includes(b.dataset.s)){ui.notesStage=b.dataset.s;render();}},
 notesEdit(){const R=CONTENT.review;ui.notesDraft={role:R.role||'',basic:R.basic||'',cross:R.cross||'',first:R.first||'',later:R.later||'',extra:R.extra||'',note:''};ui.notesEdit=true;ui.notesSaved=false;render();const t=document.querySelector('textarea[data-bind=notesEd]');if(t)t.focus();},
 notesCancel(){if(ui.notesDraft&&ui.notesDraft.dirty&&!confirm('放棄這次的修改？'))return;ui.notesEdit=false;ui.notesDraft=null;render();},
 notesSave(){
  const D0=ui.notesDraft;if(!D0)return;const R=CONTENT.review;
  if(!String(D0.role).trim()){toast('「你要做的事」不能空白');return;}
  const v=bumpVersion(R.version),o=Object.assign({},overrides.review||{});
  NOTE_KEYS.forEach(k=>{o[k]=String(D0[k]||'');});
  o.version=v;o.updated=todayISO();o.log=(R.log||[]).concat([{v,date:todayISO(),note:String(D0.note||'').trim()||'更新注意事項'}]).slice(-60);
  overrides.review=o;const ok=saveOverrides();CONTENT=buildContent();ui.notesEdit=false;ui.notesDraft=null;ui.notesSaved=true;render();
  toast(ok?'已儲存為 '+v+' 版':'瀏覽器空間不足，請立刻匯出新版檔案');
 },
 catStage(b){ui.catStage=b.dataset.s==='later'?'later':'first';render();},
 gateChange(){const d=$('gateDialog');d.querySelector('form').reset();$('gateChangeErr').textContent='';d.showModal();}
});
Object.assign(CHG,{
 rvSel(x){if(x.checked)ui.rvSel.add(x.dataset.id);else ui.rvSel.delete(x.dataset.id);render();},
 fSel(x){if(x.checked)ui.fSel.add(x.dataset.id);else ui.fSel.delete(x.dataset.id);render();},
 fLevel(x){const r=rvGet(x.dataset.r),f=r&&r.findings.find(y=>y.id===x.dataset.id);if(f&&LEVELS[x.value]){f.level=x.value;save();render();}},
 fItem(x){const r=rvGet(x.dataset.r),f=r&&r.findings.find(y=>y.id===x.dataset.id);if(!f)return;f.itemId=CONTENT.items[x.value]?x.value:'';f.doc=f.itemId?CONTENT.items[f.itemId].name.replace(/^★/,''):'整體';save();render();},
 async aiFile(x){const file=x.files&&x.files[0];x.value='';const r=rvGet(x.dataset.id);if(!file||!r)return;if(file.size>5000000){alert('檔案太大（上限 5 MB）');return;}rvImportAI(r,await file.text());},
 async replyFile(x){const file=x.files&&x.files[0];x.value='';if(!file)return;if(file.size>5000000){alert('檔案太大（上限 5 MB）');return;}rvImportReply(await file.text());}
});
Object.assign(BIND,{
 aiPaste(x){ui.aiPaste=x.value;},
 fEdit(x){const r=rvGet(x.dataset.r),f=r&&r.findings.find(y=>y.id===x.dataset.id);if(!f)return;const k=x.dataset.f;if(k==='text'){if(!x.value.trim())return;f.text=x.value.slice(0,2000);}else if(k==='suggest')f.suggest=x.value.slice(0,1000);else if(k==='rnote')f.rnote=x.value.slice(0,1000);r.updated=nowStamp();save();},
 notesEd(x){const D0=ui.notesDraft;if(!D0)return;D0[x.dataset.f]=x.value;D0.dirty=true;}
});
Object.assign(SUB,{
 rvCase(form){
  const fd=new FormData(form),name=String(fd.get('caseName')||'').trim().slice(0,120),stage=STAGES.includes(fd.get('stage'))?fd.get('stage'):'first',id=String(fd.get('id')||'');
  if(!name)return;
  if(id){const r=rvGet(id);if(r){r.caseName=name;r.stage=stage;r.updated=nowStamp();}}
  else{const r=normReview({id:uid(),caseName:name,stage,created:todayISO(),updated:nowStamp(),notesVer:CONTENT.review.version,findings:[]});state.reviews.push(r);location.hash='#/rv/'+r.id;ui.enter=true;}
  $('rvDialog').close();save();render();toast(id?'已更新':'已建立「'+short(name,16)+'」，先準備 AI 初審');
 },
 gate(form){gateSubmit(form);},
 async gateChange(form){
  const fd=new FormData(form),a=normCode(fd.get('code')),b=normCode(fd.get('code2')),err=$('gateChangeErr');
  if(a.length<8){err.textContent='通行碼至少要 8 個字。';return;}
  if(a!==b){err.textContent='兩次輸入的不一樣。';return;}
  err.textContent='產生中…';
  try{const gate=await makeGate(a);exportHtml('reviewer',gate);$('gateDialog').close();toast('已產生新的審查人員版。新開通的電腦請用新通行碼。');}
  catch(e){err.textContent='這個瀏覽器無法產生通行碼，請改用 Chrome 或 Edge。';}
 }
});
