#!/usr/bin/env node
// npm run preview：改完之後看畫面用。
// 用「測試通行碼」另外建置一份到 .test-output/preview/，在 http://127.0.0.1:8765 打開
// （8765 被佔用時自動換下一個號碼）。src/ 有變動會自動重新建置，重新整理網頁就看得到。
// 不會用到真正的審查通行碼；看審查人員版（/review）時，輸入下面印出的測試通行碼。
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.test-output', 'preview');
const CODE = process.env.REVIEWER_CODE || 'TEST-CODE-2468';

const build = () => spawnSync(process.execPath, ['scripts/build.mjs', '--out', OUT],
  { cwd: ROOT, stdio: 'inherit', env: { ...process.env, REVIEWER_CODE: CODE } }).status === 0;
if (!build()) process.exit(1);

// 找一個沒被佔用的號碼（舊的預覽還開著時，不會看到舊畫面）
const free = port => new Promise(res => {
  const s = net.createServer().once('error', () => res(false)).once('listening', () => s.close(() => res(true)));
  s.listen(port, '127.0.0.1');
});
let port = Number(process.env.PORT || 8765);
for (let i = 0; i < 20 && !(await free(port)); i++) port++;

console.log(`\n本機預覽（只有這台電腦看得到）：
  引導員版　　http://127.0.0.1:${port}
  審查人員版　http://127.0.0.1:${port}/review　（測試通行碼：${CODE}）
改了 src/ 會自動重新建置，重新整理網頁就好。看完按 Ctrl＋C 關閉。\n`);

const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)],
  { cwd: ROOT, stdio: 'inherit', env: { ...process.env, SITE_DIR: path.join(OUT, 'site'), QUIET: '1' } });
server.on('exit', code => process.exit(code ?? 0));

let timer = null;
try {
  fs.watch(path.join(ROOT, 'src'), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log('\n偵測到修改，重新建置……');
      console.log(build() ? '完成：重新整理網頁就看得到。\n' : '建置失敗：網頁維持上一版，請看上面的訊息。\n');
    }, 400);
  });
} catch {
  console.log('（這台電腦不能自動重新建置：改完請重新執行 npm run preview）');
}
