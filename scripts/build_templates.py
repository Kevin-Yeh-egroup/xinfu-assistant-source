"""Build fill-in templates from the official forms.

Input : templates/conv/plan.docx   (LibreOffice conversion of 信扶專案創業計畫書 104.05.01 .doc)
        templates/src/attach.xls    (02.創業計畫書附件-範本 110.01 .xls, original fonts)
        templates/conv/attach.xlsx  (conversion, used for formulas)
Output: src/tpl/plan.docx          placeholders {{f:key}} {{c:key}} {{m:key}}; row groups use .0. / .#.
        src/tpl/attach-first.xlsx  債務現況盤點表 / 營運結構數字計算 / 營運財務預估分析表 / 資金需求及設備購買表
        src/tpl/attach-later.xlsx  債務現況盤點表 / 營運結構數字計算
        src/tpl/meta.json          defaults for blanks, row groups, xlsx prototype rows
All zips are written STORED (no compression) so the browser can read them without an inflater.
"""
import copy, json, os, re, sys, zipfile
from lxml import etree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONV = os.path.join(ROOT, 'templates', 'conv')
SRC = os.path.join(ROOT, 'templates', 'src')
OUT = os.path.join(ROOT, 'src', 'tpl')
os.makedirs(OUT, exist_ok=True)
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS = {'w': W}
q = lambda t: '{%s}%s' % (W, t)
META = {'docx': {'defaults': {}, 'groups': {}, 'tables': {}}, 'xlsx': {}}
ANS = 22   # answers in 11 pt

# ---------------------------------------------------------------- docx helpers
def rtext(r):
    return ''.join(t.text or '' for t in r.findall('w:t', NS))

def runs(p):
    return [r for r in p.findall('w:r', NS)]

def mkrun(proto, text, underline=None):
    """New run copying proto's rPr (proto may be a run or a pPr/rPr element)."""
    r = etree.Element(q('r'))
    rpr = None
    if proto is not None:
        src = proto.find('w:rPr', NS) if etree.QName(proto).localname == 'r' else proto
        if src is not None:
            rpr = copy.deepcopy(src)
            rpr.tag = q('rPr')
    if rpr is None:
        rpr = etree.Element(q('rPr'))
    u = rpr.find('w:u', NS)
    if underline is True and u is None:
        u = etree.SubElement(rpr, q('u')); u.set(q('val'), 'single')
        # keep schema order: w:u must come before w:sz etc. -> move to a safe position
        order = ['rStyle', 'rFonts', 'b', 'bCs', 'i', 'iCs', 'caps', 'smallCaps', 'strike', 'dstrike', 'outline', 'shadow', 'emboss', 'imprint', 'noProof', 'snapToGrid', 'vanish', 'webHidden', 'color', 'spacing', 'w', 'kern', 'position', 'sz', 'szCs', 'highlight', 'u', 'effect', 'bdr', 'shd', 'fitText', 'vertAlign', 'rtl', 'cs', 'em', 'lang', 'eastAsianLayout', 'specVanish', 'oMath']
        kids = sorted(list(rpr), key=lambda e: order.index(etree.QName(e).localname) if etree.QName(e).localname in order else 99)
        for k in list(rpr): rpr.remove(k)
        for k in kids: rpr.append(k)
    elif underline is False and u is not None:
        rpr.remove(u)
    r.append(rpr)
    t = etree.SubElement(r, q('t'))
    t.text = text
    t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    return r

def token(kind, key, default=None):
    if default is not None:
        META['docx']['defaults'][key] = default
    return '{{%s:%s}}' % (kind, key)

def build_parts(proto, parts):
    """parts: str literal, or (kind, key, default, underline)"""
    out = []
    for part in parts:
        if isinstance(part, str):
            out.append(mkrun(proto, part))
        else:
            kind, key = part[0], part[1]
            default = part[2] if len(part) > 2 else None
            ul = part[3] if len(part) > 3 else None
            out.append(mkrun(proto, token(kind, key, default), ul))
    return out

def replace_runs(p, seq, parts, nth=0):
    """Find nth consecutive sequence of runs whose texts equal seq (list), replace with parts."""
    rs = runs(p)
    texts = [rtext(r) for r in rs]
    hits = [i for i in range(len(rs) - len(seq) + 1) if texts[i:i + len(seq)] == seq]
    if len(hits) <= nth:
        raise SystemExit('run sequence not found: %r in %r' % (seq, texts))
    i = hits[nth]
    proto = rs[i]
    new = build_parts(proto, parts)
    parent = proto.getparent()
    idx = parent.index(proto)
    for r in rs[i:i + len(seq)]:
        parent.remove(r)
    for k, n in enumerate(new):
        parent.insert(idx + k, n)

def ppr_rpr(p):
    ppr = p.find('w:pPr', NS)
    return ppr.find('w:rPr', NS) if ppr is not None else None

def set_size(r, half_points):
    rpr = r.find('w:rPr', NS)
    for tag in ('sz', 'szCs'):
        el = rpr.find('w:' + tag, NS)
        if el is None:
            el = etree.SubElement(rpr, q(tag))
        el.set(q('val'), str(half_points))
    order = ['rStyle', 'rFonts', 'b', 'bCs', 'i', 'iCs', 'caps', 'smallCaps', 'strike', 'dstrike', 'outline', 'shadow', 'emboss', 'imprint', 'noProof', 'snapToGrid', 'vanish', 'webHidden', 'color', 'spacing', 'w', 'kern', 'position', 'sz', 'szCs', 'highlight', 'u', 'effect', 'bdr', 'shd', 'fitText', 'vertAlign', 'rtl', 'cs', 'em', 'lang', 'eastAsianLayout', 'specVanish', 'oMath']
    kids = sorted(list(rpr), key=lambda e: order.index(etree.QName(e).localname) if etree.QName(e).localname in order else 99)
    for k in list(rpr): rpr.remove(k)
    for k in kids: rpr.append(k)

def set_jc(p, val):
    ppr = p.find('w:pPr', NS)
    if ppr is None:
        ppr = etree.Element(q('pPr')); p.insert(0, ppr)
    jc = ppr.find('w:jc', NS)
    if jc is None:
        jc = etree.SubElement(ppr, q('jc'))
        # w:jc sits before w:rPr inside w:pPr
        rp = ppr.find('w:rPr', NS)
        if rp is not None:
            ppr.remove(jc); ppr.insert(list(ppr).index(rp), jc)
    jc.set(q('val'), val)

def put(p, parts, clear_indent=False, left=False, size=None, align=None):
    """Append token runs to paragraph p (used for empty cells)."""
    proto = ppr_rpr(p)
    for r in runs(p):
        if not rtext(r):
            p.remove(r)
    for n in build_parts(proto, parts):
        if size:
            set_size(n, size)
        p.append(n)
    if clear_indent or left:
        ppr = p.find('w:pPr', NS)
        if ppr is not None:
            if clear_indent:
                ind = ppr.find('w:ind', NS)
                if ind is not None: ppr.remove(ind)
            if left:
                jc = ppr.find('w:jc', NS)
                if jc is not None: jc.set(q('val'), 'start')
    if align:
        set_jc(p, align)

def relax_spacing(p):
    """Exact line height cuts off multi-line text in some viewers; use 'atLeast'."""
    ppr = p.find('w:pPr', NS)
    if ppr is None: return
    sp = ppr.find('w:spacing', NS)
    if sp is not None and sp.get(q('lineRule')) == 'exact':
        sp.set(q('lineRule'), 'atLeast')


CORE_XML = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
            'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
            '<dc:title>信扶專案 創業計畫書</dc:title><dc:creator>信扶專案</dc:creator>'
            '<dcterms:created xsi:type="dcterms:W3CDTF">2026-10-09T00:00:00Z</dcterms:created>'
            '<dcterms:modified xsi:type="dcterms:W3CDTF">2026-10-09T00:00:00Z</dcterms:modified>'
            '</cp:coreProperties>')
APP_XML = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
           'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
           '<Application>創業貸款準備助手</Application></Properties>')

def compat_lr(s):
    """ISO start/end -> transitional left/right (identical for left-to-right text, also read by older Word)."""
    s = re.sub(r'(<w:(?:jc|tab) w:val=")start"', r'\1left"', s)
    s = re.sub(r'(<w:(?:jc|tab) w:val=")end"', r'\1right"', s)
    def inner(m):
        t = re.sub(r'<w:start(?=[\s/>])', '<w:left', m.group(0))
        return re.sub(r'<w:end(?=[\s/>])', '<w:right', t)
    s = re.sub(r'<w:(pBdr|tcBorders|tblBorders|tcMar|tblCellMar)>.*?</w:\1>', inner, s, flags=re.S)
    def ind(m):
        t = m.group(0)
        for a, b in [(' w:startChars=', ' w:leftChars='), (' w:endChars=', ' w:rightChars='), (' w:start=', ' w:left='), (' w:end=', ' w:right=')]:
            t = t.replace(a, b)
        return t
    return re.sub(r'<w:ind\b[^>]*>', ind, s)

def clean_fonts(s):
    """Undo LibreOffice conversion artefacts so Word picks the intended Taiwanese fonts."""
    for a, b in [('新細明體;PMingLiU', '新細明體'), ('Noto Serif CJK SC', '新細明體'), ('Noto Sans CJK SC', '新細明體'), ('Liberation Serif', 'Times New Roman'),
                 ('Liberation Sans', 'Arial'), ('w:cs="FreeSans"', 'w:cs="Times New Roman"'),
                 ('w:eastAsia="zh-CN"', 'w:eastAsia="zh-TW"'), ('<w:zoom w:percent="140"/>', '<w:zoom w:percent="100"/>')]:
        s = s.replace(a, b)
    return compat_lr(s)

# ---------------------------------------------------------------- docx edits
def build_docx():
    zin = zipfile.ZipFile(os.path.join(CONV, 'plan.docx'))
    doc = etree.fromstring(zin.read('word/document.xml'))
    body = doc.find('w:body', NS)
    T = body.findall('w:tbl', NS)
    P = [e for e in body if etree.QName(e).localname == 'p']
    def cell(ti, ri, ci):
        return T[ti].findall('w:tr', NS)[ri].findall('w:tc', NS)[ci]
    def para(ti, ri, ci, pi=0):
        return cell(ti, ri, ci).findall('w:p', NS)[pi]
    sp = lambda n: ' ' * n

    # 申請日期:民國 年 月 日 (header paragraph 2)
    hp = [p for p in P if '申請日期' in ''.join(t.text or '' for t in p.iter(q('t')))][0]
    replace_runs(hp, ['民國   年    月', '    ', '日'], ['民國', ('f', 'ad.y', sp(3)), '年', ('f', 'ad.m', sp(4)), '月', ('f', 'ad.d', sp(4)), '日'])

    # 壹 table 1
    put(para(0, 0, 1), [('f', 'p.name', '')])
    replace_runs(para(0, 0, 3), ['  ', '年', '    ', '月', '    ', '日'], [('f', 'p.birth.y', sp(2)), '年', ('f', 'p.birth.m', sp(4)), '月', ('f', 'p.birth.d', sp(4)), '日'])
    put(para(0, 1, 1), [('f', 'p.idno', '')])
    put(para(0, 1, 3), [('f', 'p.phone', '')])
    put(para(0, 1, 5), [('f', 'p.mobile', '')])
    put(para(0, 2, 3), [('f', 'p.email', '')])
    put(para(0, 2, 5), [('f', 'p.fax', '')])
    put(para(0, 3, 1), [('f', 'p.emName', '')])
    put(para(0, 3, 3), [('f', 'p.emRel', '')])
    put(para(0, 3, 5), [('f', 'p.emPhone', '')])

    # 貳 table 2
    c = cell(1, 0, 1); ps = c.findall('w:p', NS)
    replace_runs(ps[0], ['（一）公司名稱：', sp(14)], ['（一）公司名稱：', ('f', 'biz.name', sp(14), True)])
    replace_runs(ps[2], ['      ', '□', '已辦理；設立日期：   ', '年    月   日'], ['      ', ('c', 'biz.reg.done'), '已辦理；設立日期：', ('f', 'biz.setup.y', sp(3)), '年', ('f', 'biz.setup.m', sp(4)), '月', ('f', 'biz.setup.d', sp(3)), '日'])
    replace_runs(ps[3], ['      □', '商業登記證或核准設立登記，統一編號：', sp(20)], ['      ', ('c', 'biz.kind.commerce'), '商業登記證或核准設立登記，統一編號：', ('f', 'biz.regNo', sp(20), True)])
    replace_runs(ps[4], ['及核准設立文號', sp(42)], ['及核准設立文號', ('f', 'biz.regDoc', sp(42), True)])
    replace_runs(ps[5], ['      □', '免商業登記，辦有稅籍者統一編號：', '_______________'], ['      ', ('c', 'biz.kind.exempt'), '免商業登記，辦有稅籍者統一編號：', ('f', 'biz.taxNo', sp(15), True)])
    replace_runs(ps[6], ['□', '籌備中；尚未辦理相關登記；'], [('c', 'biz.reg.prep'), '籌備中；尚未辦理相關登記；'])
    replace_runs(ps[6], ['    /    /    '], [('f', 'biz.regPlan', '    /    /    ', True)])
    p = para(1, 1, 1)
    for i, name in [(1, '自營作業'), (2, '加盟'), (3, '公司'), (4, '行號'), (5, '其他')]:
        replace_runs(p, [str(i), '□', name], [str(i), ('c', 'biz.type.%d' % i), name])
    replace_runs(p, ['_________'], [('f', 'biz.typeOther', sp(9), True)])
    for ri, k in [(2, 'company'), (3, 'factory'), (4, 'other')]:
        replace_runs(para(1, ri, 2), ['□□□'], [('f', 'biz.addr.%s.zip' % k, '□□□'), ('f', 'biz.addr.%s.text' % k, '')])
        replace_runs(para(1, ri, 4), ['（', ' ', '）'], ['（', ('f', 'biz.addr.%s.area' % k, ' '), '）', ('f', 'biz.addr.%s.tel' % k, '')])
    put(para(1, 5, 1), [('m', 'biz.product', '')], True, True, size=ANS)
    replace_runs(para(1, 5, 3), ['人'], [('f', 'biz.staff', ''), '人'])
    for ri, k in [(6, 'biz.feature'), (7, 'biz.customer'), (8, 'biz.sales'), (10, 'biz.focus')]:
        pp = para(1, ri, 1); put(pp, [('m', k, '')], True, True, size=ANS); relax_spacing(pp)
    # 九 損益平衡: computed text goes in a new paragraph before the formula hint
    c9 = cell(1, 9, 1); hint = c9.findall('w:p', NS)[0]
    newp = copy.deepcopy(hint)
    for r in runs(newp): newp.remove(r)
    c9.insert(c9.index(hint), newp)
    put(newp, [('m', 'calc.bep', '')], True, True, size=ANS); relax_spacing(newp)
    hppr = hint.find('w:pPr', NS)          # hint: right aligned under the numbers, no big first-line indent
    hind = hppr.find('w:ind', NS) if hppr is not None else None
    if hind is not None: hppr.remove(hind)
    set_jc(hint, 'end')
    # 十一 預估: the first paragraph is empty; the hint stays below it
    c11 = cell(1, 11, 1); ps = c11.findall('w:p', NS)
    assert not ''.join(t.text or '' for t in ps[0].iter(q('t'))).strip()
    put(ps[0], [('t', 'calc.forecast', '')], True, True, size=ANS); relax_spacing(ps[0])
    w = c11.find('w:tcPr/w:tcW', NS)
    META['docx']['tables'] = {'calc.forecast': int(w.get(q('w'))) - 220}

    # 參 table 3
    for ri, k in [(1, 'purpose'), (3, 'advantage')]:
        pp = cell(2, ri, 0).findall('w:p', NS)[0]; put(pp, [('m', k, '')], True, True, size=ANS); relax_spacing(pp)
    ps = cell(2, 5, 0).findall('w:p', NS)
    replace_runs(ps[0], ['創業至今資金總計投入：共', sp(15)], ['創業至今資金總計投入：共', ('f', 'inv.total', sp(15), True)])
    replace_runs(ps[1], ['1.', '□', '自備金額', sp(15)], ['1.', ('c', 'inv.self.on'), '自備金額', ('f', 'inv.self', sp(15), True)])
    replace_runs(ps[1], ['2.', '□', '標會', '金額', '_____', '____', '___________'], ['2.', ('c', 'inv.rosca.on'), '標會', '金額', ('f', 'inv.rosca', sp(20), True)])
    replace_runs(ps[2], ['3.', '□', '親友借款', '金額', sp(10), ' '], ['3.', ('c', 'inv.family.on'), '親友借款', '金額', ('f', 'inv.family', sp(11), True)])
    replace_runs(ps[2], ['4.', '□', '銀行貸款', '金額', '________________'], ['4.', ('c', 'inv.bank.on'), '銀行貸款', '金額', ('f', 'inv.bank', sp(16), True)])
    replace_runs(ps[3], ['5.', '□', '其他', '____________', '；', '金額', '_______', '_', '_________'], ['5.', ('c', 'inv.other.on'), '其他', ('f', 'inv.otherName', sp(12), True), '；', '金額', ('f', 'inv.other', sp(17), True)])
    replace_runs(ps[5], ['□', '無  ', '□', '有（有貸款者，請詳填以下資料）'], [('c', 'loans.none'), '無  ', ('c', 'loans.has'), '有（有貸款者，請詳填以下資料）'])
    replace_runs(ps[6], ['□', '不動產', '(', '房屋', ')', '貸款，金額', sp(10), '元，月還', '__________'], [('c', 'ln.house.on'), '不動產', '(', '房屋', ')', '貸款，金額', ('f', 'ln.house.amt', sp(10), True), '元，月還', ('f', 'ln.house.pay', sp(10), True)])
    replace_runs(ps[7], ['□', '動產', '(', '汽機車', ')', '貸款，金額', sp(10), '元，月還', '__________'], [('c', 'ln.car.on'), '動產', '(', '汽機車', ')', '貸款，金額', ('f', 'ln.car.amt', sp(10), True), '元，月還', ('f', 'ln.car.pay', sp(10), True)])
    for pi, k, label, a, b in [(8, 'cashcard', '現金卡貸款，金額', '___________', '__________'), (9, 'credit', '一般信用貸款，金額', '___________', '__________'), (11, 'card', '信用卡，金額', '_________', '___________')]:
        replace_runs(ps[pi], ['□', label, a, '元，用途', b, '，月還', '__________'], [('c', 'ln.%s.on' % k), label, ('f', 'ln.%s.amt' % k, sp(len(a)), True), '元，用途', ('f', 'ln.%s.use' % k, sp(len(b)), True), '，月還', ('f', 'ln.%s.pay' % k, sp(10), True)])
    replace_runs(ps[10], ['                □', '勞工紓困貸款，金額', '___________', '元，用途', '__________', '，月還', '__________'], ['                ', ('c', 'ln.labor.on'), '勞工紓困貸款，金額', ('f', 'ln.labor.amt', sp(11), True), '元，用途', ('f', 'ln.labor.use', sp(10), True), '，月還', ('f', 'ln.labor.pay', sp(10), True)])
    replace_runs(ps[12], ['□', '其他', sp(8), '，金額', '___________', '元，用途', '__________', '，月還', '__________'], [('c', 'ln.other.on'), '其他', ('f', 'ln.other.name', sp(8), True), '，金額', ('f', 'ln.other.amt', sp(11), True), '元，用途', ('f', 'ln.other.use', sp(10), True), '，月還', ('f', 'ln.other.pay', sp(10), True)])

    # 參四 / 肆 table 4 : row groups (first row index 0, continuation row '#')
    tbl = T[3]
    rows = tbl.findall('w:tr', NS)
    def rowcells(tr): return tr.findall('w:tc', NS)
    def fill_owned(tr, n):
        cs = rowcells(tr)
        for ci, f, al in [(1, 'item', 'start'), (2, 'price', 'end'), (3, 'qty', 'center'), (4, 'amt', 'end')]:
            put(cs[ci].findall('w:p', NS)[0], [('f', 'own.%s.%s' % (n, f), '')], align=al)
        ps2 = cs[5].findall('w:p', NS)
        replace_runs(ps2[0], ['□', '已付清'], [('c', 'own.%s.paid' % n), '已付清'])
        replace_runs(ps2[1], ['□', '分期付款；未繳清金額：', sp(15)], [('c', 'own.%s.inst' % n), '分期付款；未繳清金額：', ('f', 'own.%s.unpaid' % n, sp(15), True)])
    def fill_buy(tr, n):
        cs = rowcells(tr)
        for ci, f, al in [(2, 'item', 'start'), (3, 'price', 'end'), (4, 'qty', 'center'), (5, 'amt', 'end')]:
            put(cs[ci].findall('w:p', NS)[0], [('f', 'buy.%s.%s' % (n, f), '')], align=al)
        ps2 = cs[6].findall('w:p', NS)
        replace_runs(ps2[0], ['□', '一次付清'], [('c', 'buy.%s.once' % n), '一次付清'])
        replace_runs(ps2[1], ['□', '分期付款', sp(3), '期；每期應繳金額：', sp(11)], [('c', 'buy.%s.inst' % n), '分期付款', ('f', 'buy.%s.periods' % n, sp(3), True), '期；每期應繳金額：', ('f', 'buy.%s.perPay' % n, sp(11), True)])
    def fill_funds(tr, n):
        cs = rowcells(tr)
        for ci, f, al in [(2, 'item', 'start'), (3, 'price', 'end'), (4, 'qty', 'center'), (5, 'when', 'center'), (6, 'amt', 'end'), (7, 'note', 'start')]:
            put(cs[ci].findall('w:p', NS)[0], [('f', 'funds.%s.%s' % (n, f), '')], align=al)
    def fill_work(tr, n):
        cs = rowcells(tr)
        for ci, f, al in [(2, 'item', 'start'), (3, 'monthly', 'end'), (4, 'qty', 'center'), (5, 'months', 'center'), (6, 'amt', 'end'), (7, 'note', 'start')]:
            put(cs[ci].findall('w:p', NS)[0], [('f', 'work.%s.%s' % (n, f), '')], align=al)
    # totals
    put(rowcells(rows[10])[2].findall('w:p', NS)[0], [('f', 'own.total', '')])
    replace_runs(rowcells(rows[10])[4].findall('w:p', NS)[0], ['$'], ['$', ('f', 'own.unpaidTotal', '')])
    put(rowcells(rows[16])[3].findall('w:p', NS)[0], [('f', 'buy.total', '')])
    for ri, k in [(22, 'funds.total'), (30, 'work.total'), (31, 'need.total')]:
        replace_runs(rowcells(rows[ri])[2].findall('w:p', NS)[0], ['$'], ['$', ('f', k, '')])
    # groups: keep first + one continuation row, drop the rest
    groups = [('own', 2, 9, fill_owned, 8), ('buy', 13, 15, fill_buy, 3), ('funds', 19, 21, fill_funds, 3), ('work', 26, 29, fill_work, 4)]
    for name, a, b, fn, minrows in groups:
        fn(rows[a], '0'); fn(rows[a + 1], '#')
        for tr in rows[a + 2:b + 1]:
            tbl.remove(tr)
        META['docx']['groups'][name] = {'min': minrows}

    # 伍 table 5
    ps = cell(4, 0, 0).findall('w:p', NS)
    replace_runs(ps[0], ['__', sp(8), '_'], [('f', 'loan.amount', sp(11), True)])
    replace_runs(ps[0], [sp(2), ' ', '_'], [('f', 'loan.years', sp(4), True)])
    ps2 = cell(4, 0, 1).findall('w:p', NS)
    replace_runs(ps2[0], ['□', '擬申請寬限期一年'], [('c', 'loan.grace'), '擬申請寬限期一年'])
    replace_runs(ps2[1], ['□', '不申請寬限期'], [('c', 'loan.nograce'), '不申請寬限期'])
    replace_runs(cell(4, 1, 0).findall('w:p', NS)[0], [sp(10)], [('f', 'loan.monthly', sp(10), True)])
    replace_runs(cell(4, 2, 0).findall('w:p', NS)[0], ['□', ' ', '擬撥入之中國信託商業銀行／帳號', '  ', '□'], [('c', 'loan.ctbc'), ' ', '擬撥入之中國信託商業銀行／帳號', '  ', ('c', 'loan.newacct')])
    ps = cell(4, 3, 0).findall('w:p', NS)
    replace_runs(ps[0], ['__________', '銀行', '_________'], [('f', 'loan.bank', sp(10), True), '銀行', ('f', 'loan.branch', sp(9), True)])
    replace_runs(ps[1], ['□□□□□□□□□□□□□□□□□'], [('f', 'loan.account', '□□□□□□□□□□□□□□□□□')])

    # 陸 table 6
    replace_runs(cell(5, 1, 0).findall('w:p', NS)[0], ['□', '非常高□高', ' ', '□一般', ' ', '□低', ' ', '□非常低'], [('c', 'coach.ops.5'), '非常高', ('c', 'coach.ops.4'), '高', ' ', ('c', 'coach.ops.3'), '一般', ' ', ('c', 'coach.ops.2'), '低', ' ', ('c', 'coach.ops.1'), '非常低'])
    replace_runs(cell(5, 3, 0).findall('w:p', NS)[0], ['□', '非常高', ' ', '□高', ' ', '□一般', ' ', '□低', ' ', '□非常低'], [('c', 'coach.tech.5'), '非常高', ' ', ('c', 'coach.tech.4'), '高', ' ', ('c', 'coach.tech.3'), '一般', ' ', ('c', 'coach.tech.2'), '低', ' ', ('c', 'coach.tech.1'), '非常低'])

    xml = etree.tostring(doc, xml_declaration=True, encoding='UTF-8', standalone=True)
    # sanity: every token is alone in its <w:t>
    s = xml.decode('utf8')
    toks = re.findall(r'\{\{[fcmt]:[^}]+\}\}', s)
    alone = re.findall(r'<w:t[^>]*>\{\{[fcmt]:[^}]+\}\}</w:t>', s)
    assert len(toks) == len(alone), (len(toks), len(alone))
    out = os.path.join(OUT, 'plan.docx')
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_STORED) as z:
        for info in zin.infolist():
            name = info.filename
            data = xml if name == 'word/document.xml' else zin.read(name)
            if name == 'docProps/core.xml':
                data = CORE_XML.encode('utf8')
            elif name == 'docProps/app.xml':
                data = APP_XML.encode('utf8')
            elif name.endswith('.xml'):
                data = clean_fonts(data.decode('utf8')).encode('utf8')
            z.writestr(zipfile.ZipInfo(name, date_time=(2026, 10, 9, 0, 0, 0)), data)
    print('plan.docx', len(toks), 'tokens,', os.path.getsize(out), 'bytes')

if __name__ == '__main__':
    build_docx()
    if '--docx-only' not in sys.argv:
        import build_xlsx_templates as bx
        META['xlsx'] = bx.build(OUT)
    json.dump(META, open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('meta.json written')
