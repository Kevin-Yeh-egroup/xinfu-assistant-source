# 創業貸款準備助手（信扶專案）

陪引導員和小老闆準備創業貸款審查資料的網頁工具，這裡是它的原始碼。

- 引導員版：https://xinfu-assistant.vercel.app
- 審查人員版：https://xinfu-assistant.vercel.app/review （第一次使用要輸入審查通行碼）

推上 `main` 後，Vercel 會自動建置並更新網站（約 1 分鐘）。每個 PR 也會有自己的預覽網址，方便驗收。

## 這個工具怎麼運作

- **兩個版本、同一份程式**：建置時依版本放進不同設定。審查人員版要先輸入通行碼開通。
- **單一 HTML 檔**：頁面、樣式、程式、內容、Word/Excel 範本都包在一個檔案裡，可以放上網站，也可以直接用檔案打開（離線版）。
- **資料只在使用者的瀏覽器**：存在 localStorage，網站不收任何資料；頁面用 CSP 禁止連到任何外部網址。
- **產生 Word 計畫書與 Excel 附件**：在瀏覽器裡把填寫內容套進官方範本，直接下載。

## 資料夾

| 位置 | 內容 |
|---|---|
| `src/shell.html` | 頁面骨架（建置時把樣式、程式、內容填進來） |
| `src/app.css` | 所有樣式 |
| `src/app.js` | 共用功能與引導員版：繳交資料、需修改事項、檢核工具、待辦、維護內容 |
| `src/plan.js`、`src/planmodel.js` | 計畫書與附件：9 段填寫、核對規則、資料結構 |
| `src/docgen.js` | 產生 Word（docx）和 Excel（xlsx） |
| `src/review.js` | 審查人員版：通行碼、AI 初審、需修改清單往返、AI 審核注意事項 |
| `src/tour.js`、`src/boot.js` | 歡迎頁、操作導覽、啟動 |
| `src/content.json` | 清單、完成條件、作業說明、AI 審核注意事項等文字內容 |
| `src/tpl/` | Word / Excel 範本（由官方範本轉出，見 `templates/README.md`） |
| `src/images/` | 作業說明裡的圖片 |
| `src/gate.json` | 審查通行碼的雜湊（不是通行碼本身） |
| `scripts/` | 建置、本機預覽、測試、匯入內容、換通行碼 |
| `testdata/` | 測試資料（全部虛構） |
| `video/`、`videos/` | 教學影片的製作流程，以及網站上的兩支影片 |

## 開始

需要 [Node.js](https://nodejs.org/) 20 以上（建議 22）。

```bash
npm install                        # 只有測試用的 Playwright
npx playwright install chromium    # 測試用的瀏覽器

npm run build    # 產生 dist/（兩個單檔離線版）和 site/（網站）
npm run serve    # 在 http://127.0.0.1:8765 看網站版（/review 是審查人員版）
npm test         # 用測試通行碼另外建置一份，跑全部端對端測試
```

## 修改流程

1. 從 `main` 開新分支，改好後 `npm test` 要全部通過。
2. 開 PR，**照 PR 範本附上改動畫面的截圖或錄影**（驗收時用）。
3. Vercel 會在 PR 留下預覽網址；驗收後合併到 `main`，網站就更新。

## 常見修改

- **改文字、完成條件、作業說明、AI 審核注意事項**：直接改 `src/content.json`；或由審查人員在網站的「維護內容」修改並匯出 HTML，再執行
  `npm run import-content -- 匯出的檔案.html` 轉回原始碼。
- **改畫面或功能**：`src/` 裡的 CSS、JS。沒有框架，也不要加外部套件。
- **換 Word / Excel 範本**：見 `templates/README.md`。
- **換審查通行碼**：`npm run set-code`（只存雜湊）；或審查人員在「維護內容」換好後匯出，用 `import-content` 匯入。
- **重錄教學影片**：見 `video/README.md`。

## 一定要守住

- **不連網**：不載入外部字型、程式、圖片，也不送出任何資料。
- **個資**：身分證字號、銀行帳號不存進瀏覽器；測試、截圖、影片只用虛構資料。
- **通行碼**：不寫進 repo、PR、Issue 或聊天紀錄；repo 只放雜湊。審查人員版的內容技術上看得到原始碼，AI 審核注意事項不要寫機密或個資。
- **使用者的資料不能不見**：不要改 localStorage 的名稱；資料結構要改，就寫轉換程式並加測試。
- **寫給第一線社工看**：白話、繁體中文、不用資訊術語；手機上不能整頁左右捲動；鍵盤也能操作。

更細的規則寫在 [AGENTS.md](AGENTS.md)（給夥伴和 AI 工具）。
