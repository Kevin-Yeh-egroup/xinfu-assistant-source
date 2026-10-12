"""Make the "產生的檔案" screen for the guide video from the files the app really generated.
Reads video/tmp/docs/*.docx|*.xlsx (saved by capture.js), renders them with LibreOffice,
and composites one 2304x1440 image: Word 計畫書 page 1 on the left, two Excel sheets on the right.
Writes assets/g-pl-doc.png and adds its boxes to assets/manifest.json.
usage: python3 docshot.py"""
import glob, json, os, re, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(HERE, 'tmp', 'docs')
ASSETS = os.path.join(HERE, 'assets')
FC = os.environ.get('DOC_FONTCONF')  # fontconfig with 標楷體/新細明體 aliases
W, H = 2304, 1440
DPI = 220
F_REG = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
F_BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
font = lambda path, size: ImageFont.truetype(path, size, index=3)

docx = glob.glob(os.path.join(DOCS, '*.docx'))[0]
xlsx = glob.glob(os.path.join(DOCS, '*.xlsx'))[0]
work = tempfile.mkdtemp(prefix='docshot-')
env = dict(os.environ, LANG='C.UTF-8')
if FC:
    env['FONTCONFIG_FILE'] = FC
subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', work, docx, xlsx], check=True, env=env, capture_output=True)
pdf_w = os.path.join(work, os.path.splitext(os.path.basename(docx))[0] + '.pdf')
pdf_x = os.path.join(work, os.path.splitext(os.path.basename(xlsx))[0] + '.pdf')


def page(pdf, n):
    out = os.path.join(work, f'p{abs(hash(pdf)) % 9999}-{n}')
    subprocess.run(['pdftoppm', '-r', str(DPI), '-f', str(n), '-l', str(n), '-png', '-singlefile', pdf, out], check=True)
    return Image.open(out + '.png').convert('RGB')


def words(pdf, n):
    """[(text, x0, y0, x1, y1)] in points for page n."""
    xml = subprocess.run(['pdftotext', '-bbox', '-f', str(n), '-l', str(n), pdf, '-'], check=True, capture_output=True, text=True).stdout
    return [(m.group(5), float(m.group(1)), float(m.group(2)), float(m.group(3)), float(m.group(4)))
            for m in re.finditer(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)</word>', xml)]


def find(ws, text):
    for w in ws:
        if w[0] == text:
            return w
    for w in ws:
        if text in w[0]:
            return w
    raise SystemExit(f'text not found: {text}')


def content_box(im, pad=24):
    bg = Image.new('RGB', im.size, (255, 255, 255))
    diff = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > 18 else 0)
    x0, y0, x1, y1 = diff.getbbox()
    return max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)


def shadow_paste(canvas, im, x, y, radius=0, blur=26, offset=14, alpha=70):
    sh = Image.new('L', (im.width + blur * 4, im.height + blur * 4), 0)
    ImageDraw.Draw(sh).rounded_rectangle([blur * 2, blur * 2, blur * 2 + im.width, blur * 2 + im.height], radius=radius, fill=alpha)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    tint = Image.new('RGB', sh.size, (92, 62, 44))
    canvas.paste(tint, (x - blur * 2, y - blur * 2 + offset), sh)
    if radius:
        mask = Image.new('L', im.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=radius, fill=255)
        canvas.paste(im, (x, y), mask)
    else:
        canvas.paste(im, (x, y))


# ---------- background ----------
canvas = Image.new('RGB', (W, H))
top, bot = (241, 231, 221), (229, 216, 204)
for yy in range(H):
    u = yy / (H - 1)
    canvas.paste(tuple(int(top[i] + (bot[i] - top[i]) * u) for i in range(3)), (0, yy, W, yy + 1))
d = ImageDraw.Draw(canvas)
boxes = {}

def label(x, y, kind, color, name):
    """small file tag: [Word] filename"""
    fk, fn = font(F_BOLD, 26), font(F_REG, 27)
    tw = d.textlength(kind, font=fk)
    d.rounded_rectangle([x, y, x + tw + 30, y + 44], radius=10, fill=color)
    d.text((x + 15, y + 5), kind, font=fk, fill=(255, 255, 255))
    d.text((x + tw + 46, y + 4), name, font=fn, fill=(74, 50, 38))
    return [x, y, int(tw + 46 + d.textlength(name, font=fn)), 44]

# ---------- left: Word 計畫書 page 1 ----------
P_TOP = 124
w1 = page(pdf_w, 1)
ph = H - P_TOP - 58
pw = round(ph * w1.width / w1.height)
sx = pw / w1.width
wim = w1.resize((pw, ph), Image.LANCZOS)
WX = 96
boxes['wordLabel'] = label(WX, 54, 'Word', (61, 104, 166), os.path.basename(docx))
shadow_paste(canvas, wim, WX, P_TOP)
boxes['wordPage'] = [WX, P_TOP, pw, ph]
pt = lambda v: v * DPI / 72 * sx  # pdf points -> canvas px
ws = words(pdf_w, 1)
a = find(ws, '壹、'); b = find(ws, '貳、')
boxes['wordTop'] = [WX + 20, P_TOP + round(pt(a[2])) - 14, pw - 40, round(pt(b[2]) - pt(a[2])) + 4]
c = find(ws, '九、'); last = max(w[4] for w in ws if w[2] > c[2] - 2)
boxes['wordBep'] = [WX + 20, P_TOP + round(pt(c[2])) - 40, pw - 40, round(pt(last) - pt(c[2])) + 60]
boxes['wordBiz'] = [WX + 20, P_TOP + round(pt(b[2])) - 14, pw - 40, round(pt(last) - pt(b[2])) + 40]

# ---------- right: Excel 附件 (債務現況盤點表 + 營運財務預估分析表) ----------
RX = WX + pw + 92
RW = W - 96 - RX
boxes['xlsLabel'] = label(RX, 54, 'Excel', (47, 107, 61), os.path.basename(xlsx))
y = P_TOP
cards = []
for n, sheet, key in [(1, '債務現況盤點表', 'xlsDebt'), (3, '營運財務預估分析表', 'xlsFc')]:
    im = page(pdf_x, n)
    cb = content_box(im)
    crop = im.crop(cb)
    s = RW / crop.width
    ch = round(crop.height * s)
    cim = crop.resize((RW, ch), Image.LANCZOS)
    head = 50
    card = Image.new('RGB', (RW, ch + head), (255, 255, 255))
    cd = ImageDraw.Draw(card)
    cd.rectangle([0, 0, RW, head], fill=(244, 238, 232))
    cd.line([0, head - 1, RW, head - 1], fill=(226, 214, 202), width=2)
    tab = font(F_BOLD, 25)
    tw = cd.textlength(sheet, font=tab)
    cd.rounded_rectangle([16, 8, 16 + tw + 36, head + 6], radius=8, fill=(255, 255, 255), outline=(214, 200, 188), width=2)
    cd.rectangle([18, head - 4, 16 + tw + 34, head + 4], fill=(255, 255, 255))
    cd.text((34, 10), sheet, font=tab, fill=(47, 107, 61))
    card.paste(cim, (0, head))
    cards.append((card, key, n, cb, s, head))
total = sum(c[0].height for c in cards) + 40
if total > H - P_TOP - 58:  # scale both cards down to fit
    k = (H - P_TOP - 58 - 40) / (total - 40)
    cards = [(c.resize((round(c.width * k), round(c.height * k)), Image.LANCZOS), key, n, cb, s * k, round(head * k)) for c, key, n, cb, s, head in cards]
for card, key, n, cb, s, head in cards:
    shadow_paste(canvas, card, RX, y, radius=14)
    boxes[key] = [RX, y, card.width, card.height]
    ws = words(pdf_x, n)
    P = lambda v: v * DPI / 72
    if key == 'xlsDebt':
        r0 = find(ws, '債務人'); r1 = find(ws, '小計')
        boxes['debtRows'] = [RX + 8, y + head + round((P(r0[2]) - cb[1]) * s) - 6, card.width - 16, round((P(r1[4]) - P(r0[2])) * s) + 14]
        first = [w for w in ws if w[0].startswith('陳小美') or w[0].startswith('配偶')]
        if first:
            fy0 = min(w[2] for w in first); fy1 = max(w[4] for w in first)
            boxes['debtOrder'] = [RX + 8, y + head + round((P(fy0) - cb[1]) * s) - 10, round(card.width * 0.42), round((P(fy1) - P(fy0)) * s) + 20]
    else:
        r0 = find(ws, '盈餘')
        boxes['fcNet'] = [RX + 8, y + head + round((P(r0[2]) - cb[1]) * s) - 8, card.width - 16, round((P(r0[4]) - P(r0[2])) * s) + 16]
    y += card.height + 40

out = os.path.join(ASSETS, 'g-pl-doc.png')
canvas.save(out, optimize=True)
man_p = os.path.join(ASSETS, 'manifest.json')
man = json.load(open(man_p, encoding='utf8'))
man['shots']['g-pl-doc'] = {k: [int(round(v)) for v in b] for k, b in boxes.items()}
json.dump(man, open(man_p, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
print('wrote', out, json.dumps(man['shots']['g-pl-doc'], ensure_ascii=False))
