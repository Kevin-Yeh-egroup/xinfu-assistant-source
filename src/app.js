'use strict';
/* ---------- 常數與內容 ---------- */
const EDITION=document.documentElement.dataset.edition==='reviewer'?'reviewer':'guide';
const RV=EDITION==='reviewer';
const WEB=/^https?:$/.test(location.protocol);
const VIDEO_URL=WEB?(RV?'/videos/reviewer.mp4':'/videos/guide.mp4'):'';
const KEY=RV?'startup-loan-review-v1':'startup-loan-local-v3';
const LEGACY_KEY='startup-loan-local-v1';
const CONTENT_KEY='startup-loan-content-v1';
const ACT_KEY='startup-loan-review-activation';
const SOURCE_HTML='<!doctype html>\n'+document.documentElement.outerHTML;
const BASE_CONTENT=JSON.parse(document.getElementById('contentData').textContent);
const ROUNDS=['2','3','4','5'];
const LEGACY_FLOWS=['確認方案與承辦窗口','盤點事業與資金需求','撰寫計畫與整理依據','核對文件與計畫內容','送件並記錄收件資訊','追蹤審查與補件'];
const REMOVED_NAMES=['加入官方Line進行綁定','更新信扶系統創業別','創業貸款受理申請文件檢查表'];
const SECTIONS=[
 ['事業概況與創業動機','你要經營什麼？目前到哪個階段？說明創辦人經驗、團隊分工、既有資源，以及這次申請的目的。'],
 ['產品、服務與目標客群','提供什麼產品或服務？誰會購買、為什麼購買？整理定價、需求依據與競爭差異。'],
 ['營運方式與執行進度','如何取得客戶、交付產品並維持品質？描述場地、人力、供應來源、行銷管道與預定時程。'],
 ['資金需求與用途','逐項列出用途、金額、計算方式與對應估價單；說明自備款及其他資金來源，核對總額是否一致。'],
 ['營收、成本與現金流','列出銷量、單價及成本的估算依據，區分固定與變動支出，並說明收付款時間與資金缺口。'],
 ['還款規劃與風險因應','說明預計還款資金來源；如果營收低於預期或成本增加，將如何調整？貸款條件請依公司或顧問說明填寫。'],
 ['附件與送件前摘要','整理本次申請目的、執行重點、引用資料與附件對照；最後檢查名稱、日期、金額及格式。']
];
const OP_LABELS={unset:'請選擇',started:'已創業',notStarted:'未創業'};
const ISSUE_SOURCES=['自我檢核','公司書面審查','基金會審查','銀行','顧問','其他'];
const ISSUE_STATUS={open:'待修改',fixed:'已修改，待確認',done:'已確認'};
const KIND_LABELS={fix:'需修改',missing:'缺件待補'};
const LEGACY_STATUS={todo:'尚未準備',ready:'已備妥',checked:'已核對',submitted:'已送出',na:'不適用',pending:'未完成',completed:'完成',missing:'缺件待補'};
const TOOLS=[
 {id:'debt',icon:'table',name:'債務盤點表檢核',short:'本名、排序、還款狀況、加總',desc:'檢查債務人排序、借款時間順序、還款狀況寫法與加總。'},
 {id:'forecast',icon:'chart',name:'未來三個月試算',short:'收入、支出、盈餘',desc:'依「未來營運說明」的公式，計算每個月的預估營業盈餘。'},
 {id:'breakeven',icon:'calc',name:'損益平衡試算',short:'損益平衡點、每日來客數',desc:'依營運結構表的毛利率、固定成本與家庭支出，算出損益平衡點與每日來客數。'},
 {id:'usage',icon:'coin',name:'前期動撥款使用加總',short:'週轉金、總數等於前一期款',desc:'前一期款扣掉發票、收據後，剩下的列為週轉金；檢查總數是否等於前一期款。'},
 {id:'sheet',icon:'tools',name:'表格空白與加總',short:'公式錯誤、空白、小計',desc:'找出公式錯誤、空白金額，以及小計、合計對不上的地方。'}
];
const PLAN_LINKS={'ref-21':['basic','填一次，直接產生 Word 計畫書'],'ref-23':['money','債務填好，自動排序、加總'],'ref-25':['structure','自動算毛利率、損益平衡'],'ref-26':['forecast','收入、支出、盈餘自動計算'],'ref-27':['needs','金額、小計自動計算'],'ref-28':['needs','每項設備逐項核對估價單'],'later-debt':['money','用最新債務產生附件'],'later-structure':['structure','用最新數字產生附件']};
const STATUS_ORDER=[['done','完成','var(--pine)'],['verify','待確認','#d39a2b'],['progress','進行中','#6f95cf'],['fix','需修改／缺件','var(--stamp)'],['todo','未開始','#dfe6e3']];

/* ---------- 小工具 ---------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const clone=o=>JSON.parse(JSON.stringify(o));
const S=(v,max=200000)=>typeof v==='string'?v.slice(0,max):'';
const ID_RE=/^[\w-]{1,60}$/;
const safeId=v=>typeof v==='string'&&ID_RE.test(v)?v:uid();
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function todayISO(){return iso(new Date());}
function isISO(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const [y,m,d]=s.split('-').map(Number);const t=new Date(y,m-1,d);return t.getFullYear()===y&&t.getMonth()===m-1&&t.getDate()===d;}
const D=v=>isISO(v)?v:'';
function parseISO(s){const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);}
function addDays(s,n){const d=parseISO(s);d.setDate(d.getDate()+n);return iso(d);}
function addMonths(s,n){const d=parseISO(s);const y=d.getFullYear(),m=d.getMonth()+n,day=d.getDate();const last=new Date(y,m+1,0).getDate();return iso(new Date(y,m,Math.min(day,last)));}
function daysUntil(s){return Math.round((parseISO(s)-parseISO(todayISO()))/86400000);}
function fmt(s){if(!isISO(s))return '';const [y,m,d]=s.split('-');return y+'/'+m+'/'+d;}
function fmtShort(s){const [y,m,d]=s.split('-');const t=Number(m)+'/'+Number(d);return y===todayISO().slice(0,4)?t:y+'/'+t;}
function money(n){return Math.round(n).toLocaleString('zh-TW');}
function fmtNum(n){return Number.isInteger(n)?n.toLocaleString('zh-TW'):n.toLocaleString('zh-TW',{maximumFractionDigits:2});}
function toHalf(s){return String(s).replace(/[０-９．－，]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248));}
function toNum(s){if(typeof s==='number')return s;let t=toHalf(String(s??'')).trim();if(!t)return null;t=t.replace(/NT\$?|[,\s元$＄]/gi,'');if(/^\(\d+(\.\d+)?\)$/.test(t))t='-'+t.slice(1,-1);const wan=t.match(/^([-+]?\d+(?:\.\d+)?)萬$/);if(wan)return Math.round(parseFloat(wan[1])*10000*100)/100;return /^[-+]?\d+(\.\d+)?$/.test(t)?parseFloat(t):NaN;}
function pnum(s){const n=toNum(String(s??'').replace(/[%％]/g,''));return n===null?NaN:n;}
function pnumZ(s){const n=pnum(s);return isNaN(n)?0:n;}
function pct(s){const str=String(s??''),n=pnum(str);if(isNaN(n))return NaN;if(/[%％]/.test(str))return n/100;return /[.．]/.test(str)&&n>0&&n<1?n:n/100;}
function short(s,n=24){s=String(s);return s.length>n?s.slice(0,n)+'…':s;}
function colName(i){let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;}
function colIndex(s){let n=0;for(const ch of s)n=n*26+(ch.charCodeAt(0)-64);return n-1;}
function rowNo(ref){return String(ref||'').replace(/^[A-Z]+/,'');}
function lines(s){return String(s||'').split('\n').map(x=>x.trim()).filter(Boolean);}
const CHEV='<svg class="chev" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const WAVES='<svg class="waves" viewBox="0 0 54 40" aria-hidden="true"><path d="M0 9q6.75-6 13.5 0t13.5 0 13.5 0 13.5 0M0 20q6.75-6 13.5 0t13.5 0 13.5 0 13.5 0M0 31q6.75-6 13.5 0t13.5 0 13.5 0 13.5 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const ICON={
 home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 docs:'<path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1z"/><path d="M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2"/><path d="m9 13.5 2 2 4-4.5"/>',
 issues:'<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
 tools:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/><path d="m8 10.6 1.9 1.9 3.3-3.4"/>',
 calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h0M14 11h2M8 14h2M12 14h0M14 14h2M8 17h2M12 17h0M14 17h2"/>',
 table:'<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>',
 coin:'<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
 chart:'<path d="M4 20V4"/><path d="M4 20h16"/><path d="m7 15 4-4 3 3 5-6"/>',
 writing:'<path d="M4 20h4L19.5 8.5l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
 tasks:'<rect x="4" y="5" width="16" height="16" rx="1.5"/><path d="M4 10h16M8 3v4M16 3v4"/>',
 rv:'<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/>',
 notes:'<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="m11.5 11 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 download:'<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
 upload:'<path d="M12 16V5"/><path d="m7 10 5-5 5 5"/><path d="M5 20h14"/>',
 copy:'<rect x="8" y="8" width="12" height="13" rx="1.5"/><path d="M5 16h-.5A1.5 1.5 0 0 1 3 14.5v-10A1.5 1.5 0 0 1 4.5 3h10A1.5 1.5 0 0 1 16 4.5V5"/>',
 send:'<path d="M4 12 20 4l-6.5 16-2.8-6.7z"/><path d="m10.7 13.3 4.3-4.3"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 x:'<path d="M6 6l12 12M18 6 6 18"/>',
 spark:'<path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z"/><path d="m18.5 15 .8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
 shield:'<path d="M12 3 19 6v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z"/><path d="m9 12 2 2 4-4"/>',
 folder:'<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2h8.5A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 back:'<path d="M15 5l-7 7 7 7"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
 inbox:'<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.5 5h13l2.5 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
 chat:'<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/>',
 file:'<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>'
};
const ico=(n,cls)=>'<svg class="ico'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(ICON[n]||'')+'</svg>';
const LEVELS={fix:'需修改',check:'請核對',hint:'提醒'};
const STAGES=['first','r2','r3','r4','r5'];
const NEWS='4';
const isStamp=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?$/.test(s);
const nowStamp=()=>new Date().toISOString();
function ring(parts,total,size=148,stroke=14){
 const r=(size-stroke)/2,c=2*Math.PI*r;let off=0;
 const segs=parts.filter(p=>p.v>0).map(p=>{const len=total?p.v/total*c:0;const s='<circle class="seg '+p.cls+'" cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" stroke-width="'+stroke+'" style="stroke-dasharray:'+len.toFixed(2)+' '+(c-len).toFixed(2)+';stroke-dashoffset:'+(-off).toFixed(2)+'"/>';off+=len;return s;}).join('');
 return '<svg class="ringsvg" viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'" aria-hidden="true"><circle class="track" cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" stroke-width="'+stroke+'"/><g transform="rotate(-90 '+size/2+' '+size/2+')">'+segs+'</g></svg>';
}

/* ---------- 內容（含維護修改） ---------- */
let overrides={baseRev:BASE_CONTENT.rev,items:{}},overridesStale=false;
if(RV){try{const raw=localStorage.getItem(CONTENT_KEY);if(raw){const o=JSON.parse(raw);if(o&&o.baseRev===BASE_CONTENT.rev&&o.items&&typeof o.items==='object')overrides=o;else overridesStale=true;}}catch(e){}}
function cleanOverride(o){
 const out={};
 if(typeof o.guide==='string')out.guide=o.guide.slice(0,20000);
 if(Array.isArray(o.tips))out.tips=o.tips.filter(x=>typeof x==='string').map(x=>x.slice(0,500)).slice(0,30);
 if(Array.isArray(o.commonIssues))out.commonIssues=o.commonIssues.filter(x=>typeof x==='string').map(x=>x.slice(0,200)).slice(0,30);
 if(Array.isArray(o.criteria))out.criteria=o.criteria.filter(c=>c&&typeof c.id==='string'&&ID_RE.test(c.id)&&typeof c.text==='string'&&c.text.trim()).map(c=>({id:c.id.slice(0,60),text:c.text.slice(0,300),...(c.auto==='valid3m'?{auto:'valid3m'}:{})})).slice(0,30);
 if(Array.isArray(o.images))out.images=o.images.filter(i=>i&&typeof i.src==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,/.test(i.src)).map(i=>({title:S(i.title,120),alt:S(i.alt,500),src:i.src,...(typeof i.crit==='string'?{crit:i.crit.slice(0,60)}:{})})).slice(0,12);
 return out;
}
const NOTE_KEYS=['role','basic','cross','first','later','extra'];
function cleanReview(o){
 const out={};if(!o||typeof o!=='object')return out;
 NOTE_KEYS.forEach(k=>{if(typeof o[k]==='string')out[k]=o[k].slice(0,20000);});
 if(typeof o.version==='string'&&/^\d{1,3}\.\d{1,3}$/.test(o.version))out.version=o.version;
 if(isISO(o.updated))out.updated=o.updated;
 if(Array.isArray(o.log))out.log=o.log.filter(x=>x&&typeof x.v==='string'&&typeof x.note==='string').map(x=>({v:x.v.slice(0,10),date:D(x.date),note:x.note.slice(0,300)})).slice(-60);
 return out;
}
function buildContent(){
 const c=clone(BASE_CONTENT);
 for(const [id,o] of Object.entries(overrides.items||{})){if(c.items[id]&&o&&typeof o==='object')Object.assign(c.items[id],cleanOverride(o));}
 if(!c.review)c.review={version:'1.0',updated:'',log:[],role:'',basic:'',cross:'',first:'',later:'',extra:''};
 if(overrides.review)Object.assign(c.review,cleanReview(overrides.review));
 return c;
}
let CONTENT=buildContent();
function saveOverrides(){try{localStorage.setItem(CONTENT_KEY,JSON.stringify(overrides));return true;}catch(e){return false;}}

/* ---------- 狀態 ---------- */
function blankMonth(){return {label:'',a:'',b:'',rate:'',d:'',e:'',f:'',repay:'',written:''};}
function blankRound(){return {date:'',flows:{},items:{},usage:{amount:'',rows:[]},forecast:{months:[blankMonth(),blankMonth(),blankMonth()]}};}
function fresh(){
 const rounds={};ROUNDS.forEach(r=>rounds[r]=blankRound());
 return {version:3,role:EDITION,welcomed:false,tour:{guide:false,reviewer:false},seenNews:'',caseName:'',program:'',mode:'first',round:'2',first:{date:'',legacyMonth:'',operation:'unset',flows:{},items:{},forecast:{months:[blankMonth(),blankMonth(),blankMonth()]}},rounds,issues:[],tasks:[],writing:SECTIONS.map(()=>({text:'',done:false})),meetingNotes:'',reviewNotes:'',tools:{breakeven:{margin:'',fixed:'',income:'',before:'',after:'',days:'',price:''}},legacy:{docs:[],flows:[],others:[]},reviews:[],upgradedFrom:0,plan:blankPlan()};
}
function newRec(){return {crit:{},via:{},na:false,legacyDone:false,note:'',fields:{}};}
function recIn(scope,id){return scope.items[id]||(scope.items[id]=newRec());}
function normFlags(o){const out={};if(o&&typeof o==='object')for(const [k,v] of Object.entries(o))if(v===true&&k.length<=60)out[k]=true;return out;}
function normItems(o){
 const out={};if(!o||typeof o!=='object')return out;
 for(const [id,r] of Object.entries(o)){
  if(!BASE_CONTENT.items[id]||!r||typeof r!=='object')continue;
  const x=newRec();
  if(r.crit&&typeof r.crit==='object')for(const [k,v] of Object.entries(r.crit))if(v===true&&k.length<=60)x.crit[k]=true;
  if(r.via&&typeof r.via==='object')for(const [k,v] of Object.entries(r.via))if(v==='tool'&&x.crit[k])x.via[k]='tool';
  if(r.fields&&typeof r.fields==='object')for(const [k,v] of Object.entries(r.fields))if(/^[\w-]{1,40}$/.test(k)&&typeof v==='string')x.fields[k]=v.slice(0,100);
  x.na=r.na===true;x.legacyDone=r.legacyDone===true;x.note=S(r.note);out[id]=x;
 }
 return out;
}
function normMonth(m){const b=blankMonth();if(m&&typeof m==='object')for(const k of Object.keys(b))b[k]=S(m[k],40);return b;}
const USAGE_KIND_MAP={'設施設備':'設施設備','租賃契約':'租賃契約','週轉金':'週轉金','設備':'設施設備','計畫性還款':'週轉金','其他':'週轉金'};
function normRound(x){
 x=x&&typeof x==='object'?x:{};const r=blankRound();
 r.date=D(x.date);r.flows=normFlags(x.flows);r.items=normItems(x.items);
 if(x.usage&&typeof x.usage==='object'){r.usage.amount=S(x.usage.amount,40);if(Array.isArray(x.usage.rows))r.usage.rows=x.usage.rows.slice(0,200).filter(o=>o&&typeof o==='object').map(o=>({id:safeId(o.id),name:S(o.name,200),kind:USAGE_KIND_MAP[o.kind]||'週轉金',amount:S(o.amount,40),proof:o.proof===true}));}
 if(x.forecast&&Array.isArray(x.forecast.months))r.forecast.months=[0,1,2].map(i=>normMonth(x.forecast.months[i]));
 return r;
}
function normIssue(i){
 if(!i||typeof i!=='object'||typeof i.text!=='string'||!i.text.trim())return null;
 const scope=(i.scope==='first'||/^r[2-5]$/.test(i.scope))?i.scope:'first';
 return {id:safeId(i.id),scope,itemId:BASE_CONTENT.items[i.itemId]?i.itemId:'',text:i.text.slice(0,2000),source:ISSUE_SOURCES.includes(i.source)?i.source:'其他',kind:i.kind==='missing'?'missing':'fix',status:ISSUE_STATUS[i.status]?i.status:'open',created:D(i.created),closed:D(i.closed),rid:typeof i.rid==='string'&&ID_RE.test(i.rid)?i.rid:'',where:S(i.where,300),suggest:S(i.suggest,1000),level:LEVELS[i.level]?i.level:'',gnote:S(i.gnote,1000),rnote:S(i.rnote,1000),upd:isStamp(i.upd)?i.upd:''};
}
function normFinding(f){
 if(!f||typeof f!=='object'||typeof f.text!=='string'||!f.text.trim())return null;
 return {id:safeId(f.id),itemId:BASE_CONTENT.items[f.itemId]?f.itemId:'',doc:S(f.doc,120),where:S(f.where,300),text:f.text.slice(0,2000),basis:S(f.basis,500),suggest:S(f.suggest,1000),level:LEVELS[f.level]?f.level:'check',origin:f.origin==='manual'?'manual':'ai',decision:['pending','accept','reject'].includes(f.decision)?f.decision:'pending',status:ISSUE_STATUS[f.status]?f.status:'open',gnote:S(f.gnote,1000),rnote:S(f.rnote,1000),upd:isStamp(f.upd)?f.upd:''};
}
function normReview(r){
 if(!r||typeof r!=='object')return null;
 return {id:safeId(r.id),caseName:S(r.caseName,120),stage:STAGES.includes(r.stage)?r.stage:'first',created:D(r.created),updated:isStamp(r.updated)?r.updated:'',notesVer:S(r.notesVer,20),aiAt:isStamp(r.aiAt)?r.aiAt:'',sentAt:isStamp(r.sentAt)?r.sentAt:'',replyAt:isStamp(r.replyAt)?r.replyAt:'',findings:uniqIds((Array.isArray(r.findings)?r.findings:[]).slice(0,1000).map(normFinding))};
}
function normTask(t){if(!t||typeof t!=='object'||typeof t.text!=='string'||!t.text.trim())return null;return {id:safeId(t.id),text:t.text.slice(0,500),date:D(t.date),done:t.done===true};}
function uniqIds(list){const seen=new Set();return list.filter(Boolean).map(x=>{if(seen.has(x.id))x.id=uid();seen.add(x.id);return x;});}
function normLegacy(l){
 const out={docs:[],flows:[],others:[]};if(!l||typeof l!=='object')return out;
 if(Array.isArray(l.docs))out.docs=l.docs.slice(0,300).filter(d=>d&&typeof d.name==='string').map(d=>({name:S(d.name,300),hint:S(d.hint,1000),status:S(d.status,40),note:S(d.note,5000)}));
 if(Array.isArray(l.flows))out.flows=l.flows.filter(x=>typeof x==='string').map(x=>x.slice(0,100)).slice(0,20);
 if(Array.isArray(l.others))out.others=l.others.slice(0,300).filter(d=>d&&typeof d.name==='string').map(d=>({name:S(d.name,300),method:S(d.method,100),status:S(d.status,40),note:S(d.note,5000)}));
 return out;
}
function normalize(v){
 if(!v||typeof v!=='object'||v.version!==3)throw Error('格式不符');
 const s=fresh();
 s.role=EDITION;s.welcomed=v.welcomed===true;
 s.tour={guide:!!(v.tour&&v.tour.guide===true),reviewer:!!(v.tour&&v.tour.reviewer===true)};
 s.seenNews=S(v.seenNews,10);
 s.reviews=uniqIds((Array.isArray(v.reviews)?v.reviews:[]).slice(0,500).map(normReview));
 s.caseName=S(v.caseName,120);s.program=S(v.program,200);
 s.mode=v.mode==='later'?'later':'first';s.round=ROUNDS.includes(String(v.round))?String(v.round):'2';
 const f=v.first&&typeof v.first==='object'?v.first:{};
 s.first={date:D(f.date),legacyMonth:/^\d{4}-\d{2}$/.test(f.legacyMonth||'')?f.legacyMonth:'',operation:OP_LABELS[f.operation]?f.operation:'unset',flows:normFlags(f.flows),items:normItems(f.items),forecast:{months:[0,1,2].map(i=>{const src=f.forecast&&Array.isArray(f.forecast.months)?f.forecast.months:(v.rounds&&v.rounds['2']&&v.rounds['2'].forecast&&Array.isArray(v.rounds['2'].forecast.months)?v.rounds['2'].forecast.months:null);return normMonth(src?src[i]:null);})}};
 ROUNDS.forEach(r=>s.rounds[r]=normRound((v.rounds||{})[r]));
 s.issues=uniqIds((Array.isArray(v.issues)?v.issues:[]).slice(0,3000).map(normIssue));
 s.tasks=uniqIds((Array.isArray(v.tasks)?v.tasks:[]).slice(0,1000).map(normTask));
 if(Array.isArray(v.writing))s.writing=SECTIONS.map((_,i)=>({text:S(v.writing[i]&&v.writing[i].text),done:!!(v.writing[i]&&v.writing[i].done===true)}));
 s.meetingNotes=S(v.meetingNotes);s.reviewNotes=S(v.reviewNotes);
 const be=v.tools&&v.tools.breakeven;if(be&&typeof be==='object')for(const k of Object.keys(s.tools.breakeven))s.tools.breakeven[k]=S(be[k],40);
 s.legacy=normLegacy(v.legacy);s.upgradedFrom=[1,2].includes(v.upgradedFrom)?v.upgradedFrom:0;
 s.plan=normPlan(v.plan);
 return s;
}
/* 舊版（v1、v2）轉入：不猜測、不刪除，無法對應的資料放進「舊版紀錄」 */
function migrateOld(v){
 if(!v||typeof v!=='object'||![1,2].includes(v.version))throw Error('格式不符');
 const s=fresh();s.upgradedFrom=v.version;
 s.caseName=S(v.caseName,120);s.program=S(v.program,200);s.meetingNotes=S(v.meetingNotes);
 if(typeof v.dueDate==='string'&&/^\d{4}-\d{2}/.test(v.dueDate))s.first.legacyMonth=v.dueDate.slice(0,7);
 if(Array.isArray(v.flows))s.legacy.flows=LEGACY_FLOWS.filter((_,i)=>v.flows[i]===true);
 if(Array.isArray(v.writing))s.writing=SECTIONS.map((_,i)=>({text:S(v.writing[i]&&v.writing[i].text),done:!!(v.writing[i]&&v.writing[i].done===true)}));
 if(Array.isArray(v.tasks))s.tasks=uniqIds(v.tasks.slice(0,1000).map(normTask));
 const oldLegacy=v.version===1?v.docs:v.legacyDocs;
 if(Array.isArray(oldLegacy))s.legacy.docs=oldLegacy.filter(d=>d&&typeof d.name==='string'&&!REMOVED_NAMES.includes(d.name)).slice(0,300).map(d=>({name:S(d.name,300),hint:S(d.hint,1000),status:LEGACY_STATUS[d.status]||S(d.status,40),note:S(d.note,5000)}));
 if(v.version===2){
  if(Array.isArray(v.docs))for(const d of v.docs){
   if(!d||typeof d!=='object')continue;
   const id=d.id,def=BASE_CONTENT.items[id];
   if(id==='ref-7'){if(OP_LABELS[d.status])s.first.operation=d.status;if(S(d.note))recIn(s.first,id).note=S(d.note);continue;}
   if(def&&def.row){
    const r=recIn(s.first,id);r.note=S(d.note);
    if(d.status==='completed')r.legacyDone=true;
    else if(d.status==='na'&&def.allowNA)r.na=true;
    else if(d.status==='missing')s.issues.push({id:uid(),scope:'first',itemId:id,text:'缺件待補（沿用舊版狀態）',source:'其他',kind:'missing',status:'open',created:todayISO(),closed:''});
   }else if(typeof d.name==='string'&&!REMOVED_NAMES.includes(d.name)&&!['ref-6','ref-8','ref-20'].includes(id)){
    s.legacy.others.push({name:S(d.name,300),method:S(d.method,100),status:LEGACY_STATUS[d.status]||S(d.status,40),note:S(d.note,5000)});
   }
  }
  if(v.review&&typeof v.review.notes==='string')s.reviewNotes=v.review.notes;
  const ic=v.infocenterCompletion;
  if(ic&&typeof ic==='object'){if(ic.contact===true)recIn(s.first,'ref-11').crit['ic-contact']=true;if(ic.personal===true)recIn(s.first,'ref-11').crit['ic-personal']=true;}
 }
 return s;
}
function readAny(v){if(v&&v.version===3)return normalize(v);return migrateOld(v);}

let state=fresh(),loadIssue='',upgradeNotice='';
function hasData(s){return !!(s.caseName||s.issues.length||s.tasks.length||s.first.date||Object.keys(s.first.items).length||s.legacy.docs.length||s.legacy.others.length||s.legacy.flows.length||s.reviews.length||planHasData(s.plan));}
let activated=false;
(function load(){
 if(RV){try{activated=!!localStorage.getItem(ACT_KEY);}catch(e){}}
 let raw=null;
 try{raw=localStorage.getItem(KEY);}catch(e){loadIssue='storage';return;}
 if(raw){try{state=normalize(JSON.parse(raw));}catch(e){loadIssue='corrupt';state.welcomed=true;}}
 else if(!RV){
  let old=null;try{old=localStorage.getItem(LEGACY_KEY);}catch(e){}
  if(old){try{state=migrateOld(JSON.parse(old));state.welcomed=true;upgradeNotice='已把舊版的進度轉入新版。舊版資料仍留在瀏覽器裡，沒有刪除。';}catch(e){state.welcomed=true;upgradeNotice='找到舊版進度，但無法讀取。請在舊版按「備份進度」，再到這裡按「還原備份」。';}}
 }
 state.role=EDITION;
 if(!RV&&hasData(state))state.welcomed=true;
})();

const ui={docFilter:'all',openRows:new Set(),issueFilter:'open',issueBatch:false,issueSel:new Set(),taskBatch:false,taskSel:new Set(),maint:false,drafts:{},
 issueAdd:false,itemForm:new Set(),flowOpen:-1,rvBatch:false,rvSel:new Set(),rvStep:{},fOpen:new Set(),fSel:new Set(),fBatch:false,fFilter:'all',notesStage:'first',notesEdit:false,notesDraft:null,xMode:'',xRid:'',enter:true,

 tool:{debt:{paste:'',grid:null,wb:null,sheets:null,sheetIdx:-1,fileName:'',caseName:'',later:null,result:null},sheet:{paste:'',grid:null,wb:null,sheets:null,sheetIdx:-1,fileName:'',result:null,target:''}}};

/* ---------- 保存與復原 ---------- */
function setSave(text,bad){['saveState','saveStateM'].forEach(id=>{const el=$(id);el.textContent=text;el.classList.toggle('bad',!!bad);});}
let changeId=0;
function save(){
 changeId++;pruneUndo();
 if(loadIssue){setSave(loadIssue==='storage'?'這個瀏覽器不允許保存，請用「備份進度」':'原本的資料讀取失敗，暫停自動保存。請「還原備份」或「清除此機進度」',true);return false;}
 try{localStorage.setItem(KEY,JSON.stringify(state));setSave('已保存 '+new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'}));return true;}
 catch(e){setSave('無法自動保存，請用「備份進度」保存',true);return false;}
}
const undoStack=[];
function snapshot(label,extra){undoStack.length=0;undoStack.push({label,data:JSON.stringify(state),at:changeId+1,li:loadIssue,extra:extra||null});}
function pruneUndo(){const u=undoStack[undoStack.length-1];if(u&&u.at<changeId){undoStack.length=0;$('undoBtn').hidden=true;}}
function undo(){const u=undoStack.pop();if(!u){toast('之後已有其他修改，無法復原這個動作');return;}state=JSON.parse(u.data);loadIssue=u.li||'';if(u.extra&&u.extra.legacyRaw){try{localStorage.setItem(LEGACY_KEY,u.extra.legacyRaw);}catch(e){}}ui.issueSel.clear();ui.taskSel.clear();save();render();toast('已復原：'+u.label);}
function toast(text,withUndo){$('toastText').textContent=text;$('toastUndo').hidden=!withUndo;$('toast').hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>{$('toast').hidden=true;},withUndo?9000:4000);}
function done(label,msg){save();render();toast(msg||label,true);}

/* ---------- 範圍、狀態判斷 ---------- */
const scopeKey=()=>state.mode==='first'?'first':'r'+state.round;
function scopeObj(key=scopeKey()){return key==='first'?state.first:state.rounds[key.slice(1)];}
function modeOf(key){return key==='first'?'first':'later';}
function modeDef(key=scopeKey()){return CONTENT.modes[modeOf(key)];}
function scopeLabel(key=scopeKey()){return key==='first'?'首次動撥':'第 '+key.slice(1)+' 次動撥';}
function stageLabel(k){return scopeLabel(k);}
function shortName(id){const d=CONTENT.items[id];return d?d.name.replace(/^★/,'').replace(/^信扶專案(創業計畫書附件-)?/,'').replace(/\(.*?\)$/,''):'';}
function itemIds(key=scopeKey()){return modeDef(key).groups.flatMap(g=>g.items).filter(id=>CONTENT.items[id]);}
function groupOf(id,key=scopeKey()){return modeDef(key).groups.find(g=>g.items.includes(id));}
function modeOfItem(id){return CONTENT.modes.first.groups.some(g=>g.items.includes(id))?'first':'later';}
function getRec(key,id){return scopeObj(key).items[id]||newRec();}
function rec(key,id){return recIn(scopeObj(key),id);}
function validity3m(id,key){
 const a=getRec(key,id).fields.applyDate,review=scopeObj(key).date;
 if(!isISO(a))return {ok:null,text:'輸入謄本申請日期後自動判斷。'};
 const until=addMonths(a,3);
 if(!isISO(review))return {ok:null,text:'三個月有效至 '+fmt(until)+'。設定審查日期後，會判斷審查時是否仍有效。'};
 if(review<=until)return {ok:true,text:'三個月有效至 '+fmt(until)+'；審查日 '+fmt(review)+' 仍在期限內。'};
 return {ok:false,text:'三個月有效至 '+fmt(until)+'；審查日 '+fmt(review)+' 已超過，需要重新申請。'};
}
function critList(id,key=scopeKey()){
 const def=CONTENT.items[id],r=getRec(key,id);
 return (def.criteria||[]).map(c=>{if(c.auto==='valid3m'){const v=validity3m(id,key);return {...c,on:v.ok===true,info:v};}return {...c,on:r.crit[c.id]===true};});
}
function isLocked(id,key){const def=CONTENT.items[id];return !!(def.rounds&&key!=='first'&&!def.rounds.includes(Number(key.slice(1))));}
function itemIssues(id,key=scopeKey()){return state.issues.filter(i=>i.scope===key&&i.itemId===id);}
function itemStatus(id,key=scopeKey()){
 const def=CONTENT.items[id];
 if(def.kind==='operation'){const op=state.first.operation;return {key:'op',label:op==='unset'?'未選擇':OP_LABELS[op]};}
 if(isLocked(id,key))return {key:'locked',label:'本次不需要'};
 const r=getRec(key,id);
 if(r.na&&def.allowNA)return {key:'na',label:'不需要'};
 const iss=itemIssues(id,key).filter(i=>i.status!=='done');
 const cl=critList(id,key),n=cl.filter(c=>c.on).length,m=cl.length;
 if(iss.some(i=>i.status==='open'&&i.kind==='missing'))return {key:'missing',label:'缺件待補',n,m};
 if(iss.some(i=>i.status==='open'))return {key:'fix',label:'需修改',n,m};
 if(iss.length)return {key:'verify',label:'待確認',n,m};
 if(r.legacyDone)return {key:'done',label:'完成',n,m,legacy:true};
 if(m&&n===m)return {key:'done',label:'完成',n,m};
 if(n>0)return {key:'progress',label:'進行中',n,m};
 return {key:'todo',label:'未開始',n,m};
}
function tally(key=scopeKey()){
 const t={done:0,verify:0,progress:0,fix:0,todo:0,na:0,total:0};
 for(const id of itemIds(key)){const s=itemStatus(id,key);if(s.key==='op')continue;if(s.key==='na'||s.key==='locked'){t.na++;continue;}t.total++;t[s.key==='missing'?'fix':s.key]++;}
 return t;
}
function deadline(key=scopeKey()){
 const d=scopeObj(key).date;if(!isISO(d))return null;
 const rule=modeDef(key).deadline;const due=rule.unit==='month'?addMonths(d,-rule.value):addDays(d,-rule.value);
 return {date:d,due,left:daysUntil(due),rule};
}
function pillHtml(s){return '<span class="pill s-'+s.key+'">'+esc(s.label)+'</span>';}
function srcText(def){return (def.src||[]).map(k=>k==='xlsx'&&def.row?CONTENT.sources.xlsx+' 第 '+def.row+' 列':CONTENT.sources[k]).filter(Boolean).join('；');}

/* ---------- 路由與共用畫面 ---------- */
function route(){const h=location.hash.replace(/^#\/?/,'');const i=h.indexOf('/');const page=i<0?h:h.slice(0,i);let arg='';if(i>=0){try{arg=decodeURIComponent(h.slice(i+1));}catch(e){arg=h.slice(i+1);}}return {page:page||'overview',arg};}
const PAGE_TITLES={overview:'總覽',docs:'繳交資料',issues:'需修改事項',tools:'檢核工具',plan:'計畫書與附件',tasks:'待辦與紀錄',rv:'審查案件',notes:'AI 審核注意事項',catalog:'文件與審查重點',welcome:'歡迎',gate:'開通審查人員版'};
const ROLE_NAMES={guide:'引導員',reviewer:'審查人員'};
const RV_PAGES=new Set(['rv','notes','catalog']);
const GUIDE_ONLY=new Set(['overview','docs','issues','tools','plan','tasks']);
function currentPage(){
 let {page,arg}=route();
 if(RV){
  if(!activated)return {page:'gate',arg:''};
  if(!state.welcomed)return {page:'welcome',arg:''};
  if(GUIDE_ONLY.has(page)||!(RV_PAGES.has(page)||page==='item'))return {page:'rv',arg:''};
  return {page,arg};
 }
 if(page==='writing')page='plan';
 if(!state.welcomed&&!hasData(state))return {page:'welcome',arg:''};
 if(RV_PAGES.has(page)||!(GUIDE_ONLY.has(page)||page==='item'))page='overview';
 return {page,arg};
}
function render(){
 const fk=document.activeElement&&document.activeElement.dataset?document.activeElement.dataset.fk:'';
 document.querySelectorAll('#view details[data-row]').forEach(d=>{if(d.open)ui.openRows.add(d.dataset.row);else ui.openRows.delete(d.dataset.row);});
 const {page,arg}=currentPage();let html;
 switch(page){case 'gate':html=pageGate();break;case 'welcome':html=pageWelcome();break;case 'catalog':html=pageCatalog();break;case 'docs':html=pageDocs();break;case 'item':html=pageItem(arg);break;case 'issues':html=pageIssues();break;case 'tools':html=pageTools(arg);break;case 'plan':html=pagePlan(arg);break;case 'tasks':html=pageTasks();break;case 'rv':html=arg?pageRvCase(arg):pageRvList();break;case 'notes':html=pageNotes();break;default:html=pageOverview();}
 const v=$('view');
 if(!ui.enter)v.classList.remove('enter');
 v.innerHTML=html;
 if(ui.enter){v.classList.remove('enter');void v.offsetWidth;v.classList.add('enter');ui.enter=false;clearTimeout(render.t);render.t=setTimeout(()=>v.classList.remove('enter'),900);}
 renderChrome(page,arg);
 if(page==='tools')afterTools(arg);
 if(page==='plan')afterPlan();
 if(fk){const el=document.querySelector('[data-fk="'+CSS.escape(fk)+'"]');if(el)el.focus();}
}
function renderChrome(page,arg){
 document.body.dataset.edition=EDITION;document.body.dataset.page=page;
 document.body.classList.toggle('is-full',page==='welcome'||page==='gate');
 $('edLabel').textContent=RV?'信扶專案｜審查人員版':'信扶專案｜引導員版';
 const rb=document.querySelector('.foot [data-act=reset]');if(rb)rb.textContent=RV?'清除審查資料':'清除此機進度';
 document.querySelectorAll('[data-for]').forEach(el=>{el.hidden=el.dataset.for!==EDITION;});
 document.querySelectorAll('[data-act=mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode)));
 $('roundWrap').hidden=state.mode!=='later';$('roundSel').value=state.round;
 $('caseChip').textContent=state.caseName?'個案：'+state.caseName:'';
 const navKey=page==='item'?(RV?'catalog':'docs'):page;
 document.querySelectorAll('.nav a').forEach(a=>{if(a.dataset.route===navKey)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 const t=tally(),key=scopeKey();
 $('navDocs').textContent=t.done+'/'+t.total;
 const openIss=state.issues.filter(i=>i.scope===key&&i.status==='open').length;
 $('navIssues').textContent=openIss||'';$('navIssues').className='count'+(openIss?' alert':'');
 const openTasks=state.tasks.filter(x=>!x.done).length;$('navTasks').textContent=openTasks||'';
 const rvAct=RV?state.reviews.filter(r=>['decide','confirm'].includes(rvPhase(r).key)).length:0;
 $('navRv').textContent=rvAct||'';$('navRv').className='count'+(rvAct?' alert':'');
 const u=undoStack[undoStack.length-1];$('undoBtn').hidden=!u;if(u)$('undoBtn').textContent='復原：'+u.label;
 renderPostmark();renderMaintBar();
 const rv=page==='rv'&&arg?rvGet(arg):null;
 const title=page==='item'&&CONTENT.items[arg]?CONTENT.items[arg].name:rv?rv.caseName+'｜審查':(PAGE_TITLES[page]||'總覽');
 document.title=title+'｜'+(RV?'審查人員版':'創業貸款準備助手');
}
function renderNavCounts(){const t=tally();$('navDocs').textContent=t.done+'/'+t.total;}
function renderPostmark(){
 const dl=deadline(),md=modeDef(),pm=$('postmark');let cls='postmark',a,b,c,label;
 if(!dl){cls+=' unset';a='寄達期限';b='請設定<br>'+(state.mode==='first'?'審查日':'截止日');c='';label='尚未設定'+md.dateLabel+'，設定後顯示寄達期限';}
 else{const left=dl.left;cls+=left<0?' late':left<=7?' soon':'';a='寄達期限';b=esc(fmtShort(dl.due));c=left<0?'已逾期 '+(-left)+' 天':left===0?'就是今天':'剩 '+left+' 天';label='寄達期限 '+fmt(dl.due)+'，'+c+'（'+md.deadline.text+'）';}
 pm.className=cls;pm.setAttribute('aria-label',label);pm.title=label;
 pm.innerHTML=WAVES+'<span class="ring"><span class="pm-label">'+a+'</span><span class="pm-date">'+b+'</span><span class="pm-left">'+esc(c)+'</span></span>';
}
function pressPostmark(){const pm=$('postmark');pm.classList.remove('pressed');void pm.offsetWidth;pm.classList.add('pressed');}
function renderMaintBar(){
 const bar=$('maintBar');bar.hidden=!(RV&&ui.maint);if(bar.hidden)return;
 const n=Object.keys(overrides.items||{}).length+(overrides.review?1:0);
 bar.innerHTML='<span><strong>維護模式</strong>：修改先存在這台電腦（目前修改 '+n+' 處）。'+(WEB?'改完匯出新檔案，交給負責網站的同仁換上，大家打開網址就是新版。':'改完匯出新檔案分享給同仁。')+(overridesStale?' 這個瀏覽器另有其他版本的修改，未套用。':'')+'</span><span class="actions"><button type="button" class="small primary" data-act="maintExport" data-ed="guide">匯出引導員版</button><button type="button" class="small" data-act="maintExport" data-ed="reviewer">匯出審查人員版</button><button type="button" class="small" data-act="maintDiscard"'+(n?'':' disabled')+'>放棄全部修改</button><button type="button" class="small" data-act="maint">結束維護</button></span>';
}


/* ---------- 頁面：總覽 ---------- */
function legendHtml(t){return '<ul class="legend">'+STATUS_ORDER.map(([k,l])=>'<li class="lg-'+k+'"><i></i>'+l+'<b class="tnum">'+t[k]+'</b></li>').join('')+(t.na?'<li class="lg-na"><i></i>不需要<b class="tnum">'+t.na+'</b></li>':'')+'</ul>';}
function stackHtml(t){
 const total=t.total||1;
 const seg=STATUS_ORDER.filter(([k])=>k!=='todo'&&t[k]).map(([k])=>'<span class="k-'+k+'" style="width:'+(t[k]/total*100)+'%"></span>').join('');
 const aria=STATUS_ORDER.map(([k,l])=>l+' '+t[k]).join('、');
 return '<div class="stack" role="img" aria-label="'+esc(aria)+'">'+seg+'</div>'+legendHtml(t);
}
function donutHtml(t,size=156){
 const aria='繳交資料：'+STATUS_ORDER.map(([k,l])=>l+' '+t[k]).join('、');
 return '<div class="donut" role="img" aria-label="'+esc(aria)+'">'+ring([{v:t.done,cls:'k-done'},{v:t.verify,cls:'k-verify'},{v:t.progress,cls:'k-progress'},{v:t.fix,cls:'k-fix'}],t.total,size,size>120?15:9)+'<div class="donut-c"><b class="tnum">'+t.done+'<span>/'+t.total+'</span></b><small>已完成</small></div></div>';
}
function primaryNext(){
 const key=scopeKey(),so=scopeObj(),md=modeDef();
 if(!state.caseName.trim())return {icon:'user',title:'先填個案名稱',sub:'進度摘要、報告和需修改清單都會帶出個案名稱。',focus:'caseName',btn:'填寫個案'};
 if(!so.date)return {icon:'tasks',title:'設定'+md.dateLabel,sub:'設定後自動算出寄達期限（'+md.deadline.text+'）。',focus:'scopeDate',btn:'設定日期'};
 const open=state.issues.filter(i=>i.scope===key&&i.status==='open');
 if(open.length)return {icon:'issues',title:'先處理 '+open.length+' 項需修改',sub:open.slice(0,2).map(i=>(i.itemId?shortName(i.itemId)+'：':'')+i.text).join('；')+(open.length>2?'…':''),href:'#/issues',btn:'去修改'};
 const todo=itemIds().filter(id=>['todo','progress'].includes(itemStatus(id).key));
 const ordered=todo.filter(id=>CONTENT.items[id].star).concat(todo.filter(id=>!CONTENT.items[id].star));
 if(ordered.length){const id=ordered[0],s=itemStatus(id);return {icon:'docs',title:CONTENT.items[id].name.replace(/^★/,''),sub:(s.key==='progress'?'進行中，完成條件 '+s.n+'/'+s.m:'還沒開始')+'。這一次還有 '+ordered.length+' 項要準備。',href:'#/item/'+id,btn:'開始準備'};}
 const fixed=state.issues.filter(i=>i.scope===key&&i.status==='fixed'&&i.rid);
 if(fixed.length)return {icon:'send',title:'回傳修改進度',sub:fixed.length+' 項已修改，回傳後審查人員就能確認。',href:'#/issues',btn:'去回傳'};
 const f=md.flows.find(x=>!so.flows[x.id]);
 if(f)return {icon:'check',title:'資料都準備好了',sub:'目前流程：'+f.title+'。',href:'',btn:''};
 return {icon:'check',title:'全部完成',sub:'這一次要交的資料都準備好了。',href:'',btn:''};
}
function flowLine(){
 const md=modeDef(),so=scopeObj(),cur=md.flows.findIndex(x=>!so.flows[x.id]);
 const sel=ui.flowOpen>=0&&ui.flowOpen<md.flows.length?ui.flowOpen:(cur<0?md.flows.length-1:cur);
 let h='<ol class="steps" style="--n:'+md.flows.length+'">'+md.flows.map((f,i)=>{const on=!!so.flows[f.id];return '<li class="'+(on?'done':'')+(i===cur?' current':'')+'"><button type="button" data-act="flowOpen" data-i="'+i+'" aria-pressed="'+(i===sel)+'" aria-label="第 '+(i+1)+' 步：'+esc(f.title)+(on?'，已完成':i===cur?'，目前這一步':'')+'"><span class="dot">'+(on?ico('check'):i+1)+'</span><span class="st">'+esc(f.title)+'</span></button></li>';}).join('')+'</ol>';
 const f=md.flows[sel],on=!!so.flows[f.id];
 h+='<div class="stepdetail"><h3>第 '+(sel+1)+' 步：'+esc(f.title)+'</h3><p>'+esc(f.desc)+'</p>'+(f.items&&f.items.length?'<div class="links">'+f.items.filter(id=>CONTENT.items[id]).map(id=>'<a class="chiplink" href="#/item/'+id+'">'+esc(CONTENT.items[id].name.replace(/^★/,''))+'</a>').join('')+'</div>':'')+'<label class="check"><input type="checkbox" data-act="flow" data-id="'+f.id+'" data-fk="flow:'+f.id+'"'+(on?' checked':'')+'>這一步已完成</label></div>';
 return h;
}
function nextActions(){
 const key=scopeKey(),out=[],so=scopeObj(),md=modeDef();
 const open=state.issues.filter(i=>i.scope===key&&i.status==='open');
 open.slice(0,3).forEach(i=>out.push({tag:i.kind==='missing'?'缺件':'需修改',cls:'fix',href:i.itemId?'#/item/'+i.itemId:'#/issues',title:i.itemId?CONTENT.items[i.itemId].name:'整體',sub:i.text===KIND_LABELS[i.kind]?'':i.text}));
 if(open.length>3)out.push({tag:'需修改',cls:'fix',href:'#/issues',title:'另有 '+(open.length-3)+' 項需修改',sub:''});
 const f=md.flows.find(x=>!so.flows[x.id]);if(f)out.push({tag:'流程',cls:'',title:'第 '+(md.flows.indexOf(f)+1)+' 步：'+f.title,sub:f.desc});
 const due=state.tasks.filter(x=>!x.done&&x.date&&daysUntil(x.date)<=7).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
 due.forEach(x=>{const n=daysUntil(x.date);out.push({tag:'待辦',cls:'due',href:'#/tasks',title:x.text,sub:fmt(x.date)+'，'+(n<0?'已逾期 '+(-n)+' 天':n===0?'今天到期':'剩 '+n+' 天')});});
 const todo=itemIds().filter(id=>['todo','progress'].includes(itemStatus(id).key));
 const ordered=todo.filter(id=>CONTENT.items[id].star).concat(todo.filter(id=>!CONTENT.items[id].star));
 ordered.slice(0,3).forEach(id=>{const s=itemStatus(id);out.push({tag:'繳交資料',cls:'',href:'#/item/'+id,title:CONTENT.items[id].name,sub:s.label+(s.m?'，完成條件 '+s.n+'/'+s.m:'')});});
 return out;
}
function pageOverview(){
 const key=scopeKey(),md=modeDef(),so=scopeObj(),t=tally(),dl=deadline(),nx=primaryNext();
 let h='<div class="pagehead"><div><p class="kicker">'+esc(scopeLabel())+(state.caseName?'｜'+esc(state.caseName):'')+'</p><h1 tabindex="-1">總覽</h1></div><div class="actions"><button type="button" data-act="copySummary">'+ico('copy')+'複製進度摘要</button><button type="button" data-act="printReport">列印報告</button></div></div>';
 if(upgradeNotice)h+='<div class="notice warn"><p>'+esc(upgradeNotice)+' <button type="button" class="small" data-act="dismissUpgrade">知道了</button></p></div>';
 if(loadIssue==='corrupt')h+='<div class="notice bad"><p>原本保存的資料無法讀取，為避免覆蓋，暫停自動保存。請按「還原」，或按頁尾「清除此機進度」重新開始。</p></div>';
 if(state.seenNews!==NEWS&&hasData(state))h+='<div class="notice news">'+ico('spark')+'<div><p><strong>新功能：計畫書與附件</strong>　和小老闆一起填一次，直接產生 Word 計畫書和 Excel 附件（債務現況盤點表、營運結構、營運財務預估、資金需求及設備購買表），數字自動計算。</p><div class="actions"><a class="btn small primary" href="#/plan" data-act="dismissNewsGo">去填寫</a><button type="button" class="small" data-act="dismissNews">知道了</button></div></div></div>';
 h+='<div class="hero">';
 h+='<section class="card hero-progress" aria-labelledby="hpT">'+donutHtml(t)+'<div class="hp-side"><h2 id="hpT">繳交資料</h2><p class="muted">應備 '+t.total+' 項'+(t.na?'，不需要 '+t.na+' 項':'')+'</p>'+legendHtml(t)+'<a class="textlink" href="#/docs">打開清單</a></div></section>';
 h+='<section class="card hero-next" aria-labelledby="nxT"><h2 class="cardlabel" id="nxT">下一步</h2><div class="nx">'+ico(nx.icon,'nx-ico')+'<div><p class="nx-title">'+esc(nx.title)+'</p><p class="nx-sub">'+esc(nx.sub)+'</p></div></div>'+(nx.href?'<a class="btn primary" href="'+esc(nx.href)+'">'+esc(nx.btn)+'</a>':nx.focus?'<button type="button" class="primary" data-act="focusField" data-f="'+nx.focus+'">'+esc(nx.btn)+'</button>':'')+'</section>';
 h+='</div>';
 const openN=state.issues.filter(i=>i.scope===key&&i.status==='open').length,fixedN=state.issues.filter(i=>i.scope===key&&i.status==='fixed').length,dueN=state.tasks.filter(x=>!x.done&&x.date&&daysUntil(x.date)<=7).length;
 h+='<div class="stats"><a class="stat st-fix" href="#/issues"><b class="tnum">'+openN+'</b><span>需修改</span></a><a class="stat st-verify" href="#/issues"><b class="tnum">'+fixedN+'</b><span>已修改、等確認</span></a><a class="stat st-due" href="#/tasks"><b class="tnum">'+dueN+'</b><span>7 天內到期的待辦</span></a></div>';
 h+='<div class="cols">';
 h+='<section class="card flowcard"><h2>流程<span class="sub">'+md.flows.filter(x=>so.flows[x.id]).length+' / '+md.flows.length+' 步</span></h2>'+flowLine()+'</section>';
 h+='<section class="card casecard"><h2>案件資料</h2><label class="field">個案（姓名或代稱）<input id="caseName" data-bind="caseName" maxlength="120" autocomplete="off" value="'+esc(state.caseName)+'"></label>';
 h+='<label class="field">'+(state.mode==='later'?'第 '+state.round+' 次動撥的':'')+esc(md.dateLabel)+'<input type="date" id="scopeDate" data-act="scopeDate" data-fk="scopeDate" value="'+esc(so.date)+'"><small>'+esc(md.deadline.text)+'。'+(dl?'寄達期限：'+fmt(dl.due)+'。':'')+'</small></label>';
 if(key==='first'&&!so.date&&state.first.legacyMonth)h+='<p class="hint">舊版設定的審查月份：'+esc(state.first.legacyMonth.slice(0,4))+' 年 '+Number(state.first.legacyMonth.slice(5,7))+' 月。請補上審查日期，才能計算寄達期限。</p>';
 h+='<div class="actions"><button type="button" data-act="deadlineTask"'+(dl?'':' disabled')+'>'+ico('tasks')+'把寄達期限加入待辦</button></div></section>';
 h+='</div>';
 const next=nextActions();
 h+='<details class="card more"'+(ui.moreOpen?' open':'')+' data-more="1"><summary><h2>所有待處理<span class="sub">'+next.length+' 項</span></h2>'+CHEV+'</summary>'+(next.length?'<ol class="next">'+next.map(x=>'<li><span class="tag '+x.cls+'">'+esc(x.tag)+'</span><div>'+(x.href?'<a href="'+esc(x.href)+'">'+esc(x.title)+'</a>':'<strong>'+esc(x.title)+'</strong>')+(x.sub?'<small>'+esc(x.sub)+'</small>':'')+'</div></li>').join('')+'</ol>':'<p class="empty">目前沒有待處理的事項。</p>')+'</details>';
 return h;
}

/* ---------- 頁面：繳交資料 ---------- */
function matchFilter(s,f){if(f==='all')return true;if(f==='open')return ['todo','progress','fix','missing','verify'].includes(s.key);if(f==='fix')return ['fix','missing','verify'].includes(s.key);if(f==='done')return s.key==='done';return true;}
function critChecks(id,key){
 const cl=critList(id,key),na=getRec(key,id).na&&CONTENT.items[id].allowNA;
 return '<ul class="checks">'+cl.map(c=>{
  if(c.auto)return '<li><label class="check"><input type="checkbox" disabled'+(c.on?' checked':'')+'><span>'+esc(c.text)+'</span></label><div class="auto'+(c.info.ok===false?' bad':'')+'">'+esc(c.info.text)+'</div></li>';
  const via=c.on&&getRec(key,id).via[c.id]==='tool';
  return '<li><label class="check"><input type="checkbox" data-act="crit" data-id="'+id+'" data-c="'+esc(c.id)+'" data-fk="crit:'+id+':'+esc(c.id)+'"'+(c.on?' checked':'')+(na||RV?' disabled':'')+'><span>'+esc(c.text)+(via?' <em class="viatag">'+ico('check')+'工具檢查通過</em>':'')+'</span></label></li>';
 }).join('')+'</ul>';
}
function fieldInputs(id,key){
 const def=CONTENT.items[id];if(!def.fields)return '';const r=getRec(key,id);
 return '<div class="fieldrow">'+def.fields.map(f=>'<label class="field">'+esc(f.label)+'<input type="date" data-act="field" data-id="'+id+'" data-f="'+esc(f.id)+'" data-fk="field:'+id+':'+esc(f.id)+'" value="'+esc(r.fields[f.id]||'')+'"></label>').join('')+'</div>';
}
function rowHtml(id,key){
 const def=CONTENT.items[id],s=itemStatus(id,key),r=getRec(key,id),star=def.star||def.name.startsWith('★');
 const name='<span class="rname'+(star?' star':'')+'">'+esc(def.name.replace(/^★/,''))+'<small>'+esc(def.method||'—')+'</small></span>';
 if(def.kind==='operation'){
  return '<li class="row op"><div class="opline">'+pillHtml(s)+name+'<select class="opsel" data-act="op" data-fk="op" aria-label="進案前營運狀態">'+Object.entries(OP_LABELS).map(([k,v])=>'<option value="'+k+'"'+(state.first.operation===k?' selected':'')+'>'+v+'</option>').join('')+'</select></div></li>';
 }
 const iss=itemIssues(id,key).filter(i=>i.status!=='done');
 const meta=[];if(s.m&&s.key!=='na'&&s.key!=='locked')meta.push('條件 '+s.n+'/'+s.m);if(iss.length)meta.push('需修改 '+iss.length);if(r.note)meta.push('有備註');
 const open=ui.openRows.has(key+':'+id);
 let body='';
 if(s.key==='locked')body='<p class="hint">'+esc(def.guide||'這一次動撥不需要。')+'</p><a href="#/item/'+id+'">看作業說明</a>';
 else{
  if(s.legacy)body+='<p class="legacy-tag">沿用舊版的「完成」狀態。勾選任何一項完成條件後，改依完成條件判斷。</p>';
  if(iss.length)body+='<ul class="issue-mini">'+iss.map(i=>'<li class="'+(i.status==='fixed'?'fixed':'')+'">'+esc(issueLabel(i))+(i.status==='fixed'?'（已修改，待確認）':'')+'</li>').join('')+'</ul>';
  body+=critChecks(id,key)+fieldInputs(id,key);
  body+='<div class="rowtools">'+(def.allowNA?'<label class="check"><input type="checkbox" data-act="na" data-id="'+id+'" data-fk="na:'+id+'"'+(r.na?' checked':'')+'>這個案子不需要</label>':'')+'<button type="button" class="small" data-act="markMissing" data-id="'+id+'" data-fk="miss:'+id+'">標記缺件</button><a href="#/item/'+id+'">作業說明與需修改事項</a></div>';
  body+='<label class="field" style="margin-top:12px">備註<textarea rows="2" style="min-height:60px" data-bind="itemNote" data-id="'+id+'" placeholder="缺件原因、版本、寄出日期">'+esc(r.note)+'</textarea></label>';
 }
 return '<li class="row"><details data-row="'+key+':'+id+'"'+(open?' open':'')+'><summary>'+pillHtml(s)+name+'<span class="rmeta">'+esc(meta.join('，'))+'</span>'+CHEV+'</summary><div class="rbody">'+body+'</div></details></li>';
}
function pageDocs(){
 const key=scopeKey(),md=modeDef(),t=tally(),f=ui.docFilter;
 const counts={all:0,open:0,fix:0,done:0};
 itemIds().forEach(id=>{const s=itemStatus(id);if(s.key==='op')return;counts.all++;['open','fix','done'].forEach(k=>{if(matchFilter(s,k))counts[k]++;});});
 let h='<div class="pagehead"><h1 tabindex="-1">繳交資料</h1><div class="actions"><button type="button" class="small" data-act="expandAll">全部展開</button><button type="button" class="small" data-act="collapseAll">全部收合</button></div></div><p class="intro">'+esc(scopeLabel())+'：'+esc(md.intro)+'</p>';
 h+=stackHtml(t);
 h+='<div class="toolbar" style="margin-top:14px"><div class="seg" role="group" aria-label="篩選">'+[['all','全部'],['open','待處理'],['fix','需修改'],['done','已完成']].map(([k,l])=>'<button type="button" data-act="docFilter" data-f="'+k+'" aria-pressed="'+(f===k)+'">'+l+' '+counts[k]+'</button>').join('')+'</div></div>';
 let any=false;
 for(const g of md.groups){
  const ids=g.items.filter(id=>CONTENT.items[id]&&(f==='all'||matchFilter(itemStatus(id,key),f)));
  if(!ids.length)continue;any=true;
  const gs=g.items.filter(id=>CONTENT.items[id]).map(id=>itemStatus(id,key)).filter(s=>!['op','na','locked'].includes(s.key));
  h+='<section class="group"><div class="grouphead"><h2>'+esc(g.title)+'</h2><span>完成 '+gs.filter(s=>s.key==='done').length+' / '+gs.length+'</span></div><ul class="rows">'+ids.map(id=>rowHtml(id,key)).join('')+'</ul></section>';
 }
 if(!any)h+='<p class="empty">這個篩選條件下沒有項目。</p>';
 const L=state.legacy;
 if(key==='first'&&(L.docs.length||L.others.length||L.flows.length)){
  h+='<details class="block"><summary><strong>舊版紀錄（保留供對照，不計入進度）</strong></summary><div style="margin-top:12px">';
  if(L.flows.length)h+='<p><strong>舊版流程已勾選：</strong>'+esc(L.flows.join('、'))+'</p>';
  [...L.others,...L.docs].forEach(d=>{h+='<p class="small-text"><strong>'+esc(d.name)+'</strong>（'+esc(d.status)+'）'+(d.hint?'<br><span class="muted">'+esc(d.hint)+'</span>':'')+(d.note?'<br>'+esc(d.note):'')+'</p>';});
  h+='</div></details>';
 }
 h+='<p class="hint" style="margin-top:18px">依據：'+esc(key==='first'?CONTENT.sources.xlsx+' A1:F34':CONTENT.sources.a3)+'。名稱與收件方式依原資料，未註明的收件方式以「—」顯示。</p>';
 return h;
}

/* ---------- 頁面：單一項目 ---------- */
function inlineMarks(t){
 return esc(t).replace(/==([^=]+?)==/g,'<mark>$1</mark>').replace(/!!([^!]+?)!!/g,'<strong class="hl">$1</strong>').replace(/\*\*([^*]+?)\*\*/g,'<strong>$1</strong>');
}
function guideHtml(text){
 return String(text||'').split(/\n\s*\n/).map(b=>{
  let out='',kind='',items=[];
  const flush=()=>{if(!items.length)return;out+=kind==='ul'?'<ul>'+items.map(x=>'<li>'+inlineMarks(x)+'</li>').join('')+'</ul>':'<ul class="dodont">'+items.map(([ok,x])=>'<li class="'+(ok?'do':'dont')+'">'+ico(ok?'check':'x')+'<span>'+inlineMarks(x)+'</span></li>').join('')+'</ul>';items=[];kind='';};
  const push=(k,v)=>{if(kind&&kind!==k)flush();kind=k;items.push(v);};
  b.split('\n').forEach(l=>{const t=l.trim();if(!t)return;
   if(/^[✓✔]/.test(t))return push('dd',[true,t.replace(/^[✓✔]\s*/,'')]);
   if(/^[✗✘×]/.test(t))return push('dd',[false,t.replace(/^[✗✘×]\s*/,'')]);
   if(t.startsWith('- '))return push('ul',t.slice(2));
   flush();out+=t.startsWith('## ')?'<h3>'+inlineMarks(t.slice(3))+'</h3>':'<p>'+inlineMarks(t)+'</p>';});
  flush();return out;}).join('');
}
function issueRowHtml(i,opts={}){
 const def=i.itemId?CONTENT.items[i.itemId]:null,fromRv=!!i.rid;
 let acts='';
 if(i.status==='open')acts='<button type="button" class="small primary-lite" data-act="issueSet" data-s="fixed" data-id="'+esc(i.id)+'" data-fk="iss:'+esc(i.id)+'">'+ico('check')+'標記已修改</button>';
 else if(i.status==='fixed')acts=fromRv?'<span class="waiting">等審查人員確認</span><button type="button" class="small quiet" data-act="issueSet" data-s="open" data-id="'+esc(i.id)+'">退回待修改</button>':'<button type="button" class="small" data-act="issueSet" data-s="done" data-id="'+esc(i.id)+'" data-fk="iss:'+esc(i.id)+'">標記已確認</button><button type="button" class="small" data-act="issueSet" data-s="open" data-id="'+esc(i.id)+'">退回待修改</button>';
 else acts=fromRv?'':'<button type="button" class="small" data-act="issueSet" data-s="open" data-id="'+esc(i.id)+'" data-fk="iss:'+esc(i.id)+'">重新開啟</button>';
 const sel=opts.batch?'<input type="checkbox" data-act="issueSel" data-id="'+esc(i.id)+'" data-fk="isel:'+esc(i.id)+'" aria-label="選取：'+esc(i.text)+'"'+(ui.issueSel.has(i.id)?' checked':'')+'>':'<span class="pill '+(i.status==='open'?(i.kind==='missing'?'s-missing':'s-fix'):i.status==='fixed'?'s-verify':'s-done')+'">'+esc(i.status==='open'?KIND_LABELS[i.kind]:i.status==='fixed'?'待確認':'已確認')+'</span>';
 let body='<div class="itext">'+(i.level&&i.level!=='fix'?'<span class="lvbadge sm lv-'+i.level+'">'+LEVELS[i.level]+'</span> ':'')+esc(i.text)+'</div>';
 body+='<div class="imeta">'+(opts.showItem!==false?(def?'<a href="#/item/'+i.itemId+'">'+esc(def.name.replace(/^★/,''))+'</a>':'<span>整體</span>'):'')+(opts.batch?'<span>'+esc(KIND_LABELS[i.kind])+'・'+esc(ISSUE_STATUS[i.status])+'</span>':'')+'<span>來源：'+esc(fromRv?'審查人員':i.source)+'</span>'+(i.created?'<span>'+fmt(i.created)+' 建立</span>':'')+(i.closed?'<span>'+fmt(i.closed)+' 確認</span>':'')+'</div>';
 if(fromRv&&(i.where||i.suggest||i.rnote))body+='<details class="idetail"><summary>位置與建議</summary><dl>'+(i.where?'<dt>位置</dt><dd>'+esc(i.where)+'</dd>':'')+(i.suggest?'<dt>建議</dt><dd>'+esc(i.suggest)+'</dd>':'')+(i.rnote?'<dt>審查人員補充</dt><dd>'+esc(i.rnote)+'</dd>':'')+'</dl></details>';
 if(fromRv&&i.status!=='open'&&!opts.batch)body+='<label class="field inline">回覆審查人員（選填）<input data-bind="gnote" data-id="'+esc(i.id)+'" maxlength="500" value="'+esc(i.gnote)+'" placeholder="例如：已依時間重新排列"></label>';
 return '<li class="'+(i.status==='done'?'closed':'')+(fromRv?' fromrv':'')+'">'+sel+'<div>'+body+'</div><div class="iacts">'+(opts.batch?'':acts+'<button type="button" class="small quiet danger" data-act="issueDel" data-id="'+esc(i.id)+'">刪除</button>')+'</div></li>';
}
function issueFormHtml(itemId){
 const kinds='<label class="field">類型<select name="kind"><option value="fix">需修改</option><option value="missing">缺件待補</option></select></label>';
 const src='<label class="field">來源<select name="source">'+ISSUE_SOURCES.map(s=>'<option>'+esc(s)+'</option>').join('')+'</select></label>';
 const text='<label class="field wide">內容<input name="text" maxlength="500" required autocomplete="off" placeholder="例如：借款時間沒有依先後排列"></label>';
 if(itemId)return '<form class="issueform compact" data-form="issue" data-item="'+itemId+'">'+text+kinds+src+'<button class="primary">加入</button></form>';
 const opts='<option value="">整體（不屬於單一項目）</option>'+itemIds().filter(id=>CONTENT.items[id].kind!=='operation').map(id=>'<option value="'+id+'">'+esc(short(CONTENT.items[id].name,30))+'</option>').join('');
 return '<form class="issueform" data-form="issue"><label class="field">項目<select name="item">'+opts+'</select></label>'+text+kinds+src+'<button class="primary">加入</button></form>';
}
function issueSection(id,key){
 const def=CONTENT.items[id],iss=itemIssues(id,key),openN=iss.filter(i=>i.status!=='done').length,show=ui.itemForm.has(id);
 let h='<section class="card issuecard"><div class="cardhead"><h2>需修改事項<span class="sub">'+(openN?'未完成 '+openN+' 項':'目前沒有')+'</span></h2><button type="button" class="small" data-act="itemForm" data-id="'+id+'" aria-expanded="'+show+'">'+ico(show?'x':'plus')+(show?'收起':'記錄需修改')+'</button></div>';
 if(iss.length)h+='<ul class="ilist">'+iss.map(i=>issueRowHtml(i,{showItem:false})).join('')+'</ul>';
 if(show){
  const have=new Set(iss.filter(i=>i.status!=='done').map(i=>i.text));
  h+='<div class="addpanel">';
  if(def.commonIssues&&def.commonIssues.length)h+='<p class="hint" style="margin:0 0 8px">審查時常見的問題，點一下加入：</p><div class="chips">'+def.commonIssues.map(x=>'<button type="button" data-act="quickIssue" data-id="'+id+'" data-text="'+esc(x)+'"'+(have.has(x)?' disabled aria-label="已加入：'+esc(x)+'"':'')+'>'+(have.has(x)?'✓ ':'')+esc(x)+'</button>').join('')+'</div>';
  h+=issueFormHtml(id)+'</div>';
 }
 return h+'</section>';
}
function pageItem(id){
 const def=CONTENT.items[id];
 if(!def)return '<h1 tabindex="-1">找不到這個項目</h1><p><a href="'+(RV?'#/catalog':'#/docs')+'">回到清單</a></p>';
 const mode=modeOfItem(id);
 if(!RV&&mode!==state.mode)return '<h1 tabindex="-1">'+esc(def.name)+'</h1><div class="notice warn"><p>這一項屬於「'+esc(CONTENT.modes[mode].label)+'」。<button type="button" class="small" data-act="mode" data-mode="'+mode+'">切換到'+esc(CONTENT.modes[mode].label)+'</button></p></div>';
 const key=RV?(mode==='first'?'first':'r3'):scopeKey(),ids=itemIds(key),idx=ids.indexOf(id),g=groupOf(id,key),s=itemStatus(id,key),r=getRec(key,id);
 let h='<nav class="crumbs" aria-label="位置"><a href="'+(RV?'#/catalog':'#/docs')+'">'+(RV?'文件與審查重點':'繳交資料')+'</a> ／ '+(RV?esc(CONTENT.modes[mode].label)+' ／ ':'')+esc(g?g.title:'')+' ／ 第 '+(idx+1)+' 項，共 '+ids.length+' 項</nav>';
 h+='<div class="itemhead"><h1 tabindex="-1">'+esc(def.name)+'</h1>'+(RV?'':pillHtml(s))+'</div>';
 h+='<div class="itemmeta"><span>收件方式：'+esc(def.method||'—')+'</span>'+(srcText(def)?'<details class="srcmeta"><summary>依據的文章與表單</summary><p>'+esc(srcText(def))+'</p></details>':'')+'</div>';
 if(RV)h+='<div class="notice">'+ico('user')+'<p>這是引導員看到的內容（預覽）。'+(ui.maint?'下方可以直接修改作業說明、完成條件和審查重點。':'要修改，請按頁尾「維護內容」。')+'</p></div>';
 if(def.kind==='operation'){
  h+='<div class="card"><div class="guide">'+guideHtml(def.guide)+'</div>'+(RV?'':'<label class="field" style="max-width:260px;margin-top:10px">進案前營運狀態<select data-act="op" data-fk="op">'+Object.entries(OP_LABELS).map(([k,v])=>'<option value="'+k+'"'+(state.first.operation===k?' selected':'')+'>'+v+'</option>').join('')+'</select></label>')+'</div>';
 }else{
  h+='<div class="cols item-cols"><section class="card critcard"><h2>完成條件<span class="sub">'+(s.m&&!RV?s.n+' / '+s.m:'')+'</span></h2>';
  if(s.key==='locked'&&!RV)h+='<p class="hint">這一次動撥不需要這一項。</p>';
  else{
   if(s.legacy)h+='<p class="legacy-tag">沿用舊版的「完成」狀態。勾選任何一項完成條件後，改依完成條件判斷。</p>';
   h+=critChecks(id,key)+(RV?'':fieldInputs(id,key));
   if(!RV){
    h+='<div class="rowtools"><button type="button" class="small" data-act="critAll" data-id="'+id+'">全部勾選</button><button type="button" class="small" data-act="critNone" data-id="'+id+'">全部清除</button>'+(def.allowNA?'<label class="check"><input type="checkbox" data-act="na" data-id="'+id+'" data-fk="na:'+id+'"'+(r.na?' checked':'')+'>這個案子不需要</label>':'')+'</div>';
    h+='<details class="notebox"'+(r.note?' open':'')+'><summary>備註'+(r.note?'（有內容）':'')+'</summary><textarea rows="3" aria-label="備註" data-bind="itemNote" data-id="'+id+'" placeholder="缺件原因、版本、寄出日期">'+esc(r.note)+'</textarea></details>';
   }
  }
  if(!RV&&PLAN_LINKS[id]){const [sec,sub]=PLAN_LINKS[id];h+='<a class="toollink planlink" href="#/plan/'+sec+'">'+ico('plan')+'<span>在「計畫書與附件」填寫、產生<small>'+esc(sub)+'</small></span>'+CHEV+'</a>';}
  if(def.tool&&!RV){const tl=TOOLS.find(x=>x.id===def.tool);if(tl)h+='<a class="toollink" href="#/tools/'+tl.id+'">'+ico(tl.icon||'tools')+'<span>用「'+esc(tl.name)+'」檢查<small>'+esc(tl.short||'')+'</small></span>'+CHEV+'</a>';}
  h+='</section><section class="card guidecard"><h2>作業說明</h2><div class="guide">'+(def.guide?guideHtml(def.guide):'<p class="pendingnote">這一項的作業說明還沒補上。先依完成條件確認；有疑問請洽公司窗口或顧問。</p>')+'</div>';
  if(def.tips&&def.tips.length)h+='<ul class="tips">'+def.tips.map(x=>'<li>'+ico('spark')+'<span>'+inlineMarks(x)+'</span></li>').join('')+'</ul>';
  if(RV&&def.commonIssues&&def.commonIssues.length)h+='<h3 class="subhead">審查重點（引導員也看得到）</h3><ul class="reviewpoints">'+def.commonIssues.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
  (def.images||[]).forEach((im,i)=>{
   const c=im.crit&&(def.criteria||[]).find(x=>x.id===im.crit);
   h+='<figure class="figure"><figcaption><span>'+esc(im.title||'範例')+'</span>'+(c&&s.key!=='locked'&&!RV?'<label class="check"><input type="checkbox" data-act="crit" data-id="'+id+'" data-c="'+esc(c.id)+'" data-fk="img:'+id+':'+esc(c.id)+'"'+(r.crit[c.id]?' checked':'')+'>這部分已完成</label>':'')+'</figcaption><button type="button" class="imgbtn" data-act="zoom" data-id="'+id+'" data-i="'+i+'" aria-label="放大查看'+esc(im.title||'範例圖片')+'"><img src="'+esc(im.src)+'" alt="'+esc(im.alt||im.title||'')+'" loading="lazy"></button></figure>';
  });
  h+='</section></div>';
  if(s.key!=='locked'&&!RV)h+=issueSection(id,key);
 }
 const prev=ids[idx-1],next=ids[idx+1];
 h+='<nav class="pager" aria-label="上一項與下一項">'+(prev?'<a href="#/item/'+prev+'"><small>上一項</small>'+esc(CONTENT.items[prev].name)+'</a>':'')+(next?'<a class="next-link" href="#/item/'+next+'"><small>下一項</small>'+esc(CONTENT.items[next].name)+'</a>':'')+'</nav>';
 if(ui.maint&&RV&&def.kind!=='operation')h+=editorHtml(id);
 return h;
}

/* ---------- 頁面：需修改事項 ---------- */
function shownIssues(){const key=scopeKey(),f=ui.issueFilter;return state.issues.filter(i=>i.scope===key&&(f==='all'||i.status===f));}
function exchangeHero(){
 const key=scopeKey(),rv=state.issues.filter(i=>i.scope===key&&i.rid);
 const total=rv.length,fixed=rv.filter(i=>i.status==='fixed').length,doneN=rv.filter(i=>i.status==='done').length,openN=total-fixed-doneN;
 if(!total)return '<section class="card exchange is-empty" data-drop="issues">'+ico('inbox','ex-ico')+'<div class="ex-body"><h2>審查人員的修改意見</h2><p>收到審查人員給的「需修改清單」檔案時，按這裡匯入。每一項會出現在對應的資料上，改好再回傳。</p></div><div class="ex-acts"><button type="button" class="primary" data-act="xImport">'+ico('upload')+'匯入需修改清單</button></div></section>';
 return '<section class="card exchange" data-drop="issues"><div class="donut sm">'+ring([{v:doneN,cls:'k-done'},{v:fixed,cls:'k-verify'}],total,112,11)+'<div class="donut-c"><b class="tnum">'+(fixed+doneN)+'<span>/'+total+'</span></b><small>已改好</small></div></div><div class="ex-body"><h2>審查人員的修改意見</h2><p>待修改 '+openN+' 項、已修改等確認 '+fixed+' 項、已確認 '+doneN+' 項。'+(openN?'改好一項，就按「標記已修改」。':'都改好了，記得回傳。')+'</p></div><div class="ex-acts"><button type="button" class="primary" data-act="xReply"'+(fixed||doneN?'':' disabled')+'>'+ico('send')+'回傳修改進度</button><button type="button" data-act="xImport">'+ico('upload')+'匯入新的清單</button></div></section>';
}
function pageIssues(){
 const key=scopeKey(),all=state.issues.filter(i=>i.scope===key),f=ui.issueFilter;
 const cnt={open:all.filter(i=>i.status==='open').length,fixed:all.filter(i=>i.status==='fixed').length,done:all.filter(i=>i.status==='done').length,all:all.length};
 const shown=all.filter(i=>f==='all'||i.status===f);
 let h='<div class="pagehead"><div><p class="kicker">'+esc(scopeLabel())+'</p><h1 tabindex="-1">需修改事項</h1></div></div>';
 h+=exchangeHero();
 h+='<div class="listbar"><div class="seg" role="group" aria-label="篩選">'+[['open','待修改'],['fixed','待確認'],['done','已確認'],['all','全部']].map(([k,l])=>'<button type="button" data-act="issueFilter" data-f="'+k+'" aria-pressed="'+(f===k)+'">'+l+' '+cnt[k]+'</button>').join('')+'</div><div class="actions"><button type="button" class="small" data-act="issueAdd" aria-expanded="'+ui.issueAdd+'">'+ico(ui.issueAdd?'x':'plus')+(ui.issueAdd?'收起':'自己新增一項')+'</button><button type="button" class="small" data-act="issueBatch" aria-pressed="'+ui.issueBatch+'">'+(ui.issueBatch?'結束批次管理':'批次管理')+'</button></div></div>';
 if(ui.issueAdd)h+='<section class="card addpanel">'+issueFormHtml('')+'</section>';
 if(ui.issueBatch){const n=[...ui.issueSel].filter(id=>shown.some(i=>i.id===id)).length;h+='<div class="batchbar" role="region" aria-label="批次操作"><strong>已選 '+n+' 項</strong><button type="button" class="small" data-act="issueSelAll">全選目前顯示的 '+shown.length+' 項</button><button type="button" class="small" data-act="issueSelNone">取消選取</button><button type="button" class="small" data-act="issueBatchSet" data-s="fixed"'+(n?'':' disabled')+'>標記已修改</button><button type="button" class="small" data-act="issueBatchSet" data-s="done"'+(n?'':' disabled')+'>標記已確認</button><button type="button" class="small danger" data-act="issueBatchDel"'+(n?'':' disabled')+'>刪除選取的 '+n+' 項</button></div>';}
 h+='<section class="card">'+(shown.length?'<ul class="ilist">'+shown.map(i=>issueRowHtml(i,{batch:ui.issueBatch})).join('')+'</ul>':'<p class="empty">'+(f==='open'?'沒有待修改的事項。':'這個篩選條件下沒有事項。')+'</p>')+'</section>';
 const others=[];['first',...ROUNDS.map(r=>'r'+r)].forEach(k=>{if(k===key)return;const n=state.issues.filter(i=>i.scope===k&&i.status!=='done').length;if(n)others.push(scopeLabel(k)+' '+n+' 項');});
 if(others.length)h+='<p class="hint">其他階段未完成：'+esc(others.join('、'))+'。切換上方的動撥階段即可查看。</p>';
 h+='<details class="card more"'+(state.reviewNotes?' open':'')+'><summary><h2>審查回覆紀錄</h2>'+CHEV+'</summary><textarea aria-label="審查回覆紀錄" data-bind="reviewNotes" placeholder="記錄日期、回覆內容、補件項目與期限">'+esc(state.reviewNotes)+'</textarea></details>';
 return h;
}

/* ---------- 審查往返（引導員端）：匯入需修改清單、回傳修改進度 ---------- */
function parseExchangeText(text){
 const t=String(text||'').replace(/^﻿/,'').trim();
 const tryJSON=x=>{try{return JSON.parse(x);}catch(e){return null;}};
 let obj=tryJSON(t);
 if(!obj){const m=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(m)obj=tryJSON(m[1].trim());}
 if(!obj){const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a)obj=tryJSON(t.slice(a,b+1));}
 if(obj&&typeof obj==='object'){
  if(obj.type==='startup-loan-review-issues')return {kind:'issues',data:obj};
  if(obj.type==='startup-loan-review-reply')return {kind:'reply',data:obj};
  if([1,2,3].includes(obj.version)&&!obj.findings)return {kind:'backup',data:obj};
  if(obj.type==='ai-review-result'||Array.isArray(obj.findings)||Array.isArray(obj)||Array.isArray(obj['發現']))return {kind:'ai',data:obj};
 }
 if(typeof parseMdTable==='function'){const rows=parseMdTable(t);if(rows.length)return {kind:'ai',data:{findings:rows}};}
 return {kind:'unknown'};
}
function importReviewIssues(obj){
 const stage=['first','r2','r3','r4','r5'].includes(obj.stage)?obj.stage:'first';
 const items=(Array.isArray(obj.items)?obj.items:[]).slice(0,1000);
 if(!items.length)return {error:'清單裡沒有需修改事項。'};
 const cn=String(obj.caseName||'').trim();
 if(state.caseName.trim()&&cn&&state.caseName.trim()!==cn&&!confirm('清單上的個案是「'+cn+'」，目前工具裡是「'+state.caseName+'」。確定要匯入嗎？'))return {cancel:true};
 snapshot('匯入需修改清單');
 if(!state.caseName.trim()&&cn)state.caseName=cn.slice(0,120);
 const rid=typeof obj.rid==='string'&&ID_RE.test(obj.rid)?obj.rid:uid();let add=0,upd=0;
 items.forEach(x=>{
  if(!x||typeof x!=='object')return;
  const n=normIssue({id:x.id,scope:stage,itemId:x.itemId,text:x.text,source:'公司書面審查',kind:x.kind,status:x.status,created:todayISO(),rid,where:x.where,suggest:x.suggest,level:x.level,rnote:x.rnote,upd:x.upd});
  if(!n)return;
  const cur=state.issues.find(i=>i.id===n.id);
  if(!cur){state.issues.push(n);add++;return;}
  Object.assign(cur,{text:n.text,where:n.where,suggest:n.suggest,level:n.level,rnote:n.rnote,itemId:n.itemId,rid,scope:stage,source:'公司書面審查'});
  if(!cur.upd||(n.upd&&n.upd>cur.upd)){if(cur.status!==n.status){cur.status=n.status;cur.closed=n.status==='done'?todayISO():'';}cur.upd=n.upd||cur.upd;}
  upd++;
 });
 if(stage==='first')state.mode='first';else{state.mode='later';state.round=stage.slice(1);}
 ui.issueFilter='open';
 return {add,upd,stage};
}
function replyFile(){
 const key=scopeKey(),list=state.issues.filter(i=>i.scope===key&&i.rid);
 return {type:'startup-loan-review-reply',v:1,caseName:state.caseName,stage:key,at:nowStamp(),items:list.map(i=>({id:i.id,rid:i.rid,status:i.status,gnote:i.gnote,upd:i.upd}))};
}
async function guideFile(file){
 if(file.size>5000000){alert('檔案太大（上限 5 MB）');return;}
 let text='';try{text=await file.text();}catch(e){toast('無法讀取這個檔案');return;}
 const p=parseExchangeText(text);
 if(p.kind!=='issues'){alert(p.kind==='reply'?'這是引導員的「修改回覆」檔，要由審查人員匯入。':p.kind==='ai'?'這是 AI 審查結果，要由審查人員匯入。':p.kind==='backup'?'這是備份檔，請按「還原」匯入。':'看不懂這個檔案。請選擇審查人員給的「需修改清單」檔案。');return;}
 const res=importReviewIssues(p.data);
 if(res.error){alert(res.error);return;}if(res.cancel)return;
 if(route().page!=='issues')location.hash='#/issues';
 done('匯入需修改清單','已匯入'+scopeLabel(res.stage)+'的需修改清單：新增 '+res.add+' 項'+(res.upd?'、更新 '+res.upd+' 項':''));
}

/* ---------- 頁面：待辦與紀錄 ---------- */
function pageTasks(){
 const list=state.tasks;
 let h='<div class="pagehead"><h1 tabindex="-1">待辦與紀錄</h1></div><p class="intro">打開頁面時顯示到期提醒；不會在背景發送通知。</p>';
 h+='<section class="block"><div class="listbar" style="margin-top:0"><h2>待辦</h2><button type="button" class="small" data-act="taskBatch" aria-pressed="'+ui.taskBatch+'">'+(ui.taskBatch?'結束批次管理':'批次管理')+'</button></div>';
 if(ui.taskBatch){const n=[...ui.taskSel].filter(id=>list.some(t=>t.id===id)).length;h+='<div class="batchbar" role="region" aria-label="批次操作"><strong>已選 '+n+' 項</strong><button type="button" class="small" data-act="taskSelAll">全選 '+list.length+' 項</button><button type="button" class="small" data-act="taskSelDone">選取已完成的 '+list.filter(t=>t.done).length+' 項</button><button type="button" class="small" data-act="taskSelNone">取消選取</button><button type="button" class="small" data-act="taskBatchDone"'+(n?'':' disabled')+'>標記完成</button><button type="button" class="small danger" data-act="taskBatchDel"'+(n?'':' disabled')+'>刪除選取的 '+n+' 項</button></div>';}
 h+=list.length?'<div>'+list.map(t=>{const n=t.date?daysUntil(t.date):null;const due=t.done?'已完成':t.date?(n<0?'已逾期 '+(-n)+' 天':n===0?'今天到期':'剩 '+n+' 天'):'未設定期限';
  return '<div class="trow'+(t.done?' finished':'')+'">'+(ui.taskBatch?'<input type="checkbox" data-act="taskSel" data-id="'+esc(t.id)+'" data-fk="tsel:'+esc(t.id)+'" aria-label="選取：'+esc(t.text)+'"'+(ui.taskSel.has(t.id)?' checked':'')+'>':'<input type="checkbox" data-act="taskDone" data-id="'+esc(t.id)+'" data-fk="tdone:'+esc(t.id)+'" aria-label="完成：'+esc(t.text)+'"'+(t.done?' checked':'')+'>')+'<div class="ttext">'+esc(t.text)+'<small class="'+(!t.done&&n!==null&&n<0?'overdue':'')+'">'+esc(due)+'</small></div><input type="date" data-act="taskDate" data-id="'+esc(t.id)+'" data-fk="tdate:'+esc(t.id)+'" aria-label="到期日：'+esc(t.text)+'" value="'+esc(t.date)+'">'+(ui.taskBatch?'<span></span>':'<button type="button" class="small quiet danger" data-act="taskDel" data-id="'+esc(t.id)+'">刪除</button>')+'</div>';}).join('')+'</div>':'<p class="empty">還沒有待辦。例如：「寄出紙本（信扶專案收）」並設定日期。</p>';
 h+='<form class="addrow" data-form="task"><input type="text" name="text" maxlength="250" required aria-label="新增待辦內容" placeholder="新增待辦"><input type="date" name="date" aria-label="待辦到期日"><button class="primary">新增待辦</button></form></section>';
 h+='<section class="block"><label class="field">與公司、顧問確認的事項<textarea data-bind="meetingNotes" placeholder="記錄詢問日期、對方回覆，以及下一步要做什麼">'+esc(state.meetingNotes)+'</textarea></label></section>';
 return h;
}

/* ---------- 頁面：檢核工具 ---------- */
function pageTools(arg){
 const tl=TOOLS.find(t=>t.id===arg);
 if(!tl)return '<div class="pagehead"><div><p class="kicker">送件前先自己檢查</p><h1 tabindex="-1">檢核工具</h1></div></div><p class="intro">計算與檢查都在這個頁面完成，不會上傳。檢查沒問題的部分，會自動勾選對應的完成條件。</p><ul class="toolcards">'+TOOLS.map(t=>'<li><a class="toolcard" href="#/tools/'+t.id+'">'+ico(t.icon,'tc-ico')+'<span class="tc-name">'+esc(t.name)+'</span><span class="tc-short">'+esc(t.short)+'</span>'+(t.id==='usage'?'<span class="tc-tag">第 2～5 次動撥</span>':'')+'</a></li>').join('')+'</ul>';
 let h='<nav class="crumbs" aria-label="位置"><a href="#/tools">'+ico('back')+'所有工具</a></nav><div class="pagehead"><div class="toolhead">'+ico(tl.icon,'th-ico')+'<div><h1 tabindex="-1">'+esc(tl.name)+'</h1><p class="muted">'+esc(tl.id==='forecast'&&state.mode==='first'?'依範本「未來三個月營運試算」，計算每個月的收入小計、支出小計與盈餘。':tl.desc)+'</p></div></div></div>';
 h+=({debt:toolDebt,forecast:toolForecast,breakeven:toolBreakeven,usage:toolUsage,sheet:toolSheet})[tl.id]();
 return h;
}
function srcPicker(tool,ph){
 const T=ui.tool[tool];
 let h='<div class="srcpick"><label class="filebtn">選擇 Excel 檔（.xlsx）<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-act="xlsx" data-tool="'+tool+'"></label><span class="muted small-text">或從 Excel 複製表格後貼在下面</span></div>';
 if(T.sheets){h+='<p class="small-text" style="margin:0">已讀取：'+esc(T.fileName)+'。選擇工作表：</p><div class="sheetpick">'+T.sheets.map((s,i)=>'<button type="button" class="small" data-act="pickSheet" data-tool="'+tool+'" data-i="'+i+'" aria-pressed="'+(i===T.sheetIdx)+'">'+esc(s.name)+'</button>').join('')+'</div>';}
 h+='<textarea class="pastebox" data-bind="paste" data-tool="'+tool+'" aria-label="貼上表格" placeholder="'+esc(ph)+'">'+esc(T.paste)+'</textarea>';
 return h;
}
function toolDebt(){
 const T=ui.tool.debt;if(T.later===null)T.later=state.mode==='later';
 let h='<div class="toolgrid"><section class="block"><h2>放入債務盤點表</h2>'+srcPicker('debt','從 Excel 選取整張債務盤點表（含表頭與最下方的加總列），複製後貼在這裡');
 h+='<div class="fieldrow" style="margin-top:12px"><label class="field">個案本名（選填，只在此頁比對）<input data-bind="debtCase" autocomplete="off" value="'+esc(T.caseName)+'"></label><label class="check small-text"><input type="checkbox" data-act="debtLater"'+(T.later?' checked':'')+'>第 2～5 次動撥（已清償的不用列）</label></div>';
 h+='<div class="actions"><button type="button" class="primary" data-act="runDebt">開始檢查</button><button type="button" data-act="clearTool" data-tool="debt">清除內容</button></div></section>';
 h+='<details class="block disclose checkwhat"><summary>'+ico('help')+'檢查哪些地方</summary><ul class="guide" style="padding-left:20px"><li>債務人：寫本名、個案排第一、同一人的債務放在一起</li><li>債權人：沒有空白，避免只寫「銀行」「信用卡」</li><li>借款時間：同一位債務人依先後排列（可讀民國年，例如 113年5月7日、113/05/07）</li><li>目前還款狀況：寫明本息償還、只還息或未還（可以加註已還幾期）</li><li>金額：沒有空白（沒有請填 0）</li><li>加總：每月付款總金額、剩餘還款總金額是否等於各列加總</li></ul><p class="hint">結果是提醒，最後仍以公司審查為準。檢查通過的部分，會自動勾選「債務現況盤點表」的完成條件。</p></details></div>';
 h+='<div id="toolResult">'+(T.result?resultHtml('debt'):'')+'</div>';
 return h;
}
function toolSheet(){
 const T=ui.tool.sheet,key=scopeKey();
 const targets=itemIds().filter(id=>CONTENT.items[id].tool==='sheet'||CONTENT.items[id].tool==='breakeven');
 if(!targets.includes(T.target))T.target=targets[0]||'';
 let h='<div class="toolgrid"><section class="block"><h2>放入要檢查的表格</h2>'+srcPicker('sheet','從 Excel 選取要檢查的範圍（例如營運結構表、收支彙整表），複製後貼在這裡');
 h+='<div class="actions" style="margin-top:12px"><button type="button" class="primary" data-act="runSheet">開始檢查</button><button type="button" data-act="clearTool" data-tool="sheet">清除內容</button></div></section>';
 h+='<details class="block disclose checkwhat"><summary>'+ico('help')+'檢查哪些地方</summary><ul class="guide" style="padding-left:20px"><li>公式錯誤：#REF!、#VALUE!、#DIV/0! 等</li><li>空白金額：同一區塊的金額欄留白（沒有請填 0）</li><li>小計、合計：與上方各列加總是否一致</li><li>「其他」有金額卻沒寫是什麼</li></ul><p class="hint">檢查依表格內容推測小計範圍，結果是提醒，請回到表格確認。</p></details><label class="field targetpick">發現問題時，加入哪一項的需修改事項<select data-act="sheetTarget">'+targets.map(id=>'<option value="'+id+'"'+(id===T.target?' selected':'')+'>'+esc(short(CONTENT.items[id].name,34))+'</option>').join('')+'</select></label></div>';
 h+='<div id="toolResult">'+(T.result?resultHtml('sheet'):'')+'</div>';
 return h;
}
function calcInput(tool,f,val,label,extra=''){return '<input'+(f==='label'?'':' inputmode="decimal"')+' data-bind="calc" data-tool="'+tool+'" data-f="'+f+'" '+extra+' aria-label="'+esc(label)+'" value="'+esc(val)+'">';}
function toolBreakeven(){
 const b=state.tools.breakeven;
 let h='<div class="toolgrid"><section class="block"><h2>輸入營運結構表的數字</h2><div class="calcwrap" tabindex="0" role="region" aria-label="試算表格"><table class="calc"><tbody>';
 [['margin','毛利率（%）'],['fixed','公帳【固定成本小計】'],['income','私帳【家庭收入小計】（補助、薪資、其他收入；沒有填 0）'],['before','私帳【家庭支出小計】（計畫性還款前）'],['after','私帳【家庭支出小計】（計畫性還款後，選填）'],['days','每月營業天數'],['price','客單價']].forEach(([f,l])=>{h+='<tr><th scope="row">'+esc(l)+'</th><td style="width:150px">'+calcInput('breakeven',f,b[f],l)+'</td></tr>';});
 h+='</tbody></table></div><div class="actions" style="margin-top:12px"><button type="button" data-act="beExample">載入文章範例</button><button type="button" data-act="beClear">清除數字</button></div></section>';
 h+='<section class="block"><h2>試算結果</h2><div id="beOut">'+breakevenOut()+'</div><p class="formula">算法依範本「營運結構數字計算」：損益平衡 ＝（生意固定成本 ＋ 家庭支出 － 家庭收入）÷ 毛利率；每天最低營業額 ＝ 損益平衡 ÷ 每月營業天數；每日預估來客數 ＝ 每天最低營業額 ÷ 客單價（無條件進位）。家庭收入為 0 時，就是（固定成本 ＋ 家庭支出）÷ 毛利率。</p></section></div>';
 return h;
}
function breakevenCalc(){
 const b=state.tools.breakeven,m=pct(b.margin),fixed=pnum(b.fixed),income=pnumZ(b.income),days=pnum(b.days),price=pnum(b.price),bad=[['income','家庭收入小計'],['after','家庭支出小計（計畫性還款後）'],['days','每月營業天數'],['price','客單價']].filter(([k])=>String(b[k]??'').trim()!==''&&isNaN(pnum(b[k]))).map(([k,l])=>l+'「'+b[k]+'」');
 const one=hv=>{if(!(m>0)||isNaN(fixed)||isNaN(hv))return null;const need=fixed+hv-income;const bep=need/m;const daily=need>0&&days>0?Math.round(bep/days):null;const cust=daily!==null&&daily>0&&price>0?Math.ceil(daily/price):null;return {bep,daily,cust,hv,need};};
 return {m,fixed,income,bad,before:one(pnum(b.before)),after:String(b.after??'').trim()===''?null:one(pnum(b.after))};
}
function breakevenOut(){
 const r=breakevenCalc();
 if(!r.before)return '<p class="empty">輸入毛利率、固定成本小計與家庭支出小計後，這裡會顯示結果。</p>'+(r.bad.length?'<p class="diff-bad">'+esc(r.bad.join('、'))+' 不是數字。</p>':'');
 const cols=[['計畫性還款前',r.before]];if(r.after)cols.push(['計畫性還款後',r.after]);
 const row=(l,f)=>'<tr><th scope="row">'+l+'</th>'+cols.map(([,x])=>'<td class="out">'+f(x)+'</td>').join('')+'</tr>';
 let h='<table class="calc"><thead><tr><th></th>'+cols.map(([l])=>'<th style="text-align:right">'+l+'</th>').join('')+'</tr></thead><tbody>'+row('損益平衡（月營業額）',x=>x.need>0?money(x.bep):'0')+row('每天最低營業額',x=>x.daily===null?'—':money(x.daily))+row('每日預估來客數',x=>x.cust===null?'—':x.cust+' 人')+'</tbody></table>';
 h+='<p class="hint">例：（'+money(r.fixed)+' ＋ '+money(r.before.hv)+' － '+money(r.income)+'）÷ '+fmtNum(Math.round(r.m*10000)/100)+'% ＝ '+(r.before.need>0?money(r.before.bep):'0 以下')+'</p>';
 const low=cols.filter(([,x])=>x.need<=0).map(([l])=>l);
 if(low.length)h+='<p class="hint">'+esc(low.join('、'))+'：家庭收入已足以支付固定成本與家庭支出，損益平衡以 0 計。</p>';
 if(r.bad.length)h+='<p class="diff-bad">'+esc(r.bad.join('、'))+' 不是數字，已先以 0 或空白計算；請只填數字（可寫「3萬」）。</p>';
 return h;
}
const FC_ROWS={
 first:[['label','月份',''],['a','公帳收入','營業收入'],['b','私帳收入','家庭收入（補助、薪資等）'],['inc','收入小計','公帳收入＋私帳收入'],['e','營業固定支出','公帳固定成本'],['rate','成本率（%）','用來算營業變動支出'],['c','營業變動支出','公帳收入 × 成本率'],['d','營業額外支出','設備、裝潢、規費等'],['f','私帳固定支出','家庭支出'],['repay','私帳額外支出','例如計畫性還款'],['exp','支出小計','五項支出合計'],['total','盈餘','收入小計－支出小計'],['written','表上寫的盈餘（選填）','用來比對'],['diff','比對','']],
 later:[['label','月份',''],['a','(a) 預估營業收入','(A) 的小計'],['b','(b) 預估其他收入','私帳【家庭收入小計】'],['rate','成本率（%）','用來算 (c)'],['c','(c) 預估營業變動支出','(a) × 成本率'],['d','(d) 預估額外營業支出','(D) 的小計'],['e','(e) 預估營業固定支出','公帳【固定成本小計】'],['f','(f) 預估私帳固定支出','私帳【家庭支出小計】'],['repay','計畫性還款','寫在 (f) 欄並另外說明'],['total','預估營業盈餘','(a)+(b)−(c)−(d)−(e)−(f)'],['written','表上寫的盈餘（選填）','用來比對'],['diff','比對','']]
};
const FC_OUT=['c','inc','exp','total','diff'];
function fcStore(){return state.mode==='later'?scopeObj().forecast:state.first.forecast;}
function toolForecast(){
 const F=fcStore().months,first=state.mode==='first',rows=FC_ROWS[first?'first':'later'];
 const title=first?'營運財務預估分析表：未來三個月營運試算':scopeLabel()+'：未來營運說明（未來三個月）';
 let h='<section class="block"><h2>'+esc(title)+'</h2><div class="calcwrap" tabindex="0" role="region" aria-label="試算表格"><table class="calc"><thead><tr><th>欄位</th><th>來源</th><th>第 1 個月</th><th>第 2 個月</th><th>第 3 個月</th></tr></thead><tbody>';
 rows.forEach(([f,l,src])=>{
  h+='<tr'+(f==='total'?' class="total"':'')+'><th scope="row">'+esc(l)+'</th><td class="muted small-text">'+esc(src)+'</td>';
  for(let m=0;m<3;m++){
   if(FC_OUT.includes(f))h+='<td class="out" id="fc-'+f+'-'+m+'"></td>';
   else h+='<td>'+calcInput('forecast',f,F[m][f],l+' 第 '+(m+1)+' 個月','data-m="'+m+'"'+(f==='label'?' style="text-align:left"':''))+'</td>';
  }
  h+='</tr>';
 });
 h+='</tbody></table></div><div class="actions" style="margin-top:12px"><button type="button" data-act="fcExample">載入文章範例</button><button type="button" data-act="fcClear">清除數字</button></div><div id="fcTick" aria-live="polite"></div>';
 h+=first?'<p class="formula">依範本「未來三個月營運試算」：收入小計 ＝ 公帳收入 ＋ 私帳收入；支出小計 ＝ 營業固定、營業變動、營業額外、私帳固定、私帳額外五項支出合計；盈餘 ＝ 收入小計 － 支出小計。營業變動支出用成本率估算；空白的金額以 0 計算。「載入文章範例」用的是第 2～5 次動撥文章的範例數字。</p>':'<p class="formula">預估營業盈餘 ＝ (a)＋(b)－(c)－(d)－(e)－(f)。文章範例把計畫性還款（例如當鋪還款）寫在 (f) 欄並另外說明，盈餘一併扣除，所以這裡多一列「計畫性還款」。空白的 (b)(d)(e)(f) 與計畫性還款以 0 計算。</p>';
 return h+'</section>';
}
function forecastCalc(m){
 const a=pnum(m.a),r=pct(m.rate);if(isNaN(a)||isNaN(r))return null;
 const bad=['b','d','e','f','repay'].some(k=>String(m[k]??'').trim()!==''&&isNaN(pnum(m[k])));if(bad)return {bad:true};
 const c=Math.round(a*r),inc=a+pnumZ(m.b),exp=c+pnumZ(m.d)+pnumZ(m.e)+pnumZ(m.f)+pnumZ(m.repay),total=inc-exp;
 const w=String(m.written??'').trim()===''?null:pnum(m.written);
 return {c,inc,exp,total,w};
}
function updateForecastOut(){
 const ms=fcStore().months,allOk=ms.every(m=>{const r=forecastCalc(m);return r&&!r.bad;}),target=state.mode==='first'?'ref-26':'later-future';
 const on=applyToolTicks(target,state.mode==='first'?{ready:allOk}:{calc:allOk});const tn=$('fcTick');if(tn)tn.innerHTML=tickNote(target,on);
 if(on.length||!allOk)renderNavCounts();
 ms.forEach((m,i)=>{
  const r=forecastCalc(m),cell=k=>$('fc-'+k+'-'+i);if(!cell('total'))return;
  if(r&&r.bad){['c','inc','exp','total'].forEach(k=>{const el=cell(k);if(el)el.textContent='—';});cell('diff').innerHTML='<span class="diff-bad">有欄位不是數字</span>';return;}
  ['c','inc','exp','total'].forEach(k=>{const el=cell(k);if(el)el.textContent=r?money(r[k]):'—';});
  const d=cell('diff');if(!r){d.textContent='';return;}
  if(r.w===null||isNaN(r.w)){d.innerHTML=r.w===null?'':'<span class="diff-bad">不是數字</span>';}
  else d.innerHTML=Math.abs(r.w-Math.round(r.total))<1?'<span class="diff-ok">一致</span>':'<span class="diff-bad">差 '+money(r.w-r.total)+'</span>';
 });
}
const USAGE_KINDS=['設施設備','租賃契約','週轉金'];
function toolUsage(){
 if(state.mode!=='later')return '<section class="block"><h2>前期動撥款使用加總</h2><p>這個工具用在第 2～5 次動撥的「前期動撥款貸款使用狀況總表」。</p><button type="button" data-act="mode" data-mode="later">切換到第 2～5 次動撥</button></section>';
 const U=scopeObj().usage;
 let h='<section class="block"><h2>'+esc(scopeLabel())+'：前期動撥款貸款使用狀況</h2><p class="hint" style="margin:0 0 12px">只能填設施設備購買發票與租賃契約；前一期款扣掉發票、收據總額後，剩下的寫週轉金，總數要等於前一期款。計畫性還款請列為週轉金。</p>';
 h+='<label class="field" style="max-width:260px">前一期款總額'+calcInput('usage','amount',U.amount,'前一期款總額')+'</label>';
 h+='<div class="calcwrap" style="margin-top:12px" tabindex="0" role="region" aria-label="使用明細表格"><table class="calc"><thead><tr><th>項目</th><th>類別</th><th>金額</th><th>正本發票／收據</th><th></th></tr></thead><tbody>';
 h+=U.rows.map(r=>'<tr><td><input data-bind="calc" data-tool="usage" data-f="name" data-row="'+esc(r.id)+'" aria-label="項目" value="'+esc(r.name)+'" style="text-align:left"></td><td><select data-act="usageKind" data-row="'+esc(r.id)+'" aria-label="類別">'+USAGE_KINDS.map(k=>'<option'+(r.kind===k?' selected':'')+'>'+k+'</option>').join('')+'</select></td><td style="width:140px">'+calcInput('usage','amt',r.amount,'金額','data-row="'+esc(r.id)+'"')+'</td><td>'+(r.kind==='週轉金'?'<span class="muted small-text">不需要</span>':'<label class="check"><input type="checkbox" data-act="usageProof" data-row="'+esc(r.id)+'"'+(r.proof?' checked':'')+'>已備妥</label>')+'</td><td><button type="button" class="small quiet danger" data-act="usageDel" data-row="'+esc(r.id)+'">移除</button></td></tr>').join('')||'<tr><td colspan="5" class="empty">還沒有明細。按「新增一列」開始。</td></tr>';
 h+='</tbody></table></div><div class="actions" style="margin-top:12px"><button type="button" data-act="usageAdd">新增一列</button><button type="button" data-act="usageClear"'+(U.rows.length||U.amount?'':' disabled')+'>清除全部</button></div><div id="usOut" style="margin-top:14px">'+usageOut()+'</div></section>';
 return h;
}
function usageTicks(){
 const U=scopeObj().usage,amt=pnum(U.amount),rows=U.rows.filter(r=>r.name.trim()||String(r.amount).trim());
 if(isNaN(amt)||!rows.length)return {list:false,sum:false,repay:false,proof:false};
 const vals=rows.map(r=>pnum(r.amount)),okVals=vals.every(v=>!isNaN(v)),total=okVals?vals.reduce((a,b)=>a+b,0):NaN;
 const repayBad=rows.some(r=>/還款|還債|償還|還錢/.test(r.name)&&r.kind!=='週轉金');
 const proofRows=rows.filter(r=>r.kind!=='週轉金');
 return {list:okVals&&rows.every(r=>r.name.trim()),sum:okVals&&Math.abs(total-amt)<=0.5,repay:!repayBad,proof:proofRows.length>0&&proofRows.every(r=>r.proof)};
}
function refreshUsage(){const on=applyToolTicks('later-usage',usageTicks());const el=$('usOut');if(el)el.innerHTML=usageOut()+tickNote('later-usage',on);renderNavCounts();}
function usageOut(){
 if(state.mode!=='later')return '';
 const U=scopeObj().usage,amt=pnum(U.amount);let proofSum=0,wc=0;const fixes=[],hints=[];
 U.rows.forEach((r,i)=>{
  const v=pnum(r.amount),n=i+1;
  if(isNaN(v)){if(r.name.trim()||String(r.amount).trim())hints.push('第 '+n+' 列金額空白或不是數字');}
  else if(r.kind==='週轉金')wc+=v;else proofSum+=v;
  if(/還款|還債|償還|還錢/.test(r.name)){if(r.kind==='週轉金')hints.push('第 '+n+' 列名稱有「還款」：表上請寫「週轉金」，不要寫拿去還款');else fixes.push('第 '+n+' 列寫了還款：請不要寫拿去還款，計畫性還款請改列為週轉金');}
  if(r.kind!=='週轉金'&&!r.proof)hints.push('第 '+n+' 列需要正本發票或收據；沒有發票就列為週轉金');
 });
 const total=proofSum+wc;
 let h='<table class="calc"><tbody><tr><th scope="row">發票、收據合計</th><td class="out">'+money(proofSum)+'</td></tr><tr><th scope="row">週轉金</th><td class="out">'+money(wc)+'</td></tr><tr class="total"><th scope="row">總數</th><td class="out">'+money(total)+'</td></tr>';
 if(!isNaN(amt))h+='<tr><th scope="row">週轉金應為（前一期款 － 發票、收據合計）</th><td class="out">'+money(amt-proofSum)+'</td></tr>';
 h+='</tbody></table>';
 if(!isNaN(amt)&&U.rows.length&&Math.abs(total-amt)>0.5)fixes.unshift('總數 '+money(total)+' 元，比前一期款 '+money(amt)+' 元'+(total>amt?'多 ':'少 ')+money(Math.abs(total-amt))+' 元；總數要等於前一期款');
 if(!isNaN(amt)&&U.rows.length&&Math.abs(total-amt)<=0.5)h+='<p class="okline" style="margin-top:10px">總數等於前一期款。</p>';
 const li=(lv,t)=>'<li class="'+lv+'"><span class="lv">'+(lv==='fix'?'需修改':'提醒')+'</span><span>'+esc(t)+'</span><span></span></li>';
 if(fixes.length||hints.length)h+='<ul class="findings" style="margin-top:10px">'+fixes.map(t=>li('fix',t)).join('')+hints.map(t=>li('hint',t)).join('')+'</ul>';
 return h;
}

/* ---------- 表格讀取：貼上（TSV）與 xlsx ---------- */
function mkCell(v,ref){
 const s=String(v??'').trim();if(s==='')return {v:'',t:'s',ref};
 if(/^#(REF!|VALUE!|DIV\/0!|N\/A|NAME\?|NUM!|NULL!|SPILL!|CALC!)/i.test(s))return {v:s,t:'e',ref};
 const n=toNum(s);if(n!==null&&!isNaN(n))return {v:n,t:'n',ref,raw:s};
 return {v:s,t:'s',ref};
}
function parseTSV(text){
 text=String(text).replace(/\r\n?/g,'\n');const rows=[];let row=[],cell='',q=false;
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(q){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=ch;continue;}
  if(ch==='"'&&cell===''){q=true;continue;}
  if(ch==='\t'){row.push(cell);cell='';continue;}
  if(ch==='\n'){row.push(cell);rows.push(row);row=[];cell='';continue;}
  cell+=ch;
 }
 if(cell!==''||row.length){row.push(cell);rows.push(row);}
 while(rows.length&&rows[rows.length-1].every(c=>String(c).trim()===''))rows.pop();
 const width=Math.min(40,Math.max(0,...rows.map(r=>r.length)));
 return rows.slice(0,400).map((r,ri)=>Array.from({length:width},(_,ci)=>mkCell(r[ci],colName(ci)+(ri+1))));
}
async function openZip(buf){
 const dv=new DataView(buf),len=buf.byteLength;let eocd=-1;
 for(let i=len-22;i>=Math.max(0,len-65557);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}}
 if(eocd<0)throw Error('不是有效的 .xlsx 檔');
 const count=dv.getUint16(eocd+10,true);let p=dv.getUint32(eocd+16,true);const files={},dec=new TextDecoder();
 for(let i=0;i<count;i++){
  if(dv.getUint32(p,true)!==0x02014b50)throw Error('檔案內容損壞');
  const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true),nlen=dv.getUint16(p+28,true),elen=dv.getUint16(p+30,true),clen=dv.getUint16(p+32,true),lho=dv.getUint32(p+42,true);
  files[dec.decode(new Uint8Array(buf,p+46,nlen))]={method,csize,lho};p+=46+nlen+elen+clen;
 }
 return {has:n=>!!files[n],async text(name){
  const f=files[name];if(!f)return null;
  const start=f.lho+30+dv.getUint16(f.lho+26,true)+dv.getUint16(f.lho+28,true);const data=new Uint8Array(buf,start,f.csize);
  if(f.method===0)return new TextDecoder().decode(data);
  if(f.method!==8)throw Error('不支援的壓縮方式');
  if(typeof DecompressionStream==='undefined')throw Error('這個瀏覽器無法讀取 Excel 檔，請改用複製貼上');
  const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
 }};
}
function xmlDoc(text){const d=new DOMParser().parseFromString(text,'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('檔案內容無法解析');return d;}
function tagsNS(node,name){return Array.from(node.getElementsByTagNameNS('*',name));}
function attrLocal(el,local){for(const a of Array.from(el.attributes))if(a.localName===local&&a.name!==local)return a.value;return el.getAttribute(local);}
async function readXlsx(file){
 const zip=await openZip(await file.arrayBuffer());
 const wbText=await zip.text('xl/workbook.xml');if(!wbText)throw Error('找不到工作表，請確認是 .xlsx 檔');
 const wb=xmlDoc(wbText),relText=await zip.text('xl/_rels/workbook.xml.rels'),rels={};
 if(relText)tagsNS(xmlDoc(relText),'Relationship').forEach(r=>{rels[r.getAttribute('Id')]=r.getAttribute('Target');});
 const ss=[];const sst=await zip.text('xl/sharedStrings.xml');
 if(sst)tagsNS(xmlDoc(sst),'si').forEach(si=>{ss.push(tagsNS(si,'t').filter(t=>{for(let p=t.parentNode;p&&p!==si;p=p.parentNode)if(p.localName==='rPh')return false;return true;}).map(t=>t.textContent).join(''));});
 const sheets=tagsNS(wb,'sheet').map(s=>{const rid=attrLocal(s,'id');let target=rels[rid]||'';target=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');return {name:s.getAttribute('name')||'工作表',path:target};}).filter(s=>zip.has(s.path));
 if(!sheets.length)throw Error('找不到工作表');
 return {sheets,async grid(i){return parseSheetXml(await zip.text(sheets[i].path),ss);}};
}
function parseSheetXml(text,ss){
 const doc=xmlDoc(text),cells=new Map();let maxR=-1,maxC=-1;
 for(const c of tagsNS(doc,'c')){
  const ref=c.getAttribute('r'),m=ref&&ref.match(/^([A-Z]+)(\d+)$/);if(!m)continue;
  const ci=colIndex(m[1]),ri=Number(m[2])-1;if(ri>=400||ci>=40)continue;
  const t=c.getAttribute('t')||'n',vn=tagsNS(c,'v')[0],v=vn?vn.textContent:'';let cell;
  if(t==='s')cell={v:String(ss[Number(v)]??''),t:'s'};
  else if(t==='inlineStr')cell={v:tagsNS(c,'t').map(x=>x.textContent).join(''),t:'s'};
  else if(t==='str')cell={v,t:'s'};
  else if(t==='b')cell={v:v==='1'?'TRUE':'FALSE',t:'s'};
  else if(t==='e')cell={v,t:'e'};
  else if(v==='')cell={v:'',t:'s'};
  else{const n=Number(v);cell=isNaN(n)?{v,t:'s'}:{v:n,t:'n'};}
  if(cell.t==='s'){if(String(cell.v).trim()==='')cell.v='';else if(/^#(REF!|VALUE!|DIV\/0!|N\/A|NAME\?|NUM!|NULL!)/.test(String(cell.v).trim()))cell.t='e';}
  cell.ref=ref;cells.set(ri+':'+ci,cell);
  if(cell.v!==''){maxR=Math.max(maxR,ri);maxC=Math.max(maxC,ci);}
 }
 const grid=[];
 for(let r=0;r<=maxR;r++){const row=[];for(let c=0;c<=maxC;c++)row.push(cells.get(r+':'+c)||{v:'',t:'s',ref:colName(c)+(r+1)});grid.push(row);}
 tagsNS(doc,'mergeCell').forEach(mc=>{
  const [a,b]=String(mc.getAttribute('ref')||'').split(':');if(!a||!b)return;
  const A=a.match(/^([A-Z]+)(\d+)$/),B=b.match(/^([A-Z]+)(\d+)$/);if(!A||!B)return;
  const r0=Number(A[2])-1,c0=colIndex(A[1]),r1=Math.min(Number(B[2])-1,maxR),c1=Math.min(colIndex(B[1]),maxC);
  const top=grid[r0]&&grid[r0][c0];if(!top||top.v===''||top.t!=='s')return;
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){if(r===r0&&c===c0)continue;if(grid[r][c].v==='')grid[r][c]={v:top.v,t:'s',ref:grid[r][c].ref,merged:true};}
 });
 return grid;
}

/* ---------- 債務盤點表檢核 ---------- */
const DEBT_KW=[['debtor',['債務人']],['creditor',['債權人']],['amount',['借款金額','借款總額','債務總額','貸款金額','原借款']],['purpose',['借款用途','借錢原因','用途','原因']],['date',['借款時間','借錢時間','借款日期','借款年月','借款年度','債務時間','何時借']],['rate',['利率']],['monthly',['每月還款','每期還款','每月付款','每月繳','月付']],['status',['還款狀況','還款情形']],['remain',['剩餘金額','剩餘','尚欠','未還金額']]];
const DEBT_COLS={debtor:'債務人',creditor:'債權人',amount:'債務總額',date:'借款時間',monthly:'每月還款金額',status:'目前還款狀況',remain:'剩餘金額'};
const SELF_WORDS=['本人','自己','我','個案','小老闆','案主','申請人'];
const GENERIC_CREDITORS=['銀行','信用卡','卡費','貸款','信貸','車貸','房貸','公司','融資','融資公司','親友','朋友','家人','親戚','民間'];
const txt=c=>c&&c.t!=='n'?String(c.v).replace(/\s/g,''):'';
function matchKw(s){for(const [k,words] of DEBT_KW)if(words.some(w=>s.includes(w)))return k;return null;}
function findDebtHeader(grid){
 let best=null;
 for(let r=0;r<Math.min(grid.length,25);r++){const cols={};let score=0;const labels={};grid[r].forEach((c,ci)=>{const s=txt(c);if(!s)return;const k=matchKw(s);if(k&&cols[k]===undefined){cols[k]=ci;labels[k]=s;score++;}});if(score>=3&&(!best||score>best.score))best={row:r,score,cols,labels,dataStart:r+1};}
 if(!best)return null;
 [best.row-1,best.row+1].forEach(rr=>{if(rr<0||rr>=grid.length)return;if(rr>best.row&&grid[rr].some(x=>x.t==='n'))return;grid[rr].forEach((c,ci)=>{const s=txt(c);if(!s)return;const k=matchKw(s);if(k&&best.cols[k]===undefined&&!Object.values(best.cols).includes(ci)){best.cols[k]=ci;best.labels[k]=s;if(rr>best.row)best.dataStart=rr+1;}});});
 const nx=grid[best.dataStart];if(nx&&!nx.some(x=>x.t==='n')){const ne=nx.filter(x=>String(x.v).trim()!=='');if(ne.length&&ne.every(x=>/^[（(].*[）)]$/.test(String(x.v).trim())))best.dataStart++;}
 return best;
}
function parseLooseDate(cell){
 if(!cell||cell.v==='')return null;
 if(cell.t==='n'){const v=cell.v;
  if(Number.isInteger(v)){if(v>20000&&v<80000){const d=new Date(Date.UTC(1899,11,30)+v*86400000);return {y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate()};}if(v>=1&&v<=200)return {y:v+1911,m:null,d:null};if(v>=1950&&v<=2100)return {y:v,m:null,d:null};return null;}
  if(!cell.raw&&/^\d{2,3}\.1$/.test(String(v)))return {ambiguous:true};
  return parseDateText(cell.raw||String(v));
 }
 return parseDateText(cell.v);
}
function parseDateText(raw){
 const s=toHalf(raw).replace(/\s+/g,'');
 const m=s.match(/^(?:民國)?(\d{2,4})(?:年|\/|\.|-)(?:(\d{1,2})(?:月|\/|\.|-)?(?:(\d{1,2})日?)?)?/);if(!m)return null;
 let y=Number(m[1]);if(y<1000)y+=1911;const mo=m[2]?Number(m[2]):null,d=m[3]?Number(m[3]):null;
 if(y<1950||y>2100||(mo!==null&&(mo<1||mo>12))||(d!==null&&(d<1||d>31)))return null;
 return {y,m:mo,d};
}
function dateSpan(p){const s=new Date(p.y,(p.m||1)-1,p.d||1).getTime();const e=p.m?(p.d?s:new Date(p.y,p.m,0).getTime()):new Date(p.y,11,31).getTime();return [s,e];}
function dateLabel(p){return p.y-1911+'年'+(p.m?p.m+'月':'')+(p.d?p.d+'日':'');}
function analyzeDebt(grid,opts){
 const h=findDebtHeader(grid);
 if(!h)return {error:'找不到表頭。請確認範圍包含「債務人、債權人、借款時間…」那一列。'};
 const c=h.cols,F=[],rows=[],at=(r,k)=>c[k]!==undefined?grid[r][c[k]]:null,lab=k=>(h.labels&&h.labels[k]?h.labels[k].replace(/[（(].*$/,''):'')||DEBT_COLS[k];
 const add=(lv,r,k,text)=>{const cell=r!==null&&k?at(r,k):null;F.push({lv,text,cat:k||'',row:r!==null?rowNo(grid[r][0].ref):'',ref:cell?cell.ref:(r!==null?grid[r][0].ref:'')});};
 let totalsRow=-1;
 const TOT=/總金額|總額(?!度)|合計|總計|小計|加總/;
 for(let r=h.dataStart;r<grid.length;r++){if(!TOT.test(grid[r].map(txt).join('')))continue;const cr=at(r,'creditor'),dt=at(r,'date');if(cr&&cr.v!==''&&dt&&dt.v!=='')continue;totalsRow=r;break;}
 const end=totalsRow>=0?totalsRow:grid.length,carry={};let blank=0,pending='';
 for(let r=h.dataStart;r<end;r++){
  const filled=['creditor','status','date'].some(k=>{const x=at(r,k);return x&&x.v!=='';})||['amount','monthly','remain'].some(k=>{const x=at(r,k);return x&&x.v!==''&&!(x.t==='n'&&x.v===0);});
  if(!filled){const d=c.debtor!==undefined?String(at(r,'debtor').v).trim():'';if(d)pending=d;else if(totalsRow<0&&++blank>=3)break;continue;}
  blank=0;if(pending){carry[r]=pending;pending='';}rows.push(r);
 }
 if(!rows.length)return {error:'找到表頭，但下面沒有債務資料。'};
 const missing=Object.keys(DEBT_COLS).filter(k=>c[k]===undefined);
 if(missing.length)F.push({lv:'hint',text:'沒有找到這些欄位：'+missing.map(k=>DEBT_COLS[k]).join('、')+'，相關檢查會略過',row:'',ref:''});
 const groups=[],debtorOf={},dates={};let prev='';let sumM=0,sumR=0;
 for(const r of rows){
  const dcell=c.debtor!==undefined?at(r,'debtor'):null;let name=dcell?String(dcell.v).trim():'';if(!name&&carry[r])name=carry[r];const filledDown=(!name&&!!prev)||!!(dcell&&dcell.merged);
  if(!name&&prev)name=prev;
  if(c.debtor!==undefined&&!name)add('fix',r,'debtor','債務人空白');
  debtorOf[r]={name,filledDown};
  if(name&&(!groups.length||groups[groups.length-1].name!==name)){groups.push({name,rows:[r]});if(SELF_WORDS.includes(name))add('fix',r,'debtor','債務人寫「'+name+'」，請寫個案本名');}
  else if(name)groups[groups.length-1].rows.push(r);
  if(name)prev=name;
  if(c.creditor!==undefined){const s=String(at(r,'creditor').v).trim();if(!s)add('fix',r,'creditor',lab('creditor')+'空白');else if(GENERIC_CREDITORS.includes(s))add('hint',r,'creditor','債權人只寫「'+s+'」，建議寫清楚是哪一家或哪一位');}
  ['amount','monthly','remain'].forEach(k=>{const l=lab(k);if(c[k]===undefined)return;const x=at(r,k);if(x.v===''){add('fix',r,k,l+'空白，沒有請填 0');return;}if(x.t!=='n'){add('hint',r,k,l+'不是數字（「'+short(x.v,16)+'」），加總時不計入');return;}if(k==='monthly')sumM+=x.v;if(k==='remain')sumR+=x.v;});
  let st='';
  if(c.status!==undefined){const x=at(r,'status');st=String(x.v).trim();if(!st)add('fix',r,'status','目前還款狀況空白');else if(!/本息.{0,3}(攤還|償還)|只(繳|還|付)息|未還/.test(st)&&!/([0-9０-９]+|[一二三四五六七八九十百]+)\s*期|期數|已還|還了|已繳|繳了/.test(st))add('fix',r,'status','還款狀況「'+short(st,18)+'」沒有寫明本息償還、只還息或未還');}
  if(c.date!==undefined){const x=at(r,'date');if(x.v==='')add('fix',r,'date',lab('date')+'空白');else{const p=parseLooseDate(x);if(p&&p.ambiguous)add('hint',r,'date','借款時間「'+x.v+'」可能是 1 月或 10 月，請改寫成「'+Math.floor(x.v)+'年1月」或「'+Math.floor(x.v)+'年10月」');else if(p)dates[r]=p;else add('hint',r,'date','看不懂借款時間「'+short(x.v,16)+'」，無法檢查順序');}}
  if(opts.later){const x=c.remain!==undefined?at(r,'remain'):null;if((x&&x.t==='n'&&x.v===0)||/已清償|已還清|結清|清償完畢/.test(st))add('hint',r,'remain','看起來已清償：第 2～5 次動撥不用列出已清償的債務');}
 }
 groups.forEach(g=>{let last=null;g.rows.forEach(r=>{const p=dates[r];if(!p)return;if(last){const a=dateSpan(dates[last]),b=dateSpan(p);if(b[1]<a[0])add('fix',r,'date','借款時間 '+dateLabel(p)+' 比上一筆（第 '+rowNo(grid[last][0].ref)+' 列，'+dateLabel(dates[last])+'）早，請依先後順序排列');}last=r;});});
 const seen=new Set();groups.forEach(g=>{if(seen.has(g.name))add('hint',g.rows[0],'debtor','「'+g.name+'」的債務分散在兩處，建議放在一起');seen.add(g.name);});
 const caseName=String(opts.caseName||'').trim();
 if(groups.length){
  if(caseName){const i=groups.findIndex(g=>g.name===caseName);if(i<0)F.push({lv:'hint',cat:'debtor',text:'表上找不到債務人「'+caseName+'」，請確認本名寫法一致',row:'',ref:''});else if(i>0)add('fix',groups[0].rows[0],'debtor','個案「'+caseName+'」的債務請排在第一，目前第一位是「'+groups[0].name+'」');}
  else F.push({lv:'info',text:'第一位債務人是「'+groups[0].name+'」，請確認是個案本人（可在上方輸入個案本名自動比對）',row:'',ref:''});
 }
 const findTotal=(test,colKey)=>{
  if(totalsRow<0)return null;
  for(let r=totalsRow;r<Math.min(grid.length,totalsRow+4);r++){const row=grid[r];for(let ci=0;ci<row.length;ci++){const s=txt(row[ci]);if(!s||!test(s))continue;for(let k=ci+1;k<row.length;k++)if(row[k].t==='n')return row[k];if(grid[r+1]&&grid[r+1][ci]&&grid[r+1][ci].t==='n')return grid[r+1][ci];}}
  const x=c[colKey]!==undefined?grid[totalsRow][c[colKey]]:null;return x&&x.t==='n'?x:null;
 };
 const tm=findTotal(s=>/每月/.test(s)&&/總|合計|加總/.test(s),'monthly'),tr=findTotal(s=>/剩餘/.test(s)&&/總|合計|加總/.test(s),'remain');
 const cmp=(k,label,found,sum)=>{if(c[k]===undefined)return;if(!found){F.push({lv:'fix',cat:'total',text:'找不到「'+label+'」，最下方記得加總（各列加總是 '+money(sum)+'）',row:'',ref:''});return;}if(Math.abs(found.v-sum)>0.5)F.push({lv:'fix',cat:'total',text:label+'寫 '+money(found.v)+'，各列加總是 '+money(sum)+'，請確認',row:rowNo(found.ref),ref:found.ref});};
 cmp('monthly','每月付款總金額',tm,sumM);cmp('remain','剩餘還款總金額',tr,sumR);
 const order={fix:0,hint:1,info:2};F.sort((a,b)=>order[a.lv]-order[b.lv]);
 const has=k=>c[k]!==undefined,fx=new Set(F.filter(f=>f.lv==='fix').map(f=>f.cat));
 const pass={debtor:has('debtor')&&!fx.has('debtor'),creditor:has('creditor')&&!fx.has('creditor'),date:has('date')&&!fx.has('date'),status:has('status')&&!fx.has('status'),total:(has('monthly')||has('remain'))&&!['total','monthly','remain'].some(k=>fx.has(k))};
 return {F,pass,h,rows,totalsRow,groups,debtorOf,sums:{monthly:sumM,remain:sumR},found:{monthly:tm,remain:tr},labels:Object.fromEntries(Object.keys(DEBT_COLS).map(k=>[k,lab(k)]))};
}

/* ---------- 表格空白與加總 ---------- */
function analyzeSheet(grid){
 const F=[];let checks=0;
 grid.forEach(row=>row.forEach(cell=>{if(cell.t==='e')F.push({lv:'fix',text:'公式錯誤 '+cell.v+'（'+cell.ref+'）',row:rowNo(cell.ref),ref:cell.ref});}));
 const W=Math.max(0,...grid.map(r=>r.length));const numCols=[];
 for(let ci=0;ci<W;ci++){let n=0;grid.forEach(r=>{if(r[ci]&&r[ci].t==='n')n++;});if(n>=3)numCols.push(ci);}
 const labelLeft=(row,ci)=>{for(let k=ci-1;k>=0;k--){const x=row[k];if(x&&x.t==='s'&&x.v!=='')return String(x.v).replace(/\s/g,'');}return '';};
 const SUB=/小計|合計|總計|加總|總額/,SKIP=/率|%|％|天數|單價|客單|來客|人數/,HEAD=/^(項目|內容|內容說明|金額|說明|月份|日期)$/;
 for(const ci of numCols){
  let segStart=0;const subs=[];
  for(let r=0;r<grid.length;r++){
   const row=grid[r],x=row[ci],lab=labelLeft(row,ci);
   if(SUB.test(lab)){
    if(x&&x.t==='n'){
     let seg=0,cnt=0,all=0;
     for(let k=0;k<r;k++){const y=grid[k][ci],l2=labelLeft(grid[k],ci);if(!y||y.t!=='n'||SUB.test(l2)||SKIP.test(l2))continue;all+=y.v;if(k>=segStart){seg+=y.v;cnt++;}}
     const subSum=subs.reduce((a,b)=>a+b,0);
     let blk=0;for(let k=r-1;k>=0;k--){const rw=grid[k],y=rw[ci],l=labelLeft(rw,ci);if(y&&y.t==='n'){if(SUB.test(l))break;if(!SKIP.test(l))blk+=y.v;continue;}if(!l||HEAD.test(l)||!numCols.some(cc=>rw[cc]&&rw[cc].t==='n'))break;}
     if(cnt>0){checks++;if(![seg,all,subSum,blk].some(v=>Math.abs(v-x.v)<=0.5))F.push({lv:'hint',text:'「'+short(lab,14)+'」寫 '+fmtNum(x.v)+'，上方 '+cnt+' 列加總是 '+fmtNum(Math.round(seg*100)/100)+'（'+x.ref+'），請確認公式或數字',row:rowNo(x.ref),ref:x.ref});}
     subs.push(x.v);
    }
    segStart=r+1;continue;
   }
   if(x&&x.t==='n'&&x.v>0&&/^其他(費用|支出|收入|項目|開銷)?[:：]?(（[^）]*說明[^）]*）|\([^)]*說明[^)]*\))?$/.test(lab)&&!row.some((y,k)=>k!==ci&&y&&y.t==='s'&&String(y.v).trim()&&!/^其他/.test(String(y.v).trim())&&!HEAD.test(String(y.v).trim())))F.push({lv:'hint',text:'「'+short(lab,10)+'」有金額 '+fmtNum(x.v)+'（'+x.ref+'），請寫明是什麼',row:rowNo(x.ref),ref:x.ref});
   if(x&&x.v===''&&lab&&!SKIP.test(lab)&&!HEAD.test(lab)){
    const up=grid[r-1]&&grid[r-1][ci],dn=grid[r+1]&&grid[r+1][ci],rowNum=numCols.some(cc=>row[cc]&&row[cc].t==='n');
    if(rowNum?((up&&up.t==='n')||(dn&&dn.t==='n')):(up&&up.t==='n'&&dn&&dn.t==='n'))F.push({lv:'hint',text:'「'+short(lab,14)+'」的金額空白（'+x.ref+'），沒有請填 0',row:rowNo(x.ref),ref:x.ref});
   }
  }
 }
 const order={fix:0,hint:1,info:2};F.sort((a,b)=>order[a.lv]-order[b.lv]);
 return {F:F.slice(0,80),numCols,checks,total:F.length};
}

/* ---------- 檢核結果 ---------- */
function resultHtml(tool){
 const T=ui.tool[tool],R=T.result;
 if(R.error)return '<section class="block"><div class="notice bad"><p>'+esc(R.error)+'</p></div></section>';
 const fixes=R.F.filter(f=>f.lv==='fix').length,hints=R.F.filter(f=>f.lv==='hint').length;
 let h='<section class="block" aria-live="polite"><h2>檢查結果<span class="sub">'+(fixes?'需修改 '+fixes+' 項':'沒有需修改')+'，提醒 '+hints+' 項</span></h2>';
 if(tool==='debt')h+='<p class="small-text muted">讀到 '+R.rows.length+' 筆債務、'+R.groups.length+' 位債務人；依各列計算：每月付款合計 '+money(R.sums.monthly)+'，剩餘還款合計 '+money(R.sums.remain)+'。</p>'+tickNote(findingTarget('debt'),T.ticked);
 else h+='<p class="small-text muted">檢查了 '+R.numCols.length+' 個金額欄、'+R.checks+' 個小計或合計'+(R.total>R.F.length?'；只列出前 '+R.F.length+' 項':'')+'。</p>';
 if(!fixes&&!hints)h+='<p class="okline">沒有發現需要修改的地方。</p>';
 if(R.F.length){
  h+='<ul class="findings">'+R.F.map((f,i)=>'<li class="'+f.lv+'"><span class="lv">'+(f.lv==='fix'?'需修改':f.lv==='hint'?'提醒':'確認')+'</span><span>'+esc(f.text)+(f.row?'<small>第 '+esc(f.row)+' 列'+(f.ref?'，儲存格 '+esc(f.ref):'')+'</small>':'')+'</span>'+(f.lv==='info'?'<span></span>':'<button type="button" class="small" data-act="findingIssue" data-tool="'+tool+'" data-i="'+i+'">加入需修改事項</button>')+'</li>').join('')+'</ul>';
  if(fixes)h+='<div class="actions" style="margin-top:12px"><button type="button" data-act="findingAll" data-tool="'+tool+'">把 '+fixes+' 項「需修改」全部加入需修改事項</button></div>';
 }
 if(tool==='debt')h+=debtPreview(R);
 return h+'</section>';
}
function debtPreview(R){
 const grid=ui.tool.debt.grid,c=R.h.cols,keys=Object.keys(DEBT_COLS).filter(k=>c[k]!==undefined);
 const flag={};R.F.forEach(f=>{if(f.ref)flag[f.ref]=flag[f.ref]==='fix'?'fix':f.lv;});
 const show=[R.h.row,...R.rows];if(R.totalsRow>=0)show.push(R.totalsRow);
 let h='<details style="margin-top:14px" open><summary>對照表格（標紅的是需修改的儲存格）</summary><div class="preview" tabindex="0" role="region" aria-label="債務盤點表對照表格"><table><thead><tr><th>列</th>'+keys.map(k=>'<th>'+esc((R.labels&&R.labels[k])||DEBT_COLS[k])+'</th>').join('')+'</tr></thead><tbody>';
 show.slice(0,80).forEach((r,idx)=>{if(idx===0)return;const row=grid[r];h+='<tr><td class="rn">'+esc(rowNo(row[0].ref))+'</td>'+keys.map(k=>{const x=row[c[k]];const fl=flag[x.ref];let v=x.v===''?'':x.t==='n'?fmtNum(x.v):String(x.v);if(k==='debtor'&&R.debtorOf[r]&&R.debtorOf[r].filledDown)v='（同上）';return '<td class="'+(fl==='fix'?'flag':fl==='hint'?'soft':'')+'" title="'+esc(x.ref+' '+v)+'">'+esc(v)+'</td>';}).join('')+'</tr>';});
 return h+'</tbody></table></div></details>';
}
async function loadXlsx(tool,file){
 const T=ui.tool[tool];
 try{
  if(!/\.xlsx$/i.test(file.name))throw Error('請選擇 .xlsx 檔；舊版 .xls 請先另存為 .xlsx，或直接複製貼上');
  if(file.size>15000000)throw Error('檔案太大（上限 15 MB）');
  const wb=await readXlsx(file);T.wb=wb;T.sheets=wb.sheets;T.fileName=file.name;
  let i=0;if(tool==='debt'){const k=wb.sheets.findIndex(s=>/債務/.test(s.name));if(k>=0)i=k;}
  T.sheetIdx=i;T.fileGrid=await wb.grid(i);T.paste='';T.result=null;
  if(tool==='debt')runDebt();else{autoTarget(wb.sheets[i].name);runSheet();}
 }catch(err){T.result={error:'無法讀取這個檔案：'+(err&&err.message?err.message:'格式不符')};T.sheets=null;T.fileGrid=null;}
 render();
}
function autoTarget(name){
 const later=state.mode==='later',T=ui.tool.sheet;
 const map=[[/結構/,later?'later-structure':'ref-25'],[/預估|財務/,later?'':'ref-26'],[/日誌|收支|帳/,later?'later-journal':'ref-22']];
 for(const [re,id] of map)if(id&&re.test(name||'')){T.target=id;return;}
}
function currentGrid(tool){const T=ui.tool[tool];if(T.paste.trim())return parseTSV(T.paste);return T.fileGrid;}
function applyToolTicks(itemId,map){
 const key=scopeKey(),def=CONTENT.items[itemId];if(!def||isLocked(itemId,key)||getRec(key,itemId).na)return [];
 const r=rec(key,itemId),ids=new Set((def.criteria||[]).filter(c=>!c.auto).map(c=>c.id)),on=[];let changed=false;
 for(const [cid,ok] of Object.entries(map)){
  if(!ids.has(cid))continue;
  if(ok){if(!r.crit[cid]){r.crit[cid]=true;r.via[cid]='tool';changed=true;}if(r.via[cid]==='tool')on.push(cid);}
  else if(r.via[cid]==='tool'){delete r.crit[cid];delete r.via[cid];changed=true;}
 }
 if(changed){r.legacyDone=false;save();}
 return on;
}
function tickNote(itemId,on){
 if(!on||!on.length)return '';const def=CONTENT.items[itemId];
 return '<p class="ticknote">'+ico('check')+'<span>已自動勾選「'+esc(def.name.replace(/^★/,''))+'」的完成條件：'+esc(on.map(cid=>{const c=(def.criteria||[]).find(x=>x.id===cid);return c?short(c.text.replace(/（.*$/,''),14):cid;}).join('、'))+'。<a href="#/item/'+itemId+'">去看看</a></span></p>';
}
function runDebt(){const T=ui.tool.debt,g=currentGrid('debt');if(!g||!g.length){T.result={error:'請先貼上表格，或選擇 Excel 檔。'};return;}T.grid=g;T.result=analyzeDebt(g,{caseName:T.caseName,later:T.later});T.ticked=T.result.pass?applyToolTicks(findingTarget('debt'),T.result.pass):[];}
function runSheet(){const T=ui.tool.sheet,g=currentGrid('sheet');if(!g||!g.length){T.result={error:'請先貼上表格，或選擇 Excel 檔。'};return;}T.grid=g;T.result=analyzeSheet(g);}
function afterTools(arg){if(arg==='forecast')updateForecastOut();}

/* ---------- 維護作業說明 ---------- */
function draftFor(id){
 if(!ui.drafts[id]){const d=CONTENT.items[id];ui.drafts[id]={id,dirty:false,guide:d.guide||'',tips:(d.tips||[]).join('\n'),issues:(d.commonIssues||[]).join('\n'),criteria:clone(d.criteria||[]),images:clone(d.images||[])};}
 return ui.drafts[id];
}
function curDraft(){const {page,arg}=route();return page==='item'?ui.drafts[arg]||null:null;}
function dirtyDrafts(){return Object.values(ui.drafts).filter(d=>d.dirty);}
function markDirty(E){E.dirty=true;const el=$('edState');if(el)el.textContent='有尚未儲存的修改';}
const sameJSON=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function saveDraft(id){
 const E=ui.drafts[id];if(!E)return 'ok';
 const criteria=E.criteria.filter(c=>c.text.trim()).map(c=>({...c,text:c.text.trim()}));
 if(!criteria.length)return 'no-criteria';
 const base=BASE_CONTENT.items[id],next={guide:E.guide,tips:lines(E.tips),commonIssues:lines(E.issues),criteria,images:E.images},o={};
 [['guide',base.guide||''],['tips',base.tips||[]],['commonIssues',base.commonIssues||[]],['criteria',base.criteria||[]],['images',base.images||[]]].forEach(([k,b])=>{if(!sameJSON(next[k],b))o[k]=next[k];});
 if(Object.keys(o).length)overrides.items[id]=o;else delete overrides.items[id];
 delete ui.drafts[id];return 'ok';
}
function editorHtml(id){
 const E=draftFor(id),changed=!!overrides.items[id];
 let h='<section class="card editor" data-id="'+esc(id)+'"><h2>修改這一項的內容<span class="sub" id="edState">'+(E.dirty?'有尚未儲存的修改':changed?'這一項已有修改（只在此瀏覽器）':'目前是檔案內容')+'</span></h2>';
 h+='<label class="field">作業說明<textarea rows="10" data-bind="ed" data-f="guide">'+esc(E.guide)+'</textarea><small>空一行分段；「- 」開頭是清單；「## 」開頭是小標題；==螢光==、!!紅字!!、**粗體**；「✓ 」開頭是正確寫法、「✗ 」開頭是錯誤寫法。</small></label>';
 h+='<label class="field">提醒（一行一則）<textarea rows="3" data-bind="ed" data-f="tips">'+esc(E.tips)+'</textarea></label>';
 h+='<div class="field">完成條件<ul class="critedit">'+E.criteria.map((c,i)=>'<li><input data-bind="ed" data-f="crit" data-i="'+i+'" aria-label="完成條件 '+(i+1)+'" value="'+esc(c.text)+'">'+(c.auto?'<span class="small-text muted" style="align-self:center">自動判斷</span>':'<button type="button" class="small quiet danger" data-act="edCritDel" data-i="'+i+'">刪除</button>')+'</li>').join('')+'</ul><button type="button" class="small" data-act="edCritAdd">新增完成條件</button><small>刪除或改寫條件後，已勾選的進度若對不上，會變回未勾選。</small></div>';
 h+='<label class="field" style="margin-top:12px">審查重點（一行一則）<textarea rows="5" data-bind="ed" data-f="issues">'+esc(E.issues)+'</textarea><small>引導員會看到這些「審查時常見的問題」，AI 審核注意事項也會用同一份。</small></label>';
 h+='<div class="field">範例圖片<ul class="imgedit">'+E.images.map((im,i)=>'<li><img src="'+esc(im.src)+'" alt=""><input data-bind="ed" data-f="imgTitle" data-i="'+i+'" aria-label="圖片標題" value="'+esc(im.title)+'" placeholder="圖片標題"><button type="button" class="small quiet danger" data-act="edImgDel" data-i="'+i+'">移除</button></li>').join('')+'</ul><label class="filebtn">加入圖片<input type="file" accept="image/png,image/jpeg,image/webp" data-act="edImgAdd"></label><small>圖片會壓縮後存進檔案（寬度上限 1400 像素）。</small></div>';
 h+='<div class="actions" style="margin-top:14px"><button type="button" class="primary" data-act="edSave">儲存這一項</button><button type="button" data-act="edReset"'+(changed||E.dirty?'':' disabled')+'>改回檔案內容</button></div></section>';
 return h;
}
function compressImage(file){
 return new Promise((resolve,reject)=>{
  if(!/^image\/(png|jpeg|webp)$/.test(file.type))return reject(Error('請選擇 PNG、JPG 或 WebP 圖片'));
  const fr=new FileReader();fr.onerror=()=>reject(Error('無法讀取圖片'));
  fr.onload=()=>{const img=new Image();img.onerror=()=>reject(Error('無法讀取圖片'));img.onload=()=>{const scale=Math.min(1,1400/img.naturalWidth);const w=Math.round(img.naturalWidth*scale),h=Math.round(img.naturalHeight*scale);const cv=document.createElement('canvas');cv.width=w;cv.height=h;const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);resolve(cv.toDataURL('image/jpeg',0.82));};img.src=fr.result;};
  fr.readAsDataURL(file);
 });
}
function buildExport(edition,gate){
 const content=clone(CONTENT);content.rev=new Date().toISOString().slice(0,19);
 if(edition==='guide')delete content.gate;else if(gate)content.gate=gate;
 const json=JSON.stringify(content).replace(/</g,'\\u003c');
 const html=SOURCE_HTML.replace(/(<html[^>]*?data-edition=")[a-z]+(")/,'$1'+edition+'$2');
 const m=html.match(/<script id="contentData"[^>]*>/);if(!m)return null;
 const start=m.index+m[0].length,end=html.indexOf('<\/script>',start);
 return html.slice(0,start)+json+html.slice(end);
}
function exportHtml(edition,gate){
 edition=edition==='reviewer'?'reviewer':'guide';
 const html=buildExport(edition,gate);if(!html){alert('無法匯出：找不到內容區塊。');return;}
 download(html,'創業貸款準備助手-'+(edition==='guide'?'引導員版':'審查人員版')+'-'+todayISO().replace(/-/g,'')+'.html','text/html;charset=utf-8');
 toast('已匯出新的'+(edition==='guide'?'引導員版':'審查人員版')+'。打開新檔案確認內容後，'+(WEB?'交給負責網站的同仁換上。':'再分享給同仁。'));
}

/* ---------- 摘要、報告、匯出 ---------- */
function summaryText(){
 const key=scopeKey(),md=modeDef(),so=scopeObj(),t=tally(),dl=deadline();
 const L=[];L.push('【創業貸款準備進度】'+(state.caseName||'（未填個案）'));L.push('階段：'+scopeLabel());
 L.push(md.dateLabel+'：'+(so.date?fmt(so.date):'未設定')+(dl?'（寄達期限 '+fmt(dl.due)+'，'+(dl.left<0?'已逾期 '+(-dl.left)+' 天':'剩 '+dl.left+' 天')+'）':''));
 L.push('繳交資料：完成 '+t.done+'／應備 '+t.total+' 項'+(t.na?'（不需要 '+t.na+' 項）':''));
 const iss=state.issues.filter(i=>i.scope===key&&i.status!=='done');
 if(iss.length){L.push('');L.push('需修改／缺件（'+iss.length+'）');iss.forEach(i=>L.push('・'+(i.itemId?CONTENT.items[i.itemId].name+'：':'')+issueLabel(i)+(i.status==='fixed'?'（已修改，待確認）':'')));}
 const pend=itemIds().filter(id=>['todo','progress'].includes(itemStatus(id).key));
 if(pend.length){L.push('');L.push('尚未完成（'+pend.length+'）');pend.forEach(id=>{const s=itemStatus(id);L.push('・'+CONTENT.items[id].name+'（'+s.n+'/'+s.m+'）');});}
 const f=md.flows.find(x=>!so.flows[x.id]);if(f){L.push('');L.push('目前流程：'+f.title);}
 L.push('');L.push('整理日期：'+fmt(todayISO()));
 return L.join('\n');
}
function buildReport(){
 const key=scopeKey(),md=modeDef(),so=scopeObj(),t=tally(),dl=deadline();
 let h='<h1>創業貸款準備進度報告</h1><p class="meta">個案：'+esc(state.caseName||'未填寫')+'　階段：'+esc(scopeLabel())+'　'+esc(md.dateLabel)+'：'+(so.date?fmt(so.date):'未設定')+(dl?'　寄達期限：'+fmt(dl.due):'')+'　列印日期：'+fmt(todayISO())+'</p>';
 h+='<p>繳交資料完成 '+t.done+' 項／應備 '+t.total+' 項；需修改或缺件 '+t.fix+' 項、待確認 '+t.verify+' 項、進行中 '+t.progress+' 項、未開始 '+t.todo+' 項；不需要 '+t.na+' 項。</p>';
 h+='<h2>繳交資料</h2><table><thead><tr><th style="width:34%">項目</th><th style="width:12%">收件方式</th><th style="width:10%">狀態</th><th>未完成的條件／備註</th></tr></thead><tbody>';
 itemIds().forEach(id=>{const d=CONTENT.items[id],s=itemStatus(id),r=getRec(key,id);const miss=d.kind==='operation'||['na','locked'].includes(s.key)?[]:critList(id).filter(c=>!c.on).map(c=>'□ '+c.text);if(s.legacy)miss.unshift('（沿用舊版完成狀態）');h+='<tr><td>'+esc(d.name)+'</td><td>'+esc(d.method||'—')+'</td><td>'+esc(s.label)+(s.m&&!['na','locked','op'].includes(s.key)?' '+s.n+'/'+s.m:'')+'</td><td class="pre">'+esc(miss.concat(r.note?['備註：'+r.note]:[]).join('\n'))+'</td></tr>';});
 h+='</tbody></table>';
 const iss=state.issues.filter(i=>i.scope===key&&i.status!=='done');
 h+='<h2>需修改事項（未完成 '+iss.length+' 項）</h2>'+(iss.length?'<table><thead><tr><th style="width:30%">項目</th><th>內容</th><th style="width:12%">狀態</th><th style="width:12%">來源</th></tr></thead><tbody>'+iss.map(i=>'<tr><td>'+esc(i.itemId?CONTENT.items[i.itemId].name:'整體')+'</td><td>'+esc(issueLabel(i))+'</td><td>'+esc(ISSUE_STATUS[i.status])+'</td><td>'+esc(i.source)+'</td></tr>').join('')+'</tbody></table>':'<p>無</p>');
 h+='<h2>流程</h2><table><tbody>'+md.flows.map((f,i)=>'<tr><td style="width:8%">'+(so.flows[f.id]?'✓':'□')+' '+(i+1)+'</td><td><strong>'+esc(f.title)+'</strong>　'+esc(f.desc)+'</td></tr>').join('')+'</tbody></table>';
 const tasks=state.tasks.filter(x=>!x.done);if(tasks.length)h+='<h2>未完成待辦</h2><table><tbody>'+tasks.map(x=>'<tr><td style="width:18%">'+(x.date?fmt(x.date):'未設定')+'</td><td>'+esc(x.text)+'</td></tr>').join('')+'</tbody></table>';
 if(state.reviewNotes.trim())h+='<h2>審查回覆紀錄</h2><div class="pre">'+esc(state.reviewNotes)+'</div>';
 if(state.meetingNotes.trim())h+='<h2>與公司、顧問確認的事項</h2><div class="pre">'+esc(state.meetingNotes)+'</div>';
 return h;
}
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
async function copyText(text){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true;}}catch(e){}const ta=$('summaryText');ta.focus();ta.select();try{return document.execCommand('copy');}catch(e){return false;}}

/* ---------- 事件 ---------- */
function issueLabel(i){return KIND_LABELS[i.kind]+(i.text===KIND_LABELS[i.kind]?'':'：'+i.text);}
function addIssue(itemId,text,kind,source){
 const key=scopeKey();text=String(text||'').trim();if(!text)return false;
 if(state.issues.some(i=>i.scope===key&&i.itemId===itemId&&i.text===text&&i.status!=='done')){toast('這一項已經有相同的需修改事項');return false;}
 state.issues.push({id:uid(),scope:key,itemId,text:text.slice(0,2000),source:ISSUE_SOURCES.includes(source)?source:'自我檢核',kind:kind==='missing'?'missing':'fix',status:'open',created:todayISO(),closed:''});
 return true;
}
function findingTarget(tool){if(tool==='debt')return state.mode==='first'?'ref-23':'later-debt';return ui.tool.sheet.target||'';}
function findingText(f){return f.text+(f.row?'（第 '+f.row+' 列）':'');}
const ACT={
 mode(b){state.mode=b.dataset.mode==='later'?'later':'first';ui.issueSel.clear();ui.taskSel.clear();save();const {page,arg}=route();if(page==='item'&&CONTENT.items[arg]&&modeOfItem(arg)!==state.mode&&b.closest('.modebar'))location.hash='#/docs';else render();},
 undo(){undo();},
 export(){download(JSON.stringify(state,null,2),'創業貸款進度備份-'+todayISO()+'.json','application/json');toast('已下載備份。這個檔案含填寫內容，請妥善保管。');},
 import(){$('importFile').click();},
 privacy(){$('privacyDialog').showModal();},
 closeDialog(b){const d=b.closest('dialog');if(d)d.close();},
 reset(){if(!confirm(RV?'清除這台電腦裡的全部審查資料？清除後可按「復原」救回，關閉頁面後就無法復原。':'清除這個瀏覽器裡的全部案件進度？包含舊版留下的進度。清除後可按「復原」救回，關閉頁面後就無法復原。'))return;let legacyRaw=null;try{legacyRaw=localStorage.getItem(LEGACY_KEY);}catch(e){}snapshot('清除此機進度',{legacyRaw});try{localStorage.removeItem(LEGACY_KEY);}catch(e){}const keep={role:state.role,tour:state.tour,seenNews:state.seenNews,welcomed:true};state=fresh();Object.assign(state,keep);loadIssue='';upgradeNotice='';ui.openRows.clear();ui.issueSel.clear();ui.taskSel.clear();location.hash='#/overview';done('','已清除此機進度');},
 maint(){if(!RV)return;const d=dirtyDrafts();if(ui.maint&&d.length&&!confirm('有 '+d.length+' 項修改還沒按「儲存這一項」，結束維護會放棄這些修改。確定結束？'))return;ui.maint=!ui.maint;ui.drafts={};render();if(ui.maint)toast('已進入維護模式。打開任一項目即可修改作業說明與審查重點。');},
 maintExport(b){
  const d=dirtyDrafts();
  if(d.length){if(!confirm('有 '+d.length+' 項修改還沒按「儲存這一項」。按「確定」先全部儲存再匯出；按「取消」回去檢查。'))return;
   const empty=d.find(E=>!E.criteria.some(c=>c.text.trim()));
   if(empty){toast('「'+short(CONTENT.items[empty.id].name,16)+'」至少要保留一個完成條件，還沒有匯出');return;}
   d.forEach(E=>saveDraft(E.id));
   const ok=saveOverrides();CONTENT=buildContent();render();if(!ok)toast('瀏覽器空間不足，修改只保留在這次匯出的檔案裡');
  }
  exportHtml(b.dataset.ed);
 },
 maintDiscard(){if(!confirm('放棄這個瀏覽器裡全部的內容修改（含注意事項）？已匯出的檔案不受影響。'))return;overrides={baseRev:BASE_CONTENT.rev,items:{}};ui.notesSaved=false;saveOverrides();CONTENT=buildContent();ui.drafts={};render();toast('已放棄全部修改');},
 dismissUpgrade(){upgradeNotice='';render();},
 dismissNews(){state.seenNews=NEWS;save();render();},
 dismissNewsGo(){state.seenNews=NEWS;save();location.hash='#/plan';},
 focusField(b){const el=$(b.dataset.f);if(el){el.scrollIntoView({block:'center'});el.focus();}},
 flowOpen(b){ui.flowOpen=Number(b.dataset.i);render();},
 itemForm(b){const id=b.dataset.id;if(ui.itemForm.has(id))ui.itemForm.delete(id);else ui.itemForm.add(id);render();if(ui.itemForm.has(id)){const el=document.querySelector('form[data-form=issue] input[name=text]');if(el)el.focus();}},
 issueAdd(){ui.issueAdd=!ui.issueAdd;render();if(ui.issueAdd){const el=document.querySelector('form[data-form=issue] input[name=text]');if(el)el.focus();}},
 xImport(){$('xFile').click();},
 xReply(){const f=replyFile();if(!f.items.length){toast('沒有審查人員的需修改事項可以回傳');return;}download(JSON.stringify(f,null,1),'修改回覆_'+String(state.caseName||'未命名').replace(/[\\/:*?"<>|\s]+/g,'_').slice(0,40)+'_'+scopeLabel().replace(/\s/g,'')+'_'+todayISO().replace(/-/g,'')+'.json','application/json');toast('已下載修改回覆。請上傳到審查事件，或用公司規定的方式交給審查人員。');},
 copySummary(){$('summaryTitle').textContent='進度摘要';$('summaryHint').textContent='可貼到 LINE 或 Email 給顧問、公司窗口。內容包含個案名稱，請確認收件對象。';$('summaryText').value=summaryText();$('summaryDialog').showModal();},
 async copySummaryNow(){const ok=await copyText($('summaryText').value);toast(ok?'已複製進度摘要':'無法自動複製，請選取文字後手動複製');},
 printReport(){$('printReport').innerHTML=buildReport();document.body.classList.add('report-mode');window.print();},
 deadlineTask(){const dl=deadline();if(!dl)return;const text=state.mode==='first'?'寄出審查資料（紙本註明「信扶專案收」）':'寄出第 '+state.round+' 次動撥資料';if(state.tasks.some(x=>x.text===text&&x.date===dl.due)){toast('待辦裡已經有這一項');return;}state.tasks.push({id:uid(),text,date:dl.due,done:false});save();render();toast('已加入待辦：'+fmt(dl.due)+' '+text);},
 docFilter(b){ui.docFilter=b.dataset.f;render();},
 expandAll(){const key=scopeKey();document.querySelectorAll('#view details[data-row]').forEach(d=>{d.open=true;});itemIds().forEach(id=>ui.openRows.add(key+':'+id));render();},
 collapseAll(){document.querySelectorAll('#view details[data-row]').forEach(d=>{d.open=false;});ui.openRows.clear();render();},
 critAll(b){const id=b.dataset.id,r=rec(scopeKey(),id);snapshot('全部勾選');(CONTENT.items[id].criteria||[]).forEach(c=>{if(!c.auto)r.crit[c.id]=true;});r.legacyDone=false;done('全部勾選','已勾選全部完成條件');},
 critNone(b){const id=b.dataset.id,r=rec(scopeKey(),id);snapshot('全部清除');r.crit={};r.legacyDone=false;done('全部清除','已清除這一項的勾選');},
 markMissing(b){if(addIssue(b.dataset.id,'缺件待補','missing','自我檢核')){save();render();toast('已標記缺件，記在需修改事項');}},
 quickIssue(b){if(addIssue(b.dataset.id,b.dataset.text,'fix','自我檢核')){save();render();toast('已加入需修改事項');}},
 issueSet(b){const i=state.issues.find(x=>x.id===b.dataset.id);if(!i)return;i.status=b.dataset.s;i.closed=i.status==='done'?todayISO():'';i.upd=nowStamp();save();render();toast(i.status==='fixed'?'已標記已修改，等待確認':i.status==='done'?'已標記已確認':'已改回待修改');},
 issueDel(b){const i=state.issues.find(x=>x.id===b.dataset.id);if(!i)return;snapshot('刪除 1 項需修改事項');state.issues=state.issues.filter(x=>x!==i);done('','已刪除「'+short(i.text,20)+'」');},
 issueFilter(b){ui.issueFilter=b.dataset.f;ui.issueSel.clear();render();},
 issueBatch(){ui.issueBatch=!ui.issueBatch;ui.issueSel.clear();render();},
 issueSelAll(){shownIssues().forEach(i=>ui.issueSel.add(i.id));render();},
 issueSelNone(){ui.issueSel.clear();render();},
 issueBatchSet(b){const sel=shownIssues().filter(i=>ui.issueSel.has(i.id));if(!sel.length)return;const label=(b.dataset.s==='done'?'標記已確認 ':'標記已修改 ')+sel.length+' 項';snapshot(label);sel.forEach(i=>{if(i.rid&&b.dataset.s==='done')return;i.status=b.dataset.s;i.closed=i.status==='done'?todayISO():'';i.upd=nowStamp();});ui.issueSel.clear();done(label,'已'+label);},
 issueBatchDel(){const sel=shownIssues().filter(i=>ui.issueSel.has(i.id));if(!sel.length)return;const label='刪除 '+sel.length+' 項需修改事項';snapshot(label);const ids=new Set(sel.map(i=>i.id));state.issues=state.issues.filter(i=>!ids.has(i.id));ui.issueSel.clear();done(label,'已'+label);},
 taskDel(b){const t=state.tasks.find(x=>x.id===b.dataset.id);if(!t)return;snapshot('刪除 1 項待辦');state.tasks=state.tasks.filter(x=>x!==t);done('','已刪除待辦「'+short(t.text,20)+'」');},
 taskBatch(){ui.taskBatch=!ui.taskBatch;ui.taskSel.clear();render();},
 taskSelAll(){state.tasks.forEach(t=>ui.taskSel.add(t.id));render();},
 taskSelDone(){ui.taskSel.clear();state.tasks.filter(t=>t.done).forEach(t=>ui.taskSel.add(t.id));render();},
 taskSelNone(){ui.taskSel.clear();render();},
 taskBatchDone(){const sel=state.tasks.filter(t=>ui.taskSel.has(t.id));if(!sel.length)return;const label='標記完成 '+sel.length+' 項待辦';snapshot(label);sel.forEach(t=>t.done=true);ui.taskSel.clear();done(label,'已'+label);},
 taskBatchDel(){const sel=state.tasks.filter(t=>ui.taskSel.has(t.id));if(!sel.length)return;const label='刪除 '+sel.length+' 項待辦';snapshot(label);state.tasks=state.tasks.filter(t=>!ui.taskSel.has(t.id));ui.taskSel.clear();done(label,'已'+label);},
 tool(b){location.hash='#/tools/'+b.dataset.t;},
 runDebt(){runDebt();render();const el=$('toolResult');if(el)el.scrollIntoView({block:'start'});},
 runSheet(){runSheet();render();const el=$('toolResult');if(el)el.scrollIntoView({block:'start'});},
 clearTool(b){const T=ui.tool[b.dataset.tool];Object.assign(T,{paste:'',grid:null,fileGrid:null,wb:null,sheets:null,sheetIdx:-1,fileName:'',result:null});if(b.dataset.tool==='debt')T.caseName='';render();toast('已清除表格內容');},
 async pickSheet(b){const T=ui.tool[b.dataset.tool];if(!T.wb)return;T.sheetIdx=Number(b.dataset.i);T.paste='';try{T.fileGrid=await T.wb.grid(T.sheetIdx);}catch(e){T.result={error:'無法讀取這個工作表'};render();return;}if(b.dataset.tool==='debt')runDebt();else{autoTarget(T.sheets[T.sheetIdx].name);runSheet();}render();},
 findingIssue(b){const R=ui.tool[b.dataset.tool].result,f=R&&R.F[Number(b.dataset.i)];if(!f)return;const target=findingTarget(b.dataset.tool);if(addIssue(target,findingText(f),'fix','自我檢核')){save();renderChrome(route().page,route().arg);b.disabled=true;b.textContent='已加入';toast('已加入需修改事項：'+short(CONTENT.items[target]?CONTENT.items[target].name:'整體',18));}},
 findingAll(b){const R=ui.tool[b.dataset.tool].result;if(!R)return;const target=findingTarget(b.dataset.tool);snapshot('加入檢核結果');let n=0;R.F.filter(f=>f.lv==='fix').forEach(f=>{const key=scopeKey(),text=findingText(f);if(!state.issues.some(i=>i.scope===key&&i.itemId===target&&i.text===text&&i.status!=='done')){addIssue(target,text,'fix','自我檢核');n++;}});if(!n){undoStack.pop();toast('這些項目都已經加入過了');return;}save();render();toast('已加入 '+n+' 項需修改事項',true);},
 beExample(){snapshot('載入損益平衡範例');Object.assign(state.tools.breakeven,{margin:'60',fixed:'35779',income:'0',before:'66250',after:'53750',days:'22',price:'150'});done('載入損益平衡範例','已載入文章範例數字');},
 beClear(){snapshot('清除損益平衡數字');Object.keys(state.tools.breakeven).forEach(k=>state.tools.breakeven[k]='');done('清除損益平衡數字','已清除數字');},
 fcExample(){const st=fcStore();snapshot('載入未來三個月範例');st.months=[{label:'8月',a:'159400',b:'0',rate:'40',d:'50000',e:'35779',f:'66250',repay:'30000',written:'-86389'},{label:'9月',a:'171400',b:'0',rate:'40',d:'0',e:'35779',f:'61250',repay:'30000',written:'-24189'},{label:'10月',a:'178400',b:'0',rate:'40',d:'0',e:'35779',f:'61250',repay:'40000',written:'-29989'}];done('載入未來三個月範例','已載入文章範例數字');},
 fcClear(){const st=fcStore();snapshot('清除未來三個月數字');st.months=[blankMonth(),blankMonth(),blankMonth()];done('清除未來三個月數字','已清除數字');},
 usageAdd(){if(state.mode!=='later')return;const so=scopeObj();so.usage.rows.push({id:uid(),name:'',kind:'設施設備',amount:'',proof:false});save();render();const ins=document.querySelectorAll('[data-tool=usage][data-f=name]');if(ins.length)ins[ins.length-1].focus();},
 usageDel(b){if(state.mode!=='later')return;const so=scopeObj();snapshot('移除 1 列使用明細');so.usage.rows=so.usage.rows.filter(r=>r.id!==b.dataset.row);done('','已移除 1 列');},
 usageClear(){if(state.mode!=='later')return;const so=scopeObj();snapshot('清除使用明細');so.usage={amount:'',rows:[]};done('清除使用明細','已清除使用明細');},
 zoom(b){const im=(CONTENT.items[b.dataset.id].images||[])[Number(b.dataset.i)];if(!im)return;$('imgDialogTitle').textContent=im.title||'範例圖片';$('imgDialogImg').src=im.src;$('imgDialogImg').alt=im.alt||'';$('imgDialog').showModal();},
 textExport(){let t='創業貸款計畫草稿\n個案：'+state.caseName+'\n\n';t+=SECTIONS.map((s,i)=>(i+1)+'. '+s[0]+'\n'+(state.writing[i].text||'（尚未填寫）')).join('\n\n');download('﻿'+t,'創業貸款計畫草稿-'+todayISO()+'.txt','text/plain;charset=utf-8');},
 edCritAdd(){const E=curDraft();if(!E)return;E.criteria.push({id:'c'+uid().slice(-6),text:''});E.dirty=true;render();const ins=document.querySelectorAll('[data-f=crit]');if(ins.length)ins[ins.length-1].focus();},
 edCritDel(b){const E=curDraft();if(!E)return;E.criteria.splice(Number(b.dataset.i),1);E.dirty=true;render();},
 edImgDel(b){const E=curDraft();if(!E)return;E.images.splice(Number(b.dataset.i),1);E.dirty=true;render();},
 edSave(){const E=curDraft();if(!E)return;if(saveDraft(E.id)==='no-criteria'){toast('至少要保留一個完成條件，否則這一項永遠無法完成');return;}const ok=saveOverrides();CONTENT=buildContent();render();toast(ok?'已儲存這一項（只在此瀏覽器）。記得匯出新版 HTML。':'瀏覽器空間不足，修改沒有存進瀏覽器；請立刻「匯出新版 HTML」。');},
 edReset(){const E=curDraft();if(!E||!confirm('把這一項改回檔案內容？'))return;delete overrides.items[E.id];delete ui.drafts[E.id];saveOverrides();CONTENT=buildContent();render();toast('已改回檔案內容');}
};
const CHG={
 crit(x){if(RV)return;const r=rec(scopeKey(),x.dataset.id);if(x.checked)r.crit[x.dataset.c]=true;else delete r.crit[x.dataset.c];delete r.via[x.dataset.c];r.legacyDone=false;save();render();},
 na(x){const r=rec(scopeKey(),x.dataset.id);r.na=x.checked;save();render();},
 flow(x){scopeObj().flows[x.dataset.id]=x.checked;if(!x.checked)delete scopeObj().flows[x.dataset.id];save();render();},
 op(x){if(OP_LABELS[x.value]){state.first.operation=x.value;save();render();}},
 scopeDate(x){const v=x.value;if(v&&!isISO(v))return;scopeObj().date=v;save();render();if(v)pressPostmark();},
 field(x){const v=x.value;if(v&&!isISO(v))return;const r=rec(scopeKey(),x.dataset.id);if(v)r.fields[x.dataset.f]=v;else delete r.fields[x.dataset.f];save();render();},
 written(x){state.writing[Number(x.dataset.i)].done=x.checked;save();},
 taskDone(x){const t=state.tasks.find(y=>y.id===x.dataset.id);if(t){t.done=x.checked;save();render();}},
 taskDate(x){const t=state.tasks.find(y=>y.id===x.dataset.id);if(t&&(!x.value||isISO(x.value))){t.date=x.value;save();render();}},
 issueSel(x){if(x.checked)ui.issueSel.add(x.dataset.id);else ui.issueSel.delete(x.dataset.id);render();},
 taskSel(x){if(x.checked)ui.taskSel.add(x.dataset.id);else ui.taskSel.delete(x.dataset.id);render();},
 debtLater(x){ui.tool.debt.later=x.checked;},
 sheetTarget(x){ui.tool.sheet.target=x.value;},
 usageKind(x){if(state.mode!=='later')return;const so=scopeObj(),r=so.usage.rows.find(y=>y.id===x.dataset.row);if(r&&USAGE_KINDS.includes(x.value)){r.kind=x.value;save();render();}},
 usageProof(x){if(state.mode!=='later')return;const so=scopeObj(),r=so.usage.rows.find(y=>y.id===x.dataset.row);if(r){r.proof=x.checked;save();refreshUsage();}},
 xlsx(x){const f=x.files&&x.files[0];x.value='';if(f)loadXlsx(x.dataset.tool,f);},
 async edImgAdd(x){const f=x.files&&x.files[0];x.value='';const E=curDraft();if(!f||!E)return;try{const src=await compressImage(f);E.images.push({title:f.name.replace(/\.[^.]+$/,''),alt:'',src});E.dirty=true;render();toast('已加入圖片，記得按「儲存這一項」');}catch(e){toast(e.message||'無法加入圖片');}}
};
const BIND={
 caseName(x){state.caseName=x.value.slice(0,120);save();$('caseChip').textContent=state.caseName?'個案：'+state.caseName:'';},
 itemNote(x){rec(scopeKey(),x.dataset.id).note=x.value;save();},
 gnote(x){const i=state.issues.find(y=>y.id===x.dataset.id);if(i){i.gnote=x.value.slice(0,1000);save();}},
 reviewNotes(x){state.reviewNotes=x.value;save();},
 meetingNotes(x){state.meetingNotes=x.value;save();},
 writing(x){state.writing[Number(x.dataset.i)].text=x.value;save();},
 paste(x){ui.tool[x.dataset.tool].paste=x.value;},
 debtCase(x){ui.tool.debt.caseName=x.value;},
 calc(x){
  const tool=x.dataset.tool,f=x.dataset.f,v=x.value.slice(0,40);
  if(tool==='breakeven'){state.tools.breakeven[f]=v;save();$('beOut').innerHTML=breakevenOut();}
  else if(tool==='forecast'){fcStore().months[Number(x.dataset.m)][f]=v;save();updateForecastOut();}
  else if(tool==='usage'){if(state.mode!=='later')return;const so=scopeObj();if(f==='amount')so.usage.amount=v;else{const r=so.usage.rows.find(y=>y.id===x.dataset.row);if(!r)return;if(f==='name')r.name=x.value.slice(0,200);else r.amount=v;}save();refreshUsage();}
 },
 ed(x){const E=curDraft();if(!E)return;const f=x.dataset.f;if(f==='crit')E.criteria[Number(x.dataset.i)].text=x.value;else if(f==='imgTitle')E.images[Number(x.dataset.i)].title=x.value;else if(['guide','tips','issues'].includes(f))E[f]=x.value;markDirty(E);}
};
const SUB={
 issue(form){const fd=new FormData(form);const item=form.dataset.item||fd.get('item')||'';if(addIssue(item,fd.get('text'),fd.get('kind'),fd.get('source'))){save();render();toast('已加入需修改事項');const ni=document.querySelector('form[data-form=issue] input[name=text]');if(ni)ni.focus();}},
 task(form){const fd=new FormData(form);const text=String(fd.get('text')||'').trim();if(!text)return;const date=String(fd.get('date')||'');state.tasks.push({id:uid(),text:text.slice(0,500),date:isISO(date)?date:'',done:false});save();render();toast('已新增待辦');const ni=document.querySelector('form[data-form=task] input[name=text]');if(ni)ni.focus();}
};
