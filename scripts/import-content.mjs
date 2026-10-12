#!/usr/bin/env node
// 把網站「維護內容」匯出的 HTML 轉回原始碼：
//   - 內容（清單、完成條件、作業說明、AI 審核注意事項）→ src/content.json
//   - 作業說明的圖片 → src/images/（和現有圖片相同就沿用，新的另存一個檔）
//   - 審查人員版若換過通行碼 → src/gate.json（只有雜湊）
// 用法：npm run import-content -- 匯出的檔案.html
// 之後請 git diff 看一下改了什麼，再開 PR。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const IMG = path.join(SRC, 'images');
const file = process.argv[2];
if (!file) { console.error('用法：npm run import-content -- 匯出的檔案.html'); process.exit(2); }

const html = fs.readFileSync(file, 'utf8');
const m = html.match(/<script id="contentData"[^>]*>([\s\S]*?)<\/script>/);
if (!m) { console.error('這個檔案裡找不到內容區塊，請確認是從「維護內容」匯出的 HTML。'); process.exit(1); }
const c = JSON.parse(m[1]);
if (!c.items || !c.review) { console.error('內容格式不對，請確認是本工具匯出的檔案。'); process.exit(1); }

// 通行碼雜湊
const gate = c.gate;
delete c.gate;
if (gate && gate.hash) {
  const gp = path.join(SRC, 'gate.json');
  const cur = fs.existsSync(gp) ? JSON.parse(fs.readFileSync(gp, 'utf8')) : null;
  if (!cur || cur.hash !== gate.hash || cur.salt !== gate.salt) {
    fs.writeFileSync(gp, JSON.stringify(gate, null, 1) + '\n');
    console.log('審查通行碼換過了：已更新 src/gate.json（只有雜湊）。請把新通行碼私下交給審查人員。');
  }
}

// 圖片：data URI → src/images/ 的檔案
fs.mkdirSync(IMG, { recursive: true });
const existing = fs.readdirSync(IMG).map(f => ({ f, b: fs.readFileSync(path.join(IMG, f)) }));
const used = new Set();
let next = existing.reduce((n, { f }) => Math.max(n, Number((/^img(\d+)\./.exec(f) || [])[1] ?? -1) + 1), 0);
let added = 0;
for (const item of Object.values(c.items)) {
  for (const im of item.images || []) {
    const d = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(im.src || '');
    if (!d) continue;
    const buf = Buffer.from(d[2], 'base64');
    let hit = existing.find(e => e.b.equals(buf));
    if (!hit) {
      const name = `img${next++}.${d[1] === 'png' ? 'png' : 'jpg'}`;
      fs.writeFileSync(path.join(IMG, name), buf);
      hit = { f: name, b: buf }; existing.push(hit); added++;
    }
    used.add(hit.f);
    delete im.src;
    im.file = hit.f;
  }
}

fs.writeFileSync(path.join(SRC, 'content.json'), JSON.stringify(c, null, 1));
console.log(`已更新 src/content.json（內容版本 ${c.rev || '未標示'}，${Object.keys(c.items).length} 項資料）`);
if (added) console.log(`新增 ${added} 張圖片到 src/images/`);
const unused = existing.map(e => e.f).filter(f => !used.has(f));
if (unused.length) console.log('沒有再用到的圖片（確認後可以刪除）：' + unused.join('、'));
console.log('下一步：npm test，確認沒問題後開 PR。');
