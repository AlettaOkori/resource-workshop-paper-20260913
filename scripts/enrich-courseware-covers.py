"""Topic illustrations for resource-list mock covers; homepage assets stay untouched."""
from pathlib import Path
import json, html, textwrap, math, hashlib
ROOT=Path(__file__).resolve().parents[1]
assets=ROOT/'paper-theme/assets'
preserved=[ROOT/'paper-theme/my-resources.js',ROOT/'paper-theme/presentation.js',ROOT/'paper-theme/paper.css',*assets.glob('*.svg')]
before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in preserved}
def circle(x,y,r,fill,extra=''):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" {extra}/>'
def text(x,y,t,size=14,color='#305361'):return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="middle">{html.escape(t)}</text>'
def line(x,y,a,b,color='#7596a0',width=3):return f'<path d="M{x} {y}L{a} {b}" stroke="{color}" stroke-width="{width}" fill="none"/>'
def leaf(x,y,scale=1):return f'<g transform="translate({x} {y}) scale({scale})"><path d="M0 0C-65-65-15-115 0-125C70-75 50-25 0 0Z" fill="url(#leaf)"/><path d="M0 10V-100M0-40L-20-65M0-65L18-87" stroke="#d7eed1" stroke-width="2" fill="none"/></g>'
def cell(plant=False):
 s='<rect x="50" y="40" width="210" height="210" rx="35" fill="#6eae83" stroke="#2c775a" stroke-width="8"/>' if plant else '<ellipse cx="155" cy="145" rx="119" ry="99" fill="url(#cell)" stroke="#6da4b9" stroke-width="5"/>'
 s+=circle(155,140,45,'url(#nucleus)')+circle(169,129,14,'#ddd0ee')
 for x,y in [(92,105),(214,106),(104,205),(212,186)]:s+=f'<ellipse cx="{x}" cy="{y}" rx="20" ry="10" fill="{ "#4b9362" if plant else "#df9d60"}" transform="rotate(-30 {x} {y})"/>'+line(x-9,y,x+9,y,'#f0deb8',2)
 return s+line(155,140,275,55)+text(271,43,'细胞核')+text(155,281,'观察 · 比较 · 归纳')
def scene(s,t,i):
 if s=='生物':
  if '显微镜' in t:return '<path d="M105 235H244M173 232V205C286 188 252 105 218 94" fill="none" stroke="#486677" stroke-width="22" stroke-linecap="round"/><path d="M165 45L136 119" stroke="#5f8291" stroke-width="30"/><path d="M177 33L163 68" stroke="#233b4d" stroke-width="34"/><path d="M105 164H207" stroke="#bc8a4a" stroke-width="9"/>'+circle(215,166,16,'#dab66e')+circle(215,166,7,'#74552f')+text(157,280,'目镜 → 物镜 → 标本')
  if '细胞' in t:return cell('植物' in t)
  if '营养' in t:return '<ellipse cx="157" cy="160" rx="116" ry="89" fill="#faf8ed" stroke="#96b7ab" stroke-width="7"/>'+circle(125,144,38,'#d5ad63')+circle(196,178,30,'#db7251')+leaf(196,137,.55)+text(155,280,'谷物 · 蔬果 · 蛋白质')
  if '萌发' in t:return '<path d="M30 220H280V260H30Z" fill="#a87d53"/><path d="M62 227Q89 247 88 225M154 225V143M246 225V100" stroke="#447958" stroke-width="5" fill="none"/>'+circle(75,222,13,'#dec088')+leaf(154,166,.55)+leaf(246,160,.8)+text(155,283,'吸水 → 生根 → 长叶')
  if '食物' in t or '生态' in t or '环境' in t:return circle(253,50,28,'#efc96c')+'<path d="M0 220Q75 130 143 209Q217 120 310 209V300H0Z" fill="#b0cba0"/><path d="M0 260Q120 209 310 236V300H0Z" fill="#568765"/>'+leaf(64,226,.75)+'<ellipse cx="170" cy="213" rx="31" ry="21" fill="#f9efdc"/><ellipse cx="186" cy="185" rx="8" ry="30" fill="#f9efdc"/><path d="M225 114Q250 85 267 114Q289 85 305 113" stroke="#456a73" fill="none" stroke-width="5"/>'+line(105,206,132,206,'#bb8749',3)+text(151,63,'能量的流动')
  if '气孔' in t:return leaf(130,261,1.7)+'<circle cx="222" cy="170" r="58" fill="#eef2d6" stroke="#7eab78" stroke-width="4"/><ellipse cx="206" cy="170" rx="13" ry="33" fill="#84ad70"/><ellipse cx="236" cy="170" rx="13" ry="33" fill="#84ad70"/>'+text(223,251,'气孔放大观察')
  return leaf(151,266,1.5)+circle(245,55,31,'#efd18b')+line(157,270,157,290,'#63895c',5)+''.join(f'<path d="M{x} 80q-16-20 0-37q16 17 0 37Z" fill="#8ebcca" opacity=".8"/>' for x in [52,99])+text(210,240,'O₂' if '呼吸' in t else 'H₂O',24)+text(210,273,'气体交换',14)
 if s=='数学':
  if '钟表' in t:return circle(155,145,106,'#fff9eb','stroke="#ba9062" stroke-width="7"')+''.join(text(155+83*math.sin(n*math.pi/6),151-83*math.cos(n*math.pi/6),str(n),18) for n in range(1,13))+line(155,145,155,75,'#537f8d',6)+line(155,145,214,184,'#c0714c',5)+circle(155,145,7,'#c0714c')
  if any(w in t for w in ['圆','分数']):return circle(155,150,102,'#efcf9a','stroke="#9a7350" stroke-width="3"')+'<path d="M155 150V48A102 102 0 0 1 257 150Z" fill="#c57657"/>'+line(155,150,155,252)+line(53,150,257,150)+text(155,280,'部分与整体',18)
  if any(w in t for w in ['数轴','有理数','方程','整式']):return line(20,186,292,186,'#4b6e81',4)+''.join(line(x,180,x,194)+text(x,216,str(n-3),17) for n,x in enumerate(range(35,290,40)))+'<path d="M75 151Q145 40 235 151" fill="none" stroke="#cb895b" stroke-width="4"/>'+circle(75,186,7,'#ca795b')+circle(235,186,7,'#527f84')+text(155,91,'x + 3 = 7',25)
  return '<path d="M55 224L161 44L267 224Z" fill="#d48d6b" stroke="#965e47" stroke-width="3"/><path d="M161 44V224H267Z" fill="#668f9c"/><path d="M161 197H188V224" stroke="#f6e7ca" stroke-width="3" fill="none"/>'+text(91,130,'a',24)+text(230,140,'b',24)+text(159,268,'观察图形的关系',18)
 if s=='化学':return ''.join(line(*a,*b,'#9baeb0',9) for a,b in [((155,150),(74,90)),((155,150),(236,89)),((155,150),(226,238))])+circle(155,150,48,'url(#nucleus)')+circle(74,90,27,'#df916b')+circle(236,89,31,'#df916b')+circle(226,238,25,'#8bb3aa')+text(155,156,'O',25,'#fff')+text(74,96,'H',19,'#fff')+text(236,95,'H',19,'#fff')
 if s=='物理':
  if '声' in t:return '<path d="M65 109H101L152 72V231L101 197H65Z" fill="#5a7f93"/>'+''.join(f'<path d="M{170+n*25} {105-n*19}Q{214+n*29} 153 {170+n*25} {201+n*19}" stroke="#bd8756" stroke-width="5" fill="none"/>' for n in range(3))
  return '<path d="M173 40Q128 150 173 262Q218 150 173 40Z" fill="#badde2" stroke="#7aabb7" stroke-width="3"/>'+''.join('<path d="M20 '+str(y)+'H173L288 '+str(300-y)+'" fill="none" stroke="#cb9a4f" stroke-width="3"/>' for y in [80,150,220])+text(155,287,'观察光的传播',18)
 if s=='地理':return circle(155,145,112,'#7ca9ba')+'<path d="M81 66L130 48L159 92L133 135L79 139L58 105Z M175 140L223 105L255 153L224 196L213 243L175 217Z" fill="#bcd2a3"/><ellipse cx="155" cy="145" rx="53" ry="112" fill="none" stroke="#e5eddf" stroke-width="2"/>'+''.join(f'<ellipse cx="155" cy="145" rx="112" ry="{n}" fill="none" stroke="#e5eddf" stroke-width="2"/>' for n in [36,76])+text(155,288,'探索我们的星球',18)
 if s=='信息科技':return '<rect x="42" y="52" width="228" height="163" rx="14" fill="#527689"/><rect x="54" y="66" width="204" height="134" rx="5" fill="#e9f2eb"/><path d="M131 215V245H183V215M96 251H218" fill="none" stroke="#577283" stroke-width="8"/>'+text(153,143,'{  code  }',29)+''.join(line(77,y,150+(y%30),y,'#96b9a1',5) for y in [164,178])+circle(246,57,29,'#ddb46f')+text(246,65,'01',20)
 if s=='历史':return '<path d="M59 233H266V264H59Z M79 126H246V226H79Z" fill="#ad7854"/><path d="M42 127L159 56L284 127Z" fill="#6f826e"/>'+''.join(f'<path d="M{x} 139V225" stroke="#e6cf9d" stroke-width="13"/>' for x in [102,159,218])+circle(248,46,22,'#e1c187')+text(160,292,'追寻文明的足迹',18)
 if s in ['语文','英语']:
  return '<path d="M155 98Q84 47 33 85V235Q94 209 155 253Q218 209 278 235V85Q219 47 155 98Z" fill="#fffaed" stroke="#a59172" stroke-width="3"/><path d="M155 98V253" stroke="#bda688" stroke-width="3"/>'+''.join(line(55,y,127,y+5,'#b8baa3',3)+line(180,y+5,254,y,'#b8baa3',3) for y in [144,170,196])+text(91,121,'Aa' if s=='英语' else '文',30)+text(218,121,'Bb' if s=='英语' else '诗',30)+leaf(265,82,.6)+circle(61,44,20,'#e4ba79')
 return ''.join(circle(x,90,23,c)+f'<path d="M{x-31} 195V157Q{x} 104 {x+31} 157V195Z" fill="{c}"/>' for x,c in [(77,'#c48764'),(155,'#6e9a92'),(233,'#c5a15f')])+'<path d="M64 228Q155 265 248 228" fill="none" stroke="#8da293" stroke-width="5"/>'+text(155,283,'合作 · 分享 · 成长',18)
palettes=[('#edf3e8','#254c3c','#dce8d0'),('#e8eff3','#304e65','#d3e2e9'),('#f4eadb','#65462f','#ead5b6'),('#f0e6e6','#67434f','#e3cdd3')]
count=0
for r in json.loads((ROOT/'paper-theme/resources/catalog.json').read_text()):
 if not r.get('mock'):continue
 i=int(r['id'].split('-')[2]);p,ink,accent=palettes[(i+int(r['id'].split('-')[1]))%4]
 variant=i%3
 art=scene(r['subject'],r['topic'],i)
 wide=variant==2
 lines=textwrap.wrap(r['topic'],width=29 if wide and r['subject']=='英语' else 18 if r['subject']=='英语' else 16 if wide else 8)
 tx,ty=(30,86) if wide else (34,140)
 fs=26 if r['subject']=='英语' else 30
 title=''.join(f'<text x="{tx}" y="{ty+n*40}" font-size="{fs}" font-weight="600">{html.escape(t)}</text>' for n,t in enumerate(lines))
 transform='translate(315 88) scale(.95)' if wide else 'translate(322 55)'
 if variant==1:transform='translate(322 58) rotate(-5 155 150)'
 deco='<path d="M315 0H640V400H380Q294 194 315 0Z" fill="'+accent+'"/>' if variant==0 else '<circle cx="484" cy="205" r="149" fill="'+accent+'"/>'
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><defs>
 <linearGradient id="leaf" x2="1" y2="1"><stop stop-color="#b9d395"/><stop offset="1" stop-color="#366f50"/></linearGradient>
 <radialGradient id="cell"><stop stop-color="#d6e9de"/><stop offset="1" stop-color="#7cafb2"/></radialGradient>
 <radialGradient id="nucleus"><stop stop-color="#bbb4de"/><stop offset="1" stop-color="#716b9e"/></radialGradient>
 <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="{ink}" stroke-opacity=".04"/></pattern></defs>
 <rect width="640" height="400" fill="{p}"/>{deco}<rect width="640" height="400" fill="url(#grid)"/>
 <g font-family="PingFang SC,Microsoft YaHei,sans-serif" fill="{ink}"><text x="32" y="35" font-size="15" letter-spacing="1">{r['subject']} / {r['grade']}</text>
 {title}<path d="M34 {ty+len(lines)*40-17}H83" stroke="{ink}" stroke-width="3"/>
 <text x="34" y="{ty+len(lines)*40+21}" font-size="17">{html.escape(r['title'].split('｜')[-1])}</text>
 <g transform="{transform}">{art}</g>
 <path d="M32 353H607" stroke="{ink}" stroke-opacity=".18"/><text x="32" y="379" font-size="14">{r['edition']} · {r['kind']}</text><text x="608" y="379" text-anchor="end" font-size="14">{i+1:02} / 探究课堂</text></g></svg>'''
 (ROOT/r['cover'].lstrip('/')).write_text(svg);count+=1
assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==h for p,h in before.items())
print(f'Updated {count} resource covers; homepage code and original artwork unchanged.')
