/* ==========================================================
   事件與啟動
   ========================================================== */
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-act]');if(!el)return;
 if(el.tagName==='INPUT'||el.tagName==='SELECT')return;
 const fn=ACT[el.dataset.act];if(fn){e.preventDefault();fn(el,e);}
});
document.addEventListener('change',e=>{const x=e.target,fn=x.dataset&&CHG[x.dataset.act];if(fn)fn(x,e);});
document.addEventListener('input',e=>{const x=e.target,fn=x.dataset&&BIND[x.dataset.bind];if(fn)fn(x,e);});
document.addEventListener('submit',e=>{e.preventDefault();const fn=SUB[e.target.dataset.form];if(fn)fn(e.target);});
document.addEventListener('toggle',e=>{const d=e.target;if(d.tagName!=='DETAILS')return;if(d.dataset.row){if(d.open)ui.openRows.add(d.dataset.row);else ui.openRows.delete(d.dataset.row);}if(d.dataset.more)ui.moreOpen=d.open;},true);
/* 拖放檔案：AI 結果（審查人員）、需修改清單（引導員） */
document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('[data-drop]');if(!z)return;e.preventDefault();z.classList.add('drag');});
document.addEventListener('dragleave',e=>{const z=e.target.closest&&e.target.closest('[data-drop]');if(z)z.classList.remove('drag');});
document.addEventListener('drop',async e=>{
 const z=e.target.closest&&e.target.closest('[data-drop]');if(!z)return;e.preventDefault();z.classList.remove('drag');
 const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(!f)return;
 if(f.size>5000000){alert('檔案太大（上限 5 MB）');return;}
 if(z.dataset.drop==='ai'){const r=rvGet(z.dataset.id);if(r)rvImportAI(r,await f.text());}
 else if(z.dataset.drop==='issues')guideFile(f);
});
$('roundSel').addEventListener('change',e=>{if(ROUNDS.includes(e.target.value)){state.round=e.target.value;ui.issueSel.clear();save();render();}});
$('toastUndo').addEventListener('click',()=>{$('toast').hidden=true;undo();});
$('xFile').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(f)guideFile(f);});
$('importFile').addEventListener('change',async e=>{
 const f=e.target.files[0];e.target.value='';if(!f)return;
 try{
  if(f.size>20000000)throw Error('too big');
  const raw=JSON.parse(await f.text());
  if(raw&&(raw.type==='startup-loan-review-issues'||raw.type==='startup-loan-review-reply')){alert(raw.type==='startup-loan-review-issues'?'這是需修改清單，請到「需修改事項」按「匯入需修改清單」。':'這是修改回覆，請在審查案件的第 4 步匯入。');return;}
  const v=readAny(raw);
  if(RV&&!v.reviews.length&&hasData(v)){alert('這是引導員版的備份，裡面沒有審查資料。請在引導員版還原。');return;}
  if(!RV&&v.reviews.length&&!hasData(v)){alert('這是審查人員版的備份。請在審查人員版還原。');return;}
  const label=RV?'審查資料（'+v.reviews.length+' 件）':'「'+(v.caseName||'未命名個案')+'」';
  if(!confirm('還原'+label+'會取代目前的'+(RV?'審查資料':'進度')+'。還原後可按「復原」救回目前的內容。是否繼續？'))return;
  snapshot('還原備份');if(!RV)v.reviews=[];v.role=EDITION;v.tour=state.tour;v.welcomed=true;v.seenNews=state.seenNews;state=v;loadIssue='';ui.openRows.clear();ui.issueSel.clear();ui.taskSel.clear();ui.rvSel.clear();ui.fSel.clear();done('還原備份','已還原'+label);
 }catch(err){alert('無法還原：請選擇這個工具匯出的備份檔（新版或舊版皆可，上限 20 MB）。目前內容沒有變動。');}
});
window.addEventListener('hashchange',()=>{ui.enter=true;render();window.scrollTo(0,0);const h1=$('view').querySelector('h1');if(h1)h1.focus({preventScroll:true});});
window.addEventListener('beforeunload',e=>{if((ui.maint&&dirtyDrafts().length)||(ui.notesDraft&&ui.notesDraft.dirty)){e.preventDefault();e.returnValue='';}});
window.addEventListener('afterprint',()=>document.body.classList.remove('report-mode'));
setInterval(()=>{const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))return;renderPostmark();},60000);

if(VIDEO_URL){const vl=$('videoLink');vl.href=VIDEO_URL;vl.hidden=false;}
render();
if(loadIssue)save();else if(upgradeNotice&&!upgradeNotice.startsWith('找到'))save();else{let has=false;try{has=!!localStorage.getItem(KEY);}catch(e){}setSave(has?'資料保存在此瀏覽器':'尚未有填寫內容');}
