/* My Resources: user-requested collection behavior, kept separate from the original runtime. */
(async () => {
  'use strict';
  // The standalone build has no source-level mount hook. Read (never modify)
  // the attached event props to wait for hydration before extending its DOM.
  const mounted = await new Promise(resolve => {
    let frames = 0;
    function check() {
      const root = document.querySelector('.font-fxls.h-screen');
      const attached = node => !!node && Object.keys(node).some(k => k.startsWith('__reactProps$'));
      const controls = root ? [...root.querySelectorAll('button,a,input,textarea')].filter(node=>!node.closest('[data-rw-owned]')) : [];
      if (document.readyState === 'complete' && attached(root) && controls.length && controls.every(attached)) {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))); return;
      }
      if (++frames > 600) { resolve(false); return; }
      requestAnimationFrame(check);
    }
    check();
  });
  if (!mounted) return;
  const PATHS = {
    eye:'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3',
    chevron:'m15 18-6-6 6-6',
    library:'M4 3h5v18H4zM11 3h4v18h-4zM18 5l3 15',
    bookmark:'M6 3h12v18l-6-4-6 4z',
    heart:'M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7z',
    person:'M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 21v-2a7 7 0 0 1 14 0v2M19 6h4M21 4v4',
    pen:'m4 16-1 5 5-1L21 7l-5-5L4 16ZM14 4l5 5',
    folder:'M3 5h6l2 3h10v12H3z',
    plus:'M12 5v14M5 12h14',
    search:'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-2 4 6 6',
    arrow:'M4 12h15m-6-6 6 6-6 6',
    grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    list:'M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1',
    file:'M5 2h9l5 5v15H5zM14 2v6h5',
    download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
    close:'m5 5 14 14M5 19 19 5',
    more:'M5 12h.01M12 12h.01M19 12h.01',
    check:'m4 12 5 5L20 6',
  };
  const icon = (name, cls='') => `<svg class="rw-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[name] || PATHS.file}"/></svg>`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const setAttr = (el,name,value) => { if (el.getAttribute(name) !== String(value)) el.setAttribute(name,String(value)); };
  const text = (el,value) => { if (el && el.textContent !== String(value)) el.textContent = String(value); };
  const KEY = 'resource-workshop.library.v1';
  const CATEGORIES = [['created','我创作的'],['saved','我收藏的'],['liked','我点赞的'],['files','我的上传']];
  if (window.WorkshopData) await WorkshopData.ready;
  const initial = () => ({saved:{},liked:{},following:{},custom:[],groups:[]});
  let uploadCount=0;
  let state=initial(),catalog=[],version=0,ready=false,search='',kind='all',sort='recent',layout='grid',currentHome,scheduled=false,lastURL='',dialog,toastTimer;
  const roots=new WeakMap();
  function readState(){try{state={...initial(),...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch{state=initial();}}
  readState();
  const allResources=()=>window.WorkshopData?WorkshopData.resources():[...catalog,...state.custom.filter(r=>!catalog.some(c=>c.id===r.id))];
  const browsableResources=()=>allResources().filter(r=>window.WorkshopPreviews?.isBrowsable(r)??(!r.legacy&&!!(r.mock||r.artifact||r.href)));
  const resource=id=>allResources().find(r=>r.id===id);
  const inCategory=(r,category)=>category==='saved'?!!state.saved[r.id]:category==='liked'?!!state.liked[r.id]:category==='created'?r.created===true:r.created===true||!!state.saved[r.id]||!!state.liked[r.id];
  const routeState=()=>{const q=new URLSearchParams(location.search);return {library:location.pathname==='/'&&q.get('page')==='my-resources',category:CATEGORIES.some(([key])=>key===q.get('category'))?q.get('category'):'created'};};
  const libraryURL=(category='created')=>'/?'+new URLSearchParams({page:'my-resources',...(category!=='created'?{category}:{})});
  const count=category=>category==='files'?uploadCount:browsableResources().filter(r=>inCategory(r,category)).length;
  const collectedAt=(r,category)=>category==='saved'?state.saved[r.id]||0:category==='liked'?state.liked[r.id]||0:r.createdAt||0;
  const selectedResources=category=>browsableResources().filter(r=>inCategory(r,category)&&(!search||`${r.title} ${r.author} ${r.kind}`.toLowerCase().includes(search.toLowerCase()))&&(kind==='all'||r.kind===kind)).sort((a,b)=>sort==='name'?a.title.localeCompare(b.title,'zh-CN'):collectedAt(b,category)-collectedAt(a,category));
  function toast(message,error=false){let node=document.getElementById('rw-toast');if(!node){node=document.createElement('div');node.id='rw-toast';node.className='rw-toast';node.setAttribute('role','status');node.dataset.rwOwned='';document.body.appendChild(node);}node.classList.toggle('rw-error',error);text(node,message);node.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.hidden=true,3000);}
  function save(next,message){try{localStorage.setItem(KEY,JSON.stringify(next));state=next;version++;refresh();window.WorkshopData?.notify();if(message)toast(message);return true;}catch{toast('未能保存，请检查可用存储空间。',true);return false;}}
  function toggle(action,id){if(!['save','like'].includes(action)||!resource(id))return false;const field=action==='save'?'saved':'liked',active=!!state[field][id];if(window.WorkshopData){const ok=WorkshopData.toggle(action,id);if(ok)toast(action==='save'?(active?'已取消收藏':'已收藏'):(active?'已取消点赞':'已点赞'));return ok;}const next={...state,[field]:{...state[field]}};if(active)delete next[field][id];else next[field][id]=Date.now();return save(next,action==='save'?(active?'已取消收藏':'已收藏'):(active?'已取消点赞':'已点赞'));}
  function setPage(category='created'){search='';kind='all';if(!routeState().library){location.assign(libraryURL(category));return;}history.pushState({},'',libraryURL(category));version++;refresh();}
  function resourceCard(r,compact=false){
    const action=(name,label,glyph,pressed,extra='')=>`<button type="button" data-rw-action="${name}" data-id="${escape(r.id)}" aria-label="${label} ${escape(r.title)}" title="${label}" ${pressed===undefined?'':`aria-pressed="${pressed}"`}>${icon(glyph)}${extra}</button>`;
    const points=window.WorkshopData?.knowledge(r.id)||[];
    return `<article class="rw-card rw-index-card${compact?' rw-compact':''}" data-rw-resource="${escape(r.id)}"><a ${r.mock ? 'aria-disabled="true"' : `href="${escape(r.href)}"`} class="rw-card-link" ${r.id.startsWith('creation:')&&r.artifact?`data-rw-action="open-created" data-id="${escape(r.id)}"`:''}><div class="rw-cover">${window.WorkshopPreviews?.markup(r)||(r.cover?`<img src="${escape(r.cover)}" alt="" loading="lazy">`:'<span class="ws-preview-empty">暂无预览</span>')}</div><div class="rw-card-copy"><div class="rw-resource-caption"><span class="rw-resource-type">${escape(r.kind)}</span><span class="rw-view-count" aria-label="${r.views||0} 次浏览">${icon('eye')}${r.views||0}</span></div><h3>${escape(r.title)}</h3>${points.length?`<div class="rw-knowledge-labels">${points.slice(0,2).map(k=>`<span>${escape(k.label||k.title||k.name)}</span>`).join('')}</div>`:''}</div></a><div class="rw-card-actions"><span class="rw-author"><img src="/sites/feixianglaoshi-84909e4a/chat-78e0e1bd/avatar.png" alt="">${escape(r.author)}</span>${action('save',state.saved[r.id]?'取消收藏':'收藏','bookmark',!!state.saved[r.id])}${action('knowledge','设置知识点','pen')}${action('like',state.liked[r.id]?'取消点赞':'点赞','heart',!!state.liked[r.id],`<span class="rw-votes" aria-hidden="true">${r.likes||0}</span>`)}</div></article>`;
  }
  function emptyState(category,filtered=false){const title=filtered?'没有找到匹配的资源':{created:'暂无创作的资源',saved:'暂无收藏的资源',liked:'暂无点赞的资源',all:'暂无资源'}[category];return `<div class="rw-empty">${icon(filtered?'search':'library')}<h3>${title}</h3>${filtered?'<button class="rw-button" type="button" data-rw-action="clear-search">清除筛选</button>':`<a class="rw-button" href="${category==='created'?'/':'/plaza/resource'}">${category==='created'?'开始创作':'发现资源'}${icon('arrow')}</a>`}</div>`;}
  function tabs(category){return `<div class="rw-tabs" role="tablist" aria-label="我的资源分类">${CATEGORIES.map(([key,label])=>`<button type="button" role="tab" id="rw-tab-${key}" aria-controls="rw-resources-panel" aria-selected="${category===key}" tabindex="${category===key?'0':'-1'}" data-rw-action="category" data-category="${key}">${label}<span>${count(key)}</span></button>`).join('')}</div>`;}
  function resourceToolbar(){return `<div class="rw-toolbar"><label class="rw-search">${icon('search')}<input type="search" placeholder="搜索资源或教师姓名" aria-label="搜索我的资源" value="${escape(search)}" data-rw-search></label><div class="rw-filters"><label><span class="rw-sr-only">资源类型</span><select aria-label="资源类型" data-rw-kind><option value="all">全部类型</option>${[...new Set(browsableResources().map(r=>r.kind))].map(t=>`<option ${kind===t?'selected':''}>${escape(t)}</option>`).join('')}</select></label><label><span class="rw-sr-only">排序方式</span><select aria-label="排序方式" data-rw-sort><option value="recent" ${sort==='recent'?'selected':''}>最近收录</option><option value="name" ${sort==='name'?'selected':''}>名称排序</option></select></label><div class="rw-layout" role="group" aria-label="展示方式"><button type="button" data-rw-action="layout" data-layout="grid" aria-label="网格视图" aria-pressed="${layout==='grid'}">${icon('grid')}</button><button type="button" data-rw-action="layout" data-layout="list" aria-label="列表视图" aria-pressed="${layout==='list'}">${icon('list')}</button></div></div></div>`;}
  function libraryHTML(route){return `<div class="rw-app rw-workbench rw-personal-library" data-rw-root><header class="rw-header"><nav class="rw-breadcrumb" aria-label="面包屑"><a href="/" aria-label="返回首页">${icon('chevron')}首页</a><span aria-hidden="true">/</span><span aria-current="page">我的资源</span></nav><div class="rw-title-row"><div><h1>我的资源</h1></div><div class="rw-header-actions"><a href="/" class="rw-button rw-primary">${icon('pen')}开始创作</a></div></div></header><div class="rw-workspace"><section class="rw-resource-panel" aria-label="资源列表">${tabs(route.category)}${route.category==='files'?'':resourceToolbar()}<div id="rw-resources-panel" role="tabpanel" aria-labelledby="rw-tab-${route.category}" tabindex="0"><div class="rw-result-line" aria-live="polite"></div><div class="rw-results"></div></div></section></div></div>`;}
  function renderResults(root){const route=routeState(),target=root.querySelector('.rw-results'),line=root.querySelector('.rw-result-line');if(!target)return;if(route.category==='files'){line.hidden=true;target.className='rw-results rw-upload-results';window.WorkshopUploads?.mountLibrary(target);return;}line.hidden=false;const items=selectedResources(route.category);text(line,`${items.length} 份资源`);target.className='rw-results '+(layout==='list'?'rw-list':'rw-grid');target.innerHTML=items.length?items.map(r=>resourceCard(r)).join(''):emptyState(route.category,!!search||kind!=='all');}
  function sync(home){currentHome=home;const route=routeState(),tabsNode=home.querySelector('[data-paper-home-tabs]'),gallery=home.querySelector('[data-paper-home-gallery]');if(!tabsNode||!gallery)return;const selectedTab=tabsNode.querySelector(':scope > div > button.font-medium')?.textContent.trim()||'教学资源';const active=selectedTab==='我的资源';let nodes=roots.get(home);if(!nodes){const page=document.createElement('div');page.dataset.rwOwned='';page.dataset.rwPage='';home.appendChild(page);const preview=document.createElement('div');preview.className='rw-home-preview rw-personal-preview';preview.dataset.rwOwned='';gallery.appendChild(preview);const more=document.createElement('button');more.type='button';more.textContent='更多我的资源';more.dataset.paperResourceMore='';more.dataset.rwAction='open-library';nodes={page,preview,more,signature:''};roots.set(home,nodes);}setAttr(home,'data-rw-preview',!route.library&&active);if(route.library){document.body.setAttribute('data-rw-library','');document.body.setAttribute('data-paper-library-ready','');}else document.body.removeAttribute('data-rw-library');nodes.page.hidden=!route.library;nodes.preview.hidden=route.library||!active;if(!route.library&&active){if(nodes.more.parentElement!==tabsNode)tabsNode.appendChild(nodes.more);}else nodes.more.remove();const signature=[route.library,route.category,selectedTab,version,ready].join('|');if(nodes.signature===signature)return;nodes.signature=signature;if(route.library){document.title='我的资源 · 资源工坊';nodes.page.innerHTML=libraryHTML(route);renderResults(nodes.page);const selected=nodes.page.querySelector('.rw-tabs [aria-selected="true"]');if(selected){const strip=selected.parentElement,overflow=selected.getBoundingClientRect().right-strip.getBoundingClientRect().right;if(overflow>0)strip.scrollLeft+=overflow+4;}}else if(active){const seen=new Set();const items=browsableResources().filter(r=>inCategory(r,'all')).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).filter(r=>{const key=JSON.stringify([r.title.trim(),r.artifact||r.id]);if(seen.has(key))return false;seen.add(key);return true;}).slice(0,5);nodes.preview.innerHTML=`<div class="rw-preview-grid">${items.length?items.map(r=>resourceCard(r,true)).join(''):emptyState('all')}</div>`;}}
  function refresh(){if(currentHome?.isConnected)sync(currentHome);scheduleScan();}
  function openCreated(r){if(!r?.artifact)return;if(!dialog){dialog=document.createElement('dialog');dialog.className='rw-dialog rw-dialog-wide';dialog.dataset.rwOwned='';dialog.addEventListener('click',e=>{if(e.target===dialog){const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)dialog.close();}});document.body.appendChild(dialog);}dialog.innerHTML=`<header><h2>${escape(r.title)}</h2><button type="button" class="rw-icon-button" data-rw-action="close-dialog" aria-label="关闭弹窗">${icon('close')}</button></header><div class="rw-dialog-body"><iframe class="rw-created-frame" src="${escape(r.artifact)}" title="${escape(r.title)}"></iframe><div class="rw-dialog-actions"><button type="button" class="rw-button" data-rw-action="knowledge" data-id="${escape(r.id)}">设置知识点</button><a href="${escape(r.href)}" class="rw-button">继续创作</a><a href="${escape(r.artifact)}" download="${escape(r.filename||r.title+'.html')}" data-rw-download="${escape(r.id)}" class="rw-button rw-primary">${icon('download')}下载作品</a></div></div>`;dialog.showModal();}
  document.addEventListener('click',event=>{const download=event.target.closest('[data-rw-download]');if(download)window.WorkshopData?.recordDownload(download.dataset.rwDownload);const button=event.target.closest('[data-rw-action]');if(!button)return;const action=button.dataset.rwAction,id=button.dataset.id;event.preventDefault();event.stopImmediatePropagation();if(['save','like'].includes(action)){toggle(action,id);return;}if(action==='knowledge'){if(dialog?.open)dialog.close();window.WorkshopKnowledge?.open(id);return;}if(action==='upload'){window.WorkshopUploads?.upload();return;}if(action==='open-created'){openCreated(resource(id));return;}if(action==='close-dialog'){dialog?.close();return;}if(action==='open-library'){setPage();return;}if(action==='category'){setPage(button.dataset.category);document.getElementById('rw-tab-'+button.dataset.category)?.focus({preventScroll:true});return;}if(action==='clear-search'){search='';kind='all';version++;refresh();return;}if(action==='layout'){layout=button.dataset.layout;version++;refresh();document.querySelector(`[data-rw-action="layout"][data-layout="${layout}"]`)?.focus({preventScroll:true});}},true);
  document.addEventListener('input',event=>{if(event.target.matches('[data-rw-search]')){search=event.target.value.trim();renderResults(event.target.closest('[data-rw-root]'));}});
  document.addEventListener('change',event=>{if(event.target.matches('[data-rw-kind],[data-rw-sort]')){if(event.target.hasAttribute('data-rw-kind'))kind=event.target.value;else sort=event.target.value;renderResults(event.target.closest('[data-rw-root]'));}});
  document.addEventListener('keydown',event=>{const tab=event.target.closest('.rw-tabs [role="tab"]');if(!tab||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();const index=CATEGORIES.findIndex(([key])=>key===tab.dataset.category),next=event.key==='Home'?0:event.key==='End'?CATEGORIES.length-1:(index+(event.key==='ArrowRight'?1:-1)+CATEGORIES.length)%CATEGORIES.length;setPage(CATEGORIES[next][0]);document.getElementById('rw-tab-'+CATEGORIES[next][0])?.focus({preventScroll:true});});
  function decorateOriginalCards(){
    document.querySelectorAll('a[href*="/share/"]').forEach(card=>{
      if(card.closest('[data-rw-owned]'))return;
      const id=new URL(card.href).pathname.split('/').pop(),r=window.WorkshopData?.resource(id)||resource(id);if(!r)return;
      const thumb=card.querySelector('[data-paper-card-image]');if(!thumb)return;
      const meta=card.querySelector('[data-paper-card-meta]');
      if(meta){
        const author=meta.querySelector(':scope > span.flex-1');if(author)text(author,r.author||'教师');
        const likes=meta.querySelector('svg.lucide-star')?.parentElement;
        if(likes){const total=String(Number(r.likes||0)),number=[...likes.childNodes].find(n=>n.nodeType===3&&n.nodeValue.trim());if(number&&number.nodeValue!==total)number.nodeValue=total;setAttr(likes,'data-rw-original-liked',window.WorkshopData?.isLiked(id)??!!state.liked[id]);setAttr(likes,'aria-label',`${window.WorkshopData?.isLiked(id)?'已点赞，':''}${total} 次点赞`);}
      }
      let control=thumb.querySelector('[data-rw-bookmark]');
      if(!control){control=document.createElement('button');control.type='button';control.className='rw-bookmark';control.dataset.rwBookmark='';control.dataset.rwAction='save';control.dataset.id=id;control.innerHTML=icon('bookmark');thumb.appendChild(control);}
      const saved=window.WorkshopData?.isSaved(id)??!!state.saved[id];setAttr(control,'aria-label',`${saved?'取消收藏':'收藏'} ${r.title}`);setAttr(control,'aria-pressed',saved);setAttr(control,'title',saved?'取消收藏':'收藏');
    });
  }
  function captureCreation(){
    if(location.pathname!=='/chat'||!ready)return;
    const q=new URLSearchParams(location.search),chatId=q.get('chatId');if(!chatId?.startsWith('sim-'))return;
    const id='creation:'+chatId;if(state.custom.some(r=>r.id===id))return;
    const download=document.querySelector('[data-paper-content] main section a[download]');
    const adaptation=chatId.startsWith('sim-adapt-')&&q.get('html')&&q.get('art');
    const view=adaptation?[...document.querySelectorAll('[data-paper-content] main button')].find(b=>b.textContent.trim()==='查看'&&b.parentElement.querySelector(':scope > .flex-1')?.textContent.trim()===q.get('art')):null;
    if(!download&&!view)return;
    const box=(download||view).parentElement,filename=download?.getAttribute('download')||q.get('art')||'';
    const title=box.querySelector(':scope > .flex-1')?.textContent.trim()||filename.replace(/\.(html?|docx)$/i,'');if(!title||title.length>300)return;
    const outputURL=new URL(download?.href||q.get('html'),location.origin);
    const artifact=outputURL.origin===location.origin&&outputURL.pathname.startsWith('/artifacts/')?outputURL.pathname:'';
    const existing=allResources(),card=existing.find(r=>title.includes(r.title.split(/[｜：·]/)[0])||r.title.includes(title));
    const profile=window.WorkshopData?.base.profile||{id:'1000202320',name:'我'},context=window.WorkshopData?.contextFor(id)||{};
    const source=adaptation?existing.find(r=>r.artifact===new URL(q.get('html'),location.origin).pathname):null;
    const item={...context,id,title,href:location.pathname+location.search,artifact,filename,author:profile.name,authorId:profile.id,cover:card?.cover||'',kind:/\.docx$/i.test(filename)?'试卷':card?.kind||(/试卷|练习题/.test(title)?'试卷':'教学应用'),feature:q.get('feat')||context.feature||card?.feature||'互动课件',origin:adaptation?'adapted':'original',sourceId:source?.id||context.sourceId||null,attachments:window.WorkshopUploads?.attachmentsFor(chatId)||[],created:true,createdAt:Date.now(),likes:0,saves:0,downloads:0,views:0};
    readState();save({...state,custom:[item,...state.custom]});
  }
  function scan(){scheduled=false;if(ready){decorateOriginalCards();captureCreation();}const home=document.querySelector('[data-paper-home-body]');if(home)sync(home);window.PaperListNavigation?.();}
  function scheduleScan(){if(!scheduled){scheduled=true;requestAnimationFrame(scan);}}
  new MutationObserver(scheduleScan).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','href']});
  addEventListener('popstate',()=>{search='';version++;refresh();});
  addEventListener('storage',event=>{if(event.key===KEY){readState();version++;refresh();}});
  document.addEventListener('workshop-data-changed',()=>{readState();version++;refresh();});
  setInterval(()=>{if(location.href!==lastURL){lastURL=location.href;scheduleScan();}},250);
  async function refreshFiles(){try{uploadCount=(await window.WorkshopUploads?.list()||[]).length;version++;refresh();}catch{}}
  document.addEventListener('workshop-files-changed',refreshFiles);
  document.addEventListener('workshop-uploads-ready',refreshFiles);
  if(window.WorkshopUploads)void refreshFiles();
  window.PaperResources=Object.assign(window.PaperResources||{},{sync,refresh,all:allResources,toggle});
  document.dispatchEvent(new Event('paper-resources-ready'));
  if(window.WorkshopData){ready=true;catalog=WorkshopData.resources();version++;refresh();}else{try{catalog=await fetch('/paper-theme/resources/catalog.json').then(r=>r.json());ready=true;version++;refresh();}catch{toast('资源列表加载失败，请刷新重试。',true);}}
  scheduleScan();
})();
