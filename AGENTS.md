# 給夥伴與 AI 工具的工作守則

這份是改這個 repo 的人（包含 Codex、Claude Code 等 AI 工具）要遵守的規則。說明以繁體中文為主。

## 這是什麼

信扶專案「創業貸款準備助手」：給第一線社工（引導員）和審查人員用的單頁網頁工具。

- 引導員版：照清單準備審查資料、產生計畫書（Word）與附件（Excel）、送件前自我檢查、處理審查人員的修改意見。
- 審查人員版（`/review`）：輸入通行碼開通後，讓 AI 先看一遍、逐項決定、把需修改清單傳回引導員、確認修改；也能維護內容。
- 正式網站：https://xinfu-assistant.vercel.app ，Vercel 從這個 repo 的 `main` 自動部署。

## 指令

```bash
npm run build     # src/ → dist/（兩個單檔離線版）＋ site/（網站）；不需要安裝套件
npm run serve     # 本機看網站版 http://127.0.0.1:8765 、/review
npm test          # 用測試通行碼建置到 .test-output/，跑 scripts/test.js 和 scripts/test_plan.js
npm test -- plan  # 只跑名稱含 plan 的測試檔
npm run shots     # 用虛構資料產生畫面截圖到 .test-output/（PR 附圖用）
npm run samples   # 用虛構個案產生範例 Word / Excel 到 .test-output/範例輸出/
```

第一次要先 `npm install` 和 `npx playwright install chromium`。

## 架構

- 建置（`scripts/build.mjs`）把 `src/shell.html` 裡的記號換成內容：`/*__CSS__*/`（app.css）、`/*__JS__*/`（依序串接 planmodel、app、docgen、plan、review、tour、boot）、`__CONTENT_JSON__`（content.json，審查人員版另外加上 gate.json）、`__TPL_JSON__`（src/tpl 的範本，壓縮成 base64）。
- 版本：`<html data-edition>` 是 `guide` 或 `reviewer`；程式裡用 `RV` 判斷。用網址打開時 `WEB` 為真，畫面文字會改成網頁版說法。
- 畫面：`render()` 依網址的 `#/頁面/參數` 產生整頁 HTML；按鈕用 `data-act="動作名"`，在 `ACT` 物件裡處理；輸入框用 `data-bind`。需要保留焦點的元素加 `data-fk`。
- 狀態：`state` 存在 localStorage。引導員版 `startup-loan-local-v3`、審查人員版 `startup-loan-review-v1`、內容覆寫 `startup-loan-content-v1`、審查開通 `startup-loan-review-activation`、舊版 `startup-loan-local-v1`。
- 內容：`src/content.json` 的 `items`（每份資料：名稱、作業說明、完成條件 criteria）、`modes`（首次動撥／第 2～5 次動撥的流程與清單）、`review`（AI 審核注意事項）。網站上的「維護內容」會把修改存在瀏覽器，匯出時寫進新的 HTML。
- 計畫書與附件：`plan.js` 定義 9 段欄位、核對規則和自動勾選；`docgen.js` 在瀏覽器裡組 docx/xlsx（範本記號 `{{f:}}` 文字、`{{c:}}` 勾選框、`{{m:}}` 金額、`{{t:}}` 表格；列群組用 `.0.` / `.#.` 展開）。

## 必須遵守

1. **不連網**：不要加入 CDN、外部字型、分析工具、外部 API 或 `fetch`。`src/shell.html` 的 CSP（`default-src 'none'; connect-src 'none'`）不可放寬。
2. **個資**：身分證字號、銀行帳號只用在當次產生的檔案，不寫進 state、備份或 localStorage。測試、截圖、影片、範例只能用虛構資料，名字加「（示範）」或明顯虛構。
3. **通行碼**：真正的審查通行碼不能出現在 repo、commit、PR、Issue、log 裡。`src/gate.json` 只放 PBKDF2 雜湊；換通行碼用 `npm run set-code`。測試用 `npm test` 內建的測試通行碼。
4. **相容**：不要改 localStorage 的名稱或刪欄位。資料結構要變，寫轉換程式（參考 app.js 的 `normalize()`、`migrateOld()` 與 planmodel.js 的 `normPlan()`），並在測試加一個舊資料的案例。
5. **文字**：繁體中文、白話、寫給社工看；不要用資訊術語，也不要在畫面上說明 AI 或系統內部怎麼運作。按鈕寫清楚做什麼（例如「產生計畫書」）。
6. **品質**：手機寬度（390px）不能整頁左右捲動；鍵盤可以操作所有功能；顏色對比符合 WCAG AA。
7. **不提交產出物**：`dist/`、`site/`、`.test-output/`、`node_modules/`、`video/out/` 都在 .gitignore。網站上的影片放在 `videos/`（每支小於 25 MB）。
8. **測試**：`npm test` 要全部通過。新功能或修正都要在 `scripts/test.js` 或 `scripts/test_plan.js` 加測試（照現有的分段與 `check('代號 說明', 條件)` 寫法）。

## PR

- 一個 PR 做一件事，標題用中文寫清楚改了什麼。
- **一定要附上改動畫面的截圖或錄影**（PR 範本有欄位）。可以用 `npm run serve` 打開本機網站自己截，或用 `npm run shots`。
- 寫出測試結果（例如 `200/200、52/52 passed`）。
- 合併到 `main` 就會上線，請等驗收後再合併。

## 其他

- 換 Word / Excel 範本：`templates/README.md`。
- 重錄教學影片：`video/README.md`。
- `scripts/build_templates.py`、`scripts/build_xlsx_templates.py` 需要 Python 3、lxml、openpyxl、xlrd 和 LibreOffice，平常改功能用不到。
