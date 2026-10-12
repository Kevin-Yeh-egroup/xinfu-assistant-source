#!/usr/bin/env node
// npm test：用「測試通行碼」建置一份到 .test-output/build/，再跑兩組端對端測試。
// 不會用到真正的審查通行碼，也不會改動 src/ 或 testdata/。
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.test-output');
const BUILD = path.join(OUT, 'build');
const env = {
  ...process.env,
  REVIEWER_CODE: process.env.REVIEWER_CODE || 'TEST-CODE-2468',
  DIST: path.join(BUILD, 'dist'),
  TEST_OUT: OUT,
  LANG: 'C.UTF-8',
  LC_ALL: 'C.UTF-8',
};
const run = (label, args) => {
  console.log(`\n=== ${label} ===`);
  return spawnSync(process.execPath, args, { cwd: ROOT, env, stdio: 'inherit' }).status;
};

if (run('建置（測試通行碼）', ['scripts/build.mjs', '--out', BUILD, '--dist-only']) !== 0) process.exit(1);
const only = process.argv.slice(2);
const suites = [['基本功能、審查人員版', 'scripts/test.js'], ['計畫書與附件', 'scripts/test_plan.js']]
  .filter(([, f]) => !only.length || only.some(o => f.includes(o)));
const failed = suites.filter(([label, file]) => run(label, [file]) !== 0).map(([label]) => label);
console.log(failed.length ? `\n✗ 沒通過：${failed.join('、')}（畫面截圖在 .test-output/）` : '\n✓ 全部測試通過');
process.exit(failed.length ? 1 : 0);
