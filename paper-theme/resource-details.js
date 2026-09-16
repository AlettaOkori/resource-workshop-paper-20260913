/* Resource detail actions, shared-knowledge recommendations and local knowledge graph. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+({like:'<path d="M7 10H4v11h3zm0 0 5-8c3 0 3 3 2 7h6c2 0 2 2 1 5l-2 7H7z"/>',save:'<path d="M6 3h12v18l-6-4-6 4z"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'}[name]||'')+'</svg>';
  let data, current, pending = false, revision = 0;
  const attached = n => n && Object.keys(n).some(k => k.startsWith('__reactProps$'));
  const usable = r => !r.legacy && !r.mock && r.href;
  const visible = r => !r.legacy && !!(r.mock || r.artifact || r.href);
  function mount() {
    pending = false;
    if (!data || !location.pathname.startsWith('/share/')) { current = null; return; }
    const id = decodeURIComponent(location.pathname.split('/').pop()), resource = data.resource(id);
    const main = document.querySelector('main'), frame = main?.querySelector('iframe');
    if (!resource || !frame || !attached(frame) || document.readyState !== 'complete') return;
    const section = frame.closest('section'), nativeInfo = [...section.children].find(n => n !== frame.parentElement && !n.hasAttribute('data-rw-owned'));
    const aside = main.querySelector('aside');
    if (!nativeInfo || !aside || !attached(nativeInfo)) return;
    if (!current || current.id !== id || current.frame !== frame || !current.panel.isConnected) {
      const adapt = [...nativeInfo.querySelectorAll('button')].find(b => b.textContent.trim() === '一键改编');
      const topTitle = main.querySelector('header > span');
      if (topTitle) topTitle.dataset.rwDetailOldTitle = '';
      nativeInfo.dataset.rwDetailOldInfo = ''; section.dataset.rwDetailSection = ''; section.parentElement.dataset.rwDetailColumns = '';
      const preview = frame.parentElement; preview.dataset.rwDetailPreview = ''; main.dataset.rwDetailMain = '';
      for (const button of preview.querySelectorAll('button')) if (!button.closest('[data-rw-owned]')) button.dataset.rwNativeFullscreen = '';
      preview.querySelectorAll(':scope > .rw-detail-toolbar').forEach(n=>n.remove());
      section.querySelectorAll(':scope > .rw-detail-info').forEach(n=>n.remove());
      aside.querySelectorAll(':scope > .rw-detail-related').forEach(n=>n.remove());
      for (const child of aside.children) child.dataset.rwDetailOldRelated = '';
      aside.dataset.rwDetailAside = '';
      const toolbar = document.createElement('div'); toolbar.className = 'rw-detail-toolbar'; toolbar.dataset.rwOwned = 'detail'; preview.prepend(toolbar);
      const panel = document.createElement('section'); panel.className = 'rw-detail-info'; panel.dataset.rwOwned = 'detail';
      panel.innerHTML = '<div class="rw-detail-heading"></div><div class="rw-detail-tags"></div><div class="rw-detail-byline"></div><div class="rw-detail-bottom"><div class="rw-detail-statistics"></div></div><p class="rw-detail-feedback" role="status" hidden></p>';
      section.append(panel);
      const related = document.createElement('section'); related.className = 'rw-detail-related'; related.dataset.rwOwned = 'detail';
      related.innerHTML = '<div class="rw-rec-heading"><h2>资源推荐</h2><label class="rw-detail-search">'+icon('search')+'<input type="search" aria-label="搜索资源或教师" placeholder="搜索资源或教师"></label><button type="button" data-related-more hidden>更多</button></div><div class="rw-rec-points"></div><div class="rw-related-resources"></div><h2 class="rw-path-heading">知识关联</h2><div class="rw-learning-path"></div>';
      aside.append(related);
      current = {id,frame,section,panel,related,toolbar,adapt,query:'',signature:'',point:'',graphFocus:''};
      const state = current;
      related.querySelector('input').addEventListener('input', event => {state.query = event.target.value; renderRecommendations(state);});
      related.querySelector('[data-related-more]').addEventListener('click', event => openResources('资源推荐',state.recommendations,event.currentTarget));
      const onAction = event => {
        const button = event.target.closest('[data-detail-action]'); if (!button) return;
        const action = button.dataset.detailAction;
        if (action === 'like' || action === 'save') data.toggle(action,state.id);
        if (action === 'adapt') {
          if(state.adapt?.isConnected)state.adapt.click();
          else {const r=data.resource(state.id);const q=new URLSearchParams({chatId:'sim-adapt-'+crypto.randomUUID(),featureId:'20',feat:r.feature||'互动课件',adapt:r.title,html:r.artifact,art:r.filename||r.title+'.html'});location.assign('/chat?'+q);}
        }
        if (action === 'download') void download(state,button);
        if (action === 'fullscreen') toggleFullscreen(state);
      };
      toolbar.addEventListener('click',onAction);panel.addEventListener('click',onAction);
      related.addEventListener('click', event => {
        const point = event.target.closest('[data-detail-point]');
        if (point) {state.point = point.dataset.detailPoint; renderGraph(state);return;}
        const more = event.target.closest('[data-point-more]');
        if (more) {state.pointExpanded=!state.pointExpanded;renderGraph(state);state.related.querySelector('[data-point-more]')?.focus({preventScroll:true});return;}
        const create = event.target.closest('[data-point-create]');
        if (create) {
          const menu = related.querySelector('.rw-point-create-menu');
          menu.hidden = !menu.hidden; create.setAttribute('aria-expanded',String(!menu.hidden));
        }
      });
      related.addEventListener('change', event => {if(event.target.matches('[data-graph-focus]')){state.graphFocus=event.target.value;state.point='';renderGraph(state);}});
      related.addEventListener('keydown', event => {if ((event.key==='Enter'||event.key===' ') && event.target.matches('[data-detail-point]')) {event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
    }
    render(current);
  }
  function toggleFullscreen(state) {
    const expanded = state.frame.parentElement.classList.toggle('rw-detail-fullscreen');
    const b=state.toolbar.querySelector('[data-detail-action="fullscreen"]');
    b.innerHTML=icon('fullscreen')+(expanded?'退出全屏':'全屏'); b.setAttribute('aria-label',expanded?'退出全屏':'全屏');
  }
  function render(state) {
    const r = data.resource(state.id); if (!r) return;
    const signature = JSON.stringify([revision,r]); if (signature === state.signature) return; state.signature = signature;
    state.panel.querySelector('.rw-detail-heading').innerHTML = '<h1>'+esc(r.title)+'</h1><div class="rw-detail-actions rw-title-actions"><button type="button" data-detail-action="like" aria-pressed="'+data.isLiked(r.id)+'">'+icon('like')+(data.isLiked(r.id)?'已点赞':'点赞')+'</button><button type="button" data-detail-action="save" aria-pressed="'+data.isSaved(r.id)+'">'+icon('save')+(data.isSaved(r.id)?'已收藏':'收藏')+'</button>'+((state.adapt||r.artifact)?'<button type="button" data-detail-action="adapt">一键改编</button>':'')+'</div>';
    const points = data.knowledge(r.id);
    state.panel.querySelector('.rw-detail-tags').innerHTML = points.map(n => '<a href="/graph?subject='+esc(n.subjectId)+'&node='+esc(n.id)+'">'+esc(n.name)+'</a>').join('');
    state.panel.querySelector('.rw-detail-byline').innerHTML = '<span class="rw-detail-avatar">'+esc((r.author || '教师').slice(0,1))+'</span><strong>'+esc(r.author || '教师')+'</strong><span>'+esc(r.authorGrade || data.base.profile.grade)+'</span><span>'+esc(r.authorSubject || data.base.profile.subject)+'</span>'+(r.edition?'<span class="rw-detail-edition">'+esc(r.edition)+'</span>':'');
    state.panel.querySelector('.rw-detail-statistics').innerHTML = '<span>浏览 <b>'+Number(r.views || 0)+'</b></span><span>点赞 <b>'+Number(r.likes || 0)+'</b></span><span>下载 <b>'+Number(r.downloads || 0)+'</b></span>';
    state.toolbar.innerHTML = '<div class="rw-detail-actions"><button type="button" data-detail-action="fullscreen" aria-label="全屏">'+icon('fullscreen')+(state.frame.parentElement.classList.contains('rw-detail-fullscreen')?'退出全屏':'全屏')+'</button><button class="rw-detail-download" type="button" data-detail-action="download">'+icon('download')+'下载</button></div>';
    renderRecommendations(state);
  }
  function resourceMarkup(item) {
    const preview=window.WorkshopPreviews?.markup(item) || '<span class="ws-preview-empty">暂无预览</span>';
    return '<a class="rw-related-card" '+(usable(item)?'href="'+esc(item.href)+'"':'aria-disabled="true"')+'><span class="rw-related-thumb">'+preview+'</span><span><strong>'+esc(item.title)+'</strong><small>'+esc(item.author)+' · '+esc(item.subject)+'</small></span></a>';
  }
  function openResources(title,rs,invoker) {
    document.querySelector('.rw-detail-resource-dialog')?.remove();
    const dialog=document.createElement('dialog');dialog.className='rw-detail-resource-dialog';dialog.dataset.rwOwned='detail';
    dialog.innerHTML='<header><h2>'+esc(title)+' <small>'+rs.length+'份资源</small></h2><button type="button" aria-label="关闭资源列表">×</button></header><div class="rw-detail-resource-grid">'+(rs.map(resourceMarkup).join('')||'<p class="rw-related-empty">暂无资源</p>')+'</div>';
    const close=()=>{dialog.close();dialog.remove();if(invoker?.isConnected)invoker.focus();};
    dialog.querySelector('button').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}});
    document.body.append(dialog);dialog.showModal();
  }
  function renderRecommendations(state) {
    const r=data.resource(state.id), points=data.knowledge(r.id), selected=new Set(points.map(n=>n.id)), query=state.query.trim().toLocaleLowerCase();
    const recommendations=data.resources().filter(item=>item.id!==r.id&&visible(item)).map(item=>({item,score:(item.knowledgeIds||[]).filter(id=>selected.has(id)).length})).filter(entry=>entry.score>0&&(!query||(entry.item.title+' '+entry.item.author).toLocaleLowerCase().includes(query))).sort((a,b)=>b.score-a.score||b.item.views-a.item.views).map(entry=>entry.item);
    state.recommendations=recommendations;
    state.related.querySelector('.rw-rec-points').innerHTML='<span>相关知识点</span>'+points.map(n=>'<a href="/graph?subject='+esc(n.subjectId)+'&node='+esc(n.id)+'">'+esc(n.name)+'</a>').join('');
    state.related.querySelector('.rw-related-resources').innerHTML=recommendations.length?recommendations.slice(0,3).map(resourceMarkup).join(''):'<p class="rw-related-empty">暂无相关资源</p>';
    state.related.querySelector('[data-related-more]').hidden=recommendations.length<=3;
    renderGraph(state);
  }
  function resourcesFor(id) {return data.resources().filter(r=>visible(r)&&(r.knowledgeIds||[]).includes(id)).sort((a,b)=>b.views-a.views);}
  function graphFor(resource,focus) {
    const nodes=new Map(data.allKnowledge().map(n=>[n.id,n])), selected=new Set([focus].filter(id=>nodes.has(id))), links=new Map(), edges=new Map();
    const ids=(n,keys)=>keys.flatMap(k=>n[k]||[]).map(x=>typeof x==='string'?x:x.id);
    const add=(source,target,phase,id)=>{if(!nodes.has(id))return;if(!selected.has(id)&&!links.has(id))links.set(id,{...nodes.get(id),phase});edges.set(source+'|'+target,{source,target});};
    for(const id of selected) {
      const node=nodes.get(id);
      for(const before of ids(node,['prerequisiteIds','prerequisites']))add(before,id,'before',before);
      for(const after of ids(node,['nextIds','successorIds']))add(id,after,'after',after);
      for(const other of nodes.values()) {
        if(ids(other,['nextIds','successorIds']).includes(id))add(other.id,id,'before',other.id);
        if(ids(other,['prerequisiteIds','prerequisites']).includes(id))add(id,other.id,'after',other.id);
      }
    }
    return {center:[...selected].map(id=>nodes.get(id)),before:[...links.values()].filter(n=>n.phase==='before'),after:[...links.values()].filter(n=>n.phase==='after'),edges:[...edges.values()]};
  }
  function renderGraph(state) {
    const points=data.knowledge(state.id);
    if(!points.some(n=>n.id===state.graphFocus)){state.graphFocus=points[0]?.id||'';state.point='';}
    const graph=graphFor(data.resource(state.id),state.graphFocus), path=state.related.querySelector('.rw-learning-path');
    if(!graph.center.length) {path.innerHTML='<p class="rw-related-empty">暂未关联知识点</p>';return;}
    const all=[...graph.before,...graph.center,...graph.after];
    if(!all.some(n=>n.id===state.point))state.point=graph.after[0]?.id||graph.center[0].id;
    const height=Math.max(2,graph.before.length,graph.center.length,graph.after.length)*44+52, positions=new Map();
    [graph.before,graph.center,graph.after].forEach((list,col)=>list.forEach((n,i)=>positions.set(n.id,{x:59+col*118,y:52+i*44+(height-52-list.length*44)/2})));
    const lines=graph.edges.filter(e=>positions.has(e.source)&&positions.has(e.target)).map(e=>{
      const a=positions.get(e.source),b=positions.get(e.target),direction=b.x>=a.x?1:-1,x1=a.x+direction*49,x2=b.x-direction*49;
      return '<path d="M'+x1+' '+a.y+' C'+(x1+x2)/2+' '+a.y+' '+(x1+x2)/2+' '+b.y+' '+x2+' '+b.y+'" marker-end="url(#rw-graph-arrow)"/>';
    }).join('');
    const markup=all.map(n=>{const p=positions.get(n.id),isCurrent=graph.center.some(x=>x.id===n.id);return '<g data-relation="'+(isCurrent?'current':n.phase)+'" class="rw-local-node '+(isCurrent?'is-current ':'')+(state.point===n.id?'is-selected':'')+'" data-detail-point="'+esc(n.id)+'" role="button" tabindex="0" aria-label="'+esc(n.name)+'" aria-pressed="'+(state.point===n.id)+'"><title>'+esc(n.name)+'</title><rect x="'+(p.x-49)+'" y="'+(p.y-14)+'" width="98" height="28" rx="14"/><circle cx="'+(p.x-37)+'" cy="'+p.y+'" r="3"/><text x="'+(p.x+3)+'" y="'+(p.y+4)+'" text-anchor="middle">'+esc(n.name.length>6?n.name.slice(0,6)+'…':n.name)+'</text></g>';}).join('');
    const node=all.find(n=>n.id===state.point),rs=resourcesFor(node.id);
    const listKey=state.graphFocus+':'+state.point;
    if(state.pointListKey!==listKey){state.pointListKey=listKey;state.pointExpanded=false;}
    const features=data.base.features||[];
    const selector='<label class="rw-local-focus"><span>当前知识点</span><select data-graph-focus aria-label="当前知识点">'+points.map(n=>'<option value="'+esc(n.id)+'" '+(n.id===state.graphFocus?'selected':'')+'>'+esc(n.name)+'</option>').join('')+'</select></label>';
    const empty=[!graph.before.length?'<text x="59" y="'+(height/2+6)+'" text-anchor="middle" class="rw-local-empty">暂无</text>':'',!graph.after.length?'<text x="295" y="'+(height/2+6)+'" text-anchor="middle" class="rw-local-empty">暂无</text>':''].join('');
    path.innerHTML=selector+'<div class="rw-local-graph"><svg viewBox="0 0 354 '+height+'" role="group" aria-label="知识点关联图"><defs><marker id="rw-graph-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5" fill="#b7b4a9"/></marker></defs><g class="rw-local-headings"><text x="59" y="14" text-anchor="middle">前置知识点</text><text x="177" y="14" text-anchor="middle">当前知识点</text><text x="295" y="14" text-anchor="middle">后置知识点</text></g><g class="rw-local-edges">'+lines+'</g>'+empty+markup+'</svg></div><div class="rw-point-resources"><div class="rw-point-heading"><div class="rw-point-summary"><strong>'+esc(node.name)+'</strong><span>'+rs.length+'份资源</span></div><button type="button" data-point-create aria-expanded="false">去创作</button></div></div><div class="rw-point-create-menu" hidden>'+features.map(feature=>{const name=typeof feature==='string'?feature:feature.name;const params=new URLSearchParams({chatId:'sim-'+crypto.randomUUID(),feat:name,knowledgeId:node.id,q:'请围绕“'+node.name+'”生成一份'+name+'。'});return '<a href="/chat?'+esc(params.toString())+'">'+esc(name)+'</a>';}).join('')+'</div>';
    if(rs.length)path.insertAdjacentHTML('beforeend','<div class="rw-point-resource-list" aria-label="'+esc(node.name)+'关联资源">'+(state.pointExpanded?rs:rs.slice(0,2)).map(resourceMarkup).join('')+(rs.length>2?'<button type="button" class="rw-point-more" data-point-more aria-expanded="'+!!state.pointExpanded+'">'+(state.pointExpanded?'收起':'展开更多')+'</button>':'')+'</div>');
  }
  async function download(state,button) {
    const r = data.resource(state.id), feedback = state.panel.querySelector('.rw-detail-feedback');
    if (state.downloading) return; state.downloading = true; button.disabled = true; button.textContent = '准备下载…'; feedback.hidden = true;
    try {
      let blob;
      if (r.artifact) {
        const manifest = await fetch('/paper-theme/downloads/manifest.json').then(response => {if (!response.ok) throw new Error();return response.json();});
        const output = manifest[r.artifact];
        if (!output) throw new Error('下载文件尚未准备完成');
        const response = await fetch(output); if (!response.ok) throw new Error('下载文件读取失败');
        blob = await response.blob();
      } else {
        const source = state.frame.getAttribute('srcdoc');
        if (!source) throw new Error('当前作品没有可下载的 HTML');
        const doc = new DOMParser().parseFromString(source,'text/html');
        const base = new URL(doc.querySelector('base')?.getAttribute('href') || '.',location.href);
        doc.querySelectorAll('base').forEach(node => node.remove());
        for (const node of doc.querySelectorAll('script[src],link[rel="stylesheet"][href],img[src],source[src],audio[src],video[src]')) {
          const attr = node.hasAttribute('src')?'src':'href', url = new URL(node.getAttribute(attr),base);
          if (!['http:','https:'].includes(url.protocol)) continue;
          if (url.origin !== location.origin) throw new Error('作品含外部素材，暂无法打包');
          const response = await fetch(url); if (!response.ok) throw new Error('作品素材读取失败');
          const asset = await response.blob();
          const encoded = await new Promise((resolve,reject) => {const reader = new FileReader();reader.onload = () => resolve(reader.result);reader.onerror = reject;reader.readAsDataURL(asset);});
          node.setAttribute(attr,encoded);
        }
        blob = new Blob(['<!doctype html>\n',doc.documentElement.outerHTML],{type:'text/html;charset=utf-8'});
      }
      if (!blob.size) throw new Error('下载文件为空');
      const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `${r.title.replace(/[\\/:*?"<>|]/g,'_')}.html`;link.hidden = true;document.body.append(link);link.click();link.remove();setTimeout(() => URL.revokeObjectURL(url),60000);
      data.recordDownload(r.id); feedback.textContent = '已开始下载'; feedback.hidden = false;
    } catch (error) {feedback.textContent = error.message || '下载失败，请重试';feedback.hidden = false;}
    finally {state.downloading = false;if (button.isConnected) {button.disabled = false;button.innerHTML = `${icon('download')}下载`;}}
  }
  function schedule() {if (!pending) {pending = true;requestAnimationFrame(mount);}}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('popstate',schedule); let url = location.href;setInterval(() => {if (url !== location.href) {url = location.href;schedule();}},200);
  addEventListener('keydown',event => {if (event.key === 'Escape' && current?.frame?.parentElement.classList.contains('rw-detail-fullscreen')) toggleFullscreen(current);});
  async function init() {if (!window.WorkshopData) {setTimeout(init,50);return;}data = window.WorkshopData;await data.ready;data.subscribe(() => {revision++;schedule();});schedule();}
  init();
})();
