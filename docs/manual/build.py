import html, subprocess, os, sys

VER = sys.argv[1] if len(sys.argv) > 1 else "0.0.0"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[2] if len(sys.argv) > 2 else HERE

CSS = """
@page { size: A4; margin: 20mm 18mm 20mm 18mm; }
* { box-sizing: border-box; }
body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color:#1c2333; font-size:10.5pt; line-height:1.5; }
h1 { font-size: 30pt; margin: 0 0 6px; color:#2f62d6; }
h2 { font-size: 16pt; color:#2f62d6; border-bottom: 2px solid #c9d8f6; padding-bottom:4px; margin: 26px 0 10px; break-after: avoid; }
h3 { font-size: 12pt; margin: 16px 0 6px; break-after: avoid; }
p { margin: 6px 0; } ul,ol { margin: 6px 0 6px 20px; padding:0; } li { margin: 3px 0; }
code { font-family: Menlo, Consolas, monospace; font-size: 9.2pt; background:#eef1f7; padding:1px 4px; border-radius:3px; }
pre { background:#eef1f7; padding:8px 10px; border-radius:6px; font-size:9pt; overflow:hidden; white-space:pre-wrap; break-inside: avoid; }
pre code { background:none; padding:0; }
table { border-collapse: collapse; width:100%; margin: 8px 0; font-size:9.6pt; break-inside: avoid; }
th, td { border:1px solid #c5ccd8; padding:5px 8px; text-align:left; vertical-align:top; }
th { background:#e3e9f5; }
.note { border-left:4px solid #2f62d6; background:#eef3ff; padding:7px 12px; margin:10px 0; break-inside: avoid; }
.warn { border-left:4px solid #c2323f; background:#fdeeee; padding:7px 12px; margin:10px 0; break-inside: avoid; }
.cover { min-height: 235mm; display:flex; flex-direction:column; justify-content:center; page-break-after: always; }
.cover .sub { font-size:14pt; color:#4d586b; margin-bottom:28px; }
.cover .meta { color:#4d586b; font-size:10.5pt; }
.toc { page-break-after: always; } .toc ol { list-style: none; margin:0; } .toc li { padding:3px 0; border-bottom:1px dotted #c5ccd8; }
h2.brk { break-before: page; }
kbd { border:1px solid #9aa3b5; border-bottom-width:2px; border-radius:4px; padding:0 5px; font-size:9pt; }
"""

def page(lang, d):
    toc = ''.join(f'<li>{i+1}. {html.escape(t)}</li>' for i, (t, _, _) in enumerate(d['sections']))
    body = ''
    for i, (t, c, brk) in enumerate(d['sections']):
        body += f'<h2 class="{"brk" if brk else ""}">{i+1}. {html.escape(t)}</h2>\n{c}\n'
    return f'''<!DOCTYPE html><html lang="{lang}"><head><meta charset="utf-8"><title>G-Downloader {VER} — {d["manual"]}</title><style>{CSS}</style></head><body>
<div class="cover"><h1>G-Downloader</h1><div class="sub">{d["manual"]}</div><div class="meta">{d["version"]} {VER}<br>Graziano Melzi · OnAir Garage<br>onairgarage.com · hello@onairgarage.com<br>{d["license"]}</div></div>
<div class="toc"><h2>{d["toc"]}</h2><ol>{toc}</ol></div>
{body}</body></html>'''

sys.path.insert(0, HERE)
from content_it import IT
from content_en import EN

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

for lang, d, name in (('it', IT, f'G-Downloader-Manuale-{VER}'), ('en', EN, f'G-Downloader-Manual-{VER}')):
    h = os.path.join(OUT, f'{name}.html')
    open(h, 'w').write(page(lang, d).replace('{v}', VER))
    out = os.path.join(OUT, f'{name}.pdf')
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
                    f'--print-to-pdf={out}', f'file://{h}'], check=True, capture_output=True)
    os.remove(h)
    print(out, os.path.getsize(out))
