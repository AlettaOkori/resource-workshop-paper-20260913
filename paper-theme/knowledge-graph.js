/* Curriculum-informed knowledge networks, with resource coverage derived from explicit catalog links. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths = {search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',back:'m14 6-6 6 6 6',arrow:'M4 12h16m-6-6 6 6-6 6',plus:'M12 5v14M5 12h14',minus:'M5 12h14',fit:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',close:'m6 6 12 12M6 18 18 6',book:'M12 5v16M3 3c4 0 6 0 9 2 3-2 5-2 9-2v16c-4 0-6 0-9 2-3-2-5-2-9-2z',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',network:'M8 7l8 3M8 9l3 8m6-4-3 5M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0m12 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0m-6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0'};
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.network}"/></svg>`;
  let data, catalog, loading, mounted;
  function load() {
    return loading ||= Promise.all(['/paper-theme/resources/knowledge-graph.json','/paper-theme/resources/catalog.json'].map(url => fetch(url).then(r=>{if(!r.ok)throw Error('资源加载失败');return r.json();}))).then(([graph,resources])=>{data=graph;catalog=new Map(resources.map(r=>[r.id,r]));});
  }
  const resources = n => [...new Set(n.resourceIds || [])].map(id=>catalog.get(id)).filter(Boolean);
  const simulated = n => data.mode === 'demo' && n.demoCovered === true && resources(n).length === 0;
  const missing = n => resources(n).length === 0 && !simulated(n);
  const coverageLabel = n => missing(n) ? '本校缺失资源' : simulated(n) ? '有资源（模拟）' : resources(n).length+'份资源';
  function mount(host, original) {
    const root = document.createElement('section'); root.className='kg-app'; root.dataset.rwOwned='knowledge-graph'; root.setAttribute('aria-label','知识图谱工作区');
    original.setAttribute('data-kg-original',''); host.append(root);
    const state = {root,host,original,subject:data.subjects[0],group:'all',status:'all',relation:'all',query:'',selected:null,view:'graph',zoom:1,tx:0,ty:0,navOpen:false};
    root.innerHTML = `<header class="kg-header"><a href="/" class="kg-home">${icon('back')}首页</a><span class="kg-slash">/</span><h1>AI知识图谱</h1><a class="kg-library" href="/?page=my-resources">${icon('book')}我的资源</a><button type="button" class="kg-export" aria-label="导出知识点清单">${icon('download')}<span>导出</span></button></header>
      <div class="kg-context"><div class="kg-subjects" role="group" aria-label="学科">${data.subjects.map(s=>`<button type="button" data-subject="${s.id}" aria-pressed="false">${s.name}</button>`).join('')}</div><span class="kg-context-note">以知识点为中心，连接教学内容与资源</span><label class="kg-search">${icon('search')}<input type="search" aria-label="搜索知识点" placeholder="搜索知识点或关联内容"/><button type="button" data-action="clear-search" aria-label="清空搜索" hidden>${icon('close')}</button></label></div>
      <div class="kg-workspace"><aside class="kg-nav" aria-label="知识导航"><div class="kg-nav-heading"><h2>知识导航</h2><button type="button" data-action="nav" aria-label="收起知识导航">×</button></div><div class="kg-scope"></div><div class="kg-tree"></div><div class="kg-nav-foot">${icon('book')}<div>教材是定位线索<p>知识点可以跨主题关联<br/>教材版本待标注</p></div></div></aside>
      <main class="kg-main"><div class="kg-toolbar"><button type="button" class="kg-nav-toggle" data-action="nav" aria-expanded="false">知识导航</button><div class="kg-views" role="group" aria-label="浏览方式"><button type="button" data-view="graph" aria-pressed="true">${icon('network')}关系图谱</button><button type="button" data-view="list" aria-pressed="false">知识清单</button></div><label class="kg-relation-label">关系<select aria-label="关系类型"><option value="all">全部关系</option><option value="cross">跨主题关系</option></select></label><label class="kg-gap-toggle"><input type="checkbox" aria-label="只看缺失资源"/>只看缺失资源</label></div>
      <div class="kg-summary" aria-live="polite"></div><div class="kg-stage"><svg class="kg-canvas" aria-label="知识关联网络，可拖动画布或使用缩放按钮" role="group"><defs><marker id="kg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9" fill="#839098"/></marker></defs><g class="kg-viewport"></g></svg><div class="kg-empty" role="status" hidden></div><div class="kg-list" hidden></div><div class="kg-map-controls"><button type="button" data-action="out" aria-label="缩小">${icon('minus')}</button><output class="kg-zoom">100%</output><button type="button" data-action="in" aria-label="放大">${icon('plus')}</button><button type="button" data-action="fit" aria-label="复位图谱" title="居中查看全部节点">${icon('fit')}</button></div></div><footer class="kg-legend"></footer></main>
      <aside class="kg-detail" aria-label="知识点详情"></aside></div><div class="kg-toast" role="status" hidden></div>`;
    mounted=state;
    root.addEventListener('click', event=>onClick(state,event));
    root.querySelector('.kg-search input').addEventListener('input',e=>{state.query=e.target.value.trim(); state.selected=null;render(state);});
    root.querySelector('.kg-gap-toggle input').addEventListener('change',e=>{state.status=e.target.checked?'missing':'all';state.selected=null;render(state);});
    root.querySelector('.kg-relation-label select').addEventListener('change',e=>{state.relation=e.target.value;state.selected=null;render(state);});
    root.addEventListener('keydown',e=>{if(e.key==='Escape'){state.selected=null;state.navOpen=false;render(state);}if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-node]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
    const canvas=root.querySelector('.kg-canvas');let drag;
    canvas.addEventListener('pointerdown',e=>{if(e.target.closest('[data-node],[data-group]')||e.button!==0)return;drag={x:e.clientX,y:e.clientY,tx:state.tx,ty:state.ty};canvas.setPointerCapture(e.pointerId);canvas.classList.add('is-dragging');});
    canvas.addEventListener('pointermove',e=>{if(!drag)return;state.tx=drag.tx+e.clientX-drag.x;state.ty=drag.ty+e.clientY-drag.y;transform(state);});
    const end=()=>{drag=null;canvas.classList.remove('is-dragging');};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    canvas.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoom(state,e.deltaY>0?-.15:.15);},{passive:false});
    state.resize=new ResizeObserver(()=>draw(state));state.resize.observe(root.querySelector('.kg-stage'));
    render(state);
  }
  function onClick(s,e){
    const b=e.target.closest('button,a,[data-node],[data-group]');if(!b)return;
    if(b.dataset.subject){s.subject=data.subjects.find(x=>x.id===b.dataset.subject);s.group='all';s.query='';s.selected=null;s.root.querySelector('.kg-search input').value='';s.zoom=1;s.tx=s.ty=0;render(s);}
    else if(b.dataset.node)select(s,b.dataset.node);
    else if(b.dataset.group){s.group=b.dataset.group;s.selected=null;s.navOpen=false;s.zoom=1;s.tx=s.ty=0;render(s);}
    else if(b.dataset.view){s.view=b.dataset.view;render(s);}
    else if(b.classList.contains('kg-export'))download(s);
    else if(b.dataset.action){switch(b.dataset.action){
      case 'clear-search': s.query='';s.root.querySelector('.kg-search input').value='';render(s);s.root.querySelector('.kg-search input').focus();break;
      case 'clear': s.query='';s.group='all';s.status='all';s.relation='all';s.selected=null;s.root.querySelector('.kg-search input').value='';render(s);break;
      case 'nav':s.navOpen=!s.navOpen;render(s);break;
      case 'in':zoom(s,.2);break;case 'out':zoom(s,-.2);break;
      case 'fit':fit(s);break;
      case 'close':{const id=s.selected;s.selected=null;render(s);s.root.querySelector(`${s.view==='graph'?'.kg-canvas':'.kg-list'} [data-node="${id}"]`)?.focus({preventScroll:true});break;}
    }}
  }
  function select(s,id){if(!filtered(s).some(n=>n.id===id)){s.group='all';s.status='all';s.relation='all';s.query='';s.root.querySelector('.kg-search input').value='';}s.selected=id;s.navOpen=false;render(s);const title=s.root.querySelector('.kg-detail h2');title?.setAttribute('tabindex','-1');title?.focus({preventScroll:true});if(innerWidth<=1200)s.root.querySelector('.kg-detail').scrollIntoView({behavior:'instant',block:'nearest'});}
  function filtered(s){
    const ns=s.subject.nodes, groupMap=new Map(s.subject.groups.map(g=>[g.id,g]));
    const cross=new Set(s.subject.edges.filter(([a,b])=>ns.find(n=>n.id===a).group!==ns.find(n=>n.id===b).group).flatMap(e=>e.slice(0,2)));
    return ns.filter(n=>(s.group==='all'||s.group===n.group)&&(s.status!=='missing'||missing(n))&&(s.relation!=='cross'||cross.has(n.id))&&(!s.query||[n.name,n.description,groupMap.get(n.group).name,...resources(n).map(r=>r.title)].join(' ').toLowerCase().includes(s.query.toLowerCase())));
  }
  function render(s){
    const r=s.root,ns=s.subject.nodes, count=ns.filter(n=>!missing(n)).length;s.visible=filtered(s);
    r.querySelectorAll('[data-subject]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.subject===s.subject.id)));
    r.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===s.view)));
    r.querySelector('.kg-gap-toggle input').checked=s.status==='missing';r.querySelector('.kg-relation-label select').value=s.relation;
    r.querySelector('[data-action="clear-search"]').hidden=!s.query;
    r.querySelector('.kg-scope').innerHTML=`<strong>${esc(s.subject.scope)}</strong><span>知识点索引</span>`;
    r.querySelector('.kg-tree').innerHTML=`<div class="kg-tree-nodes">${s.visible.map(n=>{const g=s.subject.groups.find(g=>g.id===n.group);return `<button type="button" data-node="${n.id}" style="--kg-color:${g.color}" class="${missing(n)?'is-missing':''} ${s.selected===n.id?'is-selected':''}" aria-label="${esc(n.name)}，${coverageLabel(n)}"><i></i><span>${esc(n.name)}</span>${missing(n)?'<small>缺</small>':''}</button>`;}).join('')}</div>`;
    r.querySelector('.kg-summary').innerHTML=`<div><strong>${s.visible.length}</strong> 个知识点<span class="kg-summary-divider"></span><span class="kg-have-dot"></span>已覆盖 <b>${s.visible.filter(n=>!missing(n)).length}</b><span class="kg-missing-dot"></span>缺失 <b>${s.visible.filter(missing).length}</b></div><span class="kg-summary-hint">知识关系网络${s.relation==='cross'?' · 跨主题':''}</span>`;
    r.querySelector('.kg-legend').innerHTML=`<span class="kg-color-key">${s.subject.groups.map(g=>`<i style="background:${g.color}"></i>`).join('')}已有资源 · 颜色区分知识类别</span><span class="kg-legend-missing"><i></i>本校缺失资源</span><span class="kg-legend-note">点击探索关联 · 拖动 / 缩放</span>`;
    r.classList.toggle('kg-nav-open',s.navOpen);r.querySelector('.kg-nav-toggle').setAttribute('aria-expanded',String(s.navOpen));
    r.classList.toggle('kg-selected',!!s.selected);r.classList.toggle('kg-list-view',s.view==='list');
    const list=r.querySelector('.kg-list');list.hidden=s.view!=='list';
    list.innerHTML=s.visible.map(n=>{const g=s.subject.groups.find(g=>g.id===n.group);return `<button type="button" class="kg-list-row ${missing(n)?'is-missing':''} ${s.selected===n.id?'is-selected':''}" data-node="${n.id}" style="--kg-color:${g.color}"><i></i><span><strong>${esc(n.name)}</strong><small>${esc(s.subject.scope)}</small></span><span class="kg-list-status">${coverageLabel(n)}</span>${icon('arrow')}</button>`;}).join('');
    const empty=r.querySelector('.kg-empty');empty.hidden=!!s.visible.length;empty.innerHTML=`${icon('search')}<strong>没有匹配的知识点</strong><p>试试其他关键词，或清除当前筛选。</p><button type="button" data-action="clear">清除筛选</button>`;
    details(s,{count,total:ns.length});draw(s);
  }
  function details(s,stats){
    const panel=s.root.querySelector('.kg-detail'),n=s.subject.nodes.find(n=>n.id===s.selected);
    if(!n){panel.innerHTML='';return;}
    const g=s.subject.groups.find(g=>g.id===n.group),rs=resources(n),links=s.subject.edges.filter(([a,b])=>a===n.id||b===n.id);
    panel.innerHTML=`<div class="kg-detail-head"><span class="kg-topic-badge" style="--kg-color:${g.color}"><i></i>知识点详情</span><button type="button" data-action="close" aria-label="关闭知识点详情">${icon('close')}</button></div><div class="kg-detail-body"><span class="kg-eyebrow">知识点</span><h2>${esc(n.name)}</h2><p class="kg-description">${esc(n.description)}</p><div class="kg-location">${icon('book')}<div>${esc(s.subject.scope)}<small>教材版本待标注</small></div></div><section class="kg-resource-section"><div class="kg-section-heading"><h3>本校教学资源</h3><span>${simulated(n)?'模拟已覆盖':rs.length+' 份'}</span></div>${rs.length?rs.map(res=>`<a class="kg-resource" href="${esc(res.href)}"><img src="${esc(res.cover)}" alt=""/><span><small>${esc(res.kind)}</small><strong>${esc(res.title)}</strong><em>查看资源 ${icon('arrow')}</em></span></a>`).join(''):simulated(n)?`<div class="kg-resource-empty"><strong>已有教学资源（模拟）</strong><p>资源条目为演示占位，具体内容待关联。</p></div>`:`<div class="kg-resource-empty"><span class="kg-missing-dot"></span><strong>本校暂缺该知识点资源</strong><p>可前往资源广场寻找合适内容，或回到工坊创作。</p><a href="/plaza/resource">浏览教学资源 ${icon('arrow')}</a><a href="/">前往创作 ${icon('plus')}</a></div>`}</section><section class="kg-related"><div class="kg-section-heading"><h3>知识关联</h3><span>${links.length} 条</span></div>${links.map(([a,b,label])=>{const target=s.subject.nodes.find(x=>x.id===(a===n.id?b:a));return `<button type="button" data-node="${target.id}"><span><small>${a===n.id?'→':'←'} ${esc(label)}</small><strong>${esc(target.name)}</strong></span>${missing(target)?'<i class="kg-missing-dot" title="本校缺失资源"></i>':icon('arrow')}</button>`;}).join('')}</section></div>`;
  }
  function draw(s){
    if(!s.root.isConnected||!s.visible)return;
    const stage=s.root.querySelector('.kg-stage'),svg=s.root.querySelector('.kg-canvas'),box=stage.getBoundingClientRect();
    const width=box.width,height=box.height;if(width<1||height<1)return;
    const visibleIds=new Set(s.visible.map(n=>n.id));
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const drawKey=[s.subject.id,s.visible.map(n=>n.id).join(','),s.selected,s.relation,s.view,width,height].join('|');
    if(s.drawKey===drawKey){transform(s);return;}s.drawKey=drawKey;
    const focused=svg.contains(document.activeElement)?document.activeElement.dataset.node:null;
    const map=new Map(s.subject.groups.map(g=>[g.id,g]));
    const links=s.subject.edges.filter(([a,b])=>visibleIds.has(a)&&visibleIds.has(b));
    const degree=new Map(s.visible.map(n=>[n.id,0]));links.forEach(([a,b])=>{degree.set(a,degree.get(a)+1);degree.set(b,degree.get(b)+1);});
    const cacheKey=[s.subject.id,s.visible.map(n=>n.id).join(','),Math.round(width),Math.round(height)].join('|');
    let points;
    if(s.layoutKey===cacheKey)points=s.layout;
    else{
      let seed=2199;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      const dense=width<600;
      points=s.visible.map(n=>({n,g:map.get(n.group),x:width*(.12+random()*.76),y:45+(height-150)*random(),vx:0,vy:0,w:dense?40:Math.max(60,n.name.length*13+30),h:dense?38:60}));
      const byId=new Map(points.map(p=>[p.n.id,p]));
      // Deterministic spring layout: actual knowledge links attract; all nodes repel.
      // No synthetic category centers, rings or grid anchors are rendered.
      for(let step=0;step<260;step++){
        const alpha=1-step/310;
        for(const p of points){p.vx+=(width*.5-p.x)*.00035;p.vy+=((height-60)*.5-p.y)*.00045;}
        for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
          const p=points[i],q=points[j];let dx=q.x-p.x,dy=q.y-p.y;if(Math.abs(dx)+Math.abs(dy)<.01){dx=.13;dy=.17;}const d2=Math.max(90,dx*dx+dy*dy),d=Math.sqrt(d2),f=Math.min(4,(dense?1100:3300)/d2)*alpha;
          p.vx-=dx/d*f;p.vy-=dy/d*f;q.vx+=dx/d*f;q.vy+=dy/d*f;
        }
        for(const [a,b]of links){const p=byId.get(a),q=byId.get(b),dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1,target=dense?88:165,f=(d-target)*.008*alpha;p.vx+=dx/d*f;p.vy+=dy/d*f;q.vx-=dx/d*f;q.vy-=dy/d*f;}
        for(const p of points){p.vx*=.64;p.vy*=.64;p.x+=p.vx;p.y+=p.vy;}
        for(let sweep=0;sweep<2;sweep++)for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
          const p=points[i],q=points[j],dx=q.x-p.x,dy=q.y-p.y,ox=(p.w+q.w)/2-Math.abs(dx),oy=(p.h+q.h)/2-Math.abs(dy);
          if(ox>0&&oy>0){if(ox<oy){const move=(ox+.5)*.5*(dx<0?-1:1);p.x-=move;q.x+=move;}else{const move=(oy+.5)*.5*(dy<0?-1:1);p.y-=move;q.y+=move;}}
        }
      }
      // Center the natural layout without clipping or stretching its coordinates.
      // The viewport is only a camera; nodes may extend beyond it.
      if(points.length){const xs=points.map(p=>p.x),ys=points.map(p=>p.y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;for(const p of points){p.x+=width/2-cx;p.y+=(height-60)/2-cy;}}
      s.layoutKey=cacheKey;s.layout=points;
    }
    const positions=new Map(points.map(p=>[p.n.id,p]));
    let lines='';
    const occupied=[...positions.values()].flatMap(p=>[{x:p.x-15,y:p.y-15,w:30,h:30},{x:p.x-p.n.name.length*6.5,y:p.y+12,w:p.n.name.length*13,h:19}]);
    function relationLabel(text,p,q){const w=text.length*13+8,h=19,dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1;for(const offset of [-12,18,-29,32])for(const t of [.5,.38,.62,.25,.75]){const x=p.x+dx*t-dy/d*offset,y=p.y+dy*t+dx/d*offset;const rect={x:x-w/2,y:y-h/2,w,h};if(rect.x<8||rect.x+w>width-8||rect.y<8||rect.y+h>height-65)continue;if(occupied.some(b=>rect.x<b.x+b.w&&rect.x+rect.w>b.x&&rect.y<b.y+b.h&&rect.y+rect.h>b.y))continue;occupied.push(rect);return `<text x="${x}" y="${y+4}" text-anchor="middle">${esc(text)}</text>`;}return '';}
    for(const [a,b,label] of s.subject.edges){
      if(!visibleIds.has(a)||!visibleIds.has(b))continue;
      const p=positions.get(a),q=positions.get(b);if(s.relation==='cross'&&p.g.id===q.g.id)continue;
      const active=a===s.selected||b===s.selected,dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1,x1=p.x+dx/d*13,y1=p.y+dy/d*13,x2=q.x-dx/d*15,y2=q.y-dy/d*15;
      lines+=`<g class="kg-edge ${active?'is-active':''}"><title>${esc(p.n.name)} → ${esc(label)} → ${esc(q.n.name)}</title><path d="M${x1},${y1} L${x2},${y2}" marker-end="url(#kg-arrow)"/>${active?relationLabel(label,p,q):''}</g>`;
    }
    const neighborIds=new Set(s.subject.edges.filter(e=>e[0]===s.selected||e[1]===s.selected).flatMap(e=>e.slice(0,2)));
    const nodes=[...positions.values()].map(({x,y,n,g})=>{const miss=missing(n),selected=n.id===s.selected,color=miss?'#B9C1CA':g.color;return `<g class="kg-node ${miss?'is-missing':''} ${selected?'is-selected':''} ${(degree.get(n.id)||0)>=3?'is-major':''} ${s.selected&&!neighborIds.has(n.id)?'is-muted':''}" data-node="${n.id}" data-missing="${miss}" role="button" tabindex="0" aria-label="${esc(n.name)}，${coverageLabel(n)}" aria-pressed="${selected}" transform="translate(${x} ${y})"><title>${esc(n.name)} · ${coverageLabel(n)}</title><circle class="kg-node-halo" r="18" fill="${color}" fill-opacity=".12"/><circle class="kg-node-dot" r="${Math.min(13,7+(degree.get(n.id)||0)*.6)}" fill="${color}" stroke="${selected?'#252722':'#fff'}" stroke-width="${selected?2:2.5}"/><text class="kg-node-name" text-anchor="middle" y="28">${esc(n.name)}</text></g>`;}).join('');
    svg.querySelector('.kg-viewport').innerHTML=lines+nodes;transform(s);
    if(focused)svg.querySelector(`[data-node="${focused}"]`)?.focus({preventScroll:true});

  }
  function updateLabels(s){
    const svg=s.root.querySelector('.kg-canvas');if(innerWidth>760){svg.querySelectorAll('.kg-node-name').forEach(n=>n.style.removeProperty('font-size'));return;}
    const font=13/s.zoom,points=s.layout||[],degrees=new Map(points.map(p=>[p.n.id,0]));
    s.subject.edges.forEach(([a,b])=>{if(degrees.has(a))degrees.set(a,degrees.get(a)+1);if(degrees.has(b))degrees.set(b,degrees.get(b)+1);});
    const occupied=[],visible=new Set();
    [...points].sort((a,b)=>(b.n.id===s.selected?100:degrees.get(b.n.id))-(a.n.id===s.selected?100:degrees.get(a.n.id))).forEach(p=>{
      const w=p.n.name.length*font+6/s.zoom,rect={x:p.x-w/2,y:p.y+28-font,w,h:font+5/s.zoom};
      if(!occupied.some(b=>rect.x<b.x+b.w&&rect.x+rect.w>b.x&&rect.y<b.y+b.h&&rect.y+rect.h>b.y)){occupied.push(rect);visible.add(p.n.id);}
    });
    svg.querySelectorAll('.kg-node').forEach(n=>{n.classList.toggle('has-label',visible.has(n.dataset.node));n.querySelector('.kg-node-name').style.fontSize=font+'px';});
  }
  function fit(s){
    const points=s.layout||[],stage=s.root.querySelector('.kg-stage');s.tx=s.ty=0;
    if(!points.length){s.zoom=1;transform(s);return;}
    const minX=Math.min(...points.map(p=>p.x-p.w/2-8)),maxX=Math.max(...points.map(p=>p.x+p.w/2+8)),minY=Math.min(...points.map(p=>p.y-20)),maxY=Math.max(...points.map(p=>p.y+38));
    s.zoom=Math.max(.2,Math.min(1,(stage.clientWidth-40)/(maxX-minX),(stage.clientHeight-80)/(maxY-minY)));
    s.tx=(stage.clientWidth/2-(minX+maxX)/2)*s.zoom;s.ty=(stage.clientHeight/2-(minY+maxY)/2)*s.zoom-15;transform(s);
  }
  function transform(s){updateLabels(s);const stage=s.root.querySelector('.kg-stage'),cx=stage.clientWidth/2,cy=stage.clientHeight/2;s.root.querySelector('.kg-viewport').setAttribute('transform',`translate(${cx+s.tx},${cy+s.ty}) scale(${s.zoom}) translate(${-cx},${-cy})`);s.root.querySelector('.kg-zoom').textContent=Math.round(s.zoom*100)+'%';s.root.querySelector('[data-action="out"]').disabled=s.zoom<=.2;s.root.querySelector('[data-action="in"]').disabled=s.zoom>=2.4;}
  function zoom(s,delta){s.zoom=Math.max(.2,Math.min(2.4,+(s.zoom+delta).toFixed(2)));transform(s);}
  function download(s){const rows=[['学科','知识主题','知识点','资源状态（演示）','已关联资源数','资源名称'],...s.visible.map(n=>[s.subject.name,s.subject.groups.find(g=>g.id===n.group).name,n.name,missing(n)?'本校缺失资源':simulated(n)?'已覆盖（模拟）':'已覆盖',resources(n).length,resources(n).map(r=>r.title).join('；')])];const content='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`${s.subject.name}-知识点资源覆盖清单.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function sync(){
    if(location.pathname!=='/graph'){if(mounted){mounted.resize.disconnect();mounted.root.remove();mounted.original.removeAttribute('data-kg-original');mounted=null;}return;}
    // Wait for the shared resource module's hydration gate before adding non-React controls.
    if(!window.PaperResources)return;
    if(mounted?.root.isConnected)return;
    const host=document.querySelector('[data-paper-content] > div.flex-1'), original=host?.querySelector(':scope > div');
    if(!host||!original?.querySelector('svg[viewBox="0 0 1400 840"]'))return;
    if(!Object.keys(original).some(k=>k.startsWith('__reactProps$')))return;
    try{await load();if(location.pathname==='/graph'&&host.isConnected&&!host.querySelector('.kg-app'))mount(host,original);}catch(e){console.error('知识图谱加载失败',e);loading=null;}
  }
  window.PaperKnowledgeGraph={sync};sync();
})();
