/* Resource and application lists share the school catalog and profile defaults. */
(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const isPlaza = () => ['/plaza/resource','/plaza/app'].includes(location.pathname);
  const attached = node => node && Object.keys(node).some(key => key.startsWith('__reactProps$'));
  let data, mounted, pending = false, revision = 0;
  function group(label, values, kind, state) {
    const row = document.createElement('div');
    row.className = `rw-filter-row rw-filter-${kind}`;
    row.setAttribute('role','group'); row.setAttribute('aria-label',label);
    row.innerHTML = `<span class="rw-filter-label">${label}</span>`;
    for (const value of [...new Set(['全部', ...values])]) {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = value; button.dataset.value = value;
      button.addEventListener('click', () => { state[kind] = value; apply(state); });
      row.append(button);
    }
    return row;
  }
  function update() {
    pending = false;
    if (!data || !isPlaza()) { mounted = null; return; }
    const heading = [...document.querySelectorAll('main h1')].find(n => /^(教学资源|教学应用)$/.test(n.textContent));
    const scroll = heading?.parentElement?.parentElement;
    if (!scroll || !attached(heading) || document.readyState !== 'complete') return;
    if (!mounted || mounted.scroll !== scroll || mounted.route !== location.pathname || !mounted.shell.isConnected) {
      const nativeSubjects = [...scroll.children].find(n => n.classList.contains('mt-7'));
      const nativeGrades = [...scroll.children].find(n => n.firstElementChild?.textContent === '年级');
      const nativeResults = [...scroll.children].find(n => n.classList.contains('mt-6'));
      const nativeSearch = heading.parentElement.querySelector('input');
      if (![nativeSubjects,nativeGrades,nativeResults].every(attached)) return;
      for (const node of [nativeSubjects,nativeGrades,nativeResults,nativeSearch?.parentElement]) if (node) node.dataset.rwNativeList = '';
      const profile = data.base.profile;
      const state = {scroll,route:location.pathname,edition:profile.edition || '全部',subject:profile.subject || '全部',grade:profile.grade || '全部',query:'',signature:''};
      const shell = document.createElement('section'); shell.className = 'rw-discovery'; shell.dataset.rwOwned = 'discovery'; state.shell = shell;
      state.rows = [group('教材版本', [...data.base.editions,'未标注'], 'edition', state),group('学科',data.base.subjects.filter(s => s !== '推荐'),'subject',state),group('年级',data.base.grades,'grade',state)];
      shell.append(...state.rows);
      const toolbar = document.createElement('div'); toolbar.className = 'rw-discovery-toolbar';
      const searchLabel = location.pathname === '/plaza/app' ? '搜索应用名称或教师姓名' : '搜索资源名称或教师姓名';
      toolbar.innerHTML = `<span class="rw-discovery-count" role="status"></span><label class="rw-discovery-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" placeholder="${searchLabel}" aria-label="${searchLabel}"></label>`;
      state.search = toolbar.querySelector('input'); state.count = toolbar.querySelector('[role="status"]');
      state.search.addEventListener('input', () => { state.query = state.search.value; apply(state); });
      shell.append(toolbar);
      state.results = document.createElement('div'); state.results.className = 'rw-discovery-grid'; shell.append(state.results);
      state.empty = document.createElement('div'); state.empty.className = 'rw-filter-empty';
      state.empty.innerHTML = '<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="11" y="8" width="34" height="40" rx="3"/><path d="M20 20h16M20 27h16M20 34h8"/></svg><p>暂无符合条件的资源</p><button type="button">清空筛选</button>';
      state.empty.querySelector('button').addEventListener('click',() => {state.subject = state.grade = state.edition = '全部'; state.query = ''; state.search.value = ''; apply(state);});
      shell.append(state.empty); nativeSubjects.before(shell);
      shell.addEventListener('click', event => { const b = event.target.closest('[data-discovery-save]'); if (!b) return; event.preventDefault(); data.toggle('save', b.dataset.discoverySave); });
      mounted = state;
    }
    apply(mounted);
  }
  function apply(state) {
    for (const [index,kind] of ['edition','subject','grade'].entries()) for (const button of state.rows[index].querySelectorAll('button')) {
      const value = String(button.dataset.value === state[kind]); if (button.getAttribute('aria-pressed') !== value) button.setAttribute('aria-pressed',value);
    }
    const query = state.query.trim().toLocaleLowerCase();
    const seen = new Set();
    const rows = data.resources().filter(r => {
      if (!(window.WorkshopPreviews?.isBrowsable(r) ?? (!r.legacy && !!(r.mock || r.artifact || r.href)))) return false;
      const app = ['教学应用','教育应用','教学游戏'].includes(r.kind);
      const matches = app === (state.route === '/plaza/app') && (state.edition === '全部' || state.edition === (r.edition || '未标注')) && (state.subject === '全部' || state.subject === r.subject) && (state.grade === '全部' || state.grade === r.grade) && (!query || `${r.title} ${r.author}`.toLocaleLowerCase().includes(query));
      const key = JSON.stringify([r.title.trim(),r.artifact || r.id]);
      if (!matches || seen.has(key)) return false;
      seen.add(key); return true;
    });
    const signature = JSON.stringify([revision,state.edition,state.subject,state.grade,query,rows.map(r => [r.id,r.likes,r.saves,data.isSaved(r.id)])]);
    if (signature === state.signature) return; state.signature = signature;
    state.count.textContent = `${rows.length} 份${state.route === '/plaza/app' ? '教学应用' : '教学资源'}`;
    state.empty.hidden = rows.length > 0; state.results.hidden = !rows.length;
    state.results.innerHTML = rows.map(r => `<article class="rw-discovery-card"><a class="rw-discovery-link" ${r.mock ? 'aria-disabled="true"' : `href="${escape(r.href)}"`}><div class="rw-discovery-cover">${window.WorkshopPreviews?.markup(r) || (r.cover ? `<img src="${escape(r.cover)}" alt="" loading="lazy">` : '<span class="ws-preview-empty">暂无预览</span>')}</div><div class="rw-discovery-copy"><div class="rw-discovery-meta"><span>${escape(r.kind)}</span><span>浏览 ${Number(r.views || 0)}</span></div><h2>${escape(r.title)}</h2><div class="rw-discovery-author"><span class="rw-teacher-avatar">${escape((r.author || '教师').slice(0,1))}</span><span>${escape(r.author || '教师')}</span><span>${escape([r.grade,r.subject].filter(Boolean).join(' · '))}</span></div></div></a><div class="rw-discovery-footer"><span>点赞 ${Number(r.likes || 0)}</span><button type="button" data-discovery-save="${escape(r.id)}" aria-pressed="${data.isSaved(r.id)}" aria-label="${data.isSaved(r.id)?'取消收藏':'收藏'} ${escape(r.title)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>${data.isSaved(r.id)?'已收藏':'收藏'}</button></div></article>`).join('');
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(update); } }
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('workshop-previews-ready',()=>{revision++;schedule();});
  addEventListener('popstate',schedule); addEventListener('pageshow',schedule);
  let url = location.href; setInterval(() => {if (location.href !== url || (!mounted && isPlaza())) {url = location.href;schedule();}},250);
  async function init() {if (!window.WorkshopData) {setTimeout(init,50);return;} data = window.WorkshopData; await data.ready;data.subscribe(() => {revision++;schedule();});schedule();}
  init();
})();
