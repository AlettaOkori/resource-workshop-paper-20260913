/* Detail metadata, knowledge-based recommendations and real HTML downloads. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{like:'<path d="M7 10H4v11h3zm0 0 5-8c3 0 3 3 2 7h6c2 0 2 2 1 5l-2 7H7z"/>',save:'<path d="M6 3h12v18l-6-4-6 4z"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'}[name]}</svg>`;
  let data, current, pending = false, revision = 0;
  const attached = n => n && Object.keys(n).some(k => k.startsWith('__reactProps$'));
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
      const topTitle = main.querySelector('header > span') || [...main.querySelector('header').children].find(n => n.tagName !== 'BUTTON');
      if (topTitle) topTitle.dataset.rwDetailOldTitle = '';
      nativeInfo.dataset.rwDetailOldInfo = ''; section.dataset.rwDetailSection = ''; section.parentElement.dataset.rwDetailColumns = ''; frame.parentElement.dataset.rwDetailPreview = ''; main.dataset.rwDetailMain = '';
      for (const child of aside.children) child.dataset.rwDetailOldRelated = '';
      aside.dataset.rwDetailAside = '';
      const panel = document.createElement('section'); panel.className = 'rw-detail-info'; panel.dataset.rwOwned = 'detail';
      panel.innerHTML = '<div class="rw-detail-heading"></div><div class="rw-detail-tags"></div><div class="rw-detail-byline"></div><div class="rw-detail-bottom"><div class="rw-detail-statistics"></div><div class="rw-detail-actions"></div></div><p class="rw-detail-feedback" role="status" hidden></p>';
      section.append(panel);
      const related = document.createElement('section'); related.className = 'rw-detail-related'; related.dataset.rwOwned = 'detail';
      related.innerHTML = `<h2>相关课件推荐</h2><label class="rw-detail-search">${icon('search')}<input type="search" aria-label="搜索相关课件或教师" placeholder="搜索相关课件或教师"></label><div class="rw-related-resources"></div><h2 class="rw-path-heading">AI 学习建议</h2><div class="rw-learning-path"></div>`;
      aside.append(related);
      current = {id,frame,section,panel,related,adapt,query:'',signature:''};
      const state = current;
      const fullscreen = frame.parentElement.querySelector('button');
      if (fullscreen) fullscreen.addEventListener('click', event => {
        event.preventDefault(); event.stopImmediatePropagation();
        const expanded = frame.parentElement.classList.toggle('rw-detail-fullscreen');
        fullscreen.textContent = expanded ? '退出全屏' : '全屏';
        fullscreen.setAttribute('aria-label', expanded ? '退出全屏' : '全屏');
      },true);
      related.querySelector('input').addEventListener('input', event => {state.query = event.target.value; renderRecommendations(state);});
      panel.addEventListener('click', event => {
        const button = event.target.closest('[data-detail-action]'); if (!button) return;
        const action = button.dataset.detailAction;
        if (action === 'like' || action === 'save') data.toggle(action,state.id);
        if (action === 'knowledge') window.WorkshopKnowledge?.open(state.id);
        if (action === 'adapt') state.adapt?.click();
        if (action === 'download') void download(state,button);
      });
    }
    render(current);
  }
  function render(state) {
    const r = data.resource(state.id); if (!r) return;
    const signature = JSON.stringify([revision,r]); if (signature === state.signature) return; state.signature = signature;
    state.panel.querySelector('.rw-detail-heading').innerHTML = `<h1>${esc(r.title)}</h1>`;
    const points = data.knowledge(r.id);
    state.panel.querySelector('.rw-detail-tags').innerHTML = points.map(n => `<a href="/graph?subject=${esc(n.subjectId)}&node=${esc(n.id)}">${esc(n.name)}</a>`).join('') + `<button type="button" data-detail-action="knowledge">${points.length?'编辑知识点':'设置知识点'}</button>`;
    state.panel.querySelector('.rw-detail-byline').innerHTML = `<span class="rw-detail-avatar">${esc((r.author || '教师').slice(0,1))}</span><strong>${esc(r.author || '教师')}</strong><span>${esc(r.authorGrade || data.base.profile.grade)}</span><span>${esc(r.authorSubject || data.base.profile.subject)}</span>${r.edition?`<span class="rw-detail-edition">${esc(r.edition)}</span>`:''}`;
    state.panel.querySelector('.rw-detail-statistics').innerHTML = `<span>浏览 <b>${Number(r.views || 0)}</b></span><span>点赞 <b>${Number(r.likes || 0)}</b></span><span>下载 <b>${Number(r.downloads || 0)}</b></span>`;
    state.panel.querySelector('.rw-detail-actions').innerHTML = `<button type="button" data-detail-action="like" aria-pressed="${data.isLiked(r.id)}">${icon('like')}${data.isLiked(r.id)?'已点赞':'点赞'}</button><button type="button" data-detail-action="save" aria-pressed="${data.isSaved(r.id)}">${icon('save')}${data.isSaved(r.id)?'已收藏':'收藏'}</button>${state.adapt?'<button type="button" data-detail-action="adapt">一键改编</button>':''}<button class="rw-detail-download" type="button" data-detail-action="download">${icon('download')}下载 HTML</button>`;
    renderRecommendations(state);
  }
  function relations(resource) {
    const selected = new Set((resource.knowledgeIds || []).map(String)), nodes = new Map(data.allKnowledge().map(n => [n.id,n]));
    const links = new Map();
    const add = (id,phase,relation) => { if (!selected.has(id) && nodes.has(id) && !links.has(id)) links.set(id,{...nodes.get(id),phase,relation}); };
    for (const id of selected) {
      const node = nodes.get(id); if (!node) continue;
      for (const key of ['prerequisiteIds','prerequisites']) for (const next of node[key] || []) add(typeof next === 'string'?next:next.id,'before','前置知识');
      for (const key of ['nextIds','successorIds']) for (const next of node[key] || []) add(typeof next === 'string'?next:next.id,'after','后续知识');
    }
    for (const subject of data.graph.subjects || []) for (const edge of subject.edges || []) {
      const [source,target,relation] = Array.isArray(edge)?edge:[edge.source,edge.target,edge.relation];
      if (selected.has(source) && !selected.has(target)) add(target,'related',relation);
      if (selected.has(target) && !selected.has(source)) add(source,'related',relation);
    }
    return {selected,links};
  }
  function renderRecommendations(state) {
    const r = data.resource(state.id), {selected,links} = relations(r), all = data.resources().filter(item => item.id !== r.id && !item.legacy && !item.mock && item.href);
    const query = state.query.trim().toLocaleLowerCase();
    const recommendations = all.map(item => ({item,score:(item.knowledgeIds || []).reduce((sum,id) => sum + (selected.has(id)?10:links.has(id)?3:0),0)})).filter(entry => entry.score > 0 && (!query || `${entry.item.title} ${entry.item.author}`.toLocaleLowerCase().includes(query))).sort((a,b) => b.score-a.score || b.item.views-a.item.views).slice(0,4);
    state.related.querySelector('.rw-related-resources').innerHTML = recommendations.length ? recommendations.map(({item}) => `<a class="rw-related-card" href="${esc(item.href)}">${item.cover?`<img src="${esc(item.cover)}" alt="" loading="lazy">`:''}<span><strong>${esc(item.title)}</strong><small>${esc(item.author)} · ${esc(item.subject)}</small></span></a>`).join('') : '<p class="rw-related-empty">暂无相关资源</p>';
    const path = state.related.querySelector('.rw-learning-path');
    if (!selected.size) {path.innerHTML = '<p class="rw-related-empty">暂未关联知识点</p>';return;}
    const subjectName = data.allKnowledge().find(n => selected.has(n.id))?.subjectName;
    const fallback = phase => data.allKnowledge().filter(n => !selected.has(n.id) && (!subjectName || n.subjectName === subjectName)).slice(0,2).map(n => ({...n, phase}));
    const before = [...links.values()].filter(n => n.phase === 'before').slice(0,2); if (!before.length) before.push(...fallback('before'));
    const after = [...links.values()].filter(n => n.phase === 'after').slice(0,2); if (!after.length) after.push(...fallback('after'));
    path.innerHTML = [['前置知识点',before,'先复习'],['后置知识点',after,'继续学习']].map(([label,list,verb]) => `<section class="rw-path-group"><h3>${label}</h3>${list.length?list.map(n => {
      const matches = all.filter(item => (item.knowledgeIds || []).includes(n.id)).sort((a,b) => b.views-a.views);
      const item = matches[0];
      const params = item ? null : new URLSearchParams({chatId:`sim-${crypto.randomUUID()}`,feat:'互动课件',knowledgeId:n.id,q:`请围绕“${n.name}”生成一份互动课件。`});
      return `<article class="rw-path-card"><h4>${esc(n.name)}</h4>${item?'':`<p>${esc(n.description || `${verb}${n.name}，建立与当前知识点的联系。`)}</p>`}${item?`<a class="rw-path-resource" href="${esc(item.href)}"><img src="${esc(item.cover || '/paper-theme/assets/activity.svg')}" alt="${esc(item.title)}的课件封面" loading="lazy"><span><strong>${esc(item.title)}</strong><small>查看课件 <span aria-hidden="true">→</span></small></span></a>`:`<div class="rw-path-empty"><span>暂无相关课件</span><a class="rw-path-generate" href="/chat?${esc(params.toString())}" aria-label="为${esc(n.name)}制作课件">去制作课件 <span aria-hidden="true">→</span></a></div>`}</article>`;
    }).join(''):'<p class="rw-related-empty">暂无关联知识点</p>'}</section>`).join('');
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
    finally {state.downloading = false;if (button.isConnected) {button.disabled = false;button.innerHTML = `${icon('download')}下载 HTML`;}}
  }
  function schedule() {if (!pending) {pending = true;requestAnimationFrame(mount);}}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('popstate',schedule); let url = location.href;setInterval(() => {if (url !== location.href) {url = location.href;schedule();}},200);
  addEventListener('keydown',event => {if (event.key === 'Escape' && current?.frame?.parentElement.classList.contains('rw-detail-fullscreen')) {current.frame.parentElement.classList.remove('rw-detail-fullscreen');const b=current.frame.parentElement.querySelector('button');b.textContent='全屏';b.setAttribute('aria-label','全屏');}});
  async function init() {if (!window.WorkshopData) {setTimeout(init,50);return;}data = window.WorkshopData;await data.ready;data.subscribe(() => {revision++;schedule();});schedule();}
  init();
})();
