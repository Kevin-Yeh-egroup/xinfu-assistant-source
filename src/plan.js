/* ==========================================================
   頁面：計畫書與附件
   和小老闆一起填一次 → 產生 Word 計畫書、Excel 附件
   ========================================================== */
ui.plSecret={idno:'',account:''};ui.plSec='';ui.plFocus='';ui.plLast=null;
ICON.plan='<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M9.5 12.5h6M9.5 16h4"/>';
const PL_SECS={
 basic:{t:'申請人基本資料',d:[['計畫書','壹']],m:['first']},
 biz:{t:'事業基本資料',d:[['計畫書','貳']],m:['first']},
 story:{t:'創業目的與優勢',d:[['計畫書','參 一、二']],m:['first']},
 money:{t:'資金與債務',tl:'債務現況',d:[['計畫書','參 三'],['附件','債務現況盤點表']],dl:[['附件','債務現況盤點表']],m:['first','later']},
 structure:{t:'營運結構',d:[['計畫書','貳 九'],['附件','營運結構數字計算']],dl:[['附件','營運結構數字計算']],m:['first','later']},
 forecast:{t:'營運財務預估',d:[['計畫書','貳 十一'],['附件','營運財務預估分析表']],m:['first']},
 needs:{t:'設備與資金需求',d:[['計畫書','參 四、肆'],['附件','資金需求及設備購買表']],m:['first']},
 loan:{t:'貸款申請與輔導需求',d:[['計畫書','伍、陸']],m:['first']},
 make:{t:'核對與產生',d:[],m:['first','later']}
};
const PL_ORDER=['basic','biz','story','money','structure','forecast','needs','loan','make'];
const PL_SOFT={'biz.product':40,'biz.feature':70,'biz.customer':70,'biz.sales':70,'biz.focus':100,purpose:150,advantage:150};
const PL_KIND_BUCKET={'房屋貸款':'house','汽機車貸款':'car','現金卡':'cashcard','一般信用貸款':'credit','勞工紓困貸款':'labor','信用卡':'card'};
const PL_BANKISH=['信用卡','現金卡','一般信用貸款','房屋貸款','汽機車貸款'];
const PL_PER_MONTH={'每月':1,'每季':3,'每半年':6,'每年':12};
const PL_ROW_LABEL={debts:'債務',owned:'現有設備',buy:'要購買的設備',funds:'其他營運資金',work:'週轉金'};
function plSecs(){return PL_ORDER.filter(id=>PL_SECS[id].m.includes(state.mode));}
function plSecTitle(id){const s=PL_SECS[id];return state.mode==='later'&&s.tl?s.tl:s.t;}

/* ---------- 取值與設值（路徑：a.b.c；清單用 id；fm.0.a 是「未來三個月試算」的月份） ---------- */
const PL_BAD_KEYS=new Set(['__proto__','constructor','prototype']);
function plRoot(path){const ks=path.split('.');if(ks.some(k=>PL_BAD_KEYS.has(k)))return null;if(ks[0]==='fm')return {o:state.first.forecast.months,ks:ks.slice(1)};return {o:state.plan,ks};}
function plStep(o,k){if(o==null)return undefined;if(Array.isArray(o)){if(/^\d+$/.test(k))return o[Number(k)];return o.find(x=>x&&x.id===k);}return Object.prototype.hasOwnProperty.call(o,k)?o[k]:undefined;}
function plGet(path){const r=plRoot(path);if(!r)return undefined;let o=r.o;for(const k of r.ks)o=plStep(o,k);return o;}
function plSet(path,val){
 const r=plRoot(path);if(!r)return false;const ks=r.ks.slice(),last=ks.pop();let o=r.o;for(const k of ks)o=plStep(o,k);
 if(o==null||typeof o!=='object')return false;
 if(Array.isArray(o)){const i=Number(last);if(!/^\d+$/.test(last)||i>=o.length||typeof o[i]!=='string')return false;o[i]=val;return true;}
 if(!Object.prototype.hasOwnProperty.call(o,last)||typeof o[last]!==typeof val)return false;
 o[last]=val;return true;
}
function plMax(path){if(/(note|reason)$/i.test(path)||path.startsWith('fc.notes.'))return 300;if(PL_SOFT[path]||PL_LONG.has(path))return 1200;return 120;}
function plEnumOk(path,v){const k=path.replace(/^(debts|owned|buy|funds|work)\.[\w-]+\./,'$1.');const en=PL_ENUMS[k];return !en||v===''||en.includes(v);}

/* ---------- 計算 ---------- */
const plN=v=>{const x=pnum(v);return isNaN(x)?0:x;};
const plHas=v=>String(v??'').trim()!=='';
const plBadNum=v=>plHas(v)&&isNaN(pnum(v));
function plDebtor(d){return d.who==='family'?d.name.trim():(state.plan.p.name.trim()||state.caseName.trim());}
function plMonthly(d){const k=PL_PER_MONTH[d.freq]||1;return Math.round(plN(d.per)/k);}
function plDebtsOut(){
 const list=state.plan.debts.filter(d=>d.status!=='已還清'),fam=[];
 list.forEach(d=>{if(d.who==='family'){const k=d.name.trim();if(!fam.includes(k))fam.push(k);}});
 const grp=d=>d.who==='family'?fam.indexOf(d.name.trim()):-1;
 const when=d=>{const p=parseDateText(d.date||'');return p?dateSpan(p)[0]:Infinity;};
 return list.map((d,i)=>({d,i})).sort((a,b)=>grp(a.d)-grp(b.d)||when(a.d)-when(b.d)||a.i-b.i).map(x=>x.d);
}
function plStatusText(d){return d.status?d.status+(d.note.trim()?'（'+d.note.trim()+'）':''):d.note.trim();}
function plDebtGrid(rows){
 const head=['債務人','債權人','債務總額','當時借錢的原因','債務時間','利率','還款頻率','每期還款金額','目前還款狀況','目前剩餘金額'];
 const g=[head.map((h,ci)=>mkCell(h,colName(ci)+'1'))];
 rows.forEach((d,i)=>{const vals=[plDebtor(d),d.creditor,d.total,d.reason,d.date,d.rate,d.freq,d.per,plStatusText(d),d.remain];g.push(vals.map((v,ci)=>mkCell(v,colName(ci)+(i+2))));});
 const per=rows.reduce((a,d)=>a+plN(d.per),0),rem=rows.reduce((a,d)=>a+plN(d.remain),0),tot=Array(10).fill('');tot[0]='小計';tot[7]=String(per);tot[8]='小計';tot[9]=String(rem);
 g.push(tot.map((v,ci)=>mkCell(v,colName(ci)+(rows.length+2))));
 return g;
}
function plCalc(){
 const p=state.plan,st=p.st,C={};
 C.inv=['self','rosca','family','bank','other'].reduce((a,k)=>a+plN(p.inv[k]),0);
 C.invAny=['self','rosca','family','bank','other'].some(k=>plHas(p.inv[k]));
 const sum=(rows,o)=>rows.reduce((a,[k])=>a+plN(o[k].amt),0),sumB=(rows,o)=>rows.reduce((a,[k])=>a+(plHas(o[k].before)?plN(o[k].before):plN(o[k].amt)),0);
 C.incSum=sum(ST_INC,st.inc);C.homeSum=sum(ST_HOME,st.home);C.bizSum=sum(ST_BIZ,st.biz);
 C.anyBefore=st.special&&(ST_HOME.some(([k])=>plHas(st.home[k].before))||ST_BIZ.some(([k])=>plHas(st.biz[k].before)));
 C.homeBefore=sumB(ST_HOME,st.home);C.bizBefore=sumB(ST_BIZ,st.biz);
 C.m=pct(st.margin);C.days=pnum(st.days);C.price=pnum(st.price);
 const be=(fixed,home)=>{if(!(C.m>0))return null;const need=fixed+home-C.incSum,bep=Math.max(0,need/C.m),daily=C.days>0?Math.round(bep/C.days):null,cust=daily!==null&&C.price>0?Math.ceil(daily/C.price):null;return {need,bep,daily,cust};};
 C.be=be(C.bizSum,C.homeSum);C.beBefore=C.anyBefore?be(C.bizBefore,C.homeBefore):null;
 const fp=p.fc.past,pa={a:plN(fp.a),b:plN(fp.b),c:plN(fp.c),d:plN(fp.d),e:plN(fp.e),f:plN(fp.f),repay:plN(fp.repay)};
 pa.rate=pa.a>0?pa.c/pa.a:0;pa.inc=pa.a+pa.b;pa.exp=pa.e+pa.c+pa.d+pa.f+pa.repay;pa.total=pa.inc-pa.exp;
 C.months=[pa].concat(state.first.forecast.months.map(m=>{const r=pct(m.rate),x={a:plN(m.a),b:plN(m.b),rate:isNaN(r)?0:r,d:plN(m.d),e:plN(m.e),f:plN(m.f),repay:plN(m.repay)};x.c=Math.round(x.a*x.rate);x.inc=x.a+x.b;x.exp=x.e+x.c+x.d+x.f+x.repay;x.total=x.inc-x.exp;return x;}));
 C.labels=[fp.label].concat(state.first.forecast.months.map(m=>m.label));
 const fut=C.months.slice(1);C.avgSurplus=fut.reduce((a,x)=>a+x.total,0)/3;C.avgOper=fut.reduce((a,x)=>a+x.total+x.d,0)/3;
 const amt=(a,b)=>plHas(a)&&plHas(b)&&!plBadNum(a)&&!plBadNum(b)?plN(a)*plN(b):null;
 C.own={};C.ownTotal=0;C.owedA=0;p.owned.forEach(r=>{const v=amt(r.price,r.qty);C.own[r.id]=v;C.ownTotal+=v||0;if(r.paid==='inst')C.owedA+=plN(r.unpaid);});
 C.buy={};C.buyTotal=0;p.buy.forEach(r=>{const v=amt(r.price,r.qty);C.buy[r.id]=v;C.buyTotal+=v||0;});
 C.funds={};C.fundsTotal=0;p.funds.forEach(r=>{const v=amt(r.price,r.qty);C.funds[r.id]=v;C.fundsTotal+=v||0;});
 C.work={};C.workTotal=0;p.work.forEach(r=>{const a=amt(r.monthly,r.qty),v=a!==null&&plHas(r.months)&&!plBadNum(r.months)?a*plN(r.months):null;C.work[r.id]=v;C.workTotal+=v||0;});
 C.need=C.owedA+C.buyTotal+C.fundsTotal+C.workTotal;
 C.debts=plDebtsOut();C.perSum=C.debts.reduce((a,d)=>a+plN(d.per),0);C.remainSum=C.debts.reduce((a,d)=>a+plN(d.remain),0);
 return C;
}
function plMoney(n){return n===null||n===undefined||!isFinite(n)?'':money(n);}
function plOutText(key,C){
 if(key.startsWith('len:')){const v=String(plGet(key.slice(4))||'');return plLenText(v,PL_SOFT[key.slice(4)]);}
 const be=C.be;
 switch(key){
  case 'inv.total':return money(C.inv);
  case 'st.incSum':return money(C.incSum);case 'st.homeSum':return money(C.homeSum);case 'st.bizSum':return money(C.bizSum);
  case 'st.bep':return be?money(be.bep):'—';case 'st.daily':return be&&be.daily!==null?money(be.daily):'—';case 'st.cust':return be&&be.cust!==null?be.cust+' 人':'—';
  case 'st.before':return C.beBefore?'計畫性還款前（調整前）：損益平衡 '+money(C.beBefore.bep)+' 元'+(C.beBefore.daily!==null?'，每天最低營業額 '+money(C.beBefore.daily)+' 元':'')+(C.beBefore.cust!==null?'，每日來客 '+C.beBefore.cust+' 人':''):'';
  case 'own.total':return money(C.ownTotal);case 'own.owed':return money(C.owedA);case 'buy.total':return money(C.buyTotal);case 'funds.total':return money(C.fundsTotal);case 'work.total':return money(C.workTotal);
  case 'need.total':return money(C.need);
  case 'debt.per':return money(C.perSum);case 'debt.remain':return money(C.remainSum);
  case 'loan.need':return '所需貸款總額 '+money(C.need)+' 元（設備與資金需求）';
 }
 const m=key.match(/^(own|buy|funds|work)\.([\w-]+)$/);if(m){const v=C[m[1]][m[2]];return v===null||v===undefined?'—':money(v);}
 const fm=key.match(/^fc\.(\d)\.(\w+)$/);if(fm){const x=C.months[Number(fm[1])];if(!x)return '';if(fm[2]==='rate')return x.a>0?fmtNum(Math.round(x.rate*1000)/10)+'%':'—';return money(x[fm[2]]);}
 return '';
}
function plLenText(v,soft){const n=[...v.replace(/\s/g,'')].length;if(!soft)return n?'目前 '+n+' 字':'';return '目前 '+n+' 字，建議 '+soft+' 字內'+(n>soft?'（計畫書可能超過 3 頁）':'');}

/* ---------- 核對 ---------- */
function plChecks(){
 const p=state.plan,C=plCalc(),L=[],first=state.mode==='first';
 const add=(lv,sec,fk,text)=>L.push({lv,sec,fk,text});
 const miss=(sec,path,label)=>{if(!plHas(plGet(path)))add('miss',sec,'pl:'+path,label);};
 const num=(sec,path,label)=>{if(plBadNum(plGet(path)))add('fix',sec,'pl:'+path,label+'「'+short(plGet(path),12)+'」不是數字');};
 const soft=(sec,path,label)=>{const n=[...String(plGet(path)||'').replace(/\s/g,'')].length,s=PL_SOFT[path];if(s&&n>s)add('hint',sec,'pl:'+path,label+'約 '+n+' 字，建議 '+s+' 字內，計畫書比較不會超過 3 頁');};
 if(first){
  miss('basic','applyDate','申請日期');miss('basic','p.name','申請人姓名');miss('basic','p.birth','出生年月日');
  if(!plHas(p.p.phone)&&!plHas(p.p.mobile))add('miss','basic','pl:p.phone','聯絡電話或手機（至少一個）');
  miss('basic','p.emName','緊急聯絡人');miss('basic','p.emRel','緊急聯絡人關係');miss('basic','p.emPhone','緊急聯絡人電話');
  const idno=String(ui.plSecret.idno||'').trim();if(idno&&!/^[A-Z][1289]\d{8}$/i.test(idno))add('check','basic','sec:idno','身分證字號格式看起來不對，請再確認');
  miss('biz','biz.name','公司名稱');
  if(!p.biz.reg)add('miss','biz','pl:biz.reg:done','法定登記辦理情形');
  else if(p.biz.reg==='done'){miss('biz','biz.setup','設立日期');if(!p.biz.kind)add('miss','biz','pl:biz.kind:commerce','登記方式');else if(p.biz.kind==='commerce')miss('biz','biz.regNo','統一編號');else miss('biz','biz.taxNo','稅籍統一編號');}
  else miss('biz','biz.regPlan','預計登記時間');
  if(!p.biz.type)add('miss','biz','pl:biz.type:1','經營型態');else if(p.biz.type==='5')miss('biz','biz.typeOther','經營型態「其他」的內容');
  miss('biz','biz.addr.company.text','事業地址（公司）');miss('biz','biz.product','主要產品');miss('biz','biz.staff','員工人數（沒有請填 0）');num('biz','biz.staff','員工人數');
  miss('biz','biz.feature','產品特色');miss('biz','biz.customer','主要客群');miss('biz','biz.sales','銷售方式');miss('biz','biz.focus','近期維運重點');
  soft('biz','biz.product','主要產品');soft('biz','biz.feature','產品特色');soft('biz','biz.customer','主要客群');soft('biz','biz.sales','銷售方式');soft('biz','biz.focus','近期維運重點');
  miss('story','purpose','創業目的');miss('story','advantage','個人創業優勢');soft('story','purpose','創業目的');soft('story','advantage','個人創業優勢');
  if(!C.invAny)add('miss','money','pl:inv.self','創業至今資金投入（沒有請填 0）');
  ['self','rosca','family','bank','other'].forEach(k=>num('money','inv.'+k,'資金投入'));
  if(plN(p.inv.other)>0&&!plHas(p.inv.otherName))add('fix','money','pl:inv.otherName','資金投入「其他」有金額，請寫明來源');
 }
 // 債務
 const active=p.debts.filter(d=>d.status!=='已還清');
 if(!p.debts.length&&!p.noDebt)add('miss','money','act:plAdd:debts','債務：新增每一筆債務，或勾選「目前都沒有債務」');
 p.debts.forEach((d,i)=>{
  const tag='第 '+(i+1)+' 筆債務'+(d.creditor.trim()?'（'+short(d.creditor.trim(),10)+'）':'')+'：',base='debts.'+d.id+'.';
  if(d.status==='已還清')return;
  if(d.who==='family'&&!d.name.trim())add('miss','money','pl:'+base+'name',tag+'親屬的本名或稱謂');
  if(d.who==='self'&&!plDebtor(d))add('miss',first?'basic':'money','pl:p.name',tag+'債務人是小老闆本人，請先填'+(first?'申請人姓名':'小老闆姓名'));
  [['creditor','債權人'],['kind','種類'],['total','債務總額'],['reason','當時借錢的原因'],['date','債務時間'],['freq','還款頻率'],['per','每期還款金額（沒有請填 0）'],['status','目前還款狀況'],['remain','目前剩餘金額（沒有請填 0）']].forEach(([k,l])=>{if(!plHas(d[k]))add('miss','money','pl:'+base+k,tag+l);});
  [['total','債務總額'],['per','每期還款金額'],['remain','目前剩餘金額']].forEach(([k,l])=>{if(plBadNum(d[k]))add('fix','money','pl:'+base+k,tag+l+'「'+short(d[k],12)+'」不是數字');});
  if(plHas(d.date)&&!parseDateText(d.date))add('check','money','pl:'+base+'date',tag+'看不懂債務時間「'+short(d.date,14)+'」，無法排序；請寫成 113年5月 或 113/05/07');
  if(plHas(d.creditor)&&GENERIC_CREDITORS.includes(d.creditor.trim()))add('fix','money','pl:'+base+'creditor',tag+'債權人只寫「'+d.creditor.trim()+'」，請寫清楚跟誰借（例如：○○銀行、勞工紓困貸款、親友的稱謂）');
  if(plHas(d.total)&&plHas(d.remain)&&plN(d.remain)>plN(d.total))add('check','money','pl:'+base+'remain',tag+'目前剩餘金額比債務總額多，請確認');
  if(!plHas(d.rate))add('hint','money','pl:'+base+'rate',tag+'利率空白；沒有利息請寫「無息」');
 });
 if(active.some(d=>PL_BANKISH.includes(d.kind)))add('hint','money','','有銀行或信用卡的債務：記得申請「金融機構債權人清冊」正本（審查繳交進度表第 24 列）');
 // 營運結構
 miss('structure','st.margin','毛利率');miss('structure','st.days','每月營業天數');miss('structure','st.price','客單價');
 ['margin','days','price'].forEach(k=>num('structure','st.'+k,({margin:'毛利率',days:'每月營業天數',price:'客單價'})[k]));
 if(plHas(p.st.margin)&&!plBadNum(p.st.margin)&&!(C.m>0&&C.m<1))add('fix','structure','pl:st.margin','毛利率要在 0～100% 之間');
 let blanks=0;
 [['inc',ST_INC,'家庭收入'],['home',ST_HOME,'家庭支出'],['biz',ST_BIZ,'固定成本']].forEach(([g,rows,gl])=>rows.forEach(([k,l])=>{const r=p.st[g][k],path='st.'+g+'.'+k+'.';if(!plHas(r.amt))blanks++;num('structure',path+'amt',gl+'「'+l+'」');if(r.before!==undefined)num('structure',path+'before',gl+'「'+l+'」調整前');if(k==='other'&&plN(r.amt)>0&&!r.note.trim())add('fix','structure','pl:'+path+'note',gl+'「'+l+'」有金額，請寫明是什麼');}));
 if(blanks)add('hint','structure','',blanks+' 個金額空白，產生附件時會填 0');
 if(p.st.special&&!C.anyBefore)add('hint','structure','pl:st.special','已勾選「計畫性還款等特別處遇」，但還沒有填調整前的金額');
 if(first){
  // 營運財務預估
  const lab=['過去一個月','第 1 個月','第 2 個月','第 3 個月'];
  miss('forecast','fc.past.label','過去一個月的月份');miss('forecast','fc.past.a','過去一個月的公帳收入');
  ['a','b','c','d','e','f','repay'].forEach(k=>num('forecast','fc.past.'+k,'過去一個月'));
  state.first.forecast.months.forEach((m,i)=>{
   const b='fm.'+i+'.';miss('forecast',b+'label',lab[i+1]+'的月份');miss('forecast',b+'a',lab[i+1]+'的公帳收入');miss('forecast',b+'rate',lab[i+1]+'的成本率');
   ['a','b','d','e','f','repay','rate'].forEach(k=>num('forecast',b+k,lab[i+1]));
  });
  if(C.m>0)state.first.forecast.months.forEach((m,i)=>{
   const b='fm.'+i+'.',x=C.months[i+1],L2=lab[i+1];
   if(plHas(m.b)&&x.b!==C.incSum)add('check','forecast','pl:'+b+'b',L2+'私帳收入 '+money(x.b)+'，營運結構的家庭收入小計是 '+money(C.incSum));
   if(plHas(m.e)&&x.e!==C.bizSum)add('check','forecast','pl:'+b+'e',L2+'營業固定支出 '+money(x.e)+'，營運結構的固定成本小計是 '+money(C.bizSum));
   if(plHas(m.f)&&x.f!==C.homeSum)add('check','forecast','pl:'+b+'f',L2+'私帳固定支出 '+money(x.f)+'，營運結構的家庭支出小計是 '+money(C.homeSum));
   if(plHas(m.rate)&&Math.abs(x.rate-(1-C.m))>0.005)add('check','forecast','pl:'+b+'rate',L2+'成本率 '+fmtNum(Math.round(x.rate*1000)/10)+'%，營運結構的毛利率是 '+fmtNum(Math.round(C.m*1000)/10)+'%（成本率應為 '+fmtNum(Math.round((1-C.m)*1000)/10)+'%）');
  });
  C.months.forEach((x,i)=>{if((i===0?plHas(p.fc.past.a):plHas(state.first.forecast.months[i-1].a))&&x.total<0&&!String(p.fc.notes[i]||'').trim())add('hint','forecast','pl:fc.notes.'+i,lab[i]+'盈餘是負的（'+money(x.total)+' 元），請在「說明」寫原因與因應');});
  // 設備與資金需求
  if(!p.buy.length&&!p.funds.length&&!p.work.length)add('miss','needs','act:plAdd:buy','資金用途：至少要有一項（要購買的設備、其他營運資金或週轉金）');
  const rows=(list,fields,label)=>p[list].forEach((r,i)=>{const tag=label+'第 '+(i+1)+' 項'+(r.item.trim()?'「'+short(r.item.trim(),10)+'」':'')+'：';fields.forEach(([k,l,isNum])=>{const path=list+'.'+r.id+'.'+k;if(!plHas(r[k]))add('miss','needs','pl:'+path,tag+l);else if(isNum&&plBadNum(r[k]))add('fix','needs','pl:'+path,tag+l+'不是數字');});});
  rows('owned',[['item','項目'],['price','單價',1],['qty','數量',1]],'現有設備');
  p.owned.forEach((r,i)=>{const tag='現有設備第 '+(i+1)+' 項：';if(!r.paid)add('miss','needs','pl:owned.'+r.id+'.paid',tag+'付款情形');else if(r.paid==='inst'){if(!plHas(r.unpaid))add('miss','needs','pl:owned.'+r.id+'.unpaid',tag+'未繳清金額');else if(plBadNum(r.unpaid))add('fix','needs','pl:owned.'+r.id+'.unpaid',tag+'未繳清金額不是數字');}});
  rows('buy',[['item','項目'],['use','用途'],['spec','規格（機型）'],['price','單價',1],['qty','數量',1],['when','需要時間點'],['source','購買來源（廠商）']],'要購買的設備');
  p.buy.forEach((r,i)=>{const tag='要購買的設備第 '+(i+1)+' 項'+(r.item.trim()?'「'+short(r.item.trim(),10)+'」':'')+'：';if(!r.pay)add('miss','needs','pl:buy.'+r.id+'.pay',tag+'付款方式');else if(r.pay==='inst'){if(!plHas(r.periods))add('miss','needs','pl:buy.'+r.id+'.periods',tag+'分期期數');if(!plHas(r.perPay))add('miss','needs','pl:buy.'+r.id+'.perPay',tag+'每期應繳金額');}if(!r.quote)add('fix','needs','pl:buy.'+r.id+'.quote',tag+'還沒有估價單（每項設備都要附估價單）');});
  rows('funds',[['item','項目'],['price','單價',1],['qty','數量',1],['when','需要時間']],'其他營運資金');
  rows('work',[['item','項目'],['monthly','每月費用',1],['qty','數量',1],['months','月份',1]],'週轉金');
  p.work.forEach((r,i)=>{if(plN(r.months)>3)add('hint','needs','pl:work.'+r.id+'.months','週轉金第 '+(i+1)+' 項估了 '+fmtNum(plN(r.months))+' 個月；週轉金原則上預估 3 個月（視產業而定）');if(/薪|人事|工讀|員工/.test(r.item)&&!r.note.trim())add('check','needs','pl:work.'+r.id+'.note','週轉金第 '+(i+1)+' 項是薪資：請在說明寫工作人員的用途與薪資分配');});
  // 貸款申請
  miss('loan','loan.amount','擬申請貸款金額');num('loan','loan.amount','擬申請貸款金額');miss('loan','loan.years','貸款期限');num('loan','loan.years','貸款期限');
  if(plHas(p.loan.years)&&!plBadNum(p.loan.years)&&(plN(p.loan.years)>7||plN(p.loan.years)<=0))add('fix','loan','pl:loan.years','貸款期限須小於或等於 7 年');
  if(!p.loan.grace)add('miss','loan','pl:loan.grace:yes','是否申請寬限期');
  miss('loan','loan.monthly','預計每月貸款償還金額');num('loan','loan.monthly','每月貸款償還金額');
  if(!p.loan.dest)add('miss','loan','pl:loan.dest:ctbc','核貸後撥款帳戶');else if(p.loan.dest==='ctbc'){miss('loan','loan.bank','銀行名稱');miss('loan','loan.branch','分行');}
  if(!p.coach.ops)add('miss','loan','pl:coach.ops:5','營運顧問輔導需求程度');if(!p.coach.tech)add('miss','loan','pl:coach.tech:5','技術顧問輔導需求程度');
  if(plHas(p.loan.amount)&&C.need>0&&plN(p.loan.amount)>C.need)add('check','loan','pl:loan.amount','申請金額 '+money(plN(p.loan.amount))+' 元，比所需貸款總額 '+money(C.need)+' 元多');
  const fcDone=state.first.forecast.months.every(m=>plHas(m.a));
  if(plHas(p.loan.monthly)&&fcDone&&plN(p.loan.monthly)>C.avgOper)add('hint','loan','pl:loan.monthly','每月還款 '+money(plN(p.loan.monthly))+' 元，比未來三個月平均盈餘（不含營業額外支出）'+money(Math.round(C.avgOper))+' 元高；請確認還款來源（預估支出已含貸款還款時可略過）');
 }
 const order={fix:0,miss:1,check:2,hint:3};
 return L.map((x,i)=>Object.assign(x,{i})).sort((a,b)=>PL_ORDER.indexOf(a.sec)-PL_ORDER.indexOf(b.sec)||order[a.lv]-order[b.lv]||a.i-b.i);
}
function plSecStatus(id,checks){
 const mine=checks.filter(c=>c.sec===id),p=state.plan;
 const touched={basic:()=>plHas(p.applyDate)||planHasData(p.p),biz:()=>planHasData(p.biz),story:()=>plHas(p.purpose)||plHas(p.advantage),money:()=>planHasData(p.inv)||p.debts.length>0||p.noDebt,
  structure:()=>planHasData(p.st),forecast:()=>planHasData(p.fc)||state.first.forecast.months.some(m=>planHasData(m)),needs:()=>p.owned.length+p.buy.length+p.funds.length+p.work.length>0,loan:()=>planHasData(p.loan)||planHasData(p.coach),make:()=>false}[id]();
 const need=mine.filter(c=>c.lv==='miss').length,fix=mine.filter(c=>c.lv==='fix').length;
 if(id==='make')return {key:'make',need:0,fix:0};
 if(!touched)return {key:'todo',need,fix};
 return {key:need||fix?'part':'done',need,fix};
}

/* ---------- 對照審查繳交進度表 ---------- */
function plDebtAnalysis(){
 const rows=plDebtsOut();if(!rows.length)return null;
 return analyzeDebt(plDebtGrid(rows),{caseName:plDebtor({who:'self'}),later:state.mode==='later'});
}
function plRefMap(checks){
 const p=state.plan,C=plCalc(),first=state.mode==='first',secOk=id=>!checks.some(c=>c.sec===id&&(c.lv==='miss'||c.lv==='fix'));
 const noIssue=(re,lvs=['miss','fix'])=>!checks.some(c=>lvs.includes(c.lv)&&c.fk&&re.test(c.fk));
 const da=plDebtAnalysis(),dp=da&&da.pass?da.pass:null;
 const debtRe={debtor:[/^pl:(debts\.[\w-]+\.name|p\.name)$/],creditor:[/^pl:debts\.[\w-]+\.creditor$/],date:[/^pl:debts\.[\w-]+\.date$/,['miss','fix','check']],status:[/^pl:debts\.[\w-]+\.status$/],total:[/^pl:debts\.[\w-]+\.(total|per|remain)$/]};
 const debtOk=k=>dp?!!(dp[k]&&noIssue(debtRe[k][0],debtRe[k][1])):null;
 const stOk=C.m>0&&C.m<1&&C.days>0&&C.price>0&&C.be!==null;
 const plan=p.st.special?(C.anyBefore?true:false):null;
 const fcReady=state.first.forecast.months.every(m=>plHas(m.label)&&plHas(m.a)&&plHas(m.rate)&&!['a','b','d','e','f','repay','rate'].some(k=>plBadNum(m[k])));
 const fcMatch=fcReady&&C.m>0&&!checks.some(c=>c.sec==='forecast'&&c.lv==='check');
 const buyOk=p.buy.length>0&&!checks.some(c=>(c.lv==='miss'||c.lv==='fix')&&c.fk&&c.fk.startsWith('pl:buy.')&&!/估價單/.test(c.text));
 const quoteOk=p.buy.length>0&&p.buy.every(r=>r.quote);
 const planOk=['basic','biz','story','money','structure','forecast','needs','loan'].every(secOk);
 const debtTicks={debtor:debtOk('debtor'),creditor:debtOk('creditor'),date:debtOk('date'),status:debtOk('status'),total:debtOk('total')};
 if(first)return {
  plan:{'ref-21':{ready:planOk}},
  attach:{'ref-23':debtTicks,'ref-25':{margin:stOk,blank:true,plan},'ref-26':{ready:fcReady,match:fcMatch},'ref-27':{ready:p.buy.length?buyOk:null,quote:p.buy.length?quoteOk:null},'ref-28':{match:p.buy.length?quoteOk:null}}
 };
 return {plan:{},attach:{'later-debt':Object.assign({file:true},debtTicks),'later-structure':{latest:true,margin:stOk,blank:true,plan}}};
}
function plTickMap(m){const out={};for(const [id,crit] of Object.entries(m)){const c={};for(const [k,v] of Object.entries(crit))if(v===true||v===false)c[k]=v;out[id]=c;}return out;}

/* ---------- Word 計畫書的值 ---------- */
function plRoc(iso){if(!isISO(iso))return {y:'',m:'',d:''};const [y,m,d]=iso.split('-').map(Number);return {y:String(y-1911),m:String(m),d:String(d)};}
function plM(v){return plHas(v)&&!plBadNum(v)?money(plN(v)):'';}
function plTel(s){const t=toHalf(String(s||'')).trim(),m=t.match(/^[（(]?(0\d{1,3})[）)]?[\s-]*(\d[\d\s-]{4,})$/);return m&&!/^09/.test(t)?{area:m[1],tel:m[2].trim()}:{area:'',tel:t};}
function plDocxVals(){
 const p=state.plan,C=plCalc(),v={},put=(k,x)=>{v[k]=x;};
 const ad=plRoc(p.applyDate||'');put('ad.y',ad.y);put('ad.m',ad.m);put('ad.d',ad.d);
 ['name','phone','mobile','email','fax','emName','emRel','emPhone'].forEach(k=>put('p.'+k,p.p[k]));
 const bd=plRoc(p.p.birth||'');put('p.birth.y',bd.y);put('p.birth.m',bd.m);put('p.birth.d',bd.d);
 put('p.idno',String(ui.plSecret.idno||'').trim().toUpperCase());
 const b=p.biz;put('biz.name',b.name);put('biz.reg.done',b.reg==='done');put('biz.reg.prep',b.reg==='prep');
 const sd=b.reg==='done'?plRoc(b.setup||''):{y:'',m:'',d:''};put('biz.setup.y',sd.y);put('biz.setup.m',sd.m);put('biz.setup.d',sd.d);
 put('biz.kind.commerce',b.reg==='done'&&b.kind==='commerce');put('biz.kind.exempt',b.reg==='done'&&b.kind==='exempt');
 put('biz.regNo',b.reg==='done'&&b.kind==='commerce'?b.regNo:'');put('biz.regDoc',b.reg==='done'&&b.kind==='commerce'?b.regDoc:'');put('biz.taxNo',b.reg==='done'&&b.kind==='exempt'?b.taxNo:'');
 put('biz.regPlan',b.reg==='prep'?b.regPlan:'');
 PL_TYPES.forEach(([k])=>put('biz.type.'+k,b.type===k));put('biz.typeOther',b.type==='5'?b.typeOther:'');
 ['company','factory','other'].forEach(k=>{const a=b.addr[k],t=plTel(a.tel);put('biz.addr.'+k+'.zip',a.zip.trim());put('biz.addr.'+k+'.text',(a.zip.trim()?' ':'')+a.text.trim());put('biz.addr.'+k+'.area',t.area);put('biz.addr.'+k+'.tel',t.tel);});
 ['product','feature','customer','sales','focus'].forEach(k=>put('biz.'+k,b[k].trim()));put('biz.staff',b.staff.trim());
 put('calc.bep',plBepText(C));put('calc.forecast',plForecastTable(C));
 put('purpose',p.purpose.trim());put('advantage',p.advantage.trim());
 put('inv.total',C.invAny?money(C.inv):'');
 ['self','rosca','family','bank','other'].forEach(k=>{put('inv.'+k,plM(p.inv[k]));put('inv.'+k+'.on',plN(p.inv[k])>0);});put('inv.otherName',plN(p.inv.other)>0||plHas(p.inv.otherName)?p.inv.otherName.trim():'');
 const self=C.debts.filter(d=>d.who==='self'),bk={};
 self.forEach(d=>{const k=PL_KIND_BUCKET[d.kind]||'other',o=bk[k]||(bk[k]={amt:0,pay:0,use:[],names:[]});o.amt+=plN(d.total);o.pay+=plMonthly(d);if(d.reason.trim()&&!o.use.includes(d.reason.trim()))o.use.push(d.reason.trim());const nm=d.kind||'其他';if(!o.names.includes(nm))o.names.push(nm);});
 put('loans.has',self.length>0);put('loans.none',!self.length&&(p.noDebt||p.debts.length>0));
 ['house','car','cashcard','credit','labor','card','other'].forEach(k=>{const o=bk[k];put('ln.'+k+'.on',!!o);put('ln.'+k+'.amt',o?money(o.amt):'');put('ln.'+k+'.pay',o?money(o.pay):'');put('ln.'+k+'.use',o?o.use.join('、'):'');});
 put('ln.other.name',bk.other?bk.other.names.join('、'):'');
 const rowsOf=(list,fn)=>{p[list].forEach((r,i)=>fn(r,i));return p[list].length;};
 const G={};
 G.own=rowsOf('owned',(r,i)=>{const k='own.'+i+'.';put(k+'item',r.item.trim());put(k+'price',plM(r.price));put(k+'qty',r.qty.trim());put(k+'amt',C.own[r.id]===null?'':money(C.own[r.id]));put(k+'paid',r.paid==='paid');put(k+'inst',r.paid==='inst');put(k+'unpaid',r.paid==='inst'?plM(r.unpaid):'');});
 put('own.total',p.owned.length?money(C.ownTotal):'');put('own.unpaidTotal',p.owned.length?money(C.owedA):'');
 G.buy=rowsOf('buy',(r,i)=>{const k='buy.'+i+'.';put(k+'item',r.item.trim());put(k+'price',plM(r.price));put(k+'qty',r.qty.trim());put(k+'amt',C.buy[r.id]===null?'':money(C.buy[r.id]));put(k+'once',r.pay==='once');put(k+'inst',r.pay==='inst');put(k+'periods',r.pay==='inst'?r.periods.trim():'');put(k+'perPay',r.pay==='inst'?plM(r.perPay):'');});
 put('buy.total',p.buy.length?money(C.buyTotal):'');
 G.funds=rowsOf('funds',(r,i)=>{const k='funds.'+i+'.';put(k+'item',r.item.trim());put(k+'price',plM(r.price));put(k+'qty',r.qty.trim());put(k+'when',r.when.trim());put(k+'amt',C.funds[r.id]===null?'':money(C.funds[r.id]));put(k+'note',r.note.trim());});
 put('funds.total',p.funds.length?money(C.fundsTotal):'');
 G.work=rowsOf('work',(r,i)=>{const k='work.'+i+'.';put(k+'item',r.item.trim());put(k+'monthly',plM(r.monthly));put(k+'qty',r.qty.trim());put(k+'months',r.months.trim());put(k+'amt',C.work[r.id]===null?'':money(C.work[r.id]));put(k+'note',r.note.trim());});
 put('work.total',p.work.length?money(C.workTotal):'');
 put('need.total',p.owned.length+p.buy.length+p.funds.length+p.work.length?money(C.need):'');
 const L=p.loan;put('loan.amount',plM(L.amount));put('loan.years',L.years.trim());put('loan.grace',L.grace==='yes');put('loan.nograce',L.grace==='no');put('loan.monthly',plM(L.monthly));
 put('loan.ctbc',L.dest==='ctbc');put('loan.newacct',L.dest==='new');put('loan.bank',L.bank.trim());put('loan.branch',L.branch.trim());
 put('loan.account',L.dest==='ctbc'?String(ui.plSecret.account||'').replace(/\s/g,''):'');
 PL_COACH.forEach(([k])=>{put('coach.ops.'+k,p.coach.ops===k);put('coach.tech.'+k,p.coach.tech===k);});
 return {v,G};
}
function plBepText(C){
 const p=state.plan;if(!C.be)return '';const b=C.be,L=[];
 L.push('（生意固定成本 '+money(C.bizSum)+' 元＋家庭支出 '+money(C.homeSum)+' 元－家庭收入 '+money(C.incSum)+' 元）÷ 毛利率 '+fmtNum(Math.round(C.m*1000)/10)+'%');
 L.push(b.need>0?'＝每月損益平衡營業額 '+money(b.bep)+' 元':'＝家庭收入已足以支付固定成本與家庭支出，損益平衡以 0 計');
 if(b.need>0&&b.daily!==null)L.push('每月營業 '+fmtNum(C.days)+' 天，每天最低營業額 '+money(b.daily)+' 元'+(b.cust!==null?'；客單價 '+money(C.price)+' 元，每天約需 '+b.cust+' 位客人':''));
 if(C.beBefore)L.push('（計畫性還款前：每月損益平衡營業額 '+money(C.beBefore.bep)+' 元'+(C.beBefore.daily!==null?'，每天最低營業額 '+money(C.beBefore.daily)+' 元':'')+'）');
 return L.join('\n');
}
function plForecastTable(C){
 const p=state.plan,names=['過去一個月','未來第 1 個月','未來第 2 個月','未來第 3 個月'],rows=[];
 C.months.forEach((x,i)=>{const src=i===0?p.fc.past:state.first.forecast.months[i-1];if(!plHas(src.a))return;const lab=String(C.labels[i]||'').trim();rows.push([names[i]+(lab?'（'+lab+'）':''),money(x.inc),money(x.exp),money(x.total)]);});
 return {head:['期間','收入小計','支出小計','盈餘'],cols:[0.4,0.2,0.2,0.2],align:['left','right','right','right'],rows,note:rows.length?'單位：元。收入、支出明細見附件「營運財務預估分析表」。':''};
}

/* ---------- Excel 附件 ---------- */
function plXlsx(kind){
 const meta=TPL.meta.xlsx[kind],list=tplFiles(kind),files={},p=state.plan,C=plCalc();
 const get=path=>{if(!(path in files))files[path]=list.find(x=>x[0]===path)[1];return files[path];};
 const set=(sheet,ref,c)=>{const path=meta[sheet].path;files[path]=xlSet(get(path),ref,c);};
 const num=v=>plHas(v)&&!plBadNum(v)?plN(v):0;
 const rowHt=(sheet,r,cells)=>{const M=meta[sheet],w=M.widths||{};let lines=1;for(const [col,text,wid] of cells)if(text)lines=Math.max(lines,xlLines(text,wid||w[col]||12));if(lines>1){const path=M.path;files[path]=xlRowHt(get(path),r,Math.min(409,lines*16.5+2));}};
 // 債務現況盤點表
 const D=meta.debt,rows=C.debts.slice(0,D.last-D.first+1);
 rows.forEach((d,i)=>{const r=D.first+i,c=D.cols,txt=[[c.debtor,plDebtor(d)],[c.creditor,d.creditor.trim()],[c.reason,d.reason.trim()],[c.date,d.date.trim()],[c.rate,d.rate.trim()],[c.freq,d.freq],[c.status,plStatusText(d)]];
  txt.forEach(([col,v])=>set('debt',col+r,v));
  [[c.total,d.total],[c.per,d.per],[c.remain,d.remain]].forEach(([col,v])=>set('debt',col+r,num(v)));
  rowHt('debt',r,txt);
 });
 const per=rows.reduce((a,d)=>a+num(d.per),0),rem=rows.reduce((a,d)=>a+num(d.remain),0);
 set('debt',D.cols.per+D.sum,{keepF:'SUM('+D.cols.per+D.first+':'+D.cols.per+D.last+')',v:per});
 set('debt',D.cols.remain+D.sum,{keepF:'SUM('+D.cols.remain+D.first+':'+D.cols.remain+D.last+')',v:rem});
 // 營運結構數字計算
 const S=meta.structure,st=p.st;
 const note=(r,l)=>{const n=r.note.trim(),b=st.special&&plHas(r.before)?'調整前 '+money(plN(r.before))+' 元':'';return [n,b].filter(Boolean).join('；');};
 ST_INC.forEach(([k])=>{const r=S.inc[k];set('structure','B'+r,note(st.inc[k]));set('structure','C'+r,num(st.inc[k].amt));});
 ST_HOME.forEach(([k])=>{const r=S.home[k];set('structure','B'+r,note(st.home[k]));set('structure','C'+r,num(st.home[k].amt));rowHt('structure',r,[['B',note(st.home[k])]]);});
 ST_BIZ.forEach(([k,l])=>{const r=S.biz[k],n=note(st.biz[k]);if(n)set('structure','F'+r,(k==='other'?'其他：':l+'：')+n);set('structure','G'+r,num(st.biz[k].amt));});
 set('structure','C'+S.incSum,{keepF:'SUM(C6:C8)',v:C.incSum});set('structure','G'+S.bizSum,{keepF:'SUM(G6:G12)',v:C.bizSum});set('structure','C'+S.homeSum,{keepF:'SUM(C10:C21)',v:C.homeSum});
 if(C.m>0&&C.m<1)set('structure',S.margin,C.m);
 const bep=C.be?C.be.bep:0,days=C.days>0?C.days:0,daily=C.be&&C.be.daily!==null?C.be.daily:0,cust=C.be&&C.be.cust!==null?C.be.cust:0;
 set('structure',S.bep,{f:'IF(G17>0,MAX(0,(G13+C22-C9)/G17),0)',v:C.m>0&&C.m<1?bep:0});
 if(days)set('structure',S.daysLabel,'損益平衡/ '+fmtNum(days)+' 天');
 if(days)set('structure',S.daily,{f:'IF(G18>0,ROUND(G18/'+days+',0),0)',v:daily});
 if(C.price>0)set('structure',S.price,C.price);
 set('structure',S.cust,{f:'IF(AND(G19>0,G20>0),ROUNDUP(G19/G20,0),0)',v:cust});
 if(C.beBefore){const t='計畫性還款前（調整前）：家庭支出小計 '+money(C.homeBefore)+' 元、固定成本小計 '+money(C.bizBefore)+' 元；損益平衡 '+money(C.beBefore.bep)+' 元'+(C.beBefore.daily!==null?'，每天最低營業額 '+money(C.beBefore.daily)+' 元':'')+(C.beBefore.cust!==null?'，每日預估來客 '+C.beBefore.cust+' 人':'')+'。上表為調整後的金額。';set('structure',S.note,t);}
 if(kind==='first'){
  // 營運財務預估分析表
  const F=meta.forecast,R=F.rows,src=[p.fc.past].concat(state.first.forecast.months);
  F.cols.forEach((col,i)=>{
   const m=src[i],x=C.months[i];
   set('forecast',col+R.label,String(m.label||'').trim());
   ['a','b','d','e','f','repay'].forEach(k=>set('forecast',col+R[k],num(m[k])));
   if(i===0){set('forecast',col+R.c,num(m.c));set('forecast',col+R.rate,{keepF:'x',v:x.rate});}
   else{set('forecast',col+R.rate,x.rate);set('forecast',col+R.c,{keepF:'x',v:x.c});}
   set('forecast',col+R.inc,{keepF:'x',v:x.inc});set('forecast',col+R.exp,{keepF:'x',v:x.exp});set('forecast',col+R.total,{keepF:'x',v:x.total});
   const n=String(p.fc.notes[i]||'').trim();set('forecast',col+R.note,n);
  });
  rowHt('forecast',R.note,F.cols.map((col,i)=>[col,String(p.fc.notes[i]||''),15]));
  // 資金需求及設備購買表
  const Fd=meta.funds;
  const fill=(sec,list,write)=>{const M=Fd[sec];p[list].slice(0,M.n).forEach((r,i)=>write(r,M.first+i,M.cols));const tot=p[list].slice(0,M.n).reduce((a,r)=>a+(C[list][r.id]||0),0);set('funds','F'+M.sum,{keepF:'x',v:tot});return tot;};
  const s1=fill('buy','buy',(r,row,c)=>{const pay=r.pay==='once'?'一次付清':r.pay==='inst'?'分期 '+(r.periods.trim()||'＿')+' 期，每期 '+(plM(r.perPay)||'＿')+' 元':'';const t=[[c.item,r.item.trim()],[c.use,r.use.trim()],[c.spec,r.spec.trim()],[c.when,r.when.trim()],[c.pay,pay],[c.source,r.source.trim()],[c.quote,r.quote?'有':'無']];t.forEach(([col,v])=>set('funds',col+row,v));set('funds',c.price+row,num(r.price));set('funds',c.qty+row,num(r.qty));set('funds',c.amt+row,{f:c.price+row+'*'+c.qty+row,v:C.buy[r.id]||0});rowHt('funds',row,t);});
  const s2=fill('funds','funds',(r,row,c)=>{const t=[[c.item,r.item.trim()],[c.note,r.note.trim()],[c.when,r.when.trim()]];t.forEach(([col,v])=>set('funds',col+row,v));set('funds',c.price+row,num(r.price));set('funds',c.qty+row,num(r.qty));set('funds',c.amt+row,{f:c.price+row+'*'+c.qty+row,v:C.funds[r.id]||0});rowHt('funds',row,[[c.item,r.item],[c.note,r.note,36],[c.when,r.when]]);});
  const s3=fill('work','work',(r,row,c)=>{const t=[[c.item,r.item.trim()],[c.note,r.note.trim()]];t.forEach(([col,v])=>set('funds',col+row,v));set('funds',c.months+row,num(r.months));set('funds',c.monthly+row,num(r.monthly));set('funds',c.qty+row,num(r.qty));set('funds',c.amt+row,{f:c.months+row+'*'+c.monthly+row+'*'+c.qty+row,v:C.work[r.id]||0});rowHt('funds',row,t);});
  const T=Fd.total;set('funds','F'+T.owedA,C.owedA);set('funds','F'+T.s1,{keepF:'x',v:s1});set('funds','F'+T.s2,{keepF:'x',v:s2});set('funds','F'+T.s3,{keepF:'x',v:s3});
  set('funds','F'+T.need,{keepF:'x',v:C.owedA+s1+s2+s3});if(plHas(p.loan.amount)&&!plBadNum(p.loan.amount))set('funds','F'+T.apply,plN(p.loan.amount));
 }
 return packTpl(list,files);
}

/* ---------- 產生與下載 ---------- */
function plFileName(prefix,ext){
 const who=String(state.plan.p.name||state.caseName||'未命名').replace(/[\\/:*?"<>|\s]+/g,'_').slice(0,30)||'未命名';
 return prefix+'_'+who+'_'+todayISO().replace(/-/g,'')+'.'+ext;
}
function plGenerate(what){
 if(!tplReady()){toast('這個檔案沒有文件範本，請改用最新版的引導員版');return;}
 const checks=plChecks(),map=plRefMap(checks);let bytes,name,mime;
 try{
  if(what==='plan'){const {v,G}=plDocxVals();bytes=fillDocx(v,G);name=plFileName('信扶專案創業計畫書','docx');mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';}
  else{const kind=state.mode==='first'?'first':'later';bytes=plXlsx(kind);name=plFileName(kind==='first'?'創業計畫書附件':'創業計畫書附件_第'+state.round+'次動撥','xlsx');mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';}
 }catch(e){toast('產生失敗：'+(e&&e.message?e.message:'請重新整理頁面再試一次'));return;}
 download(bytes,name,mime);
 const ticks=plTickMap(what==='plan'?map.plan:map.attach),on=[];
 for(const [id,m] of Object.entries(ticks)){const got=applyToolTicks(id,m);if(got.length)on.push(shortName(id));}
 state.plan.gen[what==='plan'?'plan':'attach']=nowStamp();save();
 ui.plLast={what,name,on};render();
 toast('已下載「'+name+'」'+(on.length?'，並勾選了 '+on.join('、')+' 的完成條件':''));
}
function plSyncBreakeven(){
 const C=plCalc(),b=state.tools.breakeven,st=state.plan.st;if(!planHasData(st))return;
 b.margin=st.margin;b.fixed=String(C.bizSum);b.income=String(C.incSum);b.before=String(C.anyBefore?C.homeBefore:C.homeSum);b.after=C.anyBefore?String(C.homeSum):'';b.days=st.days;b.price=st.price;
}

/* ---------- 畫面元件 ---------- */
const plId=path=>'pl-'+path.replace(/[^\w-]/g,'-');
function plReq(o){return o.req?'<span class="req" title="必填">必填</span>':'';}
function fIn(path,label,o={}){
 const v=plGet(path)??'',id=plId(path),num=o.type==='num',hid=o.hint||o.out?id+'-h':'';
 const t=o.type==='date'?' type="date"':o.type==='email'?' type="email" inputmode="email"':o.type==='tel'?' type="tel" inputmode="tel"':'';
 const inp='<input id="'+id+'"'+t+(num?' inputmode="decimal" class="num"':'')+' autocomplete="off" data-bind="pl" data-p="'+esc(path)+'" data-fk="pl:'+esc(path)+'" maxlength="'+plMax(path)+'"'+(o.ph?' placeholder="'+esc(o.ph)+'"':'')+(hid?' aria-describedby="'+hid+'"':'')+' value="'+esc(v)+'">';
 return '<div class="field pf'+(o.cls?' '+o.cls:'')+'"><label for="'+id+'">'+esc(label)+plReq(o)+'</label>'+(o.unit?'<span class="unitwrap">'+inp+'<span class="unit" aria-hidden="true">'+esc(o.unit)+'</span></span>':inp)+(hid?'<small id="'+hid+'"'+(o.out?' data-out="'+esc(o.out)+'"':'')+'>'+esc(o.out?plOutText(o.out,plCalc()):o.hint)+'</small>':'')+'</div>';
}
function fTa(path,label,o={}){
 const v=plGet(path)??'',id=plId(path),soft=PL_SOFT[path];
 return '<div class="field pf wide"><label for="'+id+'">'+esc(label)+plReq(o)+'</label>'+(o.hint?'<small class="lead" id="'+id+'-h">'+esc(o.hint)+'</small>':'')+'<textarea id="'+id+'" rows="'+(o.rows||3)+'" data-bind="pl" data-p="'+esc(path)+'" data-fk="pl:'+esc(path)+'" maxlength="'+plMax(path)+'"'+(o.hint?' aria-describedby="'+id+'-h"':'')+(o.ph?' placeholder="'+esc(o.ph)+'"':'')+'>'+esc(v)+'</textarea><small class="count'+(soft&&[...String(v).replace(/\s/g,'')].length>soft?' over':'')+'" data-out="len:'+esc(path)+'" aria-live="polite">'+esc(plLenText(String(v),soft))+'</small></div>';
}
function fRadio(path,label,opts,o={}){
 const v=plGet(path)??'',name=plId(path);
 return '<fieldset class="field pf radios'+(o.cls?' '+o.cls:'')+'"><legend>'+esc(label)+plReq(o)+'</legend><div class="radrow">'+opts.map(([val,l])=>'<label class="rad"><input type="radio" name="'+name+'" value="'+esc(val)+'" data-act="plSet" data-p="'+esc(path)+'" data-fk="pl:'+esc(path)+':'+esc(val)+'"'+(v===val?' checked':'')+'><span>'+esc(l)+'</span></label>').join('')+'</div>'+(o.hint?'<small>'+esc(o.hint)+'</small>':'')+'</fieldset>';
}
function plOpts(opts,v){return '<option value="">請選擇</option>'+opts.map(x=>{const [val,l]=Array.isArray(x)?x:[x,x];return '<option value="'+esc(val)+'"'+(val===v?' selected':'')+'>'+esc(l)+'</option>';}).join('');}
function fSel(path,label,opts,o={}){
 const v=plGet(path)??'',id=plId(path);
 return '<div class="field pf'+(o.cls?' '+o.cls:'')+'"><label for="'+id+'">'+esc(label)+plReq(o)+'</label><select id="'+id+'" data-act="plSet" data-p="'+esc(path)+'" data-fk="pl:'+esc(path)+'">'+plOpts(opts,v)+'</select></div>';
}
function fChk(path,label,o={}){
 const v=plGet(path)===true;
 return '<label class="check pchk'+(o.cls?' '+o.cls:'')+'"><input type="checkbox" data-act="plCheck" data-p="'+esc(path)+'" data-fk="pl:'+esc(path)+'"'+(v?' checked':'')+'><span>'+esc(label)+(o.sub?'<small>'+esc(o.sub)+'</small>':'')+'</span></label>';
}
function fSecret(k,label,o={}){
 const id='pl-secret-'+k;
 return '<div class="field pf secret"><label for="'+id+'">'+esc(label)+'<span class="tag-nosave">不保存</span></label><input id="'+id+'" autocomplete="off" spellcheck="false" data-bind="plSecret" data-k="'+k+'" data-fk="sec:'+k+'" maxlength="'+(k==='idno'?10:20)+'"'+(o.ph?' placeholder="'+esc(o.ph)+'"':'')+' value="'+esc(ui.plSecret[k]||'')+'"></div>';
}
function plOut(key,cls){const t=plOutText(key,plCalc());return '<output class="'+(cls||'')+(/^-\d/.test(t)?' neg':'')+'" data-out="'+esc(key)+'">'+esc(t)+'</output>';}
function plDocTags(id){const d=state.mode==='later'&&PL_SECS[id].dl?PL_SECS[id].dl:PL_SECS[id].d;return d.map(([k,v])=>'<span class="doctag'+(k==='附件'?' att':'')+'">'+esc(k)+'<b>'+esc(v)+'</b></span>').join('');}
function plRemove(list,id,label,compact){return '<button type="button" class="small quiet danger'+(compact?' iconbtn':'')+'" data-act="plDel" data-list="'+list+'" data-id="'+esc(id)+'" aria-label="移除'+esc(label)+'"'+(compact?' title="移除"':'')+'>'+ico('x')+(compact?'<span class="mtxt">移除</span>':'移除')+'</button>';}
function plAddBtn(list,label){const n=state.plan[list].length,max=PL_LIMITS[list];return '<button type="button" class="pladd" data-act="plAdd" data-list="'+list+'" data-fk="add:'+list+'"'+(n>=max?' disabled':'')+'>'+ico('plus')+esc(label)+(n>=max?'（最多 '+max+' 筆）':'')+'</button>';}

/* ---------- 各段 ---------- */
function plSecBasic(){
 const p=state.plan;let h='<div class="pgrid">'+fIn('applyDate','申請日期',{type:'date',req:1,hint:'計畫書會印成民國年'})+fIn('p.name','申請人姓名（負責人）',{req:1});
 if(!p.p.name.trim()&&state.caseName.trim())h+='<div class="field pf ghost"><button type="button" class="small" data-act="plUseCase">帶入個案名稱「'+esc(short(state.caseName,10))+'」</button></div>';
 h+=fIn('p.birth','出生年月日',{type:'date',req:1})+fSecret('idno','國民身分證統一編號',{ph:'A123456789'})+fIn('p.phone','聯絡電話',{type:'tel',hint:'電話、手機至少填一個'})+fIn('p.mobile','手機',{type:'tel'})+fIn('p.email','e-mail',{type:'email'})+fIn('p.fax','傳真',{type:'tel'})+'</div>';
 h+='<h3 class="psub">緊急聯絡人</h3><div class="pgrid">'+fIn('p.emName','姓名',{req:1})+fIn('p.emRel','關係',{req:1,ph:'例如：配偶、姊姊'})+fIn('p.emPhone','聯絡電話',{type:'tel',req:1})+'</div>';
 h+='<p class="privacy">'+ico('shield')+'<span>身分證字號和銀行帳號只用在這次產生的計畫書，不會存進瀏覽器，重新整理頁面要再輸入；也可以留白，印出後再手寫。</span></p>';
 return h;
}
function plSecBiz(){
 const b=state.plan.biz;let h='<div class="pgrid">'+fIn('biz.name','（一）公司名稱（全銜）',{req:1,cls:'span2',ph:'例如：小美早餐店'})+'</div>';
 h+=fRadio('biz.reg','（二）相關法定登記辦理情形',[['done','已辦理'],['prep','籌備中，尚未辦理相關登記']],{req:1});
 if(b.reg==='done'){
  h+='<div class="pgrid indent">'+fIn('biz.setup','設立日期',{type:'date',req:1})+'</div>'+fRadio('biz.kind','登記方式',[['commerce','商業登記證或核准設立登記'],['exempt','免商業登記，辦有稅籍']],{req:1,cls:'indent'});
  if(b.kind==='commerce')h+='<div class="pgrid indent">'+fIn('biz.regNo','統一編號',{req:1})+fIn('biz.regDoc','核准設立文號')+'</div>';
  if(b.kind==='exempt')h+='<div class="pgrid indent">'+fIn('biz.taxNo','稅籍統一編號',{req:1})+'</div>';
 }else if(b.reg==='prep')h+='<div class="pgrid indent">'+fIn('biz.regPlan','預計登記時間',{req:1,ph:'例如：115/12'})+'</div>';
 h+=fRadio('biz.type','二、經營型態',PL_TYPES,{req:1});
 if(b.type==='5')h+='<div class="pgrid indent">'+fIn('biz.typeOther','其他：寫明經營型態',{req:1})+'</div>';
 h+='<h3 class="psub">三、事業地址</h3><p class="hint lead">若為承租，請在地址後面附註坪數及月租金，例如：「（承租 10 坪，月租 15,000 元）」。</p>';
 [['company','公司（行號或工作室等）',1],['factory','工廠',0],['other','其他（請說明）',0]].forEach(([k,l,req])=>{h+='<div class="addr"><span class="addr-l">'+esc(l)+(req?'<span class="req">必填</span>':'')+'</span>'+fIn('biz.addr.'+k+'.zip','郵遞區號',{cls:'zip',ph:'3～6 碼'})+fIn('biz.addr.'+k+'.text','地址',{cls:'grow'})+fIn('biz.addr.'+k+'.tel','電話',{type:'tel',ph:'02-2345-6789'})+'</div>';});
 h+=fTa('biz.product','四、主要產品（或業務）',{req:1,rows:2});
 h+='<div class="pgrid">'+fIn('biz.staff','五、員工人數（不包括本人）',{type:'num',req:1,unit:'人',ph:'沒有填 0'})+'</div>';
 h+=fTa('biz.feature','六、產品特色',{req:1,hint:'和別人比，有什麼不一樣？例如：手工現做、在地食材、價格實惠'})+fTa('biz.customer','七、主要客群',{req:1,hint:'誰會來買？例如：附近上班族、學生、社區家庭'})+fTa('biz.sales','八、銷售方式',{req:1,hint:'例如：店面、市場攤位、網路平台、外送、接單'})+fTa('biz.focus','十、近期維運重點',{req:1,rows:4,hint:'接下來幾個月要做的事，例如：增加早餐品項、穩定進貨成本'});
 h+='<p class="hint">九、預估損益平衡計算與十一、營運財務預估分析，在「營運結構」「營運財務預估」兩段填寫，數字會自動寫進計畫書。</p>';
 return h;
}
function plSecStory(){
 let h=fTa('purpose','一、創業目的',{req:1,rows:5,hint:'為什麼想做這個生意？希望透過創業改善家庭的什麼？'})+fTa('advantage','二、個人創業優勢',{req:1,rows:5,hint:'過去的工作經驗、技術、證照、人脈、家人的支持等'});
 const old=state.writing.map((w,i)=>[SECTIONS[i][0],w.text]).filter(([,t])=>t.trim());
 if(old.length)h+='<details class="disclose oldwrite"><summary>舊版「計畫撰寫」草稿（'+old.length+' 段）</summary><p class="hint">之前寫的草稿還在，可以參考後整理到上面的欄位。</p>'+old.map(([t,x])=>'<div class="oldw"><h4>'+esc(t)+'</h4><p class="pre">'+esc(x)+'</p></div>').join('')+'<button type="button" class="small" data-act="textExport">匯出舊草稿 .txt</button></details>';
 return h;
}
function plDebtCard(d,i){
 const b='debts.'+d.id+'.',paid=d.status==='已還清';
 let h='<li class="pcard'+(paid?' muted-card':'')+'"><div class="pcard-h"><h4>第 '+(i+1)+' 筆'+(d.creditor.trim()?'：'+esc(short(d.creditor.trim(),16)):'')+(paid?'<span class="tag-off">已還清，不列入</span>':'')+'</h4>'+plRemove('debts',d.id,'第 '+(i+1)+' 筆債務')+'</div><div class="pgrid">';
 h+=fRadio(b+'who','債務人（誰欠錢）',[['self','小老闆本人'],['family','親屬']],{cls:'span2'});
 if(d.who==='family')h+=fIn(b+'name','親屬的本名或稱謂',{req:1,ph:'例如：配偶 王大明'});
 h+=fIn(b+'creditor','債權人（欠誰錢）',{req:1,ph:'例如：台新銀行、勞工紓困貸款、阿姨'})+fSel(b+'kind','種類',PL_KINDS,{req:1})+fIn(b+'total','債務總額',{type:'num',req:1,unit:'元'})+fIn(b+'reason','當時借錢的原因',{req:1,cls:'span2'})+fIn(b+'date','債務時間（何時借的）',{req:1,ph:'例如：113年5月'})+fIn(b+'rate','利率',{ph:'例如：年利率 15%、無息'})+fSel(b+'freq','還款頻率',PL_FREQ,{req:1})+fIn(b+'per','每期還款金額',{type:'num',req:1,unit:'元',ph:'沒有填 0'})+fSel(b+'status','目前還款狀況',PL_STATUS,{req:1})+fIn(b+'note','狀況補充',{ph:'例如：已還 12 期'})+fIn(b+'remain','目前剩餘金額',{type:'num',req:1,unit:'元',ph:'沒有填 0'});
 return h+'</div></li>';
}
function plSecMoney(){
 const p=state.plan,first=state.mode==='first';let h='';
 if(!first)h+='<div class="pgrid">'+fIn('p.name','小老闆姓名（本名，債務人欄會用到）',{req:1})+'</div>';
 if(first){
  h+='<h3 class="psub">（一）創業至今資金總計投入<span class="sumline">共 '+plOut('inv.total','big')+' 元</span></h3><div class="pgrid">'+fIn('inv.self','1. 自備金額',{type:'num',unit:'元'})+fIn('inv.rosca','2. 標會金額',{type:'num',unit:'元'})+fIn('inv.family','3. 親友借款金額',{type:'num',unit:'元'})+fIn('inv.bank','4. 銀行貸款金額',{type:'num',unit:'元'})+fIn('inv.otherName','5. 其他（寫明來源）')+fIn('inv.other','其他金額',{type:'num',unit:'元'})+'</div><p class="hint">有投入的項目才會在計畫書打勾；都沒有投入，請在自備金額填 0。</p>';
  h+='<h3 class="psub">（二）目前債務</h3>';
 }
 h+='<p class="hint lead">每一筆借款、卡費、分期都要列出，同時產生「債務現況盤點表」'+(first?'和計畫書的「目前貸款」（只列小老闆本人的債務）':'')+'。產生時會自動排序：小老闆本人在前、親屬在後，同一人依借款時間由遠到近。'+(first?'':'第 2～5 次動撥不列已清償的債務：選「已還清」就不會列入。')+'</p>';
 h+=p.debts.length?'<ol class="pcards">'+p.debts.map(plDebtCard).join('')+'</ol>':'';
 const out=plDebtsOut();
 if(out.length>1)h+='<details class="disclose debtorder"><summary>看產生時的順序（債務現況盤點表）</summary><ol class="dorder">'+out.map(d=>'<li><b>'+esc(plDebtor(d)||'（姓名空白）')+'</b><span>'+esc(d.creditor||'（債權人空白）')+'</span><span class="tnum">'+esc(d.date||'（時間空白）')+'</span></li>').join('')+'</ol>'+(p.debts.length>out.length?'<p class="hint">已還清的 '+(p.debts.length-out.length)+' 筆不列入。</p>':'')+'</details>';
 h+='<div class="actions">'+plAddBtn('debts','新增一筆債務')+'</div>';
 if(!p.debts.length)h+=fChk('noDebt','小老闆和同住家人目前都沒有債務');
 if(p.debts.length)h+='<div class="sumbar"><span>每期還款合計 '+plOut('debt.per')+' 元</span><span>目前剩餘金額合計 '+plOut('debt.remain')+' 元</span></div>';
 return h;
}
function plStRow(g,k,l,ph,special){
 const r=state.plan.st[g][k],b='st.'+g+'.'+k+'.';
 return '<tr><th scope="row">'+esc(l)+'</th><td>'+'<input aria-label="'+esc(l)+'內容說明" data-bind="pl" data-p="'+b+'note" data-fk="pl:'+b+'note" id="'+plId(b+'note')+'" maxlength="300" autocomplete="off"'+(ph?' placeholder="'+esc(ph)+'"':'')+' value="'+esc(r.note)+'"></td><td><input class="num" inputmode="decimal" aria-label="'+esc(l)+'金額" data-bind="pl" data-p="'+b+'amt" data-fk="pl:'+b+'amt" id="'+plId(b+'amt')+'" maxlength="40" autocomplete="off" value="'+esc(r.amt)+'"></td>'+(special&&g!=='inc'?'<td><input class="num" inputmode="decimal" aria-label="'+esc(l)+'調整前金額" data-bind="pl" data-p="'+b+'before" data-fk="pl:'+b+'before" id="'+plId(b+'before')+'" maxlength="40" autocomplete="off" value="'+esc(r.before)+'"></td>':special?'<td></td>':'')+'</tr>';
}
function plSecStructure(){
 const st=state.plan.st,sp=st.special,hd='<thead><tr><th scope="col">項目</th><th scope="col">內容說明</th><th scope="col">金額</th>'+(sp?'<th scope="col">調整前</th>':'')+'</tr></thead>';
 const sum=(l,k)=>'<tr class="sum"><th scope="row" colspan="2">'+l+'</th><td>'+plOut(k)+'</td>'+(sp?'<td></td>':'')+'</tr>';
 let h='<div class="notice">'+ico('chat')+'<p>家庭收支請和小老闆討論<strong>預計的每月收支</strong>（收入從嚴、支出從寬），不是日誌平均。金額空白會以 0 填入；「其他」有金額，要寫明是什麼。</p></div>';
 h+=fChk('st.special','有計畫性還款等特別處遇',{sub:'勾選後可以填「調整前」的金額；表上的金額填調整後的。'});
 h+='<div class="stgrid"><section class="stbox"><h3>私帳（家庭帳務）</h3><div class="calcwrap"><table class="calc st">'+hd+'<tbody>'+ST_INC.map(([k,l,ph])=>plStRow('inc',k,l,ph,sp)).join('')+sum('家庭收入小計','st.incSum')+ST_HOME.map(([k,l,ph])=>plStRow('home',k,l,ph,sp)).join('')+sum('家庭支出小計','st.homeSum')+'</tbody></table></div></section>';
 h+='<section class="stbox"><h3>公帳（營業帳務）：固定成本</h3><div class="calcwrap"><table class="calc st">'+hd+'<tbody>'+ST_BIZ.map(([k,l,ph])=>plStRow('biz',k,l,ph,sp)).join('')+sum('固定成本小計','st.bizSum')+'</tbody></table></div>';
 const opIn=(path,label,unit,sub)=>{const id=plId(path);return '<tr><th scope="row"><label for="'+id+'">'+esc(label)+'</label><span class="req">必填</span>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</th><td><span class="unitwrap"><input id="'+id+'" class="num" inputmode="decimal" autocomplete="off" data-bind="pl" data-p="'+path+'" data-fk="pl:'+path+'" maxlength="40" value="'+esc(plGet(path)??'')+'"><span class="unit" aria-hidden="true">'+unit+'</span></span></td></tr>';};
 const opOut=(label,key,unit)=>'<tr class="res"><th scope="row">'+esc(label)+'</th><td>'+plOut(key)+(unit?'<span class="u"> '+unit+'</span>':'')+'</td></tr>';
 h+='<h3>營運試算</h3><div class="calcwrap"><table class="calc st ops"><tbody>'+opIn('st.margin','毛利率','%','毛利 ÷ 營業額')+opIn('st.days','每月營業天數','天')+opIn('st.price','客單價','元')+opOut('損益平衡（每月營業額）','st.bep','元')+opOut('每天最低營業額','st.daily','元')+opOut('每日預估來客人次','st.cust','')+'</tbody></table></div>';
 h+='<p class="formula">損益平衡 ＝（生意固定成本 ＋ 家庭支出 － 家庭收入）÷ 毛利率；每天最低營業額 ＝ 損益平衡 ÷ 每月營業天數；每日來客 ＝ 每天最低營業額 ÷ 客單價（無條件進位）。'+(sp?'<br>'+plOut('st.before'):'')+'</p></section></div>';
 return h;
}
function plFcCell(path,o={}){const v=plGet(path)??'',a=' aria-label="'+esc(o.label)+'" data-bind="pl" data-p="'+esc(path)+'" data-fk="pl:'+esc(path)+'" id="'+plId(path)+'"';if(o.area)return '<td><textarea rows="2"'+a+' maxlength="300">'+esc(v)+'</textarea></td>';return '<td><input'+(o.text?' class="txt"':' class="num" inputmode="decimal"')+a+' maxlength="40" autocomplete="off"'+(o.ph?' placeholder="'+esc(o.ph)+'"':'')+' value="'+esc(v)+'"></td>';}
function plSecForecast(){
 const cols=['過去一個月（實際）','未來第 1 個月','未來第 2 個月','未來第 3 個月'],path=(i,k)=>i===0?'fc.past.'+k:'fm.'+(i-1)+'.'+k;
 const row=(k,l,src,o={})=>'<tr'+(o.total?' class="total"':'')+'><th scope="row">'+esc(l)+(src?'<small>'+esc(src)+'</small>':'')+'</th>'+[0,1,2,3].map(i=>{
  if(o.out||(k==='rate'&&i===0)||(k==='c'&&i>0))return '<td class="out">'+plOut('fc.'+i+'.'+k)+'</td>';
  return plFcCell(path(i,k),{label:l+' '+cols[i],text:k==='label',ph:k==='label'?(i===0?'例如：115年9月':'例如：115年10月'):k==='rate'?'%':''});
 }).join('')+'</tr>';
 let h='<p class="hint lead">過去一個月填實際數字（看小老闆日誌）；未來三個月是預估。未來三個月和「檢核工具」的「未來三個月試算」是同一份數字。</p>';
 h+='<div class="actions"><button type="button" data-act="plFill">'+ico('copy')+'把營運結構的數字帶入空白欄位</button></div>';
 h+='<div class="calcwrap" tabindex="0" role="region" aria-label="營運財務預估表格"><table class="calc fc"><thead><tr><th scope="col">項目</th>'+cols.map(c=>'<th scope="col">'+c+'</th>').join('')+'</tr></thead><tbody>';
 h+=row('label','月份','')+row('a','公帳收入','營業收入')+row('b','私帳收入','家庭收入小計')+row('inc','收入小計','',{out:1,total:1})+row('e','營業固定支出','固定成本小計')+row('rate','成本率（%）','100% － 毛利率')+row('c','營業變動支出','過去：實際金額；未來：收入 × 成本率')+row('d','營業額外支出','設備、裝潢、規費等')+row('f','私帳固定支出','家庭支出小計')+row('repay','私帳額外支出','例如計畫性還款')+row('exp','支出小計','',{out:1,total:1})+row('total','盈餘','收入小計 － 支出小計',{out:1,total:1});
 h+='<tr><th scope="row">說明<small>盈餘為負或變動大時寫原因</small></th>'+[0,1,2,3].map(i=>plFcCell('fc.notes.'+i,{label:'說明 '+cols[i],area:1})).join('')+'</tr></tbody></table></div>';
 return h;
}
/* 一列一筆的表格（現有設備、其他營運資金、週轉金）：桌機是表格，手機變成卡片 */
function plLineTable(list,grid,cols){
 const rows=state.plan[list],C=plCalc();if(!rows.length)return '';
 const head='<div class="lt-head" aria-hidden="true"><span>#</span>'+cols.map(c=>'<span'+(c.num?' class="r"':'')+'>'+esc(c.label)+'</span>').join('')+'<span></span></div>';
 const cell=(r,c)=>{
  const path=list+'.'+r.id+'.'+c.k,id=plId(path),lab='<span class="lt-l">'+esc(c.label)+'</span>',v=plGet(path)??'';
  if(c.out)return '<div class="lt-c out'+(c.wide?' wide':'')+'">'+lab+'<output data-out="'+esc(c.out+'.'+r.id)+'">'+esc(plOutText(c.out+'.'+r.id,C))+'</output></div>';
  if(c.opts)return '<label class="lt-c'+(c.wide?' wide':'')+'" for="'+id+'">'+lab+'<select id="'+id+'" data-act="plSet" data-p="'+esc(path)+'" data-fk="pl:'+esc(path)+'">'+plOpts(c.opts,v)+'</select></label>';
  const off=c.when&&!c.when(r);
  return '<label class="lt-c'+(c.wide?' wide':'')+(c.line?' line':'')+'" for="'+id+'">'+lab+'<input id="'+id+'"'+(c.num?' class="num" inputmode="decimal"':'')+' autocomplete="off" data-bind="pl" data-p="'+esc(path)+'" data-fk="pl:'+esc(path)+'" maxlength="'+plMax(path)+'"'+(c.ph?' placeholder="'+esc(c.ph)+'"':'')+(off?' disabled placeholder="—"':'')+' value="'+esc(off?'':v)+'"></label>';
 };
 const main=cols.filter(c=>!c.line),extra=cols.filter(c=>c.line);
 return '<div class="ltable" style="--lt:'+grid+'">'+head.replace(cols.filter(c=>c.line).map(c=>'<span>'+esc(c.label)+'</span>').join(''),'')+rows.map((r,i)=>'<div class="lt-row"><span class="lt-n">'+(i+1)+'</span>'+main.map(c=>cell(r,c)).join('')+'<span class="lt-x">'+plRemove(list,r.id,PL_ROW_LABEL[list]+'第 '+(i+1)+' 項',true)+'</span>'+extra.map(c=>cell(r,c)).join('')+'</div>').join('')+'</div>';
}
function plSecNeeds(){
 const p=state.plan,C=plCalc(),amt=(list,id)=>'<div class="field pf out"><span>金額</span><output data-out="'+list+'.'+esc(id)+'">'+esc(plOutText(list+'.'+id,C))+'</output></div>';
 let h='<h3 class="psub">四、盤點現有設備<span class="sumline">金額小計 '+plOut('own.total')+' 元，未繳清總額（A）'+plOut('own.owed')+' 元</span></h3>';
 h+=plLineTable('owned','28px minmax(0,1.7fr) minmax(0,.95fr) minmax(0,.55fr) minmax(0,.95fr) minmax(0,1.3fr) minmax(0,1fr) 40px',[{k:'item',label:'項目',wide:1},{k:'price',label:'單價（元）',num:1},{k:'qty',label:'數量',num:1},{k:'amt',label:'金額（元）',out:'own',num:1},{k:'paid',label:'付款情形',opts:[['paid','已付清'],['inst','分期付款']]},{k:'unpaid',label:'未繳清金額',num:1,when:r=>r.paid==='inst'}]);
 h+='<div class="actions">'+plAddBtn('owned','新增現有設備')+'</div>';
 h+='<h3 class="psub">肆、1. 欲購置設備<span class="sumline">小計（1）'+plOut('buy.total')+' 元</span></h3><p class="hint lead">每項都要有估價單，項目名稱和估價單一致；網路估價請附完整截圖。</p>';
 h+=p.buy.length?'<ol class="pcards">'+p.buy.map((r,i)=>{const b='buy.'+r.id+'.';return '<li class="pcard"><div class="pcard-h"><h4>第 '+(i+1)+' 項'+(r.item.trim()?'：'+esc(short(r.item.trim(),16)):'')+'</h4>'+plRemove('buy',r.id,'第 '+(i+1)+' 項設備')+'</div><div class="pgrid">'+fIn(b+'item','項目',{req:1})+fIn(b+'use','用途',{req:1,cls:'span2'})+fIn(b+'spec','規格（機型）',{req:1})+fIn(b+'price','單價',{type:'num',req:1,unit:'元'})+fIn(b+'qty','數量',{type:'num',req:1})+amt('buy',r.id)+fIn(b+'when','需要時間點',{req:1,ph:'例如：115/11'})+fIn(b+'source','購買來源（廠商）',{req:1,cls:'span2'})+fSel(b+'pay','付款方式',[['once','一次付清'],['inst','分期付款']],{req:1})+(r.pay==='inst'?fIn(b+'periods','分期期數',{type:'num',unit:'期'})+fIn(b+'perPay','每期應繳金額',{type:'num',unit:'元'}):'')+fChk(b+'quote','已取得估價單',{cls:'quote'})+'</div></li>';}).join('')+'</ol>':'';
 h+='<div class="actions">'+plAddBtn('buy','新增要購買的設備')+'</div>';
 h+='<h3 class="psub">2. 其他營運資金<span class="sumline">小計（2）'+plOut('funds.total')+' 元</span></h3>';
 h+=plLineTable('funds','28px minmax(0,2fr) minmax(0,1fr) minmax(0,.55fr) minmax(0,.9fr) minmax(0,1fr) 40px',[{k:'item',label:'項目',wide:1},{k:'price',label:'單價（元）',num:1},{k:'qty',label:'數量',num:1},{k:'when',label:'需要時間',ph:'115/11'},{k:'amt',label:'金額（元）',out:'funds',num:1},{k:'note',label:'說明',line:1,ph:'選填'}]);
 h+='<div class="actions">'+plAddBtn('funds','新增其他營運資金')+'</div>';
 h+='<h3 class="psub">3. 預估週轉金<span class="sumline">小計（3）'+plOut('work.total')+' 元</span></h3><p class="hint lead">週轉金視產業而定，原則上預估 3 個月；薪資請說明工作人員的用途與分配。</p>';
 h+=plLineTable('work','28px minmax(0,2fr) minmax(0,1fr) minmax(0,.55fr) minmax(0,.6fr) minmax(0,1fr) 40px',[{k:'item',label:'項目',wide:1},{k:'monthly',label:'每月費用（元）',num:1},{k:'qty',label:'數量',num:1},{k:'months',label:'月份',num:1},{k:'amt',label:'金額（元）',out:'work',num:1},{k:'note',label:'說明',line:1,ph:'薪資請寫工作人員的用途與分配'}]);
 h+='<div class="actions">'+plAddBtn('work','新增週轉金')+'</div>';
 h+='<div class="needbar"><span>所需貸款總額（A）＋（1）＋（2）＋（3）</span><b>'+plOut('need.total')+'<small> 元</small></b></div>';
 return h;
}
function plSecLoan(){
 const L=state.plan.loan;let h='<h3 class="psub">伍、擬申請貸款金額</h3><div class="pgrid">'+fIn('loan.amount','1. 擬申請貸款金額（新台幣）',{type:'num',req:1,unit:'元',out:'loan.need'})+fIn('loan.years','貸款期限',{type:'num',req:1,unit:'年',hint:'須小於或等於 7 年'})+'</div>';
 h+=fRadio('loan.grace','寬限期',[['yes','擬申請寬限期一年'],['no','不申請寬限期']],{req:1});
 h+='<div class="pgrid">'+fIn('loan.monthly','2. 預計未來每月貸款償還金額',{type:'num',req:1,unit:'元',hint:'依公司或顧問說明的貸款條件試算'})+'</div>';
 h+=fRadio('loan.dest','3. 核貸後撥款帳戶',[['ctbc','擬撥入之中國信託商業銀行帳號'],['new','新開戶']],{req:1});
 if(L.dest)h+='<div class="pgrid indent">'+fIn('loan.bank','銀行名稱',{req:L.dest==='ctbc',unit:'銀行',ph:'中國信託商業'})+fIn('loan.branch','分行',{req:L.dest==='ctbc',unit:'分行'})+(L.dest==='ctbc'?fSecret('account','帳號',{ph:'只用在這次產生'}):'')+'</div>';
 h+='<h3 class="psub">陸、申貸後，顧問輔導需求</h3>'+fRadio('coach.ops','1. 營運顧問輔導需求程度',PL_COACH,{req:1})+fRadio('coach.tech','2. 技術顧問輔導需求程度',PL_COACH,{req:1});
 return h;
}
const PL_LV={fix:['需修改','lv-fix'],miss:['未填','lv-miss'],check:['請核對','lv-check'],hint:['提醒','lv-hint']};
function plCheckLi(c){
 const go=c.fk?(c.fk.startsWith('act:')?'<button type="button" class="small" data-act="plGo" data-sec="'+c.sec+'" data-fk="'+esc(c.fk)+'">去新增</button>':'<button type="button" class="small" data-act="plGo" data-sec="'+c.sec+'" data-fk="'+esc(c.fk)+'">去填寫</button>'):'<span></span>';
 return '<li class="'+PL_LV[c.lv][1]+'"><span class="lvbadge '+PL_LV[c.lv][1]+'">'+PL_LV[c.lv][0]+'</span><span>'+esc(c.text)+'<small>'+esc(plSecTitle(c.sec))+'</small></span>'+go+'</li>';
}
function plRefRows(map){
 const key=scopeKey(),all=Object.assign({},map.plan,map.attach);
 return Object.entries(all).filter(([id])=>CONTENT.items[id]).map(([id,crit])=>{
  const def=CONTENT.items[id],r=getRec(key,id),na=r.na&&def.allowNA;
  const lines=(def.criteria||[]).filter(c=>!c.auto).map(c=>{
   const v=crit[c.id],on=!!r.crit[c.id];
   let st,txt;
   if(na){st='na';txt='已標記不需要';}
   else if(v===true){st='ok';txt=on?'已勾選':'產生時自動勾選';}
   else if(v===false){st='bad';txt='還不符合，請看上方需要處理的項目';}
   else{st=on?'done':'manual';txt=on?'已勾選':'請自行確認後勾選';}
   return '<li class="rf-'+st+'"><span class="rf-ico" aria-hidden="true">'+(st==='ok'||st==='done'?ico('check'):st==='bad'?ico('x'):'')+'</span><span>'+esc(c.text)+'<small>'+esc(txt)+'</small></span></li>';
  }).join('');
  return '<li class="refitem"><div class="refhead"><a href="#/item/'+id+'">'+esc(def.name.replace(/^★/,''))+'</a>'+(def.row?'<span class="rowno">進度表第 '+def.row+' 列</span>':'')+pillHtml(itemStatus(id,key))+'</div><ul class="reflist">'+lines+'</ul></li>';
 }).join('');
}
function plSecMake(){
 const first=state.mode==='first',checks=plChecks(),map=plRefMap(checks),p=state.plan,last=ui.plLast;
 const planChecks=checks.filter(c=>['basic','biz','story','money','structure','forecast','needs','loan'].includes(c.sec));
 const attachSecs=first?['money','structure','forecast','needs']:['money','structure'];
 const cnt=(secs,lv)=>checks.filter(c=>secs.includes(c.sec)&&c.lv===lv).length;
 const stat=(secs)=>{const m=cnt(secs,'miss'),f=cnt(secs,'fix');return m||f?'<p class="genstat warn">'+(m?m+' 個欄位空白':'')+(m&&f?'、':'')+(f?f+' 項需修改':'')+'。仍可以先產生，空白的地方會留白。</p>':'<p class="genstat ok">'+ico('check')+'必填欄位都完成了</p>';};
 const when=s=>s?'<small class="genwhen">上次產生：'+esc(fmtShort(s.slice(0,10)))+' '+esc(new Date(s).toTimeString().slice(0,5))+'</small>':'';
 let h='<div class="gencards">';
 if(first)h+='<article class="gencard"><div class="gc-ico">'+ico('file')+'</div><div class="gc-body"><h3>創業計畫書<span class="fmt">Word</span></h3><p>依「信扶專案 創業計畫書（簡版 104.05.01）」格式填入：壹～陸。</p>'+stat(['basic','biz','story','money','structure','forecast','needs','loan'])+'<button type="button" class="primary" data-act="plGen" data-what="plan">'+ico('download')+'產生計畫書</button>'+when(p.gen.plan)+'</div></article>';
 h+='<article class="gencard"><div class="gc-ico att">'+ico('table')+'</div><div class="gc-body"><h3>'+(first?'計畫書附件':'第 '+esc(state.round)+' 次動撥附件')+'<span class="fmt">Excel</span></h3><p>'+(first?'債務現況盤點表、營運結構數字計算、營運財務預估分析表、資金需求及設備購買表。':'債務現況盤點表、營運結構數字計算（用最新的數字）。')+'</p>'+stat(attachSecs)+'<button type="button" class="primary" data-act="plGen" data-what="attach">'+ico('download')+'產生附件</button>'+when(p.gen.attach)+'</div></article></div>';
 if(last)h+='<p class="ticknote">'+ico('check')+'<span>已下載「'+esc(last.name)+'」。請打開檔案確認版面'+(last.on.length?'；已自動勾選 '+esc(last.on.join('、'))+' 的完成條件':'')+'。</span></p>';
 if(first)h+='<div class="notice warn">'+ico('writing')+'<div><p><strong>計畫書請盡量以小老闆本人手寫為主。</strong>可以把產生的計畫書印出來，讓小老闆照著寫；要直接使用打字版，請先和信扶專案顧問確認。表單請單面列印、不要更改格式。</p></div></div>';
 else h+='<div class="notice">'+ico('spark')+'<p>第 2～5 次動撥的「未來營運說明」請用 Word 範本撰寫；預估營業盈餘可以用「檢核工具」的「未來三個月試算」計算。</p></div>';
 const shown=first?checks:checks.filter(c=>attachSecs.includes(c.sec));
 const needN=shown.filter(c=>c.lv!=='hint').length;
 h+='<section class="psec-block"><h3>需要處理<span class="sub">'+(needN?needN+' 項':'沒有')+(shown.length-needN?'，提醒 '+(shown.length-needN)+' 項':'')+'</span></h3>'+(shown.length?'<ul class="findings plfind">'+shown.slice(0,60).map(plCheckLi).join('')+'</ul>'+(shown.length>60?'<p class="hint">只列出前 60 項。</p>':''):'<p class="okline">'+ico('check')+'沒有需要處理的地方。</p>')+'</section>';
 h+='<section class="psec-block"><h3>對照審查繳交進度表</h3><p class="hint lead">產生檔案時，工具能確認的完成條件會自動勾選（標示「工具檢查通過」）；寄出、上傳、和顧問討論等，請完成後自己勾選。</p><ul class="reflist-wrap">'+plRefRows(map)+'</ul></section>';
 h+='<p class="privacy">'+ico('shield')+'<span>檔案在這台電腦產生，不會上傳。檔案含個人資料和財務資料：請上傳到審查事件，或依公司規定寄送，不要用 LINE 傳。</span></p>';
 return h;
}

/* ---------- 頁面 ---------- */
function plSecIssues(sec,checks){
 const mine=checks.filter(c=>c.sec===sec),need=mine.filter(c=>c.lv!=='hint');
 if(!mine.length)return '<p class="okline">'+ico('check')+'這一段沒有需要處理的地方。</p>';
 return '<h3 class="psub">這一段還要處理<span class="sumline">'+(need.length?need.length+' 項':'沒有')+(mine.length-need.length?'，提醒 '+(mine.length-need.length)+' 項':'')+'</span></h3><ul class="findings plfind">'+mine.slice(0,20).map(plCheckLi).join('')+'</ul>'+(mine.length>20?'<p class="hint">還有 '+(mine.length-20)+' 項，請到「核對與產生」查看。</p>':'');
}
function pagePlan(arg){
 const secs=plSecs();let sec=secs.includes(arg)?arg:secs[0];ui.plSec=sec;
 const checks=plChecks(),first=state.mode==='first',idx=secs.indexOf(sec);
 let h='<div class="pagehead"><div><p class="kicker">'+esc(scopeLabel())+(state.caseName?'｜'+esc(state.caseName):'')+'</p><h1 tabindex="-1">計畫書與附件</h1></div></div>';
 h+='<p class="intro">'+(first?'和小老闆一起填一次，就能產生 Word 計畫書和 Excel 附件。數字自動計算，同一個數字只要填一次。':'更新債務和營運結構，產生這次動撥要附的 Excel 附件。')+'</p>';
 if(!tplReady())h+='<div class="notice bad"><p>這個檔案沒有文件範本，無法產生檔案。請改用最新版的引導員版。</p></div>';
 h+='<div class="plan"><nav class="plnav" aria-label="計畫書段落"><ol>'+secs.map((id,i)=>{
  const s=plSecStatus(id,checks),cur=id===sec,dot=id==='make'?'<span class="pn-dot mk">'+ico('download')+'</span>':'<span class="pn-dot pn-'+s.key+'">'+(s.key==='done'?ico('check'):i+1)+'</span>';
  const sub=id==='make'?'產生 Word、Excel':s.key==='todo'?'還沒開始':s.need||s.fix?(s.need?s.need+' 欄空白':'')+(s.need&&s.fix?'、':'')+(s.fix?s.fix+' 項需修改':''):'完成';
  return '<li><a href="#/plan/'+id+'" data-plnav="'+id+'"'+(cur?' aria-current="step"':'')+'>'+dot+'<span class="pn-t">'+esc(plSecTitle(id))+'<small>'+esc(sub)+'</small></span></a></li>';
 }).join('')+'</ol></nav>';
 const body={basic:plSecBasic,biz:plSecBiz,story:plSecStory,money:plSecMoney,structure:plSecStructure,forecast:plSecForecast,needs:plSecNeeds,loan:plSecLoan,make:plSecMake}[sec]();
 h+='<section class="psec card" aria-labelledby="psecT"><header class="psec-h"><p class="kicker">第 '+(idx+1)+' 段，共 '+secs.length+' 段</p><h2 id="psecT">'+esc(plSecTitle(sec))+'</h2>'+(PL_SECS[sec].d.length?'<p class="doctags"><span class="sr">會寫進：</span>'+plDocTags(sec)+'</p>':'')+'</header><div class="psec-b">'+body+(sec==='make'?'':'<div class="psec-issues" id="plSecIssues">'+plSecIssues(sec,checks)+'</div>')+'</div>';
 const prev=secs[idx-1],next=secs[idx+1];
 h+='<nav class="pager psec-f" aria-label="上一段與下一段">'+(prev?'<a href="#/plan/'+prev+'"><small>上一段</small>'+esc(plSecTitle(prev))+'</a>':'')+(next?'<a class="next-link" href="#/plan/'+next+'"><small>下一段</small>'+esc(plSecTitle(next))+'</a>':'')+'</nav></section></div>';
 return h;
}
function afterPlan(){
 const fk=ui.plFocus;if(!fk)return;ui.plFocus='';
 setTimeout(()=>{const el=document.querySelector('[data-fk="'+CSS.escape(fk)+'"]')||document.querySelector('[data-fk^="'+CSS.escape(fk)+':"]');if(el){el.scrollIntoView({block:'center'});el.focus({preventScroll:true});}},30);
}
function plLive(){
 const C=plCalc();
 document.querySelectorAll('#view [data-out]').forEach(el=>{const k=el.dataset.out;el.textContent=plOutText(k,C);if(k.startsWith('len:')){const soft=PL_SOFT[k.slice(4)];el.classList.toggle('over',!!soft&&[...String(plGet(k.slice(4))||'').replace(/\s/g,'')].length>soft);}else el.classList.toggle('neg',/^-\d/.test(el.textContent));});
 const checks=plChecks(),box=$('plSecIssues');if(box&&ui.plSec)box.innerHTML=plSecIssues(ui.plSec,checks);
 document.querySelectorAll('#view [data-plnav]').forEach(a=>{const id=a.dataset.plnav;if(id==='make')return;const s=plSecStatus(id,checks),dot=a.querySelector('.pn-dot'),sm=a.querySelector('small');if(dot){dot.className='pn-dot pn-'+s.key;dot.innerHTML=s.key==='done'?ico('check'):String(plSecs().indexOf(id)+1);}if(sm)sm.textContent=s.key==='todo'?'還沒開始':s.need||s.fix?(s.need?s.need+' 欄空白':'')+(s.need&&s.fix?'、':'')+(s.fix?s.fix+' 項需修改':''):'完成';});
}
function plNewRow(list){
 const r=Object.assign({id:uid()},JSON.parse(JSON.stringify(PL_LIST_SCHEMA[list])));
 if(list==='owned'||list==='buy'||list==='funds')r.qty='1';
 if(list==='work'){r.qty='1';r.months='3';}
 if(list==='debts')r.freq='每月';
 return r;
}

/* ---------- 事件 ---------- */
/* 金額離開欄位時加上千分位（80000 → 80,000）；百分比、天數等不變 */
document.addEventListener('change',e=>{
 const x=e.target;if(!x||!x.matches||!x.matches('input.num[data-bind=pl]'))return;
 const path=x.dataset.p,v=String(x.value).trim();if(!v||plBadNum(v)||/%|％/.test(v)||path==='st.margin'||/\.rate$/.test(path))return;
 const n=pnum(v);if(!isFinite(n))return;const f=Number.isInteger(n)?money(n):fmtNum(n);
 if(f!==x.value&&plSet(path,f)){x.value=f;save();}
});
Object.assign(ACT,{
 plAdd(b){const list=b.dataset.list;if(!PL_LIST_SCHEMA[list])return;const arr=state.plan[list];if(arr.length>=PL_LIMITS[list]){toast('最多 '+PL_LIMITS[list]+' 筆');return;}const r=plNewRow(list);arr.push(r);if(list==='debts')state.plan.noDebt=false;save();render();const el=document.querySelector('[data-fk^="pl:'+list+'.'+r.id+'."]');if(el){el.scrollIntoView({block:'center'});el.focus({preventScroll:true});}},
 plDel(b){const list=b.dataset.list,arr=state.plan[list];if(!Array.isArray(arr))return;const i=arr.findIndex(x=>x.id===b.dataset.id);if(i<0)return;const label='移除 1 筆'+PL_ROW_LABEL[list];snapshot(label);arr.splice(i,1);done(label,'已'+label);},
 plGen(b){plGenerate(b.dataset.what==='plan'?'plan':'attach');},
 plGo(b){const sec=b.dataset.sec,fk=b.dataset.fk||'';if(fk.startsWith('act:')){const [,act,list]=fk.split(':');if(act==='plAdd'){location.hash='#/plan/'+sec;ui.plFocus='add:'+list;if(route().arg===sec){render();afterPlan();}return;}}ui.plFocus=fk;if(route().page==='plan'&&route().arg===sec){render();afterPlan();}else location.hash='#/plan/'+sec;},
 plUseCase(){state.plan.p.name=state.caseName.trim().slice(0,120);save();render();toast('已帶入個案名稱，請確認是本名');},
 plFill(){
  const C=plCalc();if(!(C.m>0)&&!planHasData(state.plan.st)){toast('請先填「營運結構」');return;}
  snapshot('帶入營運結構數字');let n=0;
  state.first.forecast.months.forEach(m=>{const set=(k,v)=>{if(!plHas(m[k])&&v!==''){m[k]=v;n++;}};set('b',String(C.incSum));set('e',String(C.bizSum));set('f',String(C.homeSum));if(C.m>0&&C.m<1)set('rate',String(Math.round((1-C.m)*1000)/10));});
  if(!n){undoStack.pop();toast('沒有空白的欄位可以帶入');return;}
  done('帶入營運結構數字','已帶入 '+n+' 個欄位');
 }
});
Object.assign(CHG,{
 plSet(x){const path=x.dataset.p;if(!path)return;const v=String(x.value).slice(0,120);if(!plEnumOk(path,v)||!plSet(path,v))return;if(path.startsWith('st.'))plSyncBreakeven();save();render();},
 plCheck(x){const path=x.dataset.p;if(!path||!plSet(path,x.checked))return;if(path.startsWith('st.'))plSyncBreakeven();save();render();}
});
Object.assign(BIND,{
 pl(x){const path=x.dataset.p;if(!path)return;if(!plSet(path,String(x.value).slice(0,plMax(path))))return;if(path.startsWith('st.'))plSyncBreakeven();save();plLive();},
 plSecret(x){const k=x.dataset.k;if(k==='idno'||k==='account')ui.plSecret[k]=String(x.value).slice(0,k==='idno'?10:20);}
});
