/* ==========================================================
   歡迎頁與操作導覽
   ========================================================== */
const SEAL_SVG='<span class="seal big" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17.5"/><circle cx="20" cy="20" r="13.5"/><path d="M14 20.5l4 4 8-9"/></svg></span>';
function welcomeWeb(){
 if(!WEB)return '';
 return '<p class="wl-web"><a class="textlink" href="'+VIDEO_URL+'" target="_blank" rel="noopener">'+ico('spark')+'看 3 分鐘教學影片</a><span>以前用檔案版的進度：在檔案版按「備份」，再到這裡按「還原」。</span></p>';
}
function pageWelcome(){
 if(RV)return '<section class="welcome">'+SEAL_SVG+'<p class="kicker">信扶專案｜審查人員版</p><h1 tabindex="-1">讓 AI 先看一遍，你來做判斷</h1><p class="lead">每個案子照四個步驟走。AI 只幫你找可能的問題，採用與否由你決定。</p>'
  +'<ol class="wl-steps four"><li>'+ico('spark')+'<h2>準備 AI 初審</h2><p>下載注意事項，交給 AI</p></li><li>'+ico('check')+'<h2>確認 AI 結果</h2><p>一項一項決定採不採用</p></li><li>'+ico('send')+'<h2>傳回引導員</h2><p>下載清單，交給引導員</p></li><li>'+ico('inbox')+'<h2>確認修改</h2><p>匯入回覆，逐項確認</p></li></ol>'
  +'<div class="wl-acts"><button type="button" class="primary big" data-act="welcomeTour">看 30 秒導覽</button><button type="button" class="big" data-act="welcomeSkip">直接開始</button></div>'+welcomeWeb()+'</section>';
 return '<section class="welcome">'+SEAL_SVG+'<p class="kicker">信扶專案｜引導員版</p><h1 tabindex="-1">陪小老闆，把資料一次準備好</h1><p class="lead">照著清單一項一項準備，送件前先自己檢查；收到審查人員的修改意見，也在這裡處理。</p>'
  +'<ol class="wl-steps four"><li>'+ico('docs')+'<h2>準備資料</h2><p>每項都有說明和完成條件</p></li><li>'+ico('plan')+'<h2>產生計畫書</h2><p>填一次，產生 Word、Excel</p></li><li>'+ico('tools')+'<h2>自己先檢查</h2><p>工具會圈出可能的錯</p></li><li>'+ico('inbox')+'<h2>處理修改意見</h2><p>匯入清單，改好再回傳</p></li></ol>'
  +'<div class="wl-acts"><button type="button" class="primary big" data-act="welcomeTour">看 30 秒導覽</button><button type="button" class="big" data-act="welcomeSkip">直接開始</button></div>'
  +'<p class="privacy">'+ico('shield')+'<span>資料只存在這台電腦的瀏覽器，不會上傳。</span></p>'+welcomeWeb()+'</section>';
}
const TOURS={
 guide:[
  {sel:'.modebar .seg',title:'先選這一次是哪個階段',text:'首次動撥和第 2～5 次動撥要交的資料不一樣，選好後清單會跟著換。'},
  {sel:'#postmark',title:'寄達期限自動倒數',text:'在總覽填好審查日期，這個郵戳會告訴你還剩幾天；快到期會變色。'},
  {sel:'.nav a[data-route=docs]',title:'一項一項準備',text:'每項資料都有作業說明和完成條件。條件勾滿，就自動變成完成。'},
  {sel:'.nav a[data-route=plan]',title:'計畫書和附件一起產生',text:'和小老闆一起填，數字自動計算，直接產生 Word 計畫書和 Excel 附件；能確認的完成條件會自動打勾。'},
  {sel:'.nav a[data-route=tools]',title:'送件前先自己檢查',text:'債務盤點表、試算、加總，工具會圈出可能的錯；檢查通過的部分會自動打勾。'},
  {sel:'.nav a[data-route=issues]',title:'審查人員的修改意見在這裡',text:'匯入審查人員給的需修改清單，改好一項按「標記已修改」，最後回傳修改進度。'},
  {sel:'.helpbtn',title:'想再看一次？',text:'隨時按「導覽」重新看。'}
 ],
 reviewer:[
  {sel:'.pagehead [data-act=rvNew]',title:'每個案子開一張審查卡',text:'輸入個案和這次審查的階段，就能開始。'},
  {sel:'.nav a[data-route=rv]',title:'照四個步驟走',text:'準備 AI 初審、確認 AI 找到的問題、傳回引導員、確認修改。卡片會顯示每個案子走到哪一步。'},
  {sel:'.nav a[data-route=notes]',title:'AI 審核注意事項',text:'這是給 AI 讀的審查標準。可以直接優化，系統會記下版本。'},
  {sel:'.nav a[data-route=catalog]',title:'各份文件的審查重點',text:'在這裡修改，引導員看到的「審查時常見的問題」也會一起更新。'},
  {sel:'.helpbtn',title:'想再看一次？',text:'隨時按「導覽」重新看。'}
 ]
};
const tour={on:false,steps:[],i:0,back:null};
function tourVisible(el){if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0;}
function startTour(){
 const home=RV?'#/rv':'#/overview';
 tour.back=document.activeElement;
 if(location.hash!==home){ui.enter=true;history.replaceState(null,'',home);render();}
 tour.steps=TOURS[EDITION].filter(s=>tourVisible(document.querySelector(s.sel)));
 if(!tour.steps.length)return;
 tour.on=true;tour.i=0;document.body.classList.add('touring');showTourStep();
}
function placeTour(){
 if(!tour.on)return;
 const s=tour.steps[tour.i],el=document.querySelector(s.sel);if(!el){endTour();return;}
 const r=el.getBoundingClientRect(),pad=8,card=$('tourCard'),cw=Math.min(340,innerWidth-32);
 $('tourHole').style.cssText='left:'+(r.left-pad)+'px;top:'+(r.top-pad)+'px;width:'+(r.width+pad*2)+'px;height:'+(r.height+pad*2)+'px';
 card.style.width=cw+'px';const ch=card.offsetHeight||190;
 let top=r.bottom+pad+14;if(top+ch>innerHeight-12)top=Math.max(12,r.top-pad-14-ch);
 const left=Math.min(Math.max(16,r.left+r.width/2-cw/2),innerWidth-cw-16);
 card.style.top=top+'px';card.style.left=left+'px';
}
function showTourStep(){
 const s=tour.steps[tour.i],el=document.querySelector(s.sel);if(!el){endTour();return;}
 const r=el.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)el.scrollIntoView({block:'center'});
 $('tourStep').textContent=(tour.i+1)+' / '+tour.steps.length;$('tourTitle').textContent=s.title;$('tourText').textContent=s.text;
 $('tourPrev').hidden=tour.i===0;$('tourNext').textContent=tour.i===tour.steps.length-1?'開始使用':'下一步';
 $('tour').hidden=false;placeTour();requestAnimationFrame(placeTour);$('tourNext').focus();
}
function endTour(){
 if(!tour.on)return;tour.on=false;$('tour').hidden=true;document.body.classList.remove('touring');
 state.tour[EDITION]=true;state.seenNews=NEWS;save();render();
 const h1=$('view').querySelector('h1');if(h1)h1.focus({preventScroll:true});
}
Object.assign(ACT,{
 tour(){startTour();},
 tourNext(){if(tour.i<tour.steps.length-1){tour.i++;showTourStep();}else endTour();},
 tourPrev(){if(tour.i>0){tour.i--;showTourStep();}},
 tourEnd(){endTour();},
 welcomeTour(){state.welcomed=true;save();ui.enter=true;history.replaceState(null,'',RV?'#/rv':'#/overview');render();setTimeout(startTour,60);},
 welcomeSkip(){state.welcomed=true;state.tour[EDITION]=true;state.seenNews=NEWS;save();ui.enter=true;history.replaceState(null,'',RV?'#/rv':'#/overview');render();const h1=$('view').querySelector('h1');if(h1)h1.focus({preventScroll:true});}
});
addEventListener('resize',()=>{if(tour.on)placeTour();});
addEventListener('scroll',()=>{if(tour.on)placeTour();},{passive:true});
document.addEventListener('keydown',e=>{
 if(!tour.on)return;
 if(e.key==='Escape'){e.preventDefault();endTour();return;}
 if(e.key==='Tab'){const b=[...$('tourCard').querySelectorAll('button')].filter(x=>!x.hidden);const i=b.indexOf(document.activeElement);e.preventDefault();const n=b[(i+(e.shiftKey?-1:1)+b.length)%b.length];if(n)n.focus();}
});
