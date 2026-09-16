/* Actual artifact images, with portrait excerpts for the homepage paper stacks. */
(() => {
 'use strict';
 let manifest={};
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const artifactPath=resource=>{if(!resource?.artifact)return '';try{const url=new URL(resource.artifact,location.origin);return url.origin===location.origin?url.pathname:'';}catch{return '';}};
 const focus={
  '/artifacts/photosynthesis.html':'14% 50%',
  '/artifacts/gougu.html':'5% 50%',
  '/artifacts/cell-courseware.html':'0% 50%',
  '/artifacts/life-days.html':'0% 50%',
  '/artifacts/xiyou/index.html':'78% 50%',
  '/artifacts/taohua-app/index.html':'47% 50%',
  '/artifacts/tangshi-app/index.html':'0% 50%',
  '/artifacts/activity-mgmt/index.html':'50% 50%'
 };
 const api=window.WorkshopPreviews={
  url:resource=>manifest[artifactPath(resource)]||(resource?.mock?resource.cover:'')||'',
  sheetUrl:resource=>manifest[artifactPath(resource)+'#sheet']||'',
  isBrowsable:resource=>!!resource&&!resource.legacy&&!!(resource.mock||resource.artifact||resource.href),
  markup(resource){const src=api.url(resource);return src?`<img src="${esc(src)}" alt="${esc(resource.title)}预览" loading="lazy" decoding="async">`:'<span class="ws-preview-empty">暂无预览</span>';},
 };
 api.ready=fetch('/paper-theme/previews/manifest.json').then(r=>{if(!r.ok)throw new Error('预览目录读取失败');return r.json();}).then(value=>{manifest=value;scan();window.WorkshopData?.notify();document.dispatchEvent(new Event('workshop-previews-ready'));return api;}).catch(()=>api);
 let pending=false;
 function scan(){
  pending=false;if(!window.WorkshopData)return;
  for(const card of document.querySelectorAll('a[href*="/share/"]:not([data-rw-owned])')){
   if(card.closest('[data-rw-owned]'))continue;
   const id=new URL(card.href,location.origin).pathname.split('/').pop();const r=WorkshopData.resource(id);if(!r)continue;
   const home=location.pathname==='/'&&new URLSearchParams(location.search).get('page')!=='my-resources';
   if(home&&(r.kind==='试卷'||card.dataset.paperCover==='exam')){
    if(card.hasAttribute('data-ws-content-preview'))card.removeAttribute('data-ws-content-preview');
    continue;
   }
   const img=card.querySelector('img');const url=api.url(r);if(!img||!url)continue;
   if(img.getAttribute('src')!==url){img.src=url;img.removeAttribute('srcset');}
   img.decoding='async';
   const position=focus[artifactPath(r)]||'50% 50%';
   if(card.style.getPropertyValue('--ws-preview-focus')!==position)card.style.setProperty('--ws-preview-focus',position);
   if(!card.hasAttribute('data-ws-content-preview'))card.setAttribute('data-ws-content-preview','');
  }
 }
 function schedule(){if(!pending){pending=true;requestAnimationFrame(scan);}}
 new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('workshop-data-changed',schedule);
})();
