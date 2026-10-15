"""Local reconciliation only. XLSX and JSON outputs must not be committed."""
import openpyxl, json, sys, datetime
w=openpyxl.load_workbook(sys.argv[1],read_only=True,data_only=True)
widths={'BASE':38,'REPOSIÇÔES':21,'LINK':39,'QUALIDADE':15,'AsakaiDash':63,'Página5':5}
def encode(v):
    if isinstance(v,(datetime.datetime,datetime.date)):
        return {'__date__':v.isoformat()}
    if isinstance(v,datetime.time):return v.isoformat()
    return v
out={}
for s in w:
    if s.title not in widths:continue
    out[s.title]=[[encode(v) for v in row] for row in s.iter_rows(max_col=widths[s.title],values_only=True)]
with open(sys.argv[2],'w') as f:json.dump(out,f,ensure_ascii=False,separators=(',',':'))
print('Workbook imported locally; no cell contents printed.')
