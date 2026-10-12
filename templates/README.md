# Word / Excel 範本

產生計畫書和附件用的範本放在 `src/tpl/`：

| 檔案 | 用途 |
|---|---|
| `plan.docx` | 信扶專案創業計畫書（簡版 104.05.01），欄位換成填寫記號 |
| `attach-first.xlsx` | 首次動撥附件：債務現況盤點表、營運結構數字計算、營運財務預估分析表、資金需求及設備購買表 |
| `attach-later.xlsx` | 第 2～5 次動撥附件：債務現況盤點表、營運結構數字計算 |
| `meta.json` | 空白欄位的預設值、表格列數、Excel 範例列 |

這些檔案是從官方範本轉出來的。**官方範本原始檔不放在 repo**（附件範本裡有範例資料），需要更新時向專案負責人索取。

## 換成新版官方範本

1. 把官方檔案放到（這兩個資料夾已列在 .gitignore，不會被提交）：
   - `templates/src/plan.doc`：信扶專案創業計畫書
   - `templates/src/attach.xls`：創業計畫書附件範本
2. 用 LibreOffice 轉檔：
   ```bash
   soffice --headless --convert-to docx --outdir templates/conv templates/src/plan.doc
   soffice --headless --convert-to xlsx --outdir templates/conv templates/src/attach.xls
   ```
3. 安裝 Python 套件並產生範本：
   ```bash
   pip install lxml openpyxl xlrd
   python3 scripts/build_templates.py
   ```
4. 檢查：`npm test`、`npm run samples`，再用 Word 和 Excel 打開 `.test-output/範例輸出/` 的檔案確認版面。

官方範本的欄位位置改了的話，`scripts/build_templates.py`、`scripts/build_xlsx_templates.py` 和 `src/plan.js` 的對應也要一起改。
