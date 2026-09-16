(async () => {
  'use strict';
  const D=await window.WorkshopData.ready;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clock='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>';
  const HISTORY='resource-workshop.tasks.v2';
  const initial=[['5ADB0A81FFE2E0EE39D157C22AB8E2FD','18','数学试卷'],['871014123974C3D4C85504AB015C4F8F','19','生成九年级上册语文大单元教案'],['113DC857FF89EC9C55969F843587D077','20','光合作用'],['79B383D6A60599D9143ECB930A43C32F','17','基于图片AI生成命题'],['3C30A3E66760C7BB1AB4D39AB88B12EC','20','生成人生天数计算互动课件'],['492FCDDD536E897F6547125776ADC6D0','20','生成唐诗解读教学图谱'],['EE811DE3C3B267BA6C8198F6829B47F4','20','改编《【直播内容】零基础也能上手AI备课的3个核心技巧》'],['BB97D098D53AEBEFEEA793CFBEEE127C','20','改编《课堂活动管理系统》']].map(([id,featureId,title])=>({id,title,href:'/chat?'+new URLSearchParams({chatId:id,featureId}),createdAt:0}));
  let tasks;try{tasks=JSON.parse(localStorage.getItem(HISTORY))||[];}catch{tasks=[];}
  const DRAWER='resource-workshop.history-drawer.v1';
  let drawerState;try{drawerState=JSON.parse(sessionStorage.getItem(DRAWER))||{};}catch{drawerState={};}
  let last='',pending=false,dialog,query=drawerState.query||'',invoker,deletedTask,graphCollapsed=false;
  const attached=n=>n&&Object.keys(n).some(k=>k.startsWith('__reactProps$'));
  function remember(){
    if(location.pathname!=='/chat')return;
    const q=new URLSearchParams(location.search),id=q.get('chatId');if(!id?.startsWith('sim-'))return;
    let pendingPrompt={};try{pendingPrompt=JSON.parse(sessionStorage.getItem('resource-workshop.prompt.v2:'+id))||{};}catch{}
    const submitted=q.get('q')||pendingPrompt.prompt||(q.get('adapt')?'改编《'+q.get('adapt')+'》':'')||q.get('art')||'',prompt=submitted||'新创作',feature=q.get('feat')||(q.get('featureId')==='17'?'AI命题':q.get('featureId')==='18'?'AI组题':'互动课件');
    if(!tasks.some(t=>t.id===id)){const task={id,title:prompt,href:location.pathname+location.search,createdAt:Date.now()};tasks.unshift(task);try{localStorage.setItem(HISTORY,JSON.stringify(tasks));}catch{} }
    if(submitted.trim())D.logUsage({id:'task:'+id,prompt,feature,chatId:id,origin:id.startsWith('sim-adapt-')?'adapted':'original',sourceId:q.get('sourceId')||''});
    D.patchResource('creation:'+id,{origin:id.startsWith('sim-adapt-')?'adapted':'original',feature,authorId:D.base.profile.id,author:D.base.profile.name});
  }
  const taskList=()=>[...tasks,...initial.filter(t=>!tasks.some(x=>x.id===t.id))].filter(t=>!t.deletedAt);
  function saveTasks(){try{localStorage.setItem(HISTORY,JSON.stringify(tasks));}catch{document.dispatchEvent(new CustomEvent('workshop-error',{detail:'保存失败，请检查可用存储空间'}));}}
  function renderTasks(){
    const now=new Date();now.setHours(0,0,0,0);
    const matches=taskList().filter(t=>t.title.toLowerCase().includes(query.toLowerCase()));
    dialog.querySelector('.ws-task-list').innerHTML=[['今日任务',matches.filter(t=>t.createdAt>=+now)],['历史任务',matches.filter(t=>t.createdAt<+now)]].map(([label,list])=>`<section><h3>${label}<span>${list.length}</span></h3>${list.length?list.map(t=>`<div class="ws-task-row"><a href="${esc(t.href)}" ${new URLSearchParams(location.search).get('chatId')===t.id?'aria-current="page"':''}><span>${esc(t.title)}</span><small>${t.createdAt?new Date(t.createdAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'›'}</small></a><button data-remove-task="${esc(t.id)}" aria-label="删除任务 ${esc(t.title)}">×</button></div>`).join(''):'<p class="ws-empty">暂无任务</p>'}</section>`).join('')+(deletedTask?'<button class="ws-undo-task" data-undo-task>撤销删除</button>':'');
  }
  function saveDrawer(open){drawerState={open,query,scroll:dialog?.querySelector('.ws-task-list')?.scrollTop||0};try{sessionStorage.setItem(DRAWER,JSON.stringify(drawerState));}catch{}document.body.toggleAttribute('data-ws-history-open',open);}
  function closeHistory(){if(!dialog)return;dialog.hidden=true;saveDrawer(false);invoker?.focus({preventScroll:true});}
  function openHistory(button,restore=false){
    invoker=button||invoker;
    if(!dialog){
      dialog=document.createElement('aside');dialog.className='ws-task-drawer';dialog.dataset.rwOwned='';dialog.setAttribute('aria-label','任务记录');
      dialog.innerHTML='<header><h2>任务记录</h2><button type="button" aria-label="关闭任务记录">×</button></header><label class="ws-task-search"><input type="search" aria-label="搜索任务" placeholder="搜索任务"></label><div class="ws-task-list"></div>';
      document.body.append(dialog);dialog.querySelector('header button').onclick=closeHistory;
      dialog.querySelector('input').oninput=e=>{query=e.target.value.trim();renderTasks();saveDrawer(true);};
      dialog.querySelector('.ws-task-list').addEventListener('scroll',()=>{if(!dialog.hidden)saveDrawer(true);},{passive:true});
      dialog.addEventListener('click',e=>{
        const a=e.target.closest('.ws-task-row a');if(a)saveDrawer(true);
        const b=e.target.closest('button');if(b?.dataset.removeTask){const item=taskList().find(t=>t.id===b.dataset.removeTask);if(item){deletedTask=item;tasks=[{...item,deletedAt:Date.now()},...tasks.filter(t=>t.id!==item.id)];saveTasks();renderTasks();}}
        if(b?.hasAttribute('data-undo-task')&&deletedTask){tasks=[{...deletedTask,deletedAt:0},...tasks.filter(t=>t.id!==deletedTask.id)];deletedTask=null;saveTasks();renderTasks();}
      });
    }
    dialog.hidden=false;dialog.querySelector('input').value=query;renderTasks();
    if(restore)dialog.querySelector('.ws-task-list').scrollTop=drawerState.scroll||0;
    saveDrawer(true);if(!restore)dialog.querySelector('input').focus();
  }
  function shortcuts(host){
    if(!host)return;
    let nav=host.querySelector(':scope > .ws-shortcuts');
    if(!nav){nav=document.createElement('nav');nav.className='ws-shortcuts';nav.dataset.rwOwned='';nav.setAttribute('aria-label','工坊导航');nav.innerHTML='<a href="/graph">知识图谱</a><a href="/dashboard">数据看板</a>';host.append(nav);}
    for(const stale of host.closest('[data-paper-content]').querySelectorAll('.ws-shortcuts'))if(stale!==nav)stale.remove();
    let history=nav.querySelector('.ws-nav-history');
    if(!history){history=historyButton();history.classList.add('ws-nav-history');history.setAttribute('aria-label','历史任务');history.title='历史任务';history.textContent='历史任务';history.onclick=()=>dialog&&!dialog.hidden?closeHistory():openHistory(history);nav.append(history);}
    history.setAttribute('aria-expanded',String(!!drawerState.open));
    host.classList.add('ws-navigation-row');
    for(const a of nav.querySelectorAll('a')){const current=location.pathname===a.getAttribute('href');if(current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
  }
  function navigation(content){
    content.querySelector(':scope > .ws-topbar')?.remove();
    const home=location.pathname==='/'&&new URLSearchParams(location.search).get('page')!=='my-resources';
    if(!home)content.querySelectorAll('.ws-home-navigation').forEach(node=>node.remove());
    let host;
    if(location.pathname==='/graph')host=content.querySelector('.kg-header');
    else if(location.pathname==='/dashboard')host=content.querySelector('.wd-header>nav');
    else if(location.pathname.startsWith('/share/'))host=content.querySelector('main>header');
    else if(new URLSearchParams(location.search).get('page')==='my-resources')host=content.querySelector('.rw-breadcrumb');
    else if(location.pathname==='/chat'){host=content.querySelector('button[aria-label="返回首页"]')?.parentElement?.parentElement;host?.classList.add('ws-chat-navigation');}
    else if(location.pathname.startsWith('/plaza/'))host=content.querySelector('button[aria-label="返回首页"]')?.parentElement;
    else if(location.pathname==='/'){
      host=content.querySelector('.ws-home-navigation');
      if(!host){host=document.createElement('div');host.className='ws-home-navigation';host.dataset.rwOwned='';content.prepend(host);}
    }
    shortcuts(host);
    if(host?.classList.contains('ws-chat-navigation'))host.classList.toggle('ws-chat-compact',host.clientWidth<660);
    document.body.dataset.wsShell='';
    const toggle=document.querySelector('[data-paper-menu-toggle]');
    const collapsed=!!toggle?.querySelector('.lucide-panel-left-open');
    if(toggle){toggle.setAttribute('aria-label',collapsed?'展开菜单':'折叠菜单');toggle.setAttribute('aria-expanded',String(!collapsed));}
    if(location.pathname==='/graph'){
      if(!graphCollapsed&&toggle&&attached(toggle)){graphCollapsed=true;if(!collapsed)toggle.click();}
    }else graphCollapsed=false;
    let edge=document.querySelector('.ws-history-edge');
    if(!edge){edge=historyButton();edge.classList.add('ws-history-edge');document.body.append(edge);}
    const visibleHistory=[...content.querySelectorAll('.ws-history-button')].some(button=>{const bounds=button.getBoundingClientRect();return !button.hidden&&bounds.width>0&&bounds.height>0&&bounds.bottom>0&&bounds.top<innerHeight;});
    edge.hidden=!!drawerState.open||visibleHistory;
  }
  function historyButton(){const b=document.createElement('button');b.type='button';b.className='ws-history-button';b.dataset.rwOwned='';b.setAttribute('aria-label','任务记录');b.title='任务记录';b.innerHTML=clock+'<span>任务记录</span>';b.onclick=()=>openHistory(b);return b;}
  function scan(){
    pending=false;
    const content=document.querySelector('[data-paper-content]');if(!content||!attached(content)||document.readyState!=='complete')return;
    navigation(content);
    for(const b of content.querySelectorAll('button'))if(['AI资源数据看板','AI知识图谱'].includes(b.textContent.trim())&&!b.closest('[data-rw-owned]'))b.dataset.wsOldShortcut='';
    const homeTools=document.querySelector('[data-paper-composer-tools]');
    if(homeTools){const composer=homeTools.closest('[data-paper-composer]');if(composer&&!composer.querySelector(':scope > .ws-history-side')){const button=homeTools.querySelector('.ws-history-button')||historyButton();button.classList.add('ws-history-side');button.setAttribute('aria-label','历史任务');button.title='历史任务';button.innerHTML=clock+'<span>历史</span>';composer.append(button);}}
    if(location.pathname!=='/'||new URLSearchParams(location.search).has('page')){
      for(const input of content.querySelectorAll('textarea')){
        if(input.closest('[data-rw-owned]')||input.offsetParent===null)continue;
        const wrap=input.parentElement;
        if(wrap.closest('[data-paper-composer]')||wrap.querySelector('.ws-history-button'))continue;
        wrap.classList.add('ws-composer-history');wrap.append(historyButton());
      }
    }
    if(last!==location.href){last=location.href;remember();if(drawerState.open)openHistory(null,true);}
    if(drawerState.open&&!dialog)openHistory(null,true);
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(scan);}}
  // Continued prompts count as usage events; initial prompts are recorded at route arrival.
  let lastSubmission='';
  function captureSubmission(target){
    if(location.pathname!=='/chat'||target.disabled)return;
    const content=document.querySelector('[data-paper-content]');if(!content)return;
    const input=target.tagName==='TEXTAREA'?target:[...content.querySelectorAll('textarea')].find(n=>n.offsetParent!==null);
    const prompt=input?.value.trim();if(!prompt)return;
    const q=new URLSearchParams(location.search),chatId=q.get('chatId'),key=chatId+':'+prompt;
    if(lastSubmission===key)return;lastSubmission=key;setTimeout(()=>{lastSubmission='';},800);
    const initial=D.activities().find(activity=>activity.id==='task:'+chatId);
    let state={};try{state=JSON.parse(sessionStorage.getItem('resource-workshop.creation.v2:'+chatId))||{};}catch{}
    const firstForward=chatId?.startsWith('sim-')&&(!initial||(state.phase==='generating'&&state.prompt?.trim()===prompt));
    D.logUsage({...(firstForward?{id:'task:'+chatId}:{}),prompt,feature:q.get('feat')||(q.get('featureId')==='17'?'AI命题':q.get('featureId')==='18'?'AI组题':'互动课件'),chatId,origin:chatId?.startsWith('sim-adapt-')?'adapted':'original'});
  }
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(b?.textContent.trim()==='数据中心'&&!b.closest('[data-paper-content]')){e.preventDefault();e.stopImmediatePropagation();location.assign('/dashboard');return;}if(b&&(b.getAttribute('aria-label')==='发送'||b.textContent.trim()==='发送'))captureSubmission(b);},true);
  document.addEventListener('keydown',e=>{if(e.target.tagName==='TEXTAREA'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing)captureSubmission(e.target);},true);
  document.addEventListener('workshop-error',e=>{let toast=document.getElementById('ws-error');if(!toast){toast=document.createElement('div');toast.id='ws-error';toast.className='ws-error-toast';toast.setAttribute('role','alert');document.body.append(toast);}toast.textContent=e.detail;toast.hidden=false;setTimeout(()=>toast.hidden=true,3500);});
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog&&!dialog.hidden&&!document.querySelector('dialog[open]'))closeHistory();});
  addEventListener('popstate',schedule);setInterval(schedule,350);schedule();
})();
