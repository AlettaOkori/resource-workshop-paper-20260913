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
  const KEY = 'resource-workshop.library.v1';
  const CATEGORIES = [['all','全部资源'],['created','我创作的'],['saved','我收藏的'],['followed','我关注的'],['liked','我点赞的']];
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
  const initial = () => ({saved:{},liked:{},following:{},custom:[],groups:[]});
  let state = initial(), catalog = [], version = 0, ready = false, loadError = ''; 
  let search = '', kind = 'all', sort = 'recent', layout = 'grid', currentHome, dialog, dialogInvoker, toastTimer;
  let lastURL = '', scheduled = false;
  let selectionMode=false, selection=new Set(), addTarget='', editingGroup=null, groupQuery='', popover, popIds=[], undoTask=null, dragIds=[];
  const roots = new WeakMap();
  try { const value=JSON.parse(localStorage.getItem(KEY)); if(value)state={...initial(),...value}; } catch { loadError='读取资源记录失败，请检查浏览器存储是否可用。'; }
  const allResources = () => [...catalog,...state.custom.filter(r=>!catalog.some(c=>c.id===r.id))];
  const resource = id => allResources().find(r=>r.id===id);
  const own = r => r.created === true;
  const followed = r => !!state.following[r.authorId];
  const inCategory = (r,category) => category==='saved' ? !!state.saved[r.id] : category==='liked' ? !!state.liked[r.id] : category==='followed' ? followed(r) : category==='created' ? own(r) : own(r)||!!state.saved[r.id]||!!state.liked[r.id]||followed(r)||state.groups.some(g=>g.resourceIds.includes(r.id));
  const groupById = id => state.groups.find(g=>g.id===id);
  const groupResources = group => allResources().filter(r=>group.resourceIds.includes(r.id));
  const scopeMatch = (r,id='') => !id || (id==='__ungrouped'?!state.groups.some(g=>g.resourceIds.includes(r.id)):!!groupById(id)?.resourceIds.includes(r.id));
  const count = (category,groupId='') => allResources().filter(r=>inCategory(r,category)&&scopeMatch(r,groupId)).length;
  const routeState = () => { const q=new URLSearchParams(location.search);return {library:location.pathname==='/'&&q.get('page')==='my-resources',category:CATEGORIES.some(([key])=>key===q.get('category'))?q.get('category'):'all',group:q.get('group')||'',groups:['groups','folders'].includes(q.get('view'))}; };
  const libraryURL = (category='all',groups=false,group='') => '/?'+new URLSearchParams({page:'my-resources',...(category!=='all'?{category}:{}),...(group?{group}:{})});
  function toast(message,error=false) {
    undoTask=null;
    if(error&&dialog?.open){let note=dialog.querySelector('.rw-form-error');if(!note){note=document.createElement('p');note.className='rw-form-error';note.setAttribute('role','alert');dialog.querySelector('.rw-dialog-body').prepend(note);}text(note,message);return;}
    let node=document.getElementById('rw-toast');
    if(!node){node=document.createElement('div');node.id='rw-toast';node.className='rw-toast';node.setAttribute('role','status');node.setAttribute('aria-live','polite');document.body.appendChild(node);}
    node.classList.toggle('rw-error',error);text(node,message);node.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{node.hidden=true;},3600);
  }
  function save(next,message) {
    try { localStorage.setItem(KEY,JSON.stringify(next));state=next;version++;refresh();if(message)toast(message);return true; }
    catch { toast('未能保存，请检查浏览器的可用存储空间。',true);return false; }
  }
  function toggle(action,id) {
    const r=resource(id);if(!r)return;
    const field=action==='save'?'saved':action==='like'?'liked':'following', key=field==='following'?r.authorId:r.id;
    const active=!!state[field][key],next={...state,[field]:{...state[field]}};
    if(active)delete next[field][key];else next[field][key]=Date.now();
    const messages={save:active?'已取消收藏':'已收藏，可在「我的资源 · 我收藏的」查看',like:active?'已取消点赞':'已点赞，可在「我的资源 · 我点赞的」查看',follow:active?'已取消关注':'已关注，作者的资源已归入「我关注的」'};
    save(next,messages[action]);
  }
  function dateLabel(time){return time?new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit'}).format(time):'原有作品';}
  function setPage(category='all',groups=false,group='') {
    search='';kind='all';selectionMode=false;selection.clear();addTarget='';hidePopover();
    if(!routeState().library){location.assign(libraryURL(category,groups,group));return;}
    history.pushState({},'',libraryURL(category,groups,group));version++;refresh();
  }
  function changeCategory(category){
    if(!addTarget){setPage(category,false,routeState().group);return;}
    search='';kind='all';history.pushState({},'',libraryURL(category,false,routeState().group));version++;refresh();
  }
  const collectedAt = (r,category='all') => category==='saved'?state.saved[r.id]||0:category==='liked'?state.liked[r.id]||0:category==='followed'?state.following[r.authorId]||0:category==='created'?r.createdAt||0:Math.max(r.createdAt||0,state.saved[r.id]||0,state.liked[r.id]||0,state.following[r.authorId]||0);
  const selectedResources = category => allResources().filter(r=>inCategory(r,category)&&scopeMatch(r,routeState().group)&&(!search||`${r.title} ${r.author} ${r.kind}`.toLowerCase().includes(search.toLowerCase()))&&(kind==='all'||r.kind===kind)).sort((a,b)=>sort==='name'?a.title.localeCompare(b.title,'zh-CN'):collectedAt(b,category)-collectedAt(a,category));
  const bookThemes={'donghua-guanghe':'photosynthesis','donghua-gougu':'geometry','donghua-xibao':'cell','kejian-lifedays':'lifetime','mingti-shijuan':'exam','zuti-shijuan':'exam','yingyong-tangshi':'poetry','yingyong-taohua':'poetry','yingyong-huodong':'activity','yingyong-xiyou':'activity'};
  const bookCaption = kind => `<span>${escape(kind)}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12 12 4M5 4h7v7"/></svg>`;
  function libraryResourceCard(r,theme,inTarget) {
    const action=(name,label,glyph,pressed,extra='')=>`<button type="button" data-rw-action="${name}" data-id="${escape(r.id)}" aria-label="${label} ${escape(r.title)}" title="${label}" ${pressed===undefined?'':`aria-pressed="${pressed}"`}>${icon(glyph)}${extra}</button>`;
    return `<article class="rw-card rw-index-card" data-rw-resource="${escape(r.id)}" draggable="true" data-selected="${selection.has(r.id)}" data-in-target="${inTarget}"><label class="rw-card-select"><input type="checkbox" data-rw-select="${escape(r.id)}" aria-label="选择 ${escape(r.title)}" ${selection.has(r.id)?'checked':''} ${inTarget?'disabled':''}><span class="rw-sr-only">选择资源</span></label><a href="${escape(r.href)}" draggable="false" class="rw-card-link" ${r.artifact?`data-rw-action="open-created" data-id="${escape(r.id)}"`:''}><div class="rw-cover"><img src="${escape(r.cover||`/paper-theme/assets/${theme}.svg`)}" alt="" loading="lazy" draggable="false">${inTarget?'<span class="rw-already-in">已在分组</span>':''}</div><div class="rw-card-copy"><div class="rw-resource-caption"><span class="rw-resource-type">${escape(r.kind)}</span><span class="rw-view-count" aria-label="${r.views||0} 次浏览">${icon('eye')}${r.views||0}</span></div><h3>${escape(r.title)}</h3></div></a><div class="rw-card-actions"><span class="rw-author"><img src="/sites/feixianglaoshi-84909e4a/chat-78e0e1bd/avatar.png" alt="">${escape(r.author)}</span>${action('save',state.saved[r.id]?'取消收藏':'收藏','bookmark',!!state.saved[r.id])}${action('assign-groups','整理分组','folder')}${groupById(routeState().group)?action('remove-from-group','移出分组','close'):''}${action('like',state.liked[r.id]?'取消点赞':'点赞','star',!!state.liked[r.id],`<span class="rw-votes" aria-hidden="true">${r.likes+(state.liked[r.id]?1:0)}</span>`)}</div></article>`;
  }
  function resourceCard(r,compact=false) {
    const theme=Object.entries(bookThemes).find(([key])=>r.cover?.includes(key))?.[1]||(r.kind==='试卷'?'exam':'activity');
    const interactive=routeState().library&&!compact,inTarget=!!addTarget&&!!groupById(addTarget)?.resourceIds.includes(r.id);
    if(!compact)return libraryResourceCard(r,theme,inTarget);
    return `<article class="rw-card${compact?' rw-compact':''}" data-rw-resource="${escape(r.id)}" data-rw-cover="${theme}" ${interactive?'draggable="true"':''} data-selected="${selection.has(r.id)}" data-in-target="${inTarget}">${interactive?`<label class="rw-card-select"><input type="checkbox" data-rw-select="${escape(r.id)}" aria-label="选择 ${escape(r.title)}" ${selection.has(r.id)?'checked':''} ${inTarget?'disabled':''}><span class="rw-sr-only">选择资源</span></label>`:''}<a href="${escape(r.href)}" draggable="false" class="rw-card-link" ${r.artifact?`data-rw-action="open-created" data-id="${escape(r.id)}"`:""}><span class="paper-book-caption">${bookCaption(r.kind)}</span><div class="rw-cover"><img src="/paper-theme/assets/${theme}.svg" alt="" loading="lazy" draggable="false"><span class="rw-kind">${escape(r.kind)}</span>${inTarget?'<span class="rw-already-in">已在分组</span>':''}</div><div class="rw-card-copy"><h3>${escape(r.title)}</h3><p>${escape(r.author)}<span>${r.legacy?'历史创作':dateLabel(r.createdAt)}</span></p></div></a><div class="rw-card-actions"><span class="rw-origin">${r.views||0} 浏览 · ${own(r)?'我的创作':followed(r)?'关注的作者':'收录资源'}</span><button type="button" data-rw-action="save" data-id="${escape(r.id)}" aria-label="${state.saved[r.id]?'取消收藏':'收藏'} ${escape(r.title)}" aria-pressed="${!!state.saved[r.id]}" title="${state.saved[r.id]?'取消收藏':'收藏'}">${icon('bookmark')}</button><button type="button" data-rw-action="like" data-id="${escape(r.id)}" aria-label="${state.liked[r.id]?'取消点赞':'点赞'} ${escape(r.title)}" aria-pressed="${!!state.liked[r.id]}" title="${state.liked[r.id]?'取消点赞':'点赞'}">${icon('heart')}<span class="rw-votes" aria-hidden="true">${r.likes+(state.liked[r.id]?1:0)}</span></button><button type="button" data-rw-action="assign-groups" data-id="${escape(r.id)}" aria-label="整理分组 ${escape(r.title)}" title="整理分组">${icon('folder')}</button>${groupById(routeState().group)?`<button type="button" data-rw-action="remove-from-group" data-id="${escape(r.id)}" aria-label="移出分组 ${escape(r.title)}" title="移出当前分组">${icon('close')}</button>`:''}</div></article>`;
  }
  function emptyState(category,filtered=false) {
    const labels={saved:['bookmark','还没有收藏的资源','看到喜欢的内容，点击收藏，就能在这里再次找到。'],liked:['heart','把有共鸣的资源留下来','为资源点赞后，会自动收录到这里。'],followed:['person','从一位值得关注的创作者开始','关注作者后，在这里集中查看他们的资源。'],created:['pen','下一份好资源，从你的想法开始','完成创作后，作品会自动归入这里。'],all:['library','把资源慢慢积累在这里','收藏、关注、点赞和创作的内容，都会汇集在此。']};
    const [glyph,title,description]=filtered?['search','没有找到匹配的资源','换个关键词或筛选条件试试。']:labels[category]||labels.all;
    return `<div class="rw-empty">${icon(glyph)}<h3>${title}</h3><p>${description}</p>${filtered?'<button type="button" class="rw-button" data-rw-action="clear-search">清除筛选</button>':`<a class="rw-button" href="${category==='created'?'/':'/plaza/resource'}">${category==='created'?'开始创作':'发现资源'} ${icon('arrow')}</a>`}</div>`;
  }
  function tabs(category,groupId='') {return `<div class="rw-tabs" role="tablist" aria-label="我的资源分类">${CATEGORIES.map(([key,label])=>`<button type="button" role="tab" id="rw-tab-${key}" aria-controls="rw-resources-panel" aria-selected="${category===key}" tabindex="${category===key?'0':'-1'}" data-rw-action="category" data-category="${key}">${label}<span>${ready?count(key,groupId):'—'}</span></button>`).join('')}</div>`;}
  function followingStrip(category,groupId='') {
    if(category!=='followed'||!Object.keys(state.following).length)return '';
    const scoped=allResources().filter(r=>scopeMatch(r,groupId));
    const authors=[...new Map(scoped.filter(followed).map(r=>[r.authorId,r])).values()];
    if(!authors.length)return '';
    return `<div class="rw-authors">${authors.map(r=>`<div><span class="rw-author-avatar">${escape(r.author.slice(0,1))}</span><span>${escape(r.author)}<small>${scoped.filter(x=>x.authorId===r.authorId).length} 份资源</small></span><button type="button" data-rw-action="follow" data-id="${escape(r.id)}" aria-label="取消关注 ${escape(r.author)}">已关注 ${icon('check')}</button></div>`).join('')}</div>`;
  }
  function resourceToolbar() {
    return `<div class="rw-toolbar"><label class="rw-search">${icon('search')}<input type="search" placeholder="搜索我的资源" aria-label="搜索我的资源" value="${escape(search)}" data-rw-search></label><div class="rw-filters"><label><span class="rw-sr-only">资源类型</span><select aria-label="资源类型" data-rw-kind><option value="all">全部类型</option>${['教学动画','教学应用','互动课件','试卷'].map(t=>`<option ${kind===t?'selected':''}>${t}</option>`).join('')}</select></label><label><span class="rw-sr-only">排序方式</span><select aria-label="排序方式" data-rw-sort><option value="recent" ${sort==='recent'?'selected':''}>最近收录</option><option value="name" ${sort==='name'?'selected':''}>名称排序</option></select></label><button type="button" class="rw-button rw-select-mode" data-rw-action="select-mode" aria-pressed="${selectionMode}">${icon('check')}批量整理</button><div class="rw-layout" role="group" aria-label="展示方式"><button type="button" data-rw-action="layout" data-layout="grid" aria-label="网格视图" aria-pressed="${layout==='grid'}">${icon('grid')}</button><button type="button" data-rw-action="layout" data-layout="list" aria-label="列表视图" aria-pressed="${layout==='list'}">${icon('list')}</button></div></div></div>`;
  }
  function groupEditor(id='') {
    return `<form class="rw-rail-editor" data-rw-inline-group data-id="${escape(id)}"><label class="rw-sr-only" for="rw-group-name">分组名称</label><input id="rw-group-name" name="name" placeholder="输入分组名称" value="${escape(editingGroup?.value||'')}" maxlength="40" required autocomplete="off"><div><button type="submit" class="rw-text-button">${id?'保存':'创建'}</button><button type="button" class="rw-text-button" data-rw-action="cancel-edit">取消</button></div><p class="rw-inline-error" role="alert" hidden></p></form>`;
  }
  function groupRail(route) {
    if(state.groups.length<=5)groupQuery='';
    return `<aside class="rw-group-rail" aria-label="资源分组"><div class="rw-rail-title"><h2>资源分组</h2><button type="button" class="rw-icon-button" data-rw-action="new-group" aria-label="新建分组" title="新建分组">${icon('plus')}</button></div><button type="button" class="rw-rail-all" data-rw-action="open-library" aria-current="${!route.group?'page':'false'}">${icon('library')}<span>全部资源</span><small>${count('all')}</small></button><button type="button" class="rw-rail-all" data-rw-action="open-group" data-id="__ungrouped" aria-current="${route.group==='__ungrouped'?'page':'false'}">${icon('grid')}<span>未分组</span><small>${count('all','__ungrouped')}</small></button><div class="rw-rail-divider"></div>${state.groups.length>5?`<label class="rw-rail-search">${icon('search')}<input type="search" aria-label="搜索分组" placeholder="查找分组" value="${escape(groupQuery)}" data-rw-rail-search></label>`:''}<div class="rw-rail-groups">${state.groups.map(g=>editingGroup?.id===g.id?groupEditor(g.id):`<div class="rw-group-row" data-rw-group-row="${escape(g.id)}" ${!g.name.toLowerCase().includes(groupQuery.toLowerCase())?'hidden':''}><button type="button" class="rw-group-target" data-rw-action="open-group" data-id="${escape(g.id)}" data-rw-drop="${escape(g.id)}" aria-label="打开分组 ${escape(g.name)}" aria-current="${route.group===g.id?'page':'false'}" title="${escape(g.name)}">${icon('folder')}<span>${escape(g.name)}</span><small>${groupResources(g).length}</small></button><button type="button" class="rw-group-more rw-icon-button" data-rw-action="group-menu" data-id="${escape(g.id)}" aria-label="分组操作 ${escape(g.name)}">${icon('more')}</button></div>`).join('')}${editingGroup?.id===''?groupEditor():''}</div>${!state.groups.length&&!editingGroup?'<p class="rw-rail-empty">按学科、班级或教学主题<br>建立自己的资源分组</p>':''}<button type="button" class="rw-rail-create" data-rw-action="new-group">${icon('plus')}新建分组</button><p class="rw-drag-hint">${icon('folder')}拖动资源到分组，即可加入</p></aside>`;
  }
  function libraryHTML(route) {
    const group=groupById(route.group),missing=route.group&&route.group!=='__ungrouped'&&!group,target=groupById(addTarget);
    const title=target?'选择要加入的资源':group?group.name:route.group==='__ungrouped'?'未分组':'全部资源';
    return `<div class="rw-app rw-workbench" data-rw-root><header class="rw-header"><nav class="rw-breadcrumb" aria-label="面包屑"><a href="/" aria-label="返回首页">${icon('chevron')}首页</a><span aria-hidden="true">/</span><span aria-current="page">我的资源</span></nav><div class="rw-title-row"><div><h1>我的资源<span class="rw-title-dot">.</span></h1><p>把灵感收好，把教学安排妥当。</p></div><div class="rw-header-actions"><a href="/" class="rw-button">${icon('pen')}开始创作</a></div></div></header><div class="rw-workspace">${groupRail(route)}<section class="rw-resource-panel" aria-label="资源列表">${missing?`<div class="rw-empty">${icon('folder')}<h3>这个分组已不存在</h3><p>资源仍可在「我的资源」中找到。</p><button type="button" class="rw-button" data-rw-action="open-library">返回全部资源</button></div>`:`<div class="rw-panel-heading"><div><h2 class="rw-panel-title" tabindex="-1">${escape(title)}</h2>${target||group||route.group==='__ungrouped'?`<p>${target?`加入「${escape(target.name)}」 · 勾选后点击下方确认`:group?'按你的教学节奏整理与使用':route.group==='__ungrouped'?'这些资源还没有加入任何分组':''}</p>`:''}</div>${group?`<button type="button" class="rw-button" data-rw-action="add-resources" data-id="${escape(group.id)}">${icon('plus')}添加资源</button>`:''}</div>${tabs(route.category,route.group)}${followingStrip(route.category,route.group)}${resourceToolbar()}<div class="rw-batch" aria-live="polite"></div><div id="rw-resources-panel" role="tabpanel" aria-labelledby="rw-tab-${route.category}" tabindex="0"><div class="rw-result-line" aria-live="polite"></div><div class="rw-results"></div></div>`}</section></div></div>`;
  }
  function updateSelection(root=document.querySelector('[data-rw-root]')) {
    if(!root)return;
    setAttr(root,'data-selecting',selectionMode);
    root.querySelectorAll('[data-rw-select]').forEach(input=>{input.checked=selection.has(input.dataset.rwSelect);setAttr(input.closest('.rw-card'),'data-selected',input.checked);});
    const mode=root.querySelector('[data-rw-action="select-mode"]');if(mode)setAttr(mode,'aria-pressed',selectionMode);
    const bar=root.querySelector('.rw-batch');if(!bar)return;
    if(!selectionMode){bar.innerHTML='';return;}
    const items=selectedResources(routeState().category).filter(r=>!addTarget||!groupById(addTarget)?.resourceIds.includes(r.id));
    const visibleSelected=items.filter(r=>selection.has(r.id)).length;
    bar.innerHTML=`<div class="rw-selection-bar"><label><input type="checkbox" data-rw-select-all aria-label="选择当前结果" ${items.length&&items.every(r=>selection.has(r.id))?'checked':''} ${!items.length?'disabled':''}><span>已选 <b>${selection.size}</b> 份${visibleSelected<selection.size?`<small>（当前显示 ${visibleSelected} 份）</small>`:''}</span></label><div class="rw-selection-actions">${addTarget?`<button type="button" class="rw-button rw-primary" data-rw-action="confirm-add" ${!selection.size?'disabled':''}>加入分组</button>`:`<button type="button" class="rw-button" data-rw-action="batch-group" ${!selection.size?'disabled':''}>${icon('folder')}加入分组</button>${groupById(routeState().group)?`<button type="button" class="rw-text-button" data-rw-action="batch-remove" ${!selection.size?'disabled':''}>移出本组</button>`:''}`}<button type="button" class="rw-text-button" data-rw-action="cancel-selection">${addTarget?'取消添加':'取消选择'}</button></div></div>`;
    const all=bar.querySelector('[data-rw-select-all]');if(all)all.indeterminate=!!visibleSelected&&visibleSelected<items.length;
  }
  function renderResults(root) {
    const route=routeState();
    const target=root.querySelector('.rw-results'),line=root.querySelector('.rw-result-line');if(!target)return;
    if(!ready){target.innerHTML=loadError?`<div class="rw-empty"><h3>暂时无法读取资源</h3><p>${escape(loadError)}</p><button class="rw-button" data-rw-action="retry">重新加载</button></div>`:'<div class="rw-loading" role="status">正在整理你的资源…</div>';return;}
    const items=selectedResources(route.category),group=groupById(route.group);text(line,`${items.length} 份资源${search?' · 搜索「'+search+'」':''}`);
    target.className='rw-results '+(layout==='list'?'rw-list':'rw-grid');target.innerHTML=items.length?items.map(r=>resourceCard(r)).join(''):group&&!search&&kind==='all'?`<div class="rw-empty">${icon('folder')}<h3>${route.category==='all'?'这个分组还没有资源':'分组里还没有这类资源'}</h3><p>${route.category==='all'?'从我的资源中选择内容，放进这个分组。':'可以查看分组内的全部资源，或继续添加内容。'}</p><button type="button" class="rw-button" data-rw-action="${route.category==='all'?'add-resources':'open-group'}" data-id="${escape(group.id)}">${route.category==='all'?'添加资源':'查看分组全部资源'}</button></div>`:route.group==='__ungrouped'&&!search&&kind==='all'?`<div class="rw-empty">${icon('check')}<h3>这个视图里的资源都整理好了</h3><p>可以从左侧分组继续查找和使用资源。</p><button type="button" class="rw-button" data-rw-action="open-library">查看全部资源</button></div>`:emptyState(route.category,!!search||kind!=='all');
    updateSelection(root);
  }
  function sync(home) {
    currentHome=home;
    const route=routeState();
    const tabsNode=home.querySelector('[data-paper-home-tabs]'),gallery=home.querySelector('[data-paper-home-gallery]');
    if(!tabsNode||!gallery)return;
    const active=tabsNode.querySelector(':scope > div > button.font-medium')?.textContent.trim()==='我的资源';
    let nodes=roots.get(home);
    if(!nodes){
      const page=document.createElement('div');page.dataset.rwOwned='';page.dataset.rwPage='';home.appendChild(page);
      const preview=document.createElement('div');preview.className='rw-home-preview';preview.dataset.rwOwned='';gallery.appendChild(preview);
      const more=document.createElement('button');more.type='button';more.textContent='更多我的资源';more.setAttribute('aria-label','更多我的资源');more.dataset.paperResourceMore='';more.dataset.rwAction='open-library';
      nodes={page,preview,more,signature:''};roots.set(home,nodes);
    }
    setAttr(home,'data-rw-preview',!route.library&&active);
    if(route.library){document.body.setAttribute('data-rw-library','');document.body.setAttribute('data-paper-library-ready','');}
    else document.body.removeAttribute('data-rw-library');
    nodes.page.hidden=!route.library;nodes.preview.hidden=route.library||!active;
    if(!route.library&&active){if(nodes.more.parentElement!==tabsNode)tabsNode.appendChild(nodes.more);}else nodes.more.remove();
    const signature=[route.library,route.category,route.groups,route.group,active,version,ready,loadError].join('|');
    if(nodes.signature===signature)return;nodes.signature=signature;
    if(route.library){document.title='我的资源 · 资源工坊';nodes.page.innerHTML=libraryHTML(route);renderResults(nodes.page);
      const strip=nodes.page.querySelector('.rw-tabs'),selected=strip?.querySelector('[aria-selected="true"]');
      if(strip&&selected){const a=selected.getBoundingClientRect(),b=strip.getBoundingClientRect();if(a.right>b.right)strip.scrollLeft+=a.right-b.right+16;if(a.left<b.left)strip.scrollLeft-=b.left-a.left+16;}}
    else if(active){const items=allResources().filter(r=>inCategory(r,'all')).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));nodes.preview.innerHTML=`${ready?`<div class="rw-preview-grid">${items.map(r=>resourceCard(r,true)).join('')}</div>`:'<div class="rw-loading">正在整理你的资源…</div>'}`;}
  }
  function refresh() {if(currentHome?.isConnected)sync(currentHome);scheduleScan();}
  function closeDialog() {if(dialog?.open)dialog.close();}
  function openDialog(title,content,wide=false) {
    dialogInvoker=document.activeElement;
    if(!dialog){dialog=document.createElement('dialog');dialog.className='rw-dialog';dialog.setAttribute('aria-labelledby','rw-dialog-title');dialog.dataset.rwOwned='';document.body.appendChild(dialog);dialog.addEventListener('close',()=>{(dialog._urls||[]).forEach(URL.revokeObjectURL);dialog._urls=[];if(dialogInvoker?.isConnected)dialogInvoker.focus();});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});}
    (dialog._urls||[]).forEach(URL.revokeObjectURL);dialog._urls=[];
    dialog.classList.toggle('rw-dialog-wide',wide);dialog.innerHTML=`<header><h2 id="rw-dialog-title">${escape(title)}</h2><button type="button" class="rw-icon-button" data-rw-action="close-dialog" aria-label="关闭弹窗">${icon('close')}</button></header><div class="rw-dialog-body">${content}</div>`;
    if(!dialog.open)dialog.showModal();return dialog;
  }
  function startGroupEdit(id='') {
    hidePopover();groupQuery='';const group=groupById(id);editingGroup={id,value:group?.name||''};version++;refresh();
    const input=document.getElementById('rw-group-name');input?.focus({preventScroll:true});input?.select();input?.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  function hidePopover(){if(popover?.matches(':popover-open'))popover.hidePopover();}
  function showPopover(content,anchor) {
    if(!popover){popover=document.createElement('div');popover.className='rw-popover';popover.setAttribute('popover','auto');popover.dataset.rwOwned='';document.body.appendChild(popover);}
    hidePopover();popover.innerHTML=content;popover.showPopover();
    const rect=anchor?.getBoundingClientRect()||{left:innerWidth/2,bottom:innerHeight/2,top:innerHeight/2};
    const width=popover.offsetWidth,height=popover.offsetHeight;
    popover.style.left=Math.max(12,Math.min(rect.left,innerWidth-width-12))+'px';
    popover.style.top=Math.max(12,Math.min(rect.bottom+8,innerHeight-height-12))+'px';
    popover.querySelector('button:not(:disabled),input')?.focus({preventScroll:true});return popover;
  }
  function manageGroup(id,anchor) {
    const group=groupById(id);if(!group)return;
    showPopover(`<p class="rw-pop-title">${escape(group.name)}</p><button type="button" data-rw-action="rename-group" data-id="${escape(id)}">${icon('pen')}重命名</button><button type="button" data-rw-action="delete-group" data-id="${escape(id)}" class="rw-danger">${icon('close')}删除分组</button>`,anchor);
  }
  function chooseGroups(ids,anchor) {
    popIds=[...new Set(ids)].filter(id=>resource(id));if(!popIds.length)return;
    showPopover(`<p class="rw-pop-title">将 ${popIds.length} 份资源加入分组</p><div class="rw-pop-groups">${state.groups.map(g=>{const added=popIds.every(id=>g.resourceIds.includes(id));return `<button type="button" data-rw-action="pick-group" data-id="${escape(g.id)}" ${added?'disabled':''}>${icon('folder')}<span>${escape(g.name)}</span>${added?'<small>已加入</small>':icon('plus')}</button>`;}).join('')||'<p class="rw-pop-empty">先建一个分组，收好这份资源。</p>'}</div><form data-rw-quick-group><label class="rw-sr-only" for="rw-quick-name">新分组名称</label><input id="rw-quick-name" name="name" placeholder="新建分组并加入" maxlength="40" required autocomplete="off"><button type="submit" aria-label="创建并加入">${icon('plus')}</button><p class="rw-inline-error" role="alert" hidden></p></form>`,anchor);
  }
  function nameError(name,id='') {
    return !name||name.length>40?'请输入 1–40 个字的分组名称。':state.groups.some(g=>g.id!==id&&g.name===name)?'已有同名分组，请换一个名称。':'';
  }
  function undoToast(message,task){toast(message);undoTask=task;const node=document.getElementById('rw-toast');node.innerHTML=`<span>${escape(message)}</span><button type="button" data-rw-action="undo">撤销</button>`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{node.hidden=true;undoTask=null;},8000);}
  function changeMembership(groupId,ids,remove=false) {
    const group=groupById(groupId);if(!group)return false;
    const valid=[...new Set(ids)].filter(id=>resource(id));const changed=valid.filter(id=>remove?group.resourceIds.includes(id):!group.resourceIds.includes(id));
    if(!changed.length){toast(remove?'所选资源不在这个分组中':'这些资源已经在分组中了');return false;}
    const nextIds=remove?group.resourceIds.filter(id=>!changed.includes(id)):[...group.resourceIds,...changed];
    if(!save({...state,groups:state.groups.map(g=>g.id===groupId?{...g,resourceIds:nextIds}:g)}))return false;
    undoToast(remove?`已从「${group.name}」移出 ${changed.length} 份资源`:`已将 ${changed.length} 份资源加入「${group.name}」`,()=>{const current=groupById(groupId);if(!current){toast('原分组已不存在，无法撤销。',true);return;}const resourceIds=remove?[...new Set([...current.resourceIds,...changed])]:current.resourceIds.filter(id=>!changed.includes(id));save({...state,groups:state.groups.map(g=>g.id===groupId?{...g,resourceIds}:g)},'已撤销分组整理');});return true;
  }
  function addResources(id) {
    if(!ready||!groupById(id))return;
    setPage();addTarget=id;selectionMode=true;version++;refresh();document.querySelector('.rw-panel-title')?.focus({preventScroll:true});
  }
  function cancelSelection(){const target=addTarget;selectionMode=false;selection.clear();addTarget='';if(target)setPage('all',false,target);else updateSelection();}
  document.addEventListener('click',event=>{
    const cardLink=event.target.closest('.rw-workbench .rw-card-link');
    if(cardLink&&selectionMode){event.preventDefault();event.stopImmediatePropagation();const input=cardLink.closest('.rw-card').querySelector('[data-rw-select]');if(input&&!input.disabled){if(selection.has(input.dataset.rwSelect))selection.delete(input.dataset.rwSelect);else selection.add(input.dataset.rwSelect);updateSelection();}return;}
    const button=event.target.closest('[data-rw-action]');if(!button)return;
    const action=button.dataset.rwAction,id=button.dataset.id;
    event.preventDefault();event.stopImmediatePropagation();
    if(['save','like','follow'].includes(action)){const within=button.closest('[data-rw-root]');toggle(action,id);if(within)document.querySelector(`[data-rw-root] [data-rw-action="${action}"][data-id="${CSS.escape(id)}"]`)?.focus({preventScroll:true});return;}
    if(action==='open-created'){
      const r=resource(id);if(!r?.artifact)return;
      openDialog(r.title,`<iframe class="rw-created-frame" src="${escape(r.artifact)}" title="${escape(r.title)}"></iframe><div class="rw-dialog-actions"><a href="${escape(r.href)}" class="rw-button">继续创作</a><a href="${escape(r.artifact)}" download="${escape(r.filename)}" class="rw-button rw-primary">${icon('download')}下载作品</a></div>`,true);return;
    }
    if(action==='open-library'){setPage();return;}
    if(action==='category'){const key=button.dataset.category;changeCategory(key);document.querySelector(`#rw-tab-${key}`)?.focus({preventScroll:true});return;}
    if(action==='groups'){setPage();return;}
    if(action==='open-group'){if(routeState().group!==id||selectionMode)setPage('all',false,id);document.querySelector(`[data-rw-drop="${CSS.escape(id)}"]`)?.focus({preventScroll:true});return;}
    if(action==='new-group'){startGroupEdit();return;}
    if(action==='assign-groups'){chooseGroups([id],button);return;}
    if(action==='add-resources'){addResources(id);return;}
    if(action==='group-menu'){manageGroup(id,button);return;}
    if(action==='rename-group'){startGroupEdit(id);return;}
    if(action==='cancel-edit'){editingGroup=null;version++;refresh();return;}
    if(action==='select-mode'){if(addTarget){cancelSelection();return;}selectionMode=!selectionMode;if(!selectionMode)selection.clear();updateSelection();return;}
    if(action==='cancel-selection'){cancelSelection();return;}
    if(action==='batch-group'){chooseGroups([...selection],button);return;}
    if(action==='batch-remove'){if(changeMembership(routeState().group,[...selection],true)){selection.clear();updateSelection();}return;}
    if(action==='pick-group'){const ids=[...popIds];hidePopover();if(changeMembership(id,ids)){selection.clear();updateSelection();}return;}
    if(action==='confirm-add'){const target=addTarget;if(changeMembership(target,[...selection]))setPage('all',false,target);return;}
    if(action==='undo'){const task=undoTask;undoTask=null;task?.();return;}
    if(action==='remove-from-group'){changeMembership(routeState().group,[id],true);return;}
    if(action==='clear-search'){search='';kind='all';version++;refresh();return;}
    if(action==='layout'){layout=button.dataset.layout;version++;refresh();document.querySelector(`[data-rw-action="layout"][data-layout="${layout}"]`)?.focus({preventScroll:true});return;}
    if(action==='close-dialog'){closeDialog();return;}
    if(action==='delete-group'){hidePopover();const group=groupById(id);if(!group)return;openDialog('删除分组',`<p class="rw-confirm-text">删除「${escape(group.name)}」？</p><p class="rw-dialog-note">只删除分组，资源本身及收藏、关注、点赞状态都会保留。</p><div class="rw-dialog-actions"><button type="button" class="rw-button" data-rw-action="close-dialog">取消</button><button type="button" class="rw-button rw-primary" data-rw-action="confirm-delete-group" data-id="${escape(id)}">确认删除</button></div>`);return;}
    if(action==='confirm-delete-group'){const group=groupById(id);if(!group)return;const index=state.groups.indexOf(group),selected=routeState().group===id;if(save({...state,groups:state.groups.filter(g=>g.id!==id)})){closeDialog();if(selected)setPage();undoToast('分组已删除，资源已保留',()=>{if(groupById(id))return;const groups=[...state.groups];const restored={...group,name:state.groups.some(g=>g.name===group.name)?group.name+'（恢复）':group.name};groups.splice(index,0,restored);save({...state,groups},'分组已恢复');});}return;}
    if(action==='retry'){location.reload();}
  },true);
  document.addEventListener('submit',event=>{
    const form=event.target.closest('[data-rw-inline-group],[data-rw-quick-group]');if(!form)return;event.preventDefault();
    const name=new FormData(form).get('name').trim(),id=form.dataset.id||'',error=nameError(name,id);
    const note=form.querySelector('.rw-inline-error');if(error){text(note,error);note.hidden=false;return;}
    if(id&&!groupById(id)){text(note,'这个分组已被删除。');note.hidden=false;return;}
    const quick=form.hasAttribute('data-rw-quick-group');const group=id?{...groupById(id),name}:{id:crypto.randomUUID(),name,resourceIds:quick?[...popIds]:[],createdAt:Date.now()};
    if(save({...state,groups:id?state.groups.map(g=>g.id===id?group:g):[...state.groups,group]},id?'分组名称已更新':quick?'已创建分组并加入资源':'分组已创建，可以直接拖入资源')){editingGroup=null;hidePopover();if(quick)selection.clear();version++;refresh();document.querySelector(`[data-rw-drop="${CSS.escape(group.id)}"]`)?.focus({preventScroll:true});}
  });
  document.addEventListener('input',event=>{
    event.target.closest('.rw-dialog')?.querySelector('.rw-form-error')?.remove();
    const form=event.target.closest('[data-rw-inline-group],[data-rw-quick-group]');if(form){form.querySelector('.rw-inline-error').hidden=true;if(editingGroup&&form.hasAttribute('data-rw-inline-group'))editingGroup.value=event.target.value;}
    if(event.target.matches('[data-rw-search]')){search=event.target.value.trim();renderResults(event.target.closest('[data-rw-root]'));}
    if(event.target.matches('[data-rw-rail-search]')){groupQuery=event.target.value.trim();document.querySelectorAll('[data-rw-group-row]').forEach(row=>{row.hidden=!groupById(row.dataset.rwGroupRow)?.name.toLowerCase().includes(groupQuery.toLowerCase());});}
  });
  document.addEventListener('change',event=>{
    if(event.target.matches('[data-rw-kind],[data-rw-sort]')){if(event.target.hasAttribute('data-rw-kind'))kind=event.target.value;else sort=event.target.value;renderResults(event.target.closest('[data-rw-root]'));}
    if(event.target.matches('[data-rw-select]')){selectionMode=true;const id=event.target.dataset.rwSelect;if(event.target.checked)selection.add(id);else selection.delete(id);updateSelection();}
    if(event.target.matches('[data-rw-select-all]')){const checked=event.target.checked;selectedResources(routeState().category).filter(r=>!addTarget||!groupById(addTarget)?.resourceIds.includes(r.id)).forEach(r=>checked?selection.add(r.id):selection.delete(r.id));updateSelection();document.querySelector('[data-rw-select-all]')?.focus({preventScroll:true});}
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&event.target.closest('[data-rw-inline-group]')){editingGroup=null;version++;refresh();}else if(event.key==='Escape'&&selectionMode&&!dialog?.open&&!popover?.matches(':popover-open'))cancelSelection();});
  document.addEventListener('dblclick',event=>{const row=event.target.closest('[data-rw-drop]');if(row)startGroupEdit(row.dataset.rwDrop);});
  document.addEventListener('contextmenu',event=>{const row=event.target.closest('[data-rw-drop]');if(row){event.preventDefault();manageGroup(row.dataset.rwDrop,row);}});
  function clearDrag(){dragIds=[];document.querySelectorAll('[data-rw-dragging],[data-rw-over]').forEach(el=>{el.removeAttribute('data-rw-dragging');el.removeAttribute('data-rw-over');});}
  document.addEventListener('dragstart',event=>{const card=event.target.closest('.rw-workbench [data-rw-resource]');if(!card||event.target.closest('button,input'))return;const id=card.dataset.rwResource;dragIds=selection.has(id)?[...selection]:[id];event.dataTransfer.effectAllowed='copy';event.dataTransfer.setData('application/x-resource-workshop',JSON.stringify(dragIds));event.dataTransfer.setData('text/plain',dragIds.map(id=>resource(id)?.title).join('、'));document.querySelector('[data-rw-root]')?.setAttribute('data-rw-dragging','true');});
  document.addEventListener('dragover',event=>{const target=event.target.closest('[data-rw-drop]');if(!target||!dragIds.length)return;event.preventDefault();event.dataTransfer.dropEffect='copy';document.querySelectorAll('[data-rw-over]').forEach(n=>{if(n!==target)n.removeAttribute('data-rw-over');});target.setAttribute('data-rw-over','true');});
  document.addEventListener('dragleave',event=>{const target=event.target.closest('[data-rw-drop]');if(target&&!target.contains(event.relatedTarget))target.removeAttribute('data-rw-over');});
  document.addEventListener('drop',event=>{const target=event.target.closest('[data-rw-drop]');if(!target||!dragIds.length)return;event.preventDefault();const ids=[...dragIds],id=target.dataset.rwDrop;clearDrag();if(changeMembership(id,ids)){selection.clear();updateSelection();}});
  document.addEventListener('dragend',clearDrag);
  document.addEventListener('keydown',event=>{const tab=event.target.closest('.rw-tabs [role="tab"]');if(!tab||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();const i=CATEGORIES.findIndex(([key])=>key===tab.dataset.category),next=event.key==='Home'?0:event.key==='End'?CATEGORIES.length-1:(i+(event.key==='ArrowRight'?1:-1)+CATEGORIES.length)%CATEGORIES.length;changeCategory(CATEGORIES[next][0]);document.getElementById('rw-tab-'+CATEGORIES[next][0])?.focus({preventScroll:true});});
  function decorateOriginalCards() {
    document.querySelectorAll('a[href*="/share/"]').forEach(card=>{
      if(card.closest('[data-rw-owned]'))return;
      const id=new URL(card.href).pathname.split('/').pop(),r=resource(id);if(!r)return;
      const thumb=card.querySelector('[data-paper-card-image]');if(!thumb)return;
      let caption=card.querySelector(':scope > .paper-book-caption');
      if(location.pathname==='/'&&!routeState().library&&card.closest('[data-paper-home-gallery]')){
        if(!caption){caption=document.createElement('span');caption.className='paper-book-caption';caption.innerHTML=bookCaption(r.kind);card.appendChild(caption);}
        else text(caption.firstElementChild,r.kind);
      }else caption?.remove();
      const likesNode=card.querySelector('[data-paper-card-meta] svg.lucide-star')?.parentElement;
      if(likesNode){const number=[...likesNode.childNodes].find(n=>n.nodeType===3&&n.nodeValue.trim());const value=String(r.likes+(state.liked[id]?1:0));if(number&&number.nodeValue!==value)number.nodeValue=value;setAttr(likesNode,'data-rw-original-liked',!!state.liked[id]);}
      let control=thumb.querySelector('[data-rw-bookmark]');
      if(!control){control=document.createElement('button');control.type='button';control.className='rw-bookmark';control.dataset.rwBookmark='';control.dataset.rwAction='save';control.dataset.id=id;control.innerHTML=icon('bookmark');thumb.appendChild(control);}
      setAttr(control,'aria-label',`${state.saved[id]?'取消收藏':'收藏'} ${r.title}`);setAttr(control,'aria-pressed',!!state.saved[id]);setAttr(control,'title',state.saved[id]?'取消收藏':'收藏');
    });
  }
  function decorateShare() {
    if(!location.pathname.startsWith('/share/'))return;
    const id=location.pathname.split('/').pop(),r=resource(id);if(!r)return;
    const main=document.querySelector('[data-paper-content] main');if(!main)return;
    const follow=[...main.querySelectorAll('button')].find(b=>/^(已关注|关注)$/.test(b.textContent.trim()));
    if(follow){setAttr(follow,'data-rw-action','follow');setAttr(follow,'data-id',id);setAttr(follow,'aria-pressed',followed(r));setAttr(follow,'aria-label',`${followed(r)?'取消关注':'关注'} ${r.author}`);setAttr(follow,'data-rw-follow','');const label=[...follow.childNodes].find(n=>n.nodeType===3);if(label&&label.nodeValue!==(followed(r)?'已关注':'关注'))label.nodeValue=followed(r)?'已关注':'关注';}
    const star=main.querySelector('section button:has(svg.lucide-star)');
    if(star){setAttr(star,'data-rw-action','like');setAttr(star,'data-id',id);setAttr(star,'aria-pressed',!!state.liked[id]);setAttr(star,'aria-label',`${state.liked[id]?'取消点赞':'点赞'} ${r.title}`);setAttr(star,'data-rw-like','');const n=[...star.childNodes].find(n=>n.nodeType===3);const value=String(r.likes+(state.liked[id]?1:0));if(n&&n.nodeValue!==value)n.nodeValue=value;else{const span=star.querySelector('span');if(span)text(span,value);}}
    const share=[...main.querySelectorAll('section button')].find(b=>b.textContent.trim()==='分享');
    if(share){let saveButton=share.parentElement.querySelector('[data-rw-share-save]');if(!saveButton){saveButton=document.createElement('button');saveButton.type='button';saveButton.className='rw-share-save';saveButton.dataset.rwShareSave='';saveButton.dataset.rwAction='save';saveButton.innerHTML=icon('bookmark')+'<span></span>';share.before(saveButton);}setAttr(saveButton,'data-id',id);setAttr(saveButton,'aria-pressed',!!state.saved[id]);setAttr(saveButton,'aria-label',state.saved[id]?'取消收藏':'收藏');text(saveButton.querySelector('span'),state.saved[id]?'已收藏':'收藏');}
  }
  function captureCreation() {
    if(location.pathname!=='/chat'||!ready)return;
    const q=new URLSearchParams(location.search),chatId=q.get('chatId');if(!chatId?.startsWith('sim-'))return;
    const id='creation:'+chatId;if(state.custom.some(r=>r.id===id))return;
    const download=document.querySelector('[data-paper-content] main section a[download]');
    const adaptation=chatId.startsWith('sim-adapt-')&&q.get('html')&&q.get('art');
    const view=adaptation?[...document.querySelectorAll('[data-paper-content] main button')].find(b=>b.textContent.trim()==='查看'&&b.parentElement.querySelector(':scope > .flex-1')?.textContent.trim()===q.get('art')):null;
    if(!download&&!view)return;
    const box=(download||view).parentElement;
    const filename=download?.getAttribute('download')||q.get('art')||'';
    let title=box.querySelector(':scope > .flex-1')?.textContent.trim()||filename.replace(/\.(html?|docx)$/i,'');
    if(!title||title.length>300)return;
    const card=catalog.find(r=>title.includes(r.title.split(/[｜：·]/)[0])||r.title.includes(title));
    const outputURL=new URL(download?.href||q.get('html'),location.origin);
    const artifact=outputURL.origin===location.origin&&outputURL.pathname.startsWith('/artifacts/')?outputURL.pathname:'';
    const item={id,title,href:location.pathname+location.search,artifact,filename,author:'我',authorId:'1000202320',cover:card?.cover||'',kind:/\.docx$/i.test(filename)?'试卷':card?.kind||(/试卷|练习题/.test(title)?'试卷':'教学应用'),created:true,createdAt:Date.now(),likes:0,views:0};
    save({...state,custom:[item,...state.custom]});
  }
  function scan() {
    scheduled=false;
    if(location.pathname==='/knowledge'){location.replace(libraryURL('created'));return;}
    const sidebar=document.querySelector('[data-paper-sidebar] nav');
    if(sidebar&&!sidebar.querySelector('[data-rw-nav]')){const group=document.createElement('div');group.className='rw-nav-group';group.innerHTML=`<button type="button" class="rw-nav-button" data-rw-nav data-rw-action="open-library" title="我的资源">${icon('library')}<span>我的资源</span></button>`;sidebar.insertBefore(group,sidebar.children[1]||null);}
    document.querySelectorAll('[data-rw-nav]').forEach(n=>setAttr(n,'aria-current',routeState().library?'page':'false'));
    if(location.pathname==='/graph'){document.querySelectorAll('[data-paper-content] button').forEach(b=>{if(b.textContent.trim()==='文件夹')setAttr(b,'data-rw-relocated','');});}
    if(ready){decorateOriginalCards();decorateShare();captureCreation();}
    const home=document.querySelector('[data-paper-home-body]');if(home)sync(home);
    window.PaperListNavigation?.();
  }
  function scheduleScan(){if(!scheduled){scheduled=true;requestAnimationFrame(scan);}}
  new MutationObserver(scheduleScan).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','href']});
  addEventListener('popstate',()=>{search='';selection.clear();selectionMode=false;addTarget='';hidePopover();version++;refresh();});
  addEventListener('storage',event=>{if(event.key===KEY){try{state={...initial(),...JSON.parse(event.newValue||'{}')};version++;refresh();}catch{}}});
  setInterval(()=>{if(location.href!==lastURL){lastURL=location.href;scheduleScan();}},250);
  window.PaperResources={sync};document.dispatchEvent(new Event('paper-resources-ready'));
  void fetch('/paper-theme/resources/catalog.json').then(r=>{if(!r.ok)throw new Error('资源列表加载失败');return r.json();}).then(data=>{catalog=data;ready=true;version++;refresh();}).catch(error=>{loadError=error.message;version++;refresh();});
  scheduleScan();
})();
