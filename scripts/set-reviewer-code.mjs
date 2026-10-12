#!/usr/bin/env node
// 更換審查通行碼：只把雜湊寫進 src/gate.json，通行碼本身不會存在任何檔案裡。
//   npm run set-code               → 輸入兩次新通行碼
//   npm run set-code -- --generate → 自動產生一組新通行碼（只顯示這一次，請自己記好）
// 改完開 PR、合併後網站就換成新通行碼；已經開通的瀏覽器不受影響。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'gate.json');
const norm = s => String(s || '').replace(/\s+/g, '').toUpperCase();

function gateFor(code) {
  const salt = crypto.randomBytes(16), iter = 200000;
  const hash = crypto.pbkdf2Sync(Buffer.from(norm(code), 'utf8'), salt, iter, 32, 'sha256');
  return { v: 2, salt: salt.toString('hex'), iter, hash: hash.toString('hex') };
}
function generate() { // 4-4-4，去掉容易看錯的 0 O 1 I L
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const pick = () => Array.from(crypto.randomBytes(4), b => A[b % A.length]).join('');
  return [pick(), pick(), pick()].join('-');
}
function ask(q, hidden) {
  return new Promise(res => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = s => { if (/\r|\n/.test(s) || s.startsWith(q)) process.stdout.write(s.startsWith(q) ? q : '\n'); };
    rl.question(q, a => { rl.close(); res(a); });
  });
}

let code;
if (process.argv.includes('--generate')) {
  code = generate();
  console.log('新的審查通行碼（只顯示這一次）：' + code);
} else {
  code = await ask('新的審查通行碼：', true);
  const again = await ask('再輸入一次：', true);
  if (norm(code) !== norm(again)) { console.error('兩次不一樣，沒有更改。'); process.exit(1); }
  if (norm(code).length < 8) { console.error('通行碼至少 8 個字。'); process.exit(1); }
}
fs.writeFileSync(OUT, JSON.stringify(gateFor(code), null, 1) + '\n');
console.log('已更新 src/gate.json（只有雜湊）。開 PR 合併後網站就會換成新通行碼。');
