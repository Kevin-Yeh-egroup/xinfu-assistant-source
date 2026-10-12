#!/usr/bin/env node
// 建置：src/ → dist/（兩個單檔離線版）＋ site/（網站，Vercel 會部署這個資料夾）
//
// 用法：node scripts/build.mjs [--out 資料夾] [--dist-only]
//   預設輸出到專案根目錄的 dist/ 和 site/。不需要安裝任何套件。
//
// 審查通行碼：預設使用 src/gate.json（只有雜湊，沒有通行碼本身，可以公開）。
//   測試時設環境變數 REVIEWER_CODE=測試用通行碼，會改用它重新產生雜湊，不會動到 src/gate.json。
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const args = process.argv.slice(2);
const at = args.indexOf('--out');
const OUT = at >= 0 ? path.resolve(args[at + 1]) : ROOT;
const DIST_ONLY = args.includes('--dist-only');   // 測試只需要 dist/
const DIST = path.join(OUT, 'dist');
const SITE = path.join(OUT, 'site');

const JS_PARTS = ['planmodel.js', 'app.js', 'docgen.js', 'plan.js', 'review.js', 'tour.js', 'boot.js'];
const FILES = { guide: '創業貸款準備助手-引導員版.html', reviewer: '創業貸款準備助手-審查人員版.html' };
const VIDEOS = ['guide.mp4', 'reviewer.mp4', 'partner-guide.mp4'];

const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
// 全部取代，且不解讀 $& 這類特殊字元（內容裡可能有 $）
const put = (s, token, value) => s.split(token).join(value);

const shell = read('shell.html');
const css = read('app.css');
const js = JS_PARTS.map(read).join('\n');
if (js.toLowerCase().includes('</script')) throw new Error('程式碼裡不能出現 </script');

// 作業說明的圖片：src/images/ 的檔案轉成 data URI 放進頁面（網頁不連外）
const content = JSON.parse(read('content.json'));
for (const item of Object.values(content.items)) {
  for (const im of item.images || []) {
    if (!im.file) continue;
    const data = fs.readFileSync(path.join(SRC, 'images', im.file));
    const mime = im.file.endsWith('.png') ? 'image/png' : 'image/jpeg';
    delete im.file;
    im.src = `data:${mime};base64,` + data.toString('base64');
  }
}

// 審查通行碼的雜湊（PBKDF2-SHA256，和頁面上的驗證方式一致）
function makeGate(code) {
  const norm = String(code).replace(/\s+/g, '').toUpperCase();
  const salt = crypto.randomBytes(16);
  const iter = 200000;
  const hash = crypto.pbkdf2Sync(Buffer.from(norm, 'utf8'), salt, iter, 32, 'sha256');
  return { v: 2, salt: salt.toString('hex'), iter, hash: hash.toString('hex') };
}
let gate = null;
if (process.env.REVIEWER_CODE) gate = makeGate(process.env.REVIEWER_CODE);
else if (fs.existsSync(path.join(SRC, 'gate.json'))) gate = JSON.parse(read('gate.json'));
else console.warn('⚠ 沒有 src/gate.json，也沒有設定 REVIEWER_CODE：審查人員版將無法開通。');

// 文件範本：每個 docx/xlsx → [[檔名, XML 文字], ...] → raw DEFLATE → base64（頁面用 inflateRaw 還原）
function readZip(file) {
  const b = fs.readFileSync(file);
  let e = b.length - 22;
  while (e >= 0 && b.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('不是 zip 檔：' + file);
  const count = b.readUInt16LE(e + 10);
  let p = b.readUInt32LE(e + 16);
  const parts = [];
  for (let i = 0; i < count; i++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('zip 目錄損壞：' + file);
    const method = b.readUInt16LE(p + 10), size = b.readUInt32LE(p + 20);
    const nameLen = b.readUInt16LE(p + 28), extraLen = b.readUInt16LE(p + 30), noteLen = b.readUInt16LE(p + 32);
    const local = b.readUInt32LE(p + 42);
    const name = b.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    const start = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    const data = b.subarray(start, start + size);
    if (method !== 0 && method !== 8) throw new Error(`不支援的壓縮方式 ${method}：${file} ${name}`);
    parts.push([name, (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8')]);
    p += 46 + nameLen + extraLen + noteLen;
  }
  return parts;
}
const tpl = { meta: JSON.parse(read('tpl/meta.json')) };
for (const [key, name] of [['plan', 'plan.docx'], ['first', 'attach-first.xlsx'], ['later', 'attach-later.xlsx']]) {
  const raw = Buffer.from(JSON.stringify(readZip(path.join(SRC, 'tpl', name))), 'utf8');
  tpl[key] = zlib.deflateRawSync(raw, { level: 9 }).toString('base64');
}
const TPL = JSON.stringify(tpl).replace(/</g, '\\u003c');

const PAGE = {
  guide: {
    title: '創業貸款準備助手｜信扶專案引導員版',
    desc: '陪小老闆準備創業貸款審查資料：照清單準備、產生計畫書與附件、送件前自我檢查。資料只存在你的瀏覽器，不會上傳。',
  },
  reviewer: {
    title: '創業貸款準備助手｜信扶專案審查人員版',
    desc: '審查人員用：讓 AI 先看一遍，再逐項決定、傳回引導員、確認修改。需要審查通行碼。',
  },
};

fs.mkdirSync(DIST, { recursive: true });
const built = {};
for (const [edition, file] of Object.entries(FILES)) {
  const c = JSON.parse(JSON.stringify(content));
  if (edition === 'reviewer' && gate) c.gate = gate;
  const data = JSON.stringify(c).replace(/</g, '\\u003c');
  let html = shell;
  html = put(html, '__PAGE_TITLE__', PAGE[edition].title);
  html = put(html, '__PAGE_DESC__', PAGE[edition].desc);
  html = put(html, '__EDITION__', edition);
  html = put(html, '/*__CSS__*/', css);
  html = put(html, '__CONTENT_JSON__', data);
  html = put(html, '__TPL_JSON__', TPL);
  html = put(html, '/*__JS__*/', js);
  fs.writeFileSync(path.join(DIST, file), html);
  built[edition] = html;
  console.log('dist/' + file, Buffer.byteLength(html), 'bytes');
}

if (DIST_ONLY) process.exit(0);

// 網站：/ 引導員版、/review 審查人員版、/videos 教學影片
fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(path.join(SITE, 'review'), { recursive: true });
fs.writeFileSync(path.join(SITE, 'index.html'), built.guide);
fs.writeFileSync(path.join(SITE, 'review', 'index.html'), built.reviewer);
fs.mkdirSync(path.join(SITE, 'videos'), { recursive: true });
for (const v of VIDEOS) {
  const from = path.join(ROOT, 'videos', v);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(SITE, 'videos', v));
  else console.warn('⚠ 找不到 videos/' + v + '，網站上的教學影片連結會失效');
}
console.log('site/ 完成：index.html、review/index.html、videos/');
