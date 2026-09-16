/* Curriculum navigation, dynamic coverage, and in-place resource tagging. */
(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths={search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',back:'m14 6-6 6 6 6',arrow:'M4 12h16m-6-6 6 6-6 6',plus:'M12 5v14M5 12h14',minus:'M5 12h14',fit:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',close:'m6 6 12 12M6 18 18 6',book:'M12 5v16M3 3c4 0 6 0 9 2 3-2 5-2 9-2v16c-4 0-6 0-9 2-3-2-5-2-9-2z',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',network:'M8 7l8 3M8 9l3 8m6-4-3 5M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0m12 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0m-6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0'};
  const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.network}"/></svg>`;
  let data,api,mounted,loading,resourceIndex=new Map(),untaggedDialog;
  async function load(){if(!window.WorkshopData)return false;await window.WorkshopData.ready;api=window.WorkshopData;data=api.graph;indexResources();return true;}
  const availableResources=()=>api.resources().filter(r=>!r.legacy);
  function indexResources(){resourceIndex=new Map();availableResources().forEach(r=>(r.knowledgeIds||[]).forEach(id=>{if(!resourceIndex.has(id))resourceIndex.set(id,[]);resourceIndex.get(id).push(r);}));}
  const resources=n=>n.type==='knowledge'?(resourceIndex.get(n.id)||[]):n.type==='resource'?(n.resourceIds||[]).map(id=>api.resource(id)).filter(r=>r&&!r.legacy):[...new Map((n._knowledgeIds||[]).flatMap(id=>resourceIndex.get(id)||[]).map(r=>[r.id,r])).values()];
  const missing=n=>n.type==='knowledge'&&resources(n).length===0;
  const coverageLabel=n=>n.type==='knowledge'?(missing(n)?'缺失资源':resources(n).length+' 份资源'):nodeType(n).name;
  const nodeType=n=>data.nodeTypes.find(t=>t.id===n.type)||data.nodeTypes.find(t=>t.id==='knowledge');
  const nodeColor=n=>missing(n)?'#AEB9B0':nodeType(n).color;
  const edgeAllowed=(s,e)=>s.relation==='all'||s.relation===e[2];
  const getSubject=name=>{const source=data.subjects.find(s=>s.name===name)||{id:name,name,groups:[],nodes:[],edges:[],curriculum:[],chapters:[]};return {...source,baseNodes:source.nodes,baseEdges:source.edges};};
  function updateResourceNodes(s){const known=s.subject.baseNodes.filter(n=>n.type==='knowledge'),byId=new Map(known.map(n=>[n.id,n]));const rs=availableResources().filter(r=>(r.knowledgeIds||[]).some(id=>byId.has(id)));s.subject.nodes=[...s.subject.baseNodes.filter(n=>n.type!=='resource'),...rs.map(r=>{const first=(r.knowledgeIds||[]).map(id=>byId.get(id)).find(Boolean);return {id:s.subject.id+'-resource-'+r.id,type:'resource',name:r.title,description:'',group:first.group,chapterId:first.chapterId,resourceIds:[r.id]};})];s.subject.edges=[...s.subject.baseEdges.filter(e=>e[2]!=='所关联资源是'),...rs.flatMap(r=>(r.knowledgeIds||[]).filter(id=>byId.has(id)).map(id=>[id,s.subject.id+'-resource-'+r.id,'所关联资源是']))];}
  const getUnits=s=>(s.subject.curriculum||[]).filter(u=>u.edition===s.edition&&u.grade===s.grade);
  const getTopics=s=>getUnits(s).flatMap(u=>u.topics.map(t=>({...t,unit:u})));
  const activeTopic=s=>getTopics(s).find(t=>t.id===s.topicId);
  const topicKnowledge=(s,t)=>s.subject.nodes.filter(n=>n.type==='knowledge'&&t.knowledgeIds.includes(n.id));
  function scope(s){const ts=getTopics(s);const active=activeTopic(s);return active?[active]:ts;}
  function scopeKnowledge(s){const ids=new Set(scope(s).flatMap(t=>t.knowledgeIds));return s.subject.nodes.filter(n=>n.type==='knowledge'&&ids.has(n.id));}
  function chooseDefault(s){const ts=getTopics(s);s.topicId=ts.find(t=>t.knowledgeIds.includes(s.subject.defaultNode))?.id||ts[0]?.id||'';s.selected=ts.find(t=>t.id===s.topicId)?.knowledgeIds.includes(s.subject.defaultNode)?s.subject.defaultNode:ts.find(t=>t.id===s.topicId)?.knowledgeIds[0]||null;}
  const opts=(values,value)=>values.map(v=>`<option value="${esc(v)}" ${value===v?'selected':''}>${esc(v)}</option>`).join('');
  function mount(host,original){
    const root=document.createElement('section');root.className='kg-app';root.dataset.rwOwned='knowledge-graph';root.setAttribute('aria-label','知识图谱工作区');original.setAttribute('data-kg-original','');host.append(root);
    const p=api.base.profile,q=new URLSearchParams(location.search),requested=data.subjects.find(x=>x.id===q.get('subject')||x.name===q.get('subject'))||data.subjects.find(x=>x.nodes.some(n=>n.id===q.get('node')));const s={root,host,original,subject:getSubject(requested?.name||p.subject),grade:p.grade,edition:p.edition,topicId:'',status:'all',relation:'all',query:'',selected:null,view:'graph',detailOpen:false,zoom:1,tx:0,ty:0};const requestedUnit=(s.subject.curriculum||[]).find(u=>u.topics.some(t=>t.knowledgeIds.includes(q.get('node'))));if(requestedUnit){s.grade=requestedUnit.grade;s.edition=requestedUnit.edition;}chooseDefault(s);const requestedTopic=getTopics(s).find(t=>t.knowledgeIds.includes(q.get('node')));if(requestedTopic){s.topicId=requestedTopic.id;s.selected=q.get('node');s.detailOpen=true;}mounted=s;
    root.innerHTML=`<header class="kg-header"><a href="/" class="kg-home">${icon('back')}首页</a><span class="kg-slash">/</span><h1>知识图谱</h1></header><div class="kg-context"><label>教材版本<select data-context="edition" aria-label="教材版本">${opts(api.base.editions,s.edition)}</select></label><label>学科<select data-context="subject" aria-label="学科">${opts(api.base.subjects,s.subject.name)}</select></label><label>年级<select data-context="grade" aria-label="年级">${opts(api.base.grades,s.grade)}</select></label></div><div class="kg-workspace"><aside class="kg-nav" aria-label="章节目录"></aside><main class="kg-main"><div class="kg-toolbar"><strong>关系图谱</strong><label class="kg-search">${icon('search')}<input type="search" aria-label="搜索知识点" placeholder="搜索知识点或资源"/><button type="button" data-action="clear-search" aria-label="清空搜索" hidden>${icon('close')}</button></label><label class="kg-gap-toggle"><input type="checkbox" aria-label="暂无资源的知识点"/>暂无资源的知识点</label><button type="button" class="kg-untagged-entry" data-action="untagged">未标记资源 <b class="kg-untagged-count"></b></button></div><div class="kg-relations"><label>关系<select aria-label="关系筛选"><option value="all">全部关系</option></select></label><div class="kg-summary" aria-live="polite"></div></div><div class="kg-stage"><svg class="kg-canvas" aria-label="知识关联网络" role="group"><defs><marker id="kg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9" fill="#839098"/></marker></defs><g class="kg-viewport"></g></svg><div class="kg-empty" role="status" hidden></div><div class="kg-map-controls"><button type="button" data-action="out" aria-label="缩小">${icon('minus')}</button><output class="kg-zoom">100%</output><button type="button" data-action="in" aria-label="放大">${icon('plus')}</button><button type="button" data-action="fit" aria-label="复位图谱">${icon('fit')}</button></div></div><footer class="kg-legend"></footer></main><div class="kg-hover-card" role="tooltip" hidden></div></div><dialog class="kg-detail" aria-label="节点详情"></dialog>`;
    root.addEventListener('click',e=>onClick(s,e));root.querySelector('.kg-search input').addEventListener('input',e=>{s.query=e.target.value.trim();render(s);});root.querySelector('.kg-gap-toggle input').addEventListener('change',e=>{s.status=e.target.checked?'missing':'all';render(s);});root.querySelector('.kg-relations select').addEventListener('change',e=>{s.relation=e.target.value;render(s);});
    root.querySelectorAll('[data-context]').forEach(el=>el.addEventListener('change',()=>{if(el.dataset.context==='subject')s.subject=getSubject(el.value);else s[el.dataset.context]=el.value;s.detailOpen=false;s.query='';s.relation='all';s.status='all';s.root.querySelector('.kg-search input').value='';chooseDefault(s);render(s);}));
    root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-node]')){e.preventDefault();select(s,e.target.dataset.node);}});
    const detail=root.querySelector('.kg-detail');
    detail.addEventListener('cancel',e=>{e.preventDefault();closeDetail(s);});
    detail.addEventListener('click',e=>{if(e.target===detail){const r=detail.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDetail(s);}});
    root.addEventListener('scroll',()=>{if(s.detailOpen&&!s.maskPending){s.maskPending=true;requestAnimationFrame(()=>{s.maskPending=false;updateSelectionMask(s);});}},true);
    const hover=root.querySelector('.kg-hover-card');
    root.addEventListener('pointerover',e=>{const target=e.target.closest('.kg-node');if(target){clearTimeout(s.hoverTimer);showHover(s,target);}else if(e.target.closest('.kg-hover-card'))clearTimeout(s.hoverTimer);});
    root.addEventListener('pointerout',e=>{if(e.target.closest('.kg-node,.kg-hover-card'))s.hoverTimer=setTimeout(()=>{hover.hidden=true;},140);});
    root.addEventListener('focusin',e=>{if(e.target.matches('.kg-node'))showHover(s,e.target);});
    root.addEventListener('focusout',e=>{if(e.target.matches('.kg-node'))hover.hidden=true;});
    s.viewportResize=()=>updateSelectionMask(s);addEventListener('resize',s.viewportResize);
    const canvas=root.querySelector('.kg-canvas');let drag;canvas.addEventListener('pointerdown',e=>{if(e.target.closest('[data-node]')||e.button!==0)return;drag={x:e.clientX,y:e.clientY,tx:s.tx,ty:s.ty};canvas.setPointerCapture(e.pointerId);canvas.classList.add('is-dragging');});canvas.addEventListener('pointermove',e=>{if(!drag)return;s.tx=drag.tx+e.clientX-drag.x;s.ty=drag.ty+e.clientY-drag.y;transform(s);});const end=()=>{drag=null;canvas.classList.remove('is-dragging');};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoom(s,e.deltaY>0?-.15:.15);},{passive:false});s.resize=new ResizeObserver(()=>{s.drawKey='';draw(s);fit(s);});s.resize.observe(root.querySelector('.kg-stage'));render(s);
  }
  function onClick(s,e){const b=e.target.closest('button,[data-node]');if(!b)return;if(b.dataset.topic){s.topicId=b.dataset.topic==='all'?'':b.dataset.topic;s.selected=activeTopic(s)?.knowledgeIds[0]||null;s.detailOpen=false;s.query='';s.status='all';s.relation='all';s.root.querySelector('.kg-search input').value='';render(s);}else if(b.dataset.node)select(s,b.dataset.node);else switch(b.dataset.action){case 'untagged':openUntagged();break;case 'close-detail':closeDetail(s);break;case 'in':zoom(s,.2);break;case 'out':zoom(s,-.2);break;case 'fit':fit(s);break;case 'clear-search':s.query='';s.root.querySelector('.kg-search input').value='';render(s);break;case 'clear':s.query='';s.status='all';s.relation='all';s.root.querySelector('.kg-search input').value='';render(s);break;}}
  function select(s,id){const node=s.subject.nodes.find(n=>n.id===id);const t=getTopics(s).find(t=>t.knowledgeIds.includes(id))||getTopics(s).find(t=>t.chapterId===node?.chapterId);if(t&&!s.visible.some(n=>n.id===id))s.topicId=t.id;s.selected=id;s.detailOpen=true;s.query='';s.status='all';s.root.querySelector('.kg-search input').value='';render(s);}
  function filtered(s){
    const ts=scope(s),knowledge=scopeKnowledge(s),ids=new Set(knowledge.map(n=>n.id)),chapterIds=new Set(ts.map(t=>t.chapterId));
    const structural=s.subject.nodes.filter(n=>n.type!=='knowledge'&&n.type!=='resource'&&chapterIds.has(n.chapterId)).map(n=>({...n,_knowledgeIds:knowledge.filter(k=>k.chapterId===n.chapterId).map(k=>k.id),name:n.type==='chapter'&&ts.length===1?ts[0].name:n.name}));
    const linkedResources=new Set(knowledge.flatMap(n=>resources(n).map(r=>r.id)));const rs=s.subject.nodes.filter(n=>n.type==='resource'&&(n.resourceIds||[]).some(id=>linkedResources.has(id)));
    const all=[...knowledge,...structural,...rs],related=new Set(s.subject.edges.filter(e=>edgeAllowed(s,e)).flatMap(e=>e.slice(0,2))),q=s.query.toLowerCase();
    return all.filter(n=>(s.status!=='missing'||missing(n))&&(s.relation==='all'||related.has(n.id))&&(!q||[n.name,...resources(n).map(r=>r.title)].join(' ').toLowerCase().includes(q)));
  }
  function renderNav(s){const us=getUnits(s);s.root.querySelector('.kg-nav').innerHTML=`<div class="kg-nav-heading"><h2>章节目录</h2><span>${getTopics(s).length} 课题</span></div><div class="kg-curriculum"><button type="button" class="kg-topic kg-all-topics" data-topic="all" aria-pressed="${!s.topicId}">全部课题</button>${us.length?us.map(u=>`<section class="kg-unit"><h3><small>${esc(u.term)}</small>${esc(u.name)}</h3>${u.topics.map(t=>{const ns=topicKnowledge(s,t),covered=ns.filter(n=>!missing(n)).length;return `<button type="button" class="kg-topic" data-topic="${esc(t.id)}" aria-pressed="${s.topicId===t.id}"><span>${esc(t.name)}</span><small>${covered}/${ns.length}</small></button>`;}).join('')}</section>`).join(''):'<div class="kg-directory-empty">暂无章节</div>'}</div>`;}
  function render(s){
    if(!s.root.isConnected)return;updateResourceNodes(s);const all=scopeKnowledge(s),covered=all.filter(n=>!missing(n)).length;s.visible=filtered(s);if(s.selected&&!s.visible.some(n=>n.id===s.selected))s.selected=null;s.drawKey='';renderNav(s);
    s.root.querySelector('.kg-untagged-count').textContent=availableResources().filter(r=>!api.knowledge(r.id).length).length;
    s.root.querySelector('.kg-gap-toggle input').checked=s.status==='missing';s.root.querySelector('[data-action=clear-search]').hidden=!s.query;
    const relations=[...new Set(s.subject.edges.filter(([a,b])=>s.visible.some(n=>n.id===a)&&s.visible.some(n=>n.id===b)).map(e=>e[2]))];s.root.querySelector('.kg-relations select').innerHTML=`<option value="all">全部关系</option>${[...new Set([...relations,...(s.relation==='all'?[]:[s.relation])])].map(r=>`<option value="${esc(r)}" ${s.relation===r?'selected':''}>${esc(r)}</option>`).join('')}`;
    s.root.querySelector('.kg-summary').innerHTML=`<span>知识点 <b>${all.length}</b></span><span class="kg-have-dot"></span><span>已覆盖 <b>${covered}</b></span><span class="kg-missing-dot"></span><span>缺失 <b>${all.length-covered}</b></span>`;
    s.root.querySelector('.kg-legend').innerHTML=data.nodeTypes.map(t=>`<span><i style="background:${t.color}"></i>${esc(t.name)}</span>`).join('')+'<span><i style="background:#AEB9B0"></i>缺失资源</span>';
    const empty=s.root.querySelector('.kg-empty');empty.hidden=!!s.visible.length;empty.innerHTML=`${icon('search')}<strong>${all.length?'没有匹配的知识点':'暂无知识点'}</strong>${all.length?'<button type="button" data-action="clear">清除筛选</button>':''}`;
    details(s);draw(s);fit(s);
  }
  function closeDetail(s){s.detailOpen=false;s.root.querySelector('.kg-detail').close();}
  function updateSelectionMask(s){
    const panel=s.root.querySelector('.kg-detail'),overlay=panel.querySelector('.kg-focus-mask');
    if(!s.detailOpen||!panel.open||!overlay)return;
    const target=s.root.querySelector('.kg-canvas .kg-node.is-selected');
    if(!target)return;
    const mobile=innerWidth<=600;
    if(mobile){const height=Math.max(160,Math.min(innerHeight*.48,innerHeight-(s.root.querySelector('.kg-workspace').getBoundingClientRect().top+118)));panel.style.height=height+'px';panel.style.maxHeight=height+'px';}else{panel.style.removeProperty('height');panel.style.removeProperty('max-height');}
    let drawer=panel.getBoundingClientRect(),stage=s.root.querySelector('.kg-stage').getBoundingClientRect();
    if(mobile&&stage.top>drawer.top-125){
      s.root.querySelector('.kg-workspace').scrollTop+=stage.top-(drawer.top-180);
      stage=s.root.querySelector('.kg-stage').getBoundingClientRect();
    }
    let box=target.getBoundingClientRect();
    const area={left:Math.max(12,stage.left+12),right:Math.min(innerWidth-12,stage.right-12,mobile?innerWidth-12:drawer.left-16),top:Math.max(12,stage.top+12),bottom:Math.min(innerHeight-12,stage.bottom-12,mobile?drawer.top-14:innerHeight-12)};
    let dx=0,dy=0;
    if(area.right-area.left>box.width+10){if(box.right>area.right)dx=area.right-box.right;else if(box.left<area.left)dx=area.left-box.left;}
    if(area.bottom-area.top>box.height+10){if(box.bottom>area.bottom)dy=area.bottom-box.bottom;else if(box.top<area.top)dy=area.top-box.top;}
    if(dx||dy){
      s.tx+=dx;s.ty+=dy;
      const canvasStage=s.root.querySelector('.kg-stage'),cx=canvasStage.clientWidth/2,cy=canvasStage.clientHeight/2;
      s.root.querySelector('.kg-viewport').setAttribute('transform',`translate(${cx+s.tx},${cy+s.ty}) scale(${s.zoom}) translate(${-cx},${-cy})`);
      box=target.getBoundingClientRect();
    }
    const x=Math.max(0,box.left-10),y=Math.max(0,box.top-10),w=box.width+20,h=box.height+20;
    const signature=[innerWidth,innerHeight,drawer.left,drawer.top,drawer.width,drawer.height,x,y,w,h].map(value=>Math.round(value*100)/100).join('|');
    if(overlay.dataset.geometry===signature)return;
    overlay.dataset.geometry=signature;overlay.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
    overlay.innerHTML=`<defs><mask id="kg-focus-cutout" maskUnits="userSpaceOnUse" x="0" y="0" width="${innerWidth}" height="${innerHeight}"><rect width="${innerWidth}" height="${innerHeight}" fill="white"/><rect x="${drawer.left}" y="${drawer.top}" width="${drawer.width}" height="${drawer.height}" fill="black"/><rect class="kg-selection-window" x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="black"/></mask></defs><rect width="${innerWidth}" height="${innerHeight}" fill="#17251b55" mask="url(#kg-focus-cutout)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="none" stroke="#bf3034" stroke-opacity=".55" stroke-width="2"/>`;
  }
  function showHover(s,target){
    if(s.detailOpen)return;
    const n=s.subject.nodes.find(item=>item.id===target.dataset.node);if(!n)return;
    const card=s.root.querySelector('.kg-hover-card'),box=target.getBoundingClientRect();
    card.innerHTML=`<strong>${esc(n.name)}</strong><button type="button" data-node="${esc(n.id)}">${n.type==='knowledge'?'该知识点有':'关联'} <b>${resources(n).length}</b> 份资源</button>`;
    card.hidden=false;card.style.left=Math.max(12,Math.min(innerWidth-card.offsetWidth-12,box.left+box.width/2-card.offsetWidth/2))+'px';card.style.top=Math.max(12,Math.min(innerHeight-card.offsetHeight-12,box.top-card.offsetHeight-8))+'px';
  }
  function details(s){
    const panel=s.root.querySelector('.kg-detail'),n=s.visible.find(n=>n.id===s.selected)||s.subject.nodes.find(n=>n.id===s.selected&&scopeKnowledge(s).some(k=>k.id===n.id));
    s.root.querySelector('.kg-hover-card').hidden=true;
    if(!n||!s.detailOpen){if(panel.open)panel.close();return;}
    const rs=resources(n),links=s.subject.edges.filter(([a,b])=>a===n.id||b===n.id).filter(([a,b])=>s.subject.nodes.some(x=>x.id===(a===n.id?b:a)));
    const t=getTopics(s).find(t=>t.knowledgeIds.includes(n.id))||activeTopic(s);
    const params=new URLSearchParams({chatId:'sim-knowledge-'+Date.now(),q:'围绕'+n.name+'创作教学资源',knowledgeId:n.type==='knowledge'?n.id:''});
    panel.innerHTML=`<svg class="kg-focus-mask" aria-hidden="true"></svg><div class="kg-detail-head"><span class="kg-topic-badge" style="--kg-color:${nodeColor(n)}"><i></i>${esc(nodeType(n).name)}</span><button type="button" data-action="close-detail" aria-label="关闭节点详情">${icon('close')}</button></div><div class="kg-detail-body"><h2>${esc(n.name)}</h2><div class="kg-location">${icon('book')}<span>${esc(s.edition)} · ${esc(s.grade)}<small>${esc(t?.unit.name||'')}${t?' / '+esc(t.name):''}</small></span></div><section class="kg-resource-section"><div class="kg-section-heading"><h3>关联资源</h3><span>${rs.length} 份</span></div>${rs.length?rs.map(r=>`<a class="kg-resource" ${r.mock||!r.href?'aria-disabled="true"':`href="${esc(r.href)}"`}>${r.cover?`<img src="${esc(r.cover)}" alt=""/>`:''}<span><small>${esc(r.kind)}</small><strong>${esc(r.title)}</strong>${r.mock||!r.href?'':`<em>查看资源 ${icon('arrow')}</em>`}</span></a>`).join(''):'<div class="kg-resource-empty">暂无关联资源<button type="button" data-action="untagged">未标记资源</button></div>'}${n.type==='knowledge'?`<a class="kg-create-resource" href="/chat?${esc(params.toString())}">去创作 ${icon('plus')}</a>`:''}</section><section class="kg-related"><div class="kg-section-heading"><h3>知识关联</h3><span>${links.length} 条</span></div>${links.map(([a,b,label])=>{const target=s.visible.find(x=>x.id===(a===n.id?b:a))||s.subject.nodes.find(x=>x.id===(a===n.id?b:a));return `<button type="button" data-node="${esc(target.id)}"><span><small>${a===n.id?'→':'←'} ${esc(label)}</small><strong>${esc(target.name)}</strong></span>${missing(target)?'<i class="kg-missing-dot" title="暂无资源"></i>':icon('arrow')}</button>`;}).join('')}</section></div>`;
    if(!panel.open)panel.showModal();
  }
  function closeUntagged(){if(!untaggedDialog)return;const {root,focus}=untaggedDialog;root.close();root.remove();untaggedDialog=null;focus?.focus({preventScroll:true});}
  function renderUntagged(){
    if(!untaggedDialog)return;
    const {root,selected}=untaggedDialog,q=root.querySelector('input[type=search]').value.trim().toLowerCase(),all=availableResources().filter(r=>!api.knowledge(r.id).length),rs=all.filter(r=>!q||[r.title,r.author].join(' ').toLowerCase().includes(q));
    selected.forEach(id=>{if(!all.some(r=>r.id===id))selected.delete(id);});untaggedDialog.visibleIds=rs.map(r=>r.id);
    root.querySelector('[data-batch]').textContent='批量设置'+(selected.size?'（'+selected.size+'）':'');root.querySelector('[data-batch]').disabled=!selected.size;
    const selectAll=root.querySelector('[data-select-all]');selectAll.checked=rs.length>0&&rs.every(r=>selected.has(r.id));selectAll.indeterminate=rs.some(r=>selected.has(r.id))&&!selectAll.checked;
    root.querySelector('.kg-untagged-grid').innerHTML=rs.length?rs.map(r=>`<article class="kg-untagged-card"><label class="kg-select-resource"><input type="checkbox" data-select-resource="${esc(r.id)}" aria-label="选择${esc(r.title)}" ${selected.has(r.id)?'checked':''}/></label><a ${r.mock||!r.href?'aria-disabled="true"':`href="${esc(r.href)}"`}>${r.cover?`<img src="${esc(r.cover)}" alt=""/>`:'<div class="kg-no-cover">'+esc(r.kind)+'</div>'}<h3>${esc(r.title)}</h3></a><div><span>${esc(r.author)}</span><button type="button" data-resource-id="${esc(r.id)}">设置知识点</button></div></article>`).join(''):'<div class="kg-untagged-empty">暂无未标记资源</div>';
  }
  function openUntagged(){
    closeUntagged();const root=document.createElement('dialog');root.className='kg-untagged-dialog';root.dataset.rwOwned='knowledge-untagged';root.setAttribute('aria-labelledby','kg-untagged-title');
    root.innerHTML=`<header><h2 id="kg-untagged-title">未标记资源</h2><button type="button" data-close aria-label="关闭">×</button></header><label class="kg-untagged-search">${icon('search')}<input type="search" aria-label="搜索未标记资源" placeholder="搜索资源名称或教师姓名"/></label><div class="kg-batch-toolbar"><label><input type="checkbox" data-select-all/>全选</label><button type="button" data-batch disabled>批量设置</button></div><div class="kg-untagged-grid"></div>`;
    untaggedDialog={root,focus:document.activeElement,selected:new Set(),visibleIds:[]};document.body.append(root);
    root.addEventListener('click',e=>{if(e.target.closest('[data-close]')){closeUntagged();return;}const id=e.target.closest('[data-resource-id]')?.dataset.resourceId;if(id)window.WorkshopKnowledge?.open(id);if(e.target.closest('[data-batch]'))window.WorkshopKnowledge?.openBatch([...untaggedDialog.selected]);});
    root.addEventListener('change',e=>{if(e.target.matches('[data-select-all]'))untaggedDialog.visibleIds.forEach(id=>e.target.checked?untaggedDialog.selected.add(id):untaggedDialog.selected.delete(id));else if(e.target.matches('[data-select-resource]')){const id=e.target.dataset.selectResource;e.target.checked?untaggedDialog.selected.add(id):untaggedDialog.selected.delete(id);}renderUntagged();});
    root.addEventListener('cancel',e=>{e.preventDefault();closeUntagged();});root.querySelector('input[type=search]').addEventListener('input',renderUntagged);renderUntagged();root.showModal();
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
    const links=s.subject.edges.filter(e=>visibleIds.has(e[0])&&visibleIds.has(e[1])&&edgeAllowed(s,e));
    const degree=new Map(s.visible.map(n=>[n.id,0]));links.forEach(([a,b])=>{degree.set(a,degree.get(a)+1);degree.set(b,degree.get(b)+1);});
    const cacheKey=[s.subject.id,s.visible.map(n=>n.id).join(','),s.relation,Math.round(width),Math.round(height)].join('|');
    let points;
    if(s.layoutKey===cacheKey)points=s.layout;
    else{
      let seed=2199;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      const dense=width<600;
      points=s.visible.map(n=>({n,g:map.get(n.group),x:width*(.12+random()*.76),y:45+(height-150)*random(),vx:0,vy:0,w:dense?40:Math.max(60,Math.min(n.name.length,12)*13+30),h:dense?38:60}));
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
      const p=positions.get(a),q=positions.get(b);if(!edgeAllowed(s,[a,b,label]))continue;
      const active=a===s.selected||b===s.selected,dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1,x1=p.x+dx/d*13,y1=p.y+dy/d*13,x2=q.x-dx/d*15,y2=q.y-dy/d*15;
      lines+=`<g class="kg-edge ${active?'is-active':''}"><title>${esc(p.n.name)} → ${esc(label)} → ${esc(q.n.name)}</title><path d="M${x1},${y1} L${x2},${y2}" marker-end="url(#kg-arrow)"/>${active?relationLabel(label,p,q):''}</g>`;
    }
    const neighborIds=new Set(s.subject.edges.filter(e=>e[0]===s.selected||e[1]===s.selected).flatMap(e=>e.slice(0,2)));
    const nodes=[...positions.values()].map(({x,y,n,g})=>{const miss=missing(n),selected=n.id===s.selected,color=nodeColor(n);return `<g class="kg-node ${miss?'is-missing':''} ${selected?'is-selected':''} ${(degree.get(n.id)||0)>=3?'is-major':''} ${s.selected&&!neighborIds.has(n.id)?'is-muted':''}" data-node="${n.id}" data-missing="${miss}" data-type="${n.type}" role="button" tabindex="0" aria-label="${esc(n.name)}，${coverageLabel(n)}" aria-pressed="${selected}" transform="translate(${x} ${y})"><circle class="kg-node-halo" r="18" fill="${color}" fill-opacity=".12"/><circle class="kg-node-dot" style="fill:${color}" r="${Math.min(13,7+(degree.get(n.id)||0)*.6)}" fill="${color}" stroke="${selected?'#252722':'#fff'}" stroke-width="${selected?2:2.5}"/><text class="kg-node-name" text-anchor="middle" y="28">${esc(n.name.length>12?n.name.slice(0,11)+'…':n.name)}</text>${n.type==='knowledge'?`<text class="kg-node-count" text-anchor="middle" y="44">${resources(n).length} 份资源</text>`:''}</g>`;}).join('');
    svg.querySelector('.kg-viewport').innerHTML=lines+nodes;transform(s);
    if(focused)svg.querySelector(`[data-node="${focused}"]`)?.focus({preventScroll:true});

  }
  function updateLabels(s){
    const svg=s.root.querySelector('.kg-canvas');if(innerWidth>760){svg.querySelectorAll('.kg-node-name').forEach(n=>{n.style.removeProperty('font-size');n.setAttribute('y','28');});svg.querySelectorAll('.kg-node-count').forEach(n=>{n.style.removeProperty('font-size');n.setAttribute('y','44');});return;}
    const font=13/s.zoom,points=s.layout||[],degrees=new Map(points.map(p=>[p.n.id,0]));
    s.subject.edges.forEach(([a,b])=>{if(degrees.has(a))degrees.set(a,degrees.get(a)+1);if(degrees.has(b))degrees.set(b,degrees.get(b)+1);});
    const occupied=[],visible=new Set();
    [...points].sort((a,b)=>(b.n.id===s.selected?100:degrees.get(b.n.id))-(a.n.id===s.selected?100:degrees.get(a.n.id))).forEach(p=>{
      const w=Math.min(12,p.n.name.length)*font+6/s.zoom,rect={x:p.x-w/2,y:p.y+28/s.zoom-font,w,h:32/s.zoom};
      if(!occupied.some(b=>rect.x<b.x+b.w&&rect.x+rect.w>b.x&&rect.y<b.y+b.h&&rect.y+rect.h>b.y)){occupied.push(rect);visible.add(p.n.id);}
    });
    svg.querySelectorAll('.kg-node').forEach(n=>{n.classList.toggle('has-label',visible.has(n.dataset.node));const label=n.querySelector('.kg-node-name');label.style.fontSize=font+'px';label.setAttribute('y',28/s.zoom);const count=n.querySelector('.kg-node-count');if(count){count.style.fontSize=11/s.zoom+'px';count.setAttribute('y',44/s.zoom);}});
  }
  function fit(s){
    const points=s.layout||[],stage=s.root.querySelector('.kg-stage');s.tx=s.ty=0;
    if(!points.length){s.zoom=1;transform(s);return;}
    const minX=Math.min(...points.map(p=>p.x-p.w/2-8)),maxX=Math.max(...points.map(p=>p.x+p.w/2+8)),minY=Math.min(...points.map(p=>p.y-20)),maxY=Math.max(...points.map(p=>p.y+38));
    s.zoom=Math.max(.2,Math.min(1,(stage.clientWidth-40)/(maxX-minX),(stage.clientHeight-80)/(maxY-minY)));
    s.tx=(stage.clientWidth/2-(minX+maxX)/2)*s.zoom;s.ty=(stage.clientHeight/2-(minY+maxY)/2)*s.zoom-15;transform(s);
  }
  function transform(s){updateLabels(s);const stage=s.root.querySelector('.kg-stage'),cx=stage.clientWidth/2,cy=stage.clientHeight/2;s.root.querySelector('.kg-viewport').setAttribute('transform',`translate(${cx+s.tx},${cy+s.ty}) scale(${s.zoom}) translate(${-cx},${-cy})`);s.root.querySelector('.kg-zoom').textContent=Math.round(s.zoom*100)+'%';s.root.querySelector('[data-action="out"]').disabled=s.zoom<=.2;s.root.querySelector('[data-action="in"]').disabled=s.zoom>=2.4;updateSelectionMask(s);}
  function zoom(s,delta){s.zoom=Math.max(.2,Math.min(2.4,+(s.zoom+delta).toFixed(2)));transform(s);}
  async function sync(){if(location.pathname!=='/graph'){if(mounted){mounted.resize.disconnect();removeEventListener('resize',mounted.viewportResize);mounted.root.remove();mounted.original.removeAttribute('data-kg-original');mounted=null;closeUntagged();}return;}if(!window.PaperResources||!window.WorkshopData||mounted?.root.isConnected)return;const host=document.querySelector('[data-paper-content] > div.flex-1'),original=host?.querySelector(':scope > div');if(!host||!original?.querySelector('svg[viewBox="0 0 1400 840"]')||!Object.keys(original).some(k=>k.startsWith('__reactProps$')))return;try{if(!loading)loading=load();if(await loading&&location.pathname==='/graph'&&host.isConnected&&!host.querySelector('.kg-app'))mount(host,original);}catch(e){console.error('知识图谱加载失败',e);loading=null;}}
  document.addEventListener('workshop-data-changed',()=>{if(!api)return;indexResources();if(mounted?.root.isConnected)render(mounted);renderUntagged();});window.PaperKnowledgeGraph={sync};sync();
})();
