/* ==========================================================
   產生文件：Word 計畫書、Excel 附件（在本機組檔案，不上傳）
   範本在建置時壓縮後放進這個檔案（tplData）。
   ========================================================== */
const TPL=(()=>{try{const el=document.getElementById('tplData');return el?JSON.parse(el.textContent||'{}'):{};}catch(e){return {};}})();
const tplReady=()=>!!(TPL&&TPL.meta&&TPL.plan&&TPL.first&&TPL.later);

/* ---- raw DEFLATE 解壓（RFC 1951，依 zlib puff 的寫法） ---- */
const INF_LB=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258],INF_LE=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
const INF_DB=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],INF_DE=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
function inflateRaw(src){
 let pos=0,bb=0,bc=0,op=0,out=new Uint8Array(Math.max(4096,src.length*6));
 const bad=()=>{throw Error('範本資料損壞');};
 const room=n=>{if(op+n<=out.length)return;let m=out.length*2;while(m<op+n)m*=2;const t=new Uint8Array(m);t.set(out.subarray(0,op));out=t;};
 const bits=n=>{while(bc<n){if(pos>=src.length)bad();bb|=src[pos++]<<bc;bc+=8;}const v=bb&((1<<n)-1);bb>>>=n;bc-=n;return v;};
 const table=lens=>{const count=new Uint16Array(16),sym=new Uint16Array(lens.length),offs=new Uint16Array(16);for(const l of lens)count[l]++;count[0]=0;for(let i=1;i<16;i++)offs[i]=offs[i-1]+count[i-1];for(let s=0;s<lens.length;s++)if(lens[s])sym[offs[lens[s]]++]=s;return {count,sym};};
 const decode=h=>{let code=0,first=0,index=0;for(let len=1;len<16;len++){code|=bits(1);const c=h.count[len];if(code-c<first)return h.sym[index+(code-first)];index+=c;first+=c;first<<=1;code<<=1;}return bad();};
 let fixedL=null,fixedD=null,last=0;
 do{
  last=bits(1);const type=bits(2);
  if(type===0){
   bb=0;bc=0;if(pos+4>src.length)bad();
   const len=src[pos]|(src[pos+1]<<8);pos+=4;if(pos+len>src.length)bad();
   room(len);out.set(src.subarray(pos,pos+len),op);op+=len;pos+=len;continue;
  }
  let L,Dt;
  if(type===1){
   if(!fixedL){const l=new Uint8Array(288);l.fill(8,0,144);l.fill(9,144,256);l.fill(7,256,280);l.fill(8,280,288);fixedL=table(l);fixedD=table(new Uint8Array(30).fill(5));}
   L=fixedL;Dt=fixedD;
  }else if(type===2){
   const nlen=bits(5)+257,ndist=bits(5)+1,ncode=bits(4)+4,ord=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],cl=new Uint8Array(19);
   for(let i=0;i<ncode;i++)cl[ord[i]]=bits(3);
   const C=table(cl),lens=new Uint8Array(nlen+ndist);
   for(let i=0;i<nlen+ndist;){
    const s=decode(C);
    if(s<16){lens[i++]=s;continue;}
    let rep=0,val=0;
    if(s===16){if(!i)bad();val=lens[i-1];rep=3+bits(2);}else if(s===17)rep=3+bits(3);else rep=11+bits(7);
    if(i+rep>nlen+ndist)bad();while(rep--)lens[i++]=val;
   }
   L=table(lens.subarray(0,nlen));Dt=table(lens.subarray(nlen));
  }else bad();
  for(;;){
   const s=decode(L);
   if(s<256){room(1);out[op++]=s;continue;}
   if(s===256)break;
   const li=s-257;if(li>=29)bad();
   const len=INF_LB[li]+bits(INF_LE[li]),di=decode(Dt);if(di>=30)bad();
   const dist=INF_DB[di]+bits(INF_DE[di]);if(dist>op)bad();
   room(len);for(let k=0;k<len;k++){out[op]=out[op-dist];op++;}
  }
 }while(!last);
 return out.subarray(0,op);
}
function b64bytes(s){const bin=atob(s);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u;}
const tplCache={};
function tplFiles(name){
 if(tplCache[name])return tplCache[name];
 if(!TPL[name])throw Error('這個檔案裡沒有文件範本，請使用最新版的引導員版');
 const list=JSON.parse(new TextDecoder().decode(inflateRaw(b64bytes(TPL[name]))));
 return (tplCache[name]=list);
}

/* ---- ZIP（不壓縮）與 CRC-32 ---- */
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRC_T[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function zipStore(entries){
 const enc=new TextEncoder(),now=new Date();
 const dtime=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1),ddate=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
 const parts=[],central=[];let off=0;
 for(const [name,content] of entries){
  const data=typeof content==='string'?enc.encode(content):content,nm=enc.encode(name),crc=crc32(data);
  const h=new DataView(new ArrayBuffer(30));
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,dtime,true);h.setUint16(12,ddate,true);
  h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,nm.length,true);h.setUint16(28,0,true);
  const c=new DataView(new ArrayBuffer(46));
  c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);c.setUint16(12,dtime,true);c.setUint16(14,ddate,true);
  c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
  parts.push(new Uint8Array(h.buffer),nm,data);central.push(new Uint8Array(c.buffer),nm);off+=30+nm.length+data.length;
 }
 const cdSize=central.reduce((a,u)=>a+u.length,0),e=new DataView(new ArrayBuffer(22));
 e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,cdSize,true);e.setUint32(16,off,true);
 const all=parts.concat(central,[new Uint8Array(e.buffer)]),total=all.reduce((a,u)=>a+u.length,0),out=new Uint8Array(total);let p=0;
 for(const u of all){out.set(u,p);p+=u.length;}
 return out;
}
function packTpl(list,changed){
 const order=n=>n==='[Content_Types].xml'?0:n==='_rels/.rels'?1:2;
 return zipStore(list.map(([n,t])=>[n,Object.prototype.hasOwnProperty.call(changed,n)?changed[n]:t]).sort((a,b)=>order(a[0])-order(b[0])));
}

/* ---- XML 小工具 ---- */
const xmlText=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g,'').replace(/\t/g,' ').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ---- Word：{{f:鍵}} 文字、{{c:鍵}} 勾選框、{{m:鍵}} 多行；表格列群組 own/buy/funds/work ---- */
function trBounds(xml,at){
 let a=at;for(;;){a=xml.lastIndexOf('<w:tr',a-1);if(a<0)return null;const ch=xml[a+5];if(ch===' '||ch==='>')break;}
 const b=xml.indexOf('</w:tr>',at);return b<0?null:[a,b+7];
}
function expandRows(xml,group,n){
 const i0=xml.search(new RegExp('\\{\\{[fcm]:'+group+'\\.0\\.')),iT=xml.search(new RegExp('\\{\\{[fcm]:'+group+'\\.#\\.'));
 if(i0<0||iT<0)throw Error('範本缺少表格列：'+group);
 const r0=trBounds(xml,i0),rT=trBounds(xml,iT);if(!r0||!rT||rT[0]!==r0[1])throw Error('範本表格列順序不符：'+group);
 const row0=xml.slice(r0[0],r0[1]),rowT=xml.slice(rT[0],rT[1]),re=new RegExp('\\{\\{([fcm]):'+group+'\\.#\\.','g');
 let rows=row0;for(let i=1;i<n;i++)rows+=rowT.replace(re,'{{$1:'+group+'.'+i+'.');
 return xml.slice(0,r0[0])+rows+xml.slice(rT[1]);
}
function paraBounds(xml,at){
 let a=at;for(;;){a=xml.lastIndexOf('<w:p',a-1);if(a<0)return null;const ch=xml[a+4];if(ch===' '||ch==='>')break;}
 const b=xml.indexOf('</w:p>',at);return b<0?null:[a,b+6];
}
/* 表格（例如計畫書十一的四個月收支）：標楷體 10 號、細框線，黑白列印也清楚 */
function docxTable(spec){
 const W=spec.width,ws=spec.cols.map(r=>Math.round(W*r));
 const run=(t,b,sz)=>'<w:r><w:rPr><w:rFonts w:ascii="標楷體" w:hAnsi="標楷體" w:eastAsia="標楷體" w:cs="Times New Roman"/>'+(b?'<w:b/><w:bCs/>':'')+'<w:sz w:val="'+(sz||20)+'"/><w:szCs w:val="'+(sz||20)+'"/></w:rPr><w:t xml:space="preserve">'+xmlText(t)+'</w:t></w:r>';
 const cell=(t,w,al,b)=>'<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:before="20" w:after="20" w:line="260" w:lineRule="atLeast"/><w:jc w:val="'+al+'"/></w:pPr>'+run(t,b)+'</w:p></w:tc>';
 let x='<w:tbl><w:tblPr><w:tblW w:w="'+W+'" w:type="dxa"/><w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(k=>'<w:'+k+' w:val="single" w:sz="4" w:space="0" w:color="000000"/>').join('')+'</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid>'+ws.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>';
 x+='<w:tr><w:trPr><w:tblHeader/></w:trPr>'+spec.head.map((t,i)=>cell(t,ws[i],'center',true)).join('')+'</w:tr>';
 spec.rows.forEach(r=>{x+='<w:tr>'+r.map((t,i)=>cell(t,ws[i],spec.align[i],false)).join('')+'</w:tr>';});
 x+='</w:tbl>';
 if(spec.note)x+='<w:p><w:pPr><w:spacing w:before="40" w:after="0"/></w:pPr>'+run(spec.note,false,18)+'</w:p>';
 return x;
}
function fillDocx(vals,groups){
 const meta=TPL.meta.docx,list=tplFiles('plan');
 let xml=list.find(x=>x[0]==='word/document.xml')[1];
 for(const [g,min] of Object.entries(meta.groups))xml=expandRows(xml,g,Math.max(min.min,groups[g]||0));
 for(;;){
  const m=xml.match(/<w:t(?:\s[^>]*)?>\{\{t:([^}]+)\}\}<\/w:t>/);if(!m)break;
  const spec=vals[m[1]];
  if(spec&&spec.rows&&spec.rows.length){const pb=paraBounds(xml,m.index);if(!pb)throw Error('範本表格位置不符');xml=xml.slice(0,pb[0])+docxTable(Object.assign({width:(meta.tables||{})[m[1]]||8000},spec))+xml.slice(pb[1]);}
  else xml=xml.slice(0,m.index)+'<w:t xml:space="preserve"></w:t>'+xml.slice(m.index+m[0].length);
 }
 const dflt=k=>{const d=meta.defaults;if(k in d)return d[k];const a=k.replace(/\.\d+\./,'.#.');if(a in d)return d[a];const b=k.replace(/\.\d+\./,'.0.');return b in d?d[b]:'';};
 const T=t=>'<w:t xml:space="preserve">'+t+'</w:t>';
 xml=xml.replace(/<w:t(?:\s[^>]*)?>\{\{([fcm]):([^}]+)\}\}<\/w:t>/g,(m,kind,key)=>{
  const v=vals[key];
  if(kind==='c')return T(v===true?'■':'□');
  const s=v===undefined||v===null?'':String(v);
  if(kind==='m'){if(!s.trim())return T(xmlText(dflt(key)));return s.split('\n').map(l=>T(xmlText(l))).join('<w:br/>');}
  return T(xmlText(s.trim()===''?dflt(key):s));
 });
 if(/\{\{[fcmt]:/.test(xml))throw Error('計畫書範本有未填入的欄位');
 return packTpl(list,{'word/document.xml':xml});
}

/* ---- Excel：在範本的儲存格填值（字串、數字、公式＋計算結果） ---- */
function xlEsc(s){return xmlText(s);}
function cellXml(ref,style,c){
 const s=style?' s="'+style+'"':'';
 if(c===null||c===undefined||c==='')return '<c r="'+ref+'"'+s+'/>';
 if(typeof c==='number')return isFinite(c)?'<c r="'+ref+'"'+s+'><v>'+c+'</v></c>':'<c r="'+ref+'"'+s+'/>';
 if(typeof c==='string')return '<c r="'+ref+'"'+s+' t="inlineStr"><is><t xml:space="preserve">'+xlEsc(c)+'</t></is></c>';
 if(c.f){const val=c.v;const f='<f>'+xlEsc(c.f)+'</f>';if(typeof val==='number'&&isFinite(val))return '<c r="'+ref+'"'+s+'>'+f+'<v>'+val+'</v></c>';if(typeof val==='string')return '<c r="'+ref+'"'+s+' t="str">'+f+'<v>'+xlEsc(val)+'</v></c>';return '<c r="'+ref+'"'+s+'>'+f+'</c>';}
 return '<c r="'+ref+'"'+s+'/>';
}
function xlSet(xml,ref,c,styleOverride){
 const re=new RegExp('<c r="'+ref+'"(?=[\\s/>])([^>]*?)(?:/>|>([\\s\\S]*?)</c>)');
 const m=xml.match(re);
 if(m){
  const st=styleOverride!==undefined?styleOverride:((m[1].match(/\bs="(\d+)"/)||[])[1]||'');
  if(c&&typeof c==='object'&&c.keepF){const f=(m[2]||'').match(/<f>([\s\S]*?)<\/f>/);c={f:f?f[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'):c.keepF,v:c.v};}
  return xml.slice(0,m.index)+cellXml(ref,st,c)+xml.slice(m.index+m[0].length);
 }
 // 範本裡沒有這一格：插到正確位置
 const col=ref.match(/^[A-Z]+/)[0],row=Number(ref.slice(col.length)),ci=colIndex(col),cx=cellXml(ref,styleOverride||'',c&&c.keepF?{f:c.keepF,v:c.v}:c);
 const rm=xml.match(new RegExp('<row r="'+row+'"(?=[\\s>/])[^>]*?(/?)>'));
 if(!rm){
  let at=-1;const rows=[...xml.matchAll(/<row r="(\d+)"/g)];for(const x of rows)if(Number(x[1])>row){at=x.index;break;}
  const nr='<row r="'+row+'">'+cx+'</row>';
  if(at<0){const e=xml.indexOf('</sheetData>');return e<0?xml:xml.slice(0,e)+nr+xml.slice(e);}
  return xml.slice(0,at)+nr+xml.slice(at);
 }
 if(rm[1]==='/'){return xml.slice(0,rm.index)+rm[0].slice(0,-2)+'>'+cx+'</row>'+xml.slice(rm.index+rm[0].length);}
 const start=rm.index+rm[0].length,end=xml.indexOf('</row>',start),body=xml.slice(start,end);
 let ins=body.length;for(const x of body.matchAll(/<c r="([A-Z]+)\d+"/g))if(colIndex(x[1])>ci){ins=x.index;break;}
 return xml.slice(0,start)+body.slice(0,ins)+cx+body.slice(ins)+xml.slice(end);
}
function xlRowHt(xml,row,ht){
 return xml.replace(new RegExp('<row r="'+row+'"(?=[\\s>/])([^>]*?)(/?)>'),(m,attrs,sl)=>'<row r="'+row+'"'+attrs.replace(/\s(ht|customHeight)="[^"]*"/g,'')+' ht="'+ht+'" customHeight="1"'+sl+'>');
}
/* 依欄寬估計需要幾行（中文字約 2 個字寬） */
function xlLines(text,width){
 let n=0,line=0,lines=1;const w=Math.max(4,width-1);
 for(const ch of String(text)){if(ch==='\n'){lines++;line=0;continue;}const cw=/[⺀-￯]/.test(ch)?2.1:1.15;if(line+cw>w){lines++;line=cw;}else line+=cw;n++;}
 return n?lines:1;
}
