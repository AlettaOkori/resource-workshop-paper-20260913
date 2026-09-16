/* Shared prototype resource records. Integration boundaries are documented separately. */
(() => {
  'use strict';
  const LIBRARY='resource-workshop.library.v1', KEY='resource-workshop.metadata.v2';
  const empty=()=>({resources:{},activities:[]});
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
  let meta=read(KEY,empty()), catalog=[], nodes=[], demoActivities=[];
  meta={...empty(),...meta};
  const library=()=>({saved:{},liked:{},following:{},custom:[],groups:[],...read(LIBRARY,{})});
  let notifyPending=false;
  function notify(){if(notifyPending)return;notifyPending=true;queueMicrotask(()=>{notifyPending=false;document.dispatchEvent(new Event('workshop-data-changed'));});}
  function persist(next){try{localStorage.setItem(KEY,JSON.stringify(next));meta=next;notify();return true;}catch{document.dispatchEvent(new CustomEvent('workshop-error',{detail:'保存失败，请检查可用存储空间'}));return false;}}
  function patchResource(id,patch){if(!id)return false;const old=meta.resources[id]||{};if(Object.keys(patch).every(k=>JSON.stringify(old[k])===JSON.stringify(patch[k])))return true;return persist({...meta,resources:{...meta.resources,[id]:{...old,...patch}}});}
  function resources(){
    const lib=library(), items=[...catalog,...lib.custom.filter(r=>!catalog.some(c=>c.id===r.id))];
    return items.filter(r=>!r.legacy).map(r=>{
      const patch=meta.resources[r.id]||{}, baseIds=nodes.filter(n=>(n.resourceIds||[]).includes(r.id)).map(n=>n.id);
      const item={subject:'',grade:'',edition:'',chapterId:'',origin:'original',saves:0,downloads:0,views:0,likes:0,...r,...patch};
      item.knowledgeIds=patch.knowledgeIds??r.knowledgeIds??baseIds;
      if(!Object.prototype.hasOwnProperty.call(patch,'chapterId')&&!item.chapterId&&item.knowledgeIds.length)item.chapterId=nodes.find(n=>n.id===item.knowledgeIds[0])?.chapterId||'';
      if(!Object.prototype.hasOwnProperty.call(patch,'subject')&&!item.subject&&item.knowledgeIds.length)item.subject=nodes.find(n=>n.id===item.knowledgeIds[0])?.subjectName||'';
      if(!r.seed){item.created=item.authorId===api.base.profile.id||r.created===true;item.author=item.author==='我'?api.base.profile.name:item.author;}
      const teacher=api.base.teachers?.find(t=>t.id===item.authorId);
      item.authorSubject=teacher?.subject||item.authorSubject||item.subject;
      item.authorGrade=teacher?.grade||item.authorGrade||item.grade;
      item.likes=Number(item.likes||0)+(lib.liked[r.id]?1:0);
      item.saves=Number(item.saves||0)+(lib.saved[r.id]?1:0);
      item.downloads=Number(item.downloads||0);
      if(window.WorkshopPreviews)item.cover=window.WorkshopPreviews.url(item);
      return item;
    });
  }
  const resource=id=>resources().find(r=>r.id===id)||catalog.find(r=>r.id===id && r.legacy);
  function detailHref(item) {
    const r = typeof item === 'string' ? resource(item) : item;
    if (!r || r.mock || r.legacy) return '';
    if (r.href?.startsWith('/share/')) return r.href;
    if (!r.artifact) return '';
    const templates = catalog.filter(item => !item.mock && item.href?.startsWith('/share/'));
    const template = templates.find(item => item.artifact === r.artifact) || templates[0];
    if (!template) return '';
    const url = new URL(template.href, location.origin);
    url.searchParams.set('resourceId', r.id);
    return url.pathname + url.search;
  }
  const knowledge=id=>{const ids=new Set(resource(id)?.knowledgeIds||meta.resources[id]?.knowledgeIds||[]);return nodes.filter(n=>ids.has(n.id));};
  function setKnowledge(id,ids,context={}){const valid=new Set(nodes.map(n=>n.id));return patchResource(id,{...context,knowledgeIds:[...new Set(ids)].filter(x=>valid.has(x))});}
  function toggle(action,id){
    if(!resource(id))return false;
    const lib=library(),field=action==='like'?'liked':'saved',map={...lib[field]};
    if(map[id])delete map[id];else map[id]=Date.now();
    const next={...lib,[field]:map};
    try{localStorage.setItem(LIBRARY,JSON.stringify(next));document.dispatchEvent(new CustomEvent('workshop-library-changed',{detail:next}));notify();return true;}catch{document.dispatchEvent(new CustomEvent('workshop-error',{detail:'保存失败，请检查可用存储空间'}));return false;}
  }
  function logUsage(event){
    const id=event.id||'usage:'+Date.now()+':'+Math.random().toString(36).slice(2,8);
    if(meta.activities.some(a=>a.id===id))return id;
    const row={createdAt:Date.now(),authorId:api.base.profile.id,author:api.base.profile.name,origin:'original',...event,id};
    persist({...meta,activities:[...meta.activities,row]});return id;
  }
  const api=window.WorkshopData={
    base:{profile:{},subjects:[],grades:[],editions:[],features:[]},graph:{subjects:[]},
    resources,resource,detailHref,library,knowledge,allKnowledge:()=>nodes,setKnowledge,patchResource,
    contextFor:id=>{const r=resource(id)||meta.resources[id]||{};return Object.fromEntries(['subject','grade','edition','chapterId','unitId','topicId','customTopic','knowledgeMode','knowledgeConfirmed'].map(k=>[k,r[k]??'']));},
    notify,subscribe:fn=>{document.addEventListener('workshop-data-changed',fn);return()=>document.removeEventListener('workshop-data-changed',fn);},
    toggle,isLiked:id=>!!library().liked[id],isSaved:id=>!!library().saved[id],
    logUsage,activities:()=>[...demoActivities,...meta.activities].map(a=>({...a})),
    recordDownload:id=>{const r=resource(id);return r?patchResource(id,{downloads:r.downloads+1}):false;},
  };
  api.ready=Promise.all(['school-base','catalog','knowledge-graph','demo-activities'].map(name=>fetch('/paper-theme/resources/'+name+'.json').then(r=>{if(!r.ok)throw Error('数据加载失败');return r.json();}))).then(([base,items,graph,activities])=>{
    // Relative dates keep the prototype useful on future demo days; never persist seeds.
    const demoDate=days=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-days);return +d;};
    api.base=base;catalog=items.map(r=>({...r,...(Number.isFinite(r.demoDaysAgo)?{createdAt:demoDate(r.demoDaysAgo)}:{})}));api.graph=graph;
    demoActivities=activities.map(a=>({...a,createdAt:demoDate(a.demoDaysAgo)}));
    nodes=graph.subjects.flatMap(s=>s.nodes.filter(n=>n.type==='knowledge'||!n.type).map(n=>({...n,subjectId:s.id,subjectName:s.name})));
    notify();return api;
  });
  addEventListener('storage',event=>{if(event.key===KEY){meta={...empty(),...read(KEY,empty())};notify();}if(event.key===LIBRARY)notify();});
})();
