# 教學影片製作

兩支影片（引導員篇、審查人員篇）都是程式「錄」出來的：真的打開網站、操作虛構個案、截下畫面，再配上鏡頭移動、字幕、轉場和配樂。網站上的成品放在 `videos/guide.mp4`、`videos/reviewer.mp4`。

## 需要

- Node.js、Playwright（`npm install`、`npx playwright install chromium`）
- 中文字型 Noto Sans CJK TC、Noto Serif CJK TC
- ffmpeg、LibreOffice（`soffice`）
- Python 3：numpy、scipy、Pillow

## 步驟

```bash
# 1. 用測試通行碼建置網站，開本機伺服器（另開一個終端機）
REVIEWER_CODE=TEST-CODE-2468 node scripts/build.mjs
npm run serve

# 2. 截畫面（虛構資料），產生「打開產生的檔案」那一幕
cd video
REVIEWER_CODE=TEST-CODE-2468 node capture.js
python3 docshot.py

# 3. 每支約 30 分鐘；--stills 可以先抽幾格檢查
node render.js guide --stills 10,60,120
node render.js guide
node render.js reviewer

# 4. 配樂、合成、壓縮成網站用的大小（小於 25 MB）
python3 music.py guide && python3 mux.py guide
bash compress.sh out/guide-hq.mp4 ../videos/guide.mp4
python3 music.py reviewer && python3 mux.py reviewer
bash compress.sh out/reviewer-hq.mp4 ../videos/reviewer.mp4
```

Windows 請在 PowerShell 用 `$env:REVIEWER_CODE="TEST-CODE-2468"` 設定環境變數。

## 改內容

- 劇本、字幕、每一幕的鏡頭：`story.js`（字幕太短會在 render 時提醒）
- 要截哪些畫面、用什麼示範資料：`capture.js`、`../scripts/demo-data.js`
- 片頭、章節、片尾等版面：`engine.js`、`stage.css`
- 每支控制在 3 分鐘內；畫面只能出現虛構資料
