import React, { useMemo, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { RotateCcw, Sparkles, BookOpen, Mountain, Quote, Heart, Wand2, UserRound, Info, ArrowRight } from 'lucide-react'

const poem = [
  { id: 'line1', text: '日照香炉生紫烟', tag: '画面', detail: '阳光照在香炉峰上，山间水汽升腾，像紫色烟霞。', links: ['香炉峰', '紫烟'], tone: 'warm' },
  { id: 'line2', text: '遥看瀑布挂前川', tag: '画面', detail: '远远望去，瀑布像白练一样悬挂在山前。一个“挂”字让流动的瀑布有了壮观的画面。', links: ['瀑布', '挂'], tone: 'warm' },
  { id: 'line3', text: '飞流直下三千尺', tag: '气势', detail: '水流从高处奔腾直下。“三千尺”是夸张，突出瀑布的高和水势的强。', links: ['飞流', '三千尺'], tone: 'deep' },
  { id: 'line4', text: '疑是银河落九天', tag: '想象', detail: '诗人想象瀑布仿佛天上的银河从九重天落下来，奇特又浪漫。', links: ['银河', '九天'], tone: 'deep' }
]

const cards = {
  poem: { title: '先读全诗', eyebrow: '诗题 · 望庐山瀑布', icon: BookOpen, body: '这是一幅从山间云烟写到飞瀑银河的壮丽画卷。读诗时，可以一边读一边想象画面。', quote: '日照香炉生紫烟，遥看瀑布挂前川。\n飞流直下三千尺，疑是银河落九天。', tip: '小任务：找一找诗中哪些词语让瀑布“动”起来？' },
  author: { title: '诗人是谁', eyebrow: '作者 · 李白', icon: UserRound, body: '李白，唐代诗人。他的诗常常想象奇特、气势豪迈，语言飘逸，后人称他为“诗仙”。', quote: '这首诗写眼前的庐山瀑布，也写出了诗人开阔、豪迈的胸襟。', tip: '记忆钥匙：李白的山水诗，常把眼前景色写得像仙境。' },
  background: { title: '为什么写', eyebrow: '背景 · 游历庐山', icon: Mountain, body: '李白游历庐山时，被香炉峰瀑布的雄奇景色吸引，于是把眼前所见写成了这首名篇。', quote: '阳光、云烟、飞瀑，共同组成了诗人眼中的庐山奇景。', tip: '读写景诗，可以先问：诗人在哪里？他看到了什么？' },
  imagery: { title: '看见哪些意象', eyebrow: '意象 · 云烟 / 瀑布 / 银河', icon: Sparkles, body: '“紫烟”带来朦胧与仙气；“瀑布”带来奔腾的力量；“银河”把人间景色连接到高远的天空。', quote: '紫烟缥缈，飞瀑壮阔，银河奇幻。', tip: '把这些意象连起来，就能看见一幅有远景、有动势、有想象的山水图。' },
  emotion: { title: '诗人怎样的心情', eyebrow: '情感 · 赞美与惊叹', icon: Heart, body: '诗人赞美庐山瀑布的雄伟壮丽，也流露出面对大自然奇景时的惊叹、喜悦和豪迈。', quote: '美到让人惊叹，于是眼前的瀑布成了天上的银河。', tip: '情感藏在画面里：景色越壮阔，诗人的胸襟也越开阔。' },
  craft: { title: '用了什么方法', eyebrow: '手法 · 夸张 / 想象 / 炼字', icon: Wand2, body: '“挂”把流动的水写出悬挂的画面；“三千尺”用夸张写高度；“银河落九天”用大胆想象写出瀑布的神奇。', quote: '一个“挂”字，写出静态画面；一个“疑”字，引出浪漫想象。', tip: '读到“三千尺”不要量长度，要感受瀑布带来的震撼。' }
}

const nodes = [
  { id: 'author', label: '诗人', x: 16, y: 25, icon: UserRound },
  { id: 'background', label: '背景', x: 16, y: 70, icon: Mountain },
  { id: 'imagery', label: '意象', x: 50, y: 16, icon: Sparkles },
  { id: 'emotion', label: '情感', x: 84, y: 28, icon: Heart },
  { id: 'craft', label: '手法', x: 84, y: 72, icon: Wand2 }
]

function GraphPage() {
  const [selected, setSelected] = useState('poem')
  const activeLine = useMemo(() => poem.find(item => item.id === selected), [selected])
  const selectedCard = cards[selected] || (activeLine ? {
    title: activeLine.tag,
    eyebrow: `诗句 · ${activeLine.text}`,
    icon: Quote,
    body: activeLine.detail,
    quote: activeLine.text,
    tip: `关键词：${activeLine.links.join(' · ')}。试着用自己的话说一说画面。`
  } : cards.poem)
  const SelectedIcon = selectedCard.icon

  function selectLine(line) { setSelected(line.id) }
  function reset() { setSelected('poem') }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-mark">唐诗解读图谱</div>
      <div className="top-actions"><span className="grade-pill">小学 · 写景诗</span><button className="reset-btn" onClick={reset}><RotateCcw size={16} />重置视图</button></div>
    </header>
    <main className="page-wrap">
      <section className="hero">
        <div><div className="kicker">唐 · 李白 <span>／</span> 山水诗</div><h1>望庐山瀑布</h1><p>沿着诗句的线索，看见一场从紫烟到银河的想象。</p></div>
        <div className="hero-stamp">诗仙<br/><small>李白</small></div>
      </section>
      <section className="workspace">
        <div className="graph-panel">
          <div className="panel-head"><div><span className="section-no">01</span><h2>诗歌关系图</h2></div><span className="hint">点击节点，展开解读</span></div>
          <div className="graph-canvas">
            <svg className="connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {nodes.map(node => <line key={node.id} x1={node.x} y1={node.y} x2="50" y2="50" className={selected === node.id ? 'line-active' : ''} />)}
              {poem.map((line, i) => <line key={line.id} x1="50" y1="50" x2={30 + i * 13} y2="88" className={selected === line.id ? 'line-active' : ''} />)}
            </svg>
            <button className="central-node" onClick={reset}><span className="node-ring">望</span><strong>望庐山瀑布</strong><small>四句 · 二十八字</small></button>
            {nodes.map(node => { const Icon = node.icon; return <button key={node.id} className={`graph-node ${selected === node.id ? 'active' : ''}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => setSelected(node.id)}><Icon size={16}/><span>{node.label}</span></button> })}
            <div className="line-nodes">{poem.map(line => <button key={line.id} className={`poem-node ${selected === line.id ? 'active' : ''} ${line.tone}`} onClick={() => selectLine(line)}><span>{line.text.slice(0, 2)}</span><small>{line.tag}</small></button>)}</div>
          </div>
          <div className="legend"><span><i className="dot burgundy"/>主题节点</span><span><i className="dot gold"/>解读节点</span><span>点击中心节点可回到全诗</span></div>
        </div>
        <aside className="detail-panel">
          <div className="detail-top"><span className="section-no">02</span><span>当前解读</span></div>
          <div className="detail-title"><SelectedIcon size={20}/><div><div className="eyebrow">{selectedCard.eyebrow}</div><h2>{selectedCard.title}</h2></div></div>
          <p className="detail-body">{activeLine ? activeLine.detail : selectedCard.body}</p>
          <blockquote>{activeLine ? activeLine.text : selectedCard.quote}</blockquote>
          <div className="tip-card"><div className="tip-label"><Info size={15}/>读诗小提示</div><p>{activeLine ? `关键词：${activeLine.links.join(' · ')}。试着用自己的话说一说画面。` : selectedCard.tip}</p></div>
          <div className="detail-footer"><span>已展开 1 个节点</span><button onClick={reset}>回到全诗 <ArrowRight size={15}/></button></div>
        </aside>
      </section>
      <section className="poem-strip"><div className="strip-title"><Quote size={18}/><span>四句诗 · 顺着画面读</span></div><div className="poem-lines">{poem.map(line => <button key={line.id} onClick={() => selectLine(line)} className={selected === line.id ? 'selected' : ''}><span>{line.text}</span><small>{line.tag}</small></button>)}</div></section>
      <footer><span>一字一画，读出瀑布的雄奇；一想一象，走进李白的诗境。</span><span>课堂图谱 · 望庐山瀑布</span></footer>
    </main>
  </div>
}

export default function App() { return <Routes><Route path="/" element={<GraphPage />} /><Route path="*" element={<GraphPage />} /></Routes> }
