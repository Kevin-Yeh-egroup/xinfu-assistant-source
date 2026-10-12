'use strict';
/* ==========================================================
   計畫書與附件：資料結構（先於 app.js 載入，讀取保存資料時要用）
   ========================================================== */
const PL_KINDS=['信用卡','現金卡','一般信用貸款','房屋貸款','汽機車貸款','勞工紓困貸款','親友借款','民間借款','當鋪','其他'];
const PL_FREQ=['每月','每季','每半年','每年','不定期'];
const PL_STATUS=['本息償還','只還息','未還','已還清'];
const ST_INC=[['sub','補助','例如：低收入戶生活補助、兒童津貼'],['salary','薪資','家人的薪資收入'],['other','其他收入','寫明是什麼收入']];
const ST_HOME=[['food','食',''],['cloth','衣',''],['house','住','房租、房貸'],['trans','行','交通、油錢、車貸'],['edu','育','學費、補習、托育'],['fun','樂',''],['tel','電信','手機、網路'],['med','醫療',''],['ins','保險',''],['repay','還款','家庭的債務還款（本利和）'],['save','儲蓄','每月固定存款'],['other','其他','寫明是什麼支出']];
const ST_BIZ=[['rent','租金','店面、攤位、倉庫'],['staff','人事','員工薪資'],['util','水電',''],['gas','瓦斯',''],['comm','通訊','電話、網路'],['repay','還款','生意的貸款還款（本利和）'],['other','其他','寫明是什麼成本']];
const PL_TYPES=[['1','自營作業'],['2','加盟'],['3','公司'],['4','行號'],['5','其他']];
const PL_COACH=[['5','非常高'],['4','高'],['3','一般'],['2','低'],['1','非常低']];
const PL_LIMITS={debts:18,owned:15,buy:10,funds:6,work:6};
const PL_LIST_SCHEMA={
 debts:{who:'self',name:'',creditor:'',kind:'',total:'',reason:'',date:'',rate:'',freq:'',per:'',status:'',note:'',remain:''},
 owned:{item:'',price:'',qty:'',paid:'',unpaid:''},
 buy:{item:'',use:'',spec:'',price:'',qty:'',when:'',pay:'',periods:'',perPay:'',source:'',quote:false},
 funds:{item:'',price:'',qty:'',when:'',note:''},
 work:{item:'',monthly:'',qty:'',months:'',note:''}
};
const PL_ENUMS={'debts.who':['self','family'],'debts.kind':PL_KINDS,'debts.freq':PL_FREQ,'debts.status':PL_STATUS,'owned.paid':['paid','inst'],'buy.pay':['once','inst'],
 'biz.reg':['done','prep'],'biz.kind':['commerce','exempt'],'biz.type':PL_TYPES.map(x=>x[0]),'loan.grace':['yes','no'],'loan.dest':['ctbc','new'],'coach.ops':PL_COACH.map(x=>x[0]),'coach.tech':PL_COACH.map(x=>x[0])};
const PL_LONG=new Set(['purpose','advantage','biz.feature','biz.customer','biz.sales','biz.focus','biz.product','debts.reason','fc.notes']);
function blankAddr(){return {zip:'',text:'',tel:''};}
function blankPlan(){
 const row=keys=>Object.fromEntries(keys.map(([k])=>[k,{amt:'',note:'',before:''}]));
 return {
  applyDate:'',
  p:{name:'',birth:'',phone:'',mobile:'',email:'',fax:'',emName:'',emRel:'',emPhone:''},
  biz:{name:'',reg:'',setup:'',kind:'',regNo:'',regDoc:'',taxNo:'',regPlan:'',type:'',typeOther:'',addr:{company:blankAddr(),factory:blankAddr(),other:blankAddr()},product:'',staff:'',feature:'',customer:'',sales:'',focus:''},
  purpose:'',advantage:'',
  inv:{self:'',rosca:'',family:'',bank:'',other:'',otherName:''},
  noDebt:false,debts:[],
  st:{inc:row(ST_INC),home:row(ST_HOME),biz:row(ST_BIZ),margin:'',days:'',price:'',special:false},
  fc:{past:{label:'',a:'',b:'',c:'',d:'',e:'',f:'',repay:''},notes:['','','','']},
  owned:[],buy:[],funds:[],work:[],
  loan:{amount:'',years:'',grace:'',monthly:'',dest:'',bank:'',branch:''},
  coach:{ops:'',tech:''},
  gen:{plan:'',attach:''}
 };
}
/* 讀取保存或匯入的資料：只接受已知欄位，字串限制長度，清單限制筆數 */
function normPlan(v){
 const out=blankPlan();if(!v||typeof v!=='object')return out;
 const walk=(tpl,src,path)=>{
  if(!src||typeof src!=='object')return;
  for(const k of Object.keys(tpl)){
   const p=path?path+'.'+k:k,t=tpl[k],x=src[k];
   if(Array.isArray(t)){
    if(PL_LIST_SCHEMA[p]&&Array.isArray(x))tpl[k]=x.filter(o=>o&&typeof o==='object').slice(0,PL_LIMITS[p]).map(o=>normRow(p,o));
    else if(p==='fc.notes'&&Array.isArray(x))tpl[k]=[0,1,2,3].map(i=>S(x[i],300));
   }
   else if(t&&typeof t==='object')walk(t,x,p);
   else if(typeof t==='boolean')tpl[k]=x===true;
   else if(typeof x==='string'){const max=PL_LONG.has(p)?1200:p.endsWith('note')?300:120;tpl[k]=S(x,max);if(PL_ENUMS[p]&&tpl[k]&&!PL_ENUMS[p].includes(tpl[k]))tpl[k]='';}
  }
 };
 walk(out,v,'');
 if(!isISO(out.applyDate))out.applyDate='';if(!isISO(out.p.birth))out.p.birth='';if(!isISO(out.biz.setup))out.biz.setup='';
 out.gen={plan:isStamp(v.gen&&v.gen.plan)?v.gen.plan:'',attach:isStamp(v.gen&&v.gen.attach)?v.gen.attach:''};
 return out;
}
function normRow(list,o){
 const r={id:safeId(o.id)};
 for(const [k,d] of Object.entries(PL_LIST_SCHEMA[list])){
  if(typeof d==='boolean'){r[k]=o[k]===true;continue;}
  let s=S(o[k],k==='reason'||k==='note'?300:120);const en=PL_ENUMS[list+'.'+k];if(en&&s&&!en.includes(s))s='';r[k]=s||(k==='who'?'self':'');
 }
 return r;
}
function planHasData(p){
 if(!p)return false;
 let any=false;const scan=o=>{if(any||!o)return;if(typeof o==='string'){if(o.trim())any=true;return;}if(o===true){any=true;return;}if(typeof o==='object')for(const [k,x] of Object.entries(o))if(k!=='gen'&&k!=='id')scan(x);};
 scan(p);return any;
}
