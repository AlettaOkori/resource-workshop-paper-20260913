"""Compose mock covers from the prototype's original illustrated SVG artwork."""
from pathlib import Path
import json, re, html, textwrap
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'paper-theme/assets'
styles={
 'photosynthesis':('#e5ebdd','#284a36'), 'cell':('#dce8ec','#204759'),
 'geometry':('#ece5d7','#624b3e'), 'poetry':('#f0ded4','#753f43'),
 'exam':('#e5e8df','#344b42'), 'activity':('#f2e6c4','#735332'),
 'lifetime':('#e5e7e0','#3b5146')}
def art_for(r):
 t=r['topic'];s=r['subject']
 if r['kind']=='试卷':return 'exam'
 if s=='生物':return 'cell' if any(w in t for w in ['细胞','显微镜','营养']) else 'photosynthesis'
 if s in ['语文','历史','地理']:return 'poetry'
 if s in ['数学','物理','信息科技']:return 'geometry'
 if s=='化学':return 'cell'
 if s=='其他' and any(w in t for w in ['植物','垃圾']):return 'photosynthesis'
 return 'activity'
for r in json.loads((ROOT/'paper-theme/resources/catalog.json').read_text()):
 if not r.get('mock'):continue
 art=art_for(r);paper,ink=styles[art]
 source=(ASSETS/(art+'.svg')).read_text();inner=re.sub(r'^<svg[^>]*>|</svg>$','',source)
 # Keep the original illustration and its gradients, forms and texture intact.
 lines=textwrap.wrap(r['topic'],width=18) if r['subject']=='英语' else textwrap.wrap(r['topic'],width=9)
 topic=''.join(f'<text x="32" y="{143+n*43}" font-size="{27 if r["subject"]=="英语" else 32}" font-weight="600">{html.escape(line)}</text>' for n,line in enumerate(lines))
 suffix=html.escape(r['title'].split('｜')[-1]);is_app=r['kind']=='教学应用'
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
 <rect width="640" height="400" fill="{paper}"/>
 <svg x="310" y="0" width="330" height="400" viewBox="0 0 480 640" preserveAspectRatio="xMidYMid slice">{inner}</svg>
 <defs><linearGradient id="paper-fade"><stop stop-color="{paper}"/><stop offset="1" stop-color="{paper}" stop-opacity="0"/></linearGradient></defs>
 <path d="M310 0H390V400H310Z" fill="url(#paper-fade)"/>
 <g font-family="PingFang SC,Microsoft YaHei,sans-serif" fill="{ink}">
 <text x="32" y="44" font-size="17" letter-spacing="2">{html.escape(r['subject'])} · {r['grade']}</text>
 <path d="M32 78H78" stroke="{ink}" stroke-width="3"/>
 {topic}
 <text x="32" y="{143+len(lines)*43+20}" font-size="19" opacity=".8">{suffix}</text>
 <rect x="32" y="314" width="105" height="29" rx="14" fill="{ink}" opacity=".09"/>
 <text x="84" y="334" text-anchor="middle" font-size="14">{'互动探索' if is_app else r['kind']}</text>
 <text x="32" y="375" font-size="14" opacity=".7">{r['edition']} / {r['author']}</text>
 </g></svg>'''
 (ROOT/r['cover'].lstrip('/')).write_text(svg)
print('Updated 180 illustrated mock covers using original artwork.')
