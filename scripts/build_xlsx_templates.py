"""Excel templates for 創業計畫書附件.

債務現況盤點表、營運結構數字計算: rebuilt cell by cell from the official 110.01 .xls
(fonts, borders, fills, number formats, merges, widths, heights; formulas from the
LibreOffice conversion). Data cells get wrap text so long entries stay readable.
營運財務預估分析表、資金需求及設備購買表: no official sheet in the template we were
given, so they are laid out from the fields of the plan (計畫書 貳十一、參四、肆) in the
same visual language. Returns the cell map the browser fills in (meta['xlsx']).
"""
import os, re, zipfile
import xlrd, openpyxl
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.properties import PageSetupProperties

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLS = os.path.join(ROOT, 'templates', 'src', 'attach.xls')
CONV = os.path.join(ROOT, 'templates', 'conv', 'attach.xlsx')
LINE = {1: 'thin', 2: 'medium', 3: 'dashed', 4: 'dotted', 5: 'thick', 6: 'double', 7: 'hair', 8: 'mediumDashed',
        9: 'dashDot', 10: 'mediumDashDot', 11: 'dashDotDot', 12: 'mediumDashDotDot', 13: 'slantDashDot'}
HOR = {0: 'general', 1: 'left', 2: 'center', 3: 'right', 4: 'fill', 5: 'justify', 6: 'centerContinuous', 7: 'distributed'}
VER = {0: 'top', 1: 'center', 2: 'bottom', 3: 'justify', 4: 'distributed'}
BODY = '新細明體'
thin, medium = Side(style='thin'), Side(style='medium')


def rgb(book, idx):
    c = book.colour_map.get(idx)
    return None if c is None else '%02X%02X%02X' % c


def copy_sheet(book, conv_wb, name, ws, data_rows=(), data_cols=(), fmt_override=None):
    """Recreate an .xls sheet in openpyxl: values (text only), styles, merges, sizes, formulas."""
    sh = book.sheet_by_name(name)
    cws = conv_wb[name]
    for c, info in sh.colinfo_map.items():
        if c < 12:
            ws.column_dimensions[get_column_letter(c + 1)].width = round(info.width / 256, 2)
    for r, info in sh.rowinfo_map.items():
        if r < sh.nrows:
            ws.row_dimensions[r + 1].height = info.height / 20
    for r in range(sh.nrows):
        for c in range(min(sh.ncols, 12)):
            cell = sh.cell(r, c)
            xf = book.xf_list[cell.xf_index]
            f = book.font_list[xf.font_index]
            out = ws.cell(row=r + 1, column=c + 1)
            col = rgb(book, f.colour_index)
            out.font = Font(name=f.name if f.name != 'PMingLiU' else BODY, size=f.height / 20, bold=bool(f.bold), italic=bool(f.italic),
                            color=('FF' + col) if col and col != '000000' else None)
            wrap = bool(xf.alignment.text_wrapped) or (r in data_rows and c in data_cols)
            out.alignment = Alignment(horizontal=HOR.get(xf.alignment.hor_align, 'general'), vertical=VER.get(xf.alignment.vert_align, 'center'), wrap_text=wrap)
            b = xf.border
            side = lambda s: Side(style=LINE[s]) if s in LINE else Side()
            out.border = Border(left=side(b.left_line_style), right=side(b.right_line_style), top=side(b.top_line_style), bottom=side(b.bottom_line_style))
            if xf.background.fill_pattern == 1:
                bg = rgb(book, xf.background.pattern_colour_index)
                if bg:
                    out.fill = PatternFill('solid', fgColor='FF' + bg)
            fmt = book.format_map[xf.format_key].format_str
            if fmt_override and (r, c) in fmt_override:
                fmt = fmt_override[(r, c)]
            out.number_format = fmt
            conv = cws.cell(row=r + 1, column=c + 1).value
            if isinstance(conv, str) and conv.startswith('='):
                out.value = conv
            elif cell.ctype == xlrd.XL_CELL_TEXT and cell.value != '':
                out.value = cell.value
    for (r0, r1, c0, c1) in sh.merged_cells:
        ws.merge_cells(start_row=r0 + 1, end_row=r1, start_column=c0 + 1, end_column=c1)


def page(ws, landscape=True):
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.orientation = 'landscape' if landscape else 'portrait'
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.page_margins.left = ws.page_margins.right = 0.5
    ws.page_margins.top = ws.page_margins.bottom = 0.6
    ws.print_options.horizontalCentered = True


def debt_sheet(book, conv, wb):
    ws = wb.create_sheet('債務現況盤點表')
    fmt = {(r, 7): '#,##0' for r in range(2, 20)}
    fmt.update({(20, 7): '#,##0', (20, 9): '#,##0'})
    copy_sheet(book, conv, '債務現況盤點表', ws, data_rows=range(2, 20), data_cols=range(0, 10), fmt_override=fmt)
    for r in range(3, 21):   # 金額欄靠右，比較好對齊
        for col in 'CHJ':
            a = ws['%s%d' % (col, r)].alignment
            ws['%s%d' % (col, r)].alignment = Alignment(horizontal='right', vertical=a.vertical, wrap_text=a.wrap_text)
    page(ws)
    return {'name': '債務現況盤點表', 'first': 3, 'last': 20, 'sum': 21,
            'cols': {'debtor': 'A', 'creditor': 'B', 'total': 'C', 'reason': 'D', 'date': 'E', 'rate': 'F', 'freq': 'G', 'per': 'H', 'status': 'I', 'remain': 'J'},
            'widths': {k: ws.column_dimensions[k].width for k in 'ABCDEFGHIJ'}}


def structure_sheet(book, conv, wb):
    ws = wb.create_sheet('營運結構數字計算')
    copy_sheet(book, conv, '營運結構數字計算', ws, data_rows=range(5, 22), data_cols=(1, 5))
    for ref, f in [('G17', '0%'), ('G18', '#,##0"元"'), ('G19', '#,##0"元"'), ('G20', '#,##0"元"'), ('G21', '#,##0"人"')]:
        ws[ref].number_format = f
        ws[ref].alignment = Alignment(horizontal='right', vertical='center')
    for r in range(6, 23):
        ws['C%d' % r].number_format = '#,##0_);[Red]\\(#,##0\\)'
    # note for 計畫性還款 (調整前), invisible while empty
    ws.merge_cells('E24:G27')
    ws['E24'].font = Font(name=BODY, size=11)
    ws['E24'].alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)
    page(ws, landscape=False)
    return {'name': '營運結構數字計算',
            'inc': {'sub': 6, 'salary': 7, 'other': 8}, 'incSum': 9,
            'home': {'food': 10, 'cloth': 11, 'house': 12, 'trans': 13, 'edu': 14, 'fun': 15, 'tel': 16, 'med': 17, 'ins': 18, 'repay': 19, 'save': 20, 'other': 21}, 'homeSum': 22,
            'biz': {'rent': 6, 'staff': 7, 'util': 8, 'gas': 9, 'comm': 10, 'repay': 11, 'other': 12}, 'bizSum': 13,
            'margin': 'G17', 'bep': 'G18', 'daysLabel': 'F19', 'daily': 'G19', 'price': 'G20', 'cust': 'G21', 'note': 'E24',
            'widths': {k: ws.column_dimensions[k].width for k in 'ABCDEFG'}}


def styled(ws, ref, value=None, bold=False, size=12, h='left', v='center', wrap=True, fmt=None, fill=None, border=None, italic=False, color=None):
    c = ws[ref]
    if value is not None:
        c.value = value
    c.font = Font(name=BODY, size=size, bold=bold, italic=italic, color=color)
    c.alignment = Alignment(horizontal=h, vertical=v, wrap_text=wrap)
    if fmt:
        c.number_format = fmt
    if fill:
        c.fill = PatternFill('solid', fgColor=fill)
    if border is not False:
        c.border = border or Border(left=thin, right=thin, top=thin, bottom=thin)
    return c


def box(ws, r0, r1, c0, c1):
    """Medium outline around a block (keeps inner thin lines)."""
    for r in range(r0, r1 + 1):
        for c in range(c0, c1 + 1):
            cell = ws.cell(row=r, column=c)
            b = cell.border
            cell.border = Border(left=medium if c == c0 else b.left, right=medium if c == c1 else b.right,
                                 top=medium if r == r0 else b.top, bottom=medium if r == r1 else b.bottom)


GREY = 'FFC0C0C0'
SIGNED = '#,##0;[Red]-#,##0'
SOFT = 'FFF2F2F2'
MONEY = '#,##0_);[Red]\\(#,##0\\)'


def forecast_sheet(wb):
    ws = wb.create_sheet('營運財務預估分析表')
    for col, w in zip('ABCDEF', (16, 30, 15, 15, 15, 15)):
        ws.column_dimensions[col].width = w
    ws.merge_cells('A1:F1')
    styled(ws, 'A1', '營運財務預估分析表', bold=True, size=14, h='center', border=False)
    ws.row_dimensions[1].height = 22
    ws.merge_cells('A2:F2')
    styled(ws, 'A2', '過去一個月填實際數字，未來三個月為預估（收入從嚴認列、支出從寬編列）。盈餘＝收入小計－支出小計。', size=11, border=False, color='FF595959')
    ws.row_dimensions[2].height = 20
    heads = ['項目', '說明', '過去一個月\n（實際）', '未來第 1 個月\n（預估）', '未來第 2 個月\n（預估）', '未來第 3 個月\n（預估）']
    for i, t in enumerate(heads):
        styled(ws, '%s3' % 'ABCDEF'[i], t, bold=True, h='center', fill=SOFT)
    ws.row_dimensions[3].height = 36
    rows = [
        ('label', '月份', '', None),
        ('a', '公帳收入', '營業收入', MONEY),
        ('b', '私帳收入', '家庭收入（補助、薪資等）', MONEY),
        ('inc', '收入小計', '公帳收入＋私帳收入', MONEY),
        ('e', '營業固定支出', '公帳固定成本（租金、人事、水電等）', MONEY),
        ('rate', '成本率', '營業變動支出 ÷ 公帳收入', '0%'),
        ('c', '營業變動支出', '公帳收入 × 成本率（進貨、材料等）', MONEY),
        ('d', '營業額外支出', '設備、裝潢、規費等一次性支出', MONEY),
        ('f', '私帳固定支出', '家庭支出（食衣住行等）', MONEY),
        ('repay', '私帳額外支出', '例如計畫性還款', MONEY),
        ('exp', '支出小計', '五項支出合計', MONEY),
        ('total', '盈餘', '收入小計－支出小計', SIGNED),
        ('note', '說明', '盈餘為負或數字變動大時，寫原因與因應', None),
    ]
    out = {'name': '營運財務預估分析表', 'cols': ['C', 'D', 'E', 'F'], 'rows': {}}
    for i, (key, label, desc, fmt) in enumerate(rows):
        r = 4 + i
        out['rows'][key] = r
        strong = key in ('inc', 'exp', 'total')
        styled(ws, 'A%d' % r, label, bold=strong or key == 'label', fill=GREY if strong else None)
        styled(ws, 'B%d' % r, desc, size=11, fill=GREY if strong else None, color='FF595959')
        for col in 'CDEF':
            styled(ws, '%s%d' % (col, r), None, bold=strong, h='left' if key in ('label', 'note') else 'right', fmt=fmt, fill=GREY if strong else None)
        ws.row_dimensions[r].height = 36 if key == 'note' else 21
    R = out['rows']
    for col in 'CDEF':
        ws['%s%d' % (col, R['inc'])] = '=%s%d+%s%d' % (col, R['a'], col, R['b'])
        ws['%s%d' % (col, R['exp'])] = '=%s%d+%s%d+%s%d+%s%d+%s%d' % (col, R['e'], col, R['c'], col, R['d'], col, R['f'], col, R['repay'])
        ws['%s%d' % (col, R['total'])] = '=%s%d-%s%d' % (col, R['inc'], col, R['exp'])
        if col == 'C':   # past month: actual variable cost entered, rate derived
            ws['C%d' % R['rate']] = '=IF(C%d>0,C%d/C%d,0)' % (R['a'], R['c'], R['a'])
        else:            # future months: rate entered, variable cost derived
            ws['%s%d' % (col, R['c'])] = '=ROUND(%s%d*%s%d,0)' % (col, R['a'], col, R['rate'])
    box(ws, 3, 4 + len(rows) - 1, 1, 6)
    page(ws)
    return out


def funds_sheet(wb):
    ws = wb.create_sheet('資金需求及設備購買表')
    widths = (18, 20, 16, 12, 8, 13, 13, 18, 18, 8)
    for col, w in zip('ABCDEFGHIJ', widths):
        ws.column_dimensions[col].width = w
    ws.merge_cells('A1:J1')
    styled(ws, 'A1', '資金需求及設備購買表', bold=True, size=14, h='center', border=False)
    ws.row_dimensions[1].height = 22
    ws.merge_cells('A2:J2')
    styled(ws, 'A2', '金額＝單價×數量；週轉金金額＝每月費用×數量×月份。每項設備都要附估價單（網路估價請附完整截圖），項目名稱與估價單一致。', size=11, border=False, color='FF595959')
    ws.row_dimensions[2].height = 20
    out = {'name': '資金需求及設備購買表'}

    def section(r, title):
        ws.merge_cells('A%d:J%d' % (r, r))
        styled(ws, 'A%d' % r, title, bold=True, fill=SOFT, border=Border(left=medium, right=medium, top=medium, bottom=thin))
        for c in range(2, 11):
            ws.cell(row=r, column=c).border = Border(top=medium, bottom=thin, right=medium if c == 10 else None)
        ws.row_dimensions[r].height = 22

    def header(r, cells):
        for col, t in cells:
            if ':' in col:
                ws.merge_cells('%s%d:%s%d' % (col.split(':')[0], r, col.split(':')[1], r))
                col = col.split(':')[0]
            styled(ws, '%s%d' % (col, r), t, bold=True, h='center', size=11)
        ws.row_dimensions[r].height = 30

    def body(r, spec, merges=()):
        for m in merges:
            ws.merge_cells('%s%d:%s%d' % (m[0], r, m[1], r))
        for col, fmt, h in spec:
            styled(ws, '%s%d' % (col, r), None, fmt=fmt, h=h)
        ws.row_dimensions[r].height = 21

    def subtotal(r, label, src, merge_rest):
        ws.merge_cells('A%d:E%d' % (r, r))
        styled(ws, 'A%d' % r, label, bold=True, h='right', fill=GREY)
        for col in 'BCDE':
            styled(ws, '%s%d' % (col, r), None, fill=GREY)
        styled(ws, 'F%d' % r, '=SUM(%s)' % src, bold=True, h='right', fmt=MONEY, fill=GREY)
        ws.merge_cells('%s%d:J%d' % (merge_rest, r, r))
        for col in 'GHIJ':
            styled(ws, '%s%d' % (col, r), None, fill=GREY)
        ws.row_dimensions[r].height = 22

    txt, num, mid = 'left', 'right', 'center'
    # 一、欲購置設備
    r = 3
    section(r, '一、欲購置設備（生財器具或設備）')
    header(r + 1, [('A', '項目'), ('B', '用途'), ('C', '規格（機型）'), ('D', '單價'), ('E', '數量'), ('F', '金額'), ('G', '需要時間點'), ('H', '付款方式'), ('I', '購買來源（廠商）'), ('J', '估價單')])
    first = r + 2
    n = 10
    for i in range(n):
        body(first + i, [('A', None, txt), ('B', None, txt), ('C', None, txt), ('D', MONEY, num), ('E', '#,##0', num), ('F', MONEY, num), ('G', None, txt), ('H', None, txt), ('I', None, txt), ('J', None, mid)])
    sub1 = first + n
    subtotal(sub1, '小計(1)', 'F%d:F%d' % (first, sub1 - 1), 'G')
    box(ws, r, sub1, 1, 10)
    out['buy'] = {'first': first, 'n': n, 'sum': sub1, 'cols': {'item': 'A', 'use': 'B', 'spec': 'C', 'price': 'D', 'qty': 'E', 'amt': 'F', 'when': 'G', 'pay': 'H', 'source': 'I', 'quote': 'J'}}
    # 二、其他營運資金
    r = sub1 + 2
    section(r, '二、其他營運資金')
    header(r + 1, [('A', '項目'), ('B:C', '說明'), ('D', '單價'), ('E', '數量'), ('F', '金額'), ('G', '需要時間'), ('H:J', '')])
    first = r + 2
    n = 6
    for i in range(n):
        body(first + i, [('A', None, txt), ('B', None, txt), ('C', None, txt), ('D', MONEY, num), ('E', '#,##0', num), ('F', MONEY, num), ('G', None, txt), ('H', None, txt), ('I', None, txt), ('J', None, txt)], merges=[('B', 'C'), ('H', 'J')])
    sub2 = first + n
    subtotal(sub2, '小計(2)', 'F%d:F%d' % (first, sub2 - 1), 'G')
    box(ws, r, sub2, 1, 10)
    out['funds'] = {'first': first, 'n': n, 'sum': sub2, 'cols': {'item': 'A', 'note': 'B', 'price': 'D', 'qty': 'E', 'amt': 'F', 'when': 'G'}}
    # 三、週轉金
    r = sub2 + 2
    section(r, '三、週轉金（視產業而定，週轉金預估 3 個月；工作人員薪資須說明用途）')
    header(r + 1, [('A', '項目'), ('B', '說明'), ('C', '月份'), ('D', '每月費用'), ('E', '數量'), ('F', '金額'), ('G:J', '')])
    first = r + 2
    n = 6
    for i in range(n):
        body(first + i, [('A', None, txt), ('B', None, txt), ('C', '#,##0', num), ('D', MONEY, num), ('E', '#,##0', num), ('F', MONEY, num), ('G', None, txt), ('H', None, txt), ('I', None, txt), ('J', None, txt)], merges=[('G', 'J')])
    sub3 = first + n
    subtotal(sub3, '小計(3)', 'F%d:F%d' % (first, sub3 - 1), 'G')
    box(ws, r, sub3, 1, 10)
    out['work'] = {'first': first, 'n': n, 'sum': sub3, 'cols': {'item': 'A', 'note': 'B', 'months': 'C', 'monthly': 'D', 'qty': 'E', 'amt': 'F'}}
    # 四、所需貸款總額
    r = sub3 + 2
    section(r, '四、所需貸款總額')
    lines = [('owedA', '現有設備未繳清總額（A）', None), ('s1', '欲購置設備 小計(1)', '=F%d' % sub1), ('s2', '其他營運資金 小計(2)', '=F%d' % sub2),
             ('s3', '週轉金 小計(3)', '=F%d' % sub3), ('need', '所需貸款總額（A）＋(1)＋(2)＋(3)', None), ('apply', '擬申請貸款金額（計畫書伍）', None)]
    out['total'] = {}
    for i, (key, label, f) in enumerate(lines):
        rr = r + 1 + i
        ws.merge_cells('A%d:E%d' % (rr, rr))
        strong = key == 'need'
        styled(ws, 'A%d' % rr, label, bold=strong, h='right', fill=GREY if strong else None)
        for col in 'BCDE':
            styled(ws, '%s%d' % (col, rr), None, fill=GREY if strong else None)
        styled(ws, 'F%d' % rr, f, bold=strong, h='right', fmt=MONEY, fill=GREY if strong else None)
        ws.merge_cells('G%d:J%d' % (rr, rr))
        for col in 'GHIJ':
            styled(ws, '%s%d' % (col, rr), None, size=11, fill=GREY if strong else None)
        ws.row_dimensions[rr].height = 22
        out['total'][key] = rr
    ws['F%d' % out['total']['need']].value = '=SUM(F%d:F%d)' % (out['total']['owedA'], out['total']['s3'])
    box(ws, r, r + len(lines), 1, 10)
    out['widths'] = {k: ws.column_dimensions[k].width for k in 'ABCDEFGHIJ'}
    page(ws)
    from openpyxl.worksheet.pagebreak import Break
    ws.row_breaks.append(Break(id=sub2 + 1))
    return out


def finish(wb, path):
    wb.properties.creator = '信扶專案'
    wb.properties.title = '信扶專案創業計畫書附件'
    wb.properties.lastModifiedBy = None
    import datetime
    wb.properties.created = wb.properties.modified = datetime.datetime(2026, 10, 9)
    wb.active = 0
    wb.save(path)
    # re-pack STORED with fixed timestamps so the build is reproducible
    z = zipfile.ZipFile(path)
    files = [(i.filename, z.read(i.filename)) for i in z.infolist()]
    z.close()
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_STORED) as out:
        for name, data in files:
            out.writestr(zipfile.ZipInfo(name, date_time=(2026, 10, 9, 0, 0, 0)), data)


def sheet_paths(path):
    """Map sheet name -> worksheet part inside the xlsx."""
    z = zipfile.ZipFile(path)
    wbx = z.read('xl/workbook.xml').decode('utf8')
    rels = z.read('xl/_rels/workbook.xml.rels').decode('utf8')
    rmap = dict(re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"', rels)) or {}
    if not rmap:
        rmap = {a: b for b, a in re.findall(r'Target="([^"]+)"[^>]*Id="([^"]+)"', rels)}
    out = {}
    for name, rid in re.findall(r'<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"', wbx):
        t = rmap[rid]
        out[name] = t.lstrip('/') if t.startswith('/') else 'xl/' + t
    return out


def build(outdir):
    book = xlrd.open_workbook(XLS, formatting_info=True)
    conv = openpyxl.load_workbook(CONV)
    meta = {}
    for kind in ('first', 'later'):
        wb = openpyxl.Workbook()
        wb.remove(wb.active)
        normal = [s for s in wb._named_styles if s.name == 'Normal'][0]
        normal.font = Font(name=BODY, size=12)
        sheets = {'debt': debt_sheet(book, conv, wb), 'structure': structure_sheet(book, conv, wb)}
        if kind == 'first':
            sheets['forecast'] = forecast_sheet(wb)
            sheets['funds'] = funds_sheet(wb)
        path = os.path.join(outdir, 'attach-%s.xlsx' % kind)
        finish(wb, path)
        paths = sheet_paths(path)
        for v in sheets.values():
            v['path'] = paths[v['name']]
        meta[kind] = sheets
        print('attach-%s.xlsx' % kind, os.path.getsize(path), 'bytes', list(paths))
    return meta
