"""Generate test workbooks for the check tools (synthetic data only)."""
import datetime, pathlib
from openpyxl import Workbook
out = pathlib.Path(__file__).resolve().parent.parent / 'testdata'
out.mkdir(exist_ok=True)

# 1) 債務盤點表：合併的債務人儲存格、民國年、Excel 日期、錯誤的剩餘加總
wb = Workbook(); ws = wb.active; ws.title = '債務現況盤點表'
ws['A1'] = '目前債務狀況'
ws.append(['債務人', '債權人', '借款金額', '借款用途', '借款時間', '利率', '每月還款金額', '目前還款狀況(本息攤還/只繳息/未還)', '剩餘金額'])
rows = [
    ['王小明', '中國信託銀行', 300000, '創業', '110年5月7日', '16%(年)', 0, '未還', 199000],
    [None, '勞工紓困貸款', 100000, '生活', '110年', '1.5%', 2165, '本息攤還', 30000],
    [None, '銀行', 61000, '周轉', '113年', None, 0, '未還（月付 0）', 61000],
    [None, '21世紀數位', 50000, '設備', '112年2月', None, 1500, '繳款中', 40000],
    ['王媽媽', '某某銀行', 200000, '醫療', datetime.date(2024, 8, 1), '2.23%', 5000, '本息攤還', 150000],
    [None, '阿姨', 64000, '家用', '114/02/03', None, None, '只繳息', 64000],
]
for r in rows: ws.append(r)
ws.merge_cells('A3:A6'); ws.merge_cells('A7:A8')
ws['E7'].number_format = 'yyyy/m/d'
ws['F10'] = '每月付款總金額'; ws['G10'] = 8665
ws['H10'] = '剩餘還款總金額'; ws['I10'] = 554000
other = wb.create_sheet('營運結構試算表'); other['A1'] = '其他工作表'
wb.save(out / 'debt-sample.xlsx')

# 2) 營運結構表：左右兩張表、空白金額、小計錯誤、公式錯誤
wb = Workbook(); ws = wb.active; ws.title = '營運結構表'
ws['A1'] = '營運結構數字計算'
ws['A2'] = '私帳(家庭帳戶)'; ws['F2'] = '公帳(營業帳務)'
ws.append(['項目', '內容說明', '計畫性還款前', '計畫性還款後', None, '項目', '內容說明', '金額'])
data = [
    ['薪資', None, 0, 0, None, '固定成本', '租金', 13400],
    ['輔助', None, 0, 0, None, '固定成本', '人事', 8500],
    ['其他收入', None, None, 0, None, '固定成本', '水電', 400],
    ['家庭收入小計', None, 0, 0, None, '固定成本', '瓦斯', 2500],
    ['食', '三餐', 15000, 15000, None, '固定成本', '雜支', 3000],
    ['衣', None, 3000, 3000, None, '固定成本小計', None, 27800],
    ['住', '房租', 12000, 12000, None, '毛利率', None, 0.6],
    ['行', None, 3000, 3000, None, '損益平衡點', None, '#DIV/0!'],
    ['還款', '當鋪', 30000, 17500],
    ['家庭支出小計', None, 66250, 50500],
]
for r in data: ws.append(r)
wb.save(out / 'structure-sample.xlsx')
# 3) 借款時間被 Excel 存成數字（112.1 可能是 1 月或 10 月）
wb = Workbook(); ws = wb.active; ws.title = '債務現況盤點表'
ws.append(['債務人', '債權人', '借款金額', '借款時間', '每月還款金額', '目前還款狀況', '剩餘金額'])
ws.append(['王小明', 'A銀行', 1000, 112.1, 100, '本息攤還', 500])
ws.append([None, 'B銀行', 1000, 112.05, 100, '本息攤還', 500])
ws.append([None, None, None, '每月付款總金額', 200, '剩餘還款總金額', 1000])
wb.save(out / 'debt-numeric-dates.xlsx')
print('written', sorted(p.name for p in out.iterdir()))
