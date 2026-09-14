/* Presentation only: styling annotations and a decorative companion.
   Unrelated business nodes and application events are left intact.
   The user-requested collections and folder behavior lives in my-resources.js. */
(() => {
  const mark = (node, key, value = '') => { if (node && node.getAttribute('data-paper-' + key) !== value) node.setAttribute('data-paper-' + key, value); };
  const coverNames = {
    'donghua-guanghe': 'photosynthesis', 'donghua-gougu': 'geometry', 'donghua-xibao': 'cell',
    'kejian-lifedays': 'lifetime', 'mingti-shijuan': 'exam', 'zuti-shijuan': 'exam',
    'yingyong-tangshi': 'poetry', 'yingyong-taohua': 'poetry', 'yingyong-huodong': 'activity', 'yingyong-xiyou': 'activity',
  };
  const spriteNS = 'http://www.w3.org/2000/svg';
  const installedCompanions = new WeakSet();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const animatedKPIs = new WeakSet();
  function animateDashboard() {
    document.querySelectorAll('[data-paper-content] .grid-cols-4 span[class*="text-[30px]"]').forEach(node => {
      if (animatedKPIs.has(node)) return;
      const finalText = node.textContent.trim();
      if (!/^[\d,]+(?:\.\d+)?$/.test(finalText)) return;
      animatedKPIs.add(node);
      mark(node, 'kpi');
      if (reducedMotion.matches) return;
      const target = Number(finalText.replaceAll(',', ''));
      const decimals = (finalText.split('.')[1] || '').length;
      const formatter = new Intl.NumberFormat('en-US', { useGrouping: finalText.includes(','), minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      // Overlay the visual count so React hydration and accessible text stay intact.
      mark(node, 'count', formatter.format(0));
      let started;
      function tick(now) {
        if (!node.isConnected) return;
        started ??= now;
        const progress = reducedMotion.matches ? 1 : Math.min((now - started) / 1600, 1);
        mark(node, 'count', progress === 1 ? finalText : formatter.format(Math.floor(target * (1 - (1 - progress) ** 3) * 10 ** decimals) / 10 ** decimals));
        if (progress < 1) requestAnimationFrame(tick);
        else node.removeAttribute('data-paper-count');
      }
      requestAnimationFrame(tick);
    });
    document.querySelectorAll('[data-paper-content] section').forEach(section => {
      if (!section.querySelector('header')?.textContent.includes('飞轮')) return;
      const wheel = section.querySelector('svg[viewBox="0 0 420 400"]');
      if (!wheel) return;
      mark(wheel, 'flywheel');
      mark(wheel.parentElement, 'flywheel-stage');
      wheel.parentElement.querySelectorAll(':scope > span, :scope > button').forEach(node => {
        if (node.hasAttribute('data-paper-orbit')) return;
        const offset = value => {
          const match = value.match(/calc\(50% ([+-]) ([-\d.]+)px\)/);
          return match ? Number(match[2]) * (match[1] === '-' ? -1 : 1) : undefined;
        };
        const x = offset(node.style.left);
        const y = offset(node.style.top);
        if (x === undefined || y === undefined) return;
        node.style.setProperty('--orbit-x', x + 'px');
        node.style.setProperty('--orbit-y', y + 'px');
        mark(node, 'orbit');
      });
    });
  }
  let spriteAsset, companion, pointerFrame = 0, pointer = null;
  function setupCompanion(node) {
    if (!node || installedCompanions.has(node)) return;
    installedCompanions.add(node);
    spriteAsset ||= fetch('/paper-theme/assets/paper-sprite.svg').then(response => {
      if (!response.ok) throw new Error('Companion asset unavailable');
      return response.text();
    });
    spriteAsset.then(source => {
      if (!node.isConnected) return;
      const asset = new DOMParser().parseFromString(source, 'image/svg+xml');
      const drawing = document.createElementNS(spriteNS, 'g');
      drawing.setAttribute('data-paper-sprite', '');
      drawing.setAttribute('transform', 'scale(0.7142857143)');
      [...asset.documentElement.children].filter(n => n.tagName !== 'style').forEach(n => drawing.appendChild(document.importNode(n, true)));
      drawing.querySelectorAll('.eye').forEach(eye => {
        const gaze = document.createElementNS(spriteNS, 'g');
        gaze.setAttribute('data-paper-eye', '');
        eye.replaceWith(gaze); gaze.appendChild(eye);
      });
      node.appendChild(drawing);
      mark(node, 'companion', 'ready');
      companion = node;
    }).catch(() => { /* Retain the static SVG background if the asset cannot load. */ });
  }
  function updateCompanion() {
    pointerFrame = 0;
    if (!companion?.isConnected) return;
    let x = 0, y = 0;
    if (pointer && !reducedMotion.matches) {
      // Subtract the applied translation to avoid chasing our own movement.
      const rect = companion.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - (parseFloat(companion.style.getPropertyValue('--companion-x')) || 0);
      const cy = rect.top + rect.height / 2 - (parseFloat(companion.style.getPropertyValue('--companion-y')) || 0);
      x = Math.tanh((pointer.x - cx) / 300);
      y = Math.tanh((pointer.y - cy) / 240);
    }
    for (const [key,value] of Object.entries({'x':x*2,'y':y*1.5,'turn':x*6,'eye-x':x*2.1,'eye-y':y*1.6})) {
      companion.style.setProperty('--companion-'+key, value.toFixed(3)+(key==='turn'?'deg':'px'));
    }
  }
  function scheduleCompanion() { if (!pointerFrame) pointerFrame = requestAnimationFrame(updateCompanion); }
  function resetCompanion() { pointer = null; scheduleCompanion(); }
  addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    pointer = {x:event.clientX,y:event.clientY}; scheduleCompanion();
  }, {passive:true});
  document.documentElement.addEventListener('pointerleave', resetCompanion);
  addEventListener('blur', resetCompanion);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetCompanion(); });
  addEventListener('scroll', scheduleCompanion, {capture:true,passive:true});
  addEventListener('resize', scheduleCompanion, {passive:true});
  reducedMotion.addEventListener('change', resetCompanion);
  function updateMyResources(home) { window.PaperResources?.sync(home); }
  const graphScript = document.createElement('script');
  graphScript.src = '/paper-theme/knowledge-graph.js';
  document.head.appendChild(graphScript);
  const filterScript = document.createElement('script');
  filterScript.src = '/paper-theme/resource-filters.js';
  document.head.appendChild(filterScript);
  const resourcesScript = document.createElement('script');
  resourcesScript.src = '/paper-theme/my-resources.js';
  resourcesScript.defer = true;
  document.head.appendChild(resourcesScript);
  document.addEventListener('paper-resources-ready', () => schedule());
  let pending = false;
  function decorate() {
    pending = false;
    const route = location.pathname;
    if (route === '/' && new URLSearchParams(location.search).get('page') === 'my-resources') mark(document.body, 'library-page');
    else { document.body.removeAttribute('data-paper-library-page'); document.body.removeAttribute('data-paper-library-ready'); }
    mark(document.body, 'page', route === '/' ? 'home' : route.startsWith('/artifacts/') ? 'artifact' : route.startsWith('/share/') ? 'share' : route.replaceAll('/', '-').replace(/^-/, ''));
    if (route.startsWith('/artifacts/')) return;
    const root = document.querySelector('.font-fxls.h-screen');
    if (root) {
      mark(root, 'shell');
      [...root.children].forEach(node => {
        if (node.querySelector('button') && node.textContent.includes('切回旧版本')) mark(node, 'sidebar');
        else if (node.classList.contains('flex-1')) mark(node, 'content');
      });
    }
    document.querySelectorAll('a[href*="/share/"]').forEach(card => {
      if (card.closest('[data-rw-owned]')) return;
      const img = card.querySelector('img'); if (!img) return;
      mark(card, 'card');
      const thumb = card.children[0], info = card.children[1];
      mark(thumb, 'card-image'); mark(info, 'card-info');
      if (info) { mark(info.children[0], 'card-title'); mark(info.children[1], 'card-meta'); }
      const src = img.getAttribute('src') || '';
      for (const [match, theme] of Object.entries(coverNames)) if (src.includes(match)) { mark(card, 'cover', theme); break; }
      if (card.parentElement.classList.contains('grid')) mark(card.parentElement, 'card-grid');
    });
    if (route === '/') {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const composer = textarea.parentElement?.parentElement;
        if (composer?.className.includes('backdrop-blur')) {
          mark(composer, 'composer'); mark(composer.children[0], 'composer-input'); mark(composer.children[1], 'composer-tools');
          const hint = '描述教学需求，例如：生成七年级英语互动课件，帮助学生练习词汇和句型。';
          if (textarea.placeholder !== hint) textarea.placeholder = hint;
          const home = composer.parentElement; mark(home, 'home-body'); mark(home.children[0], 'home-heading'); setupCompanion(home.children[0]?.querySelector(':scope > svg'));
          mark(home.children[2], 'home-tabs'); mark(home.children[3], 'home-gallery');
          mark(home.parentElement, 'home-scroll');
          updateMyResources(home);
        }
      }
    }
    window.PaperKnowledgeGraph?.sync();
    if (route === '/dashboard') animateDashboard();
    if (route === '/chat') {
      document.querySelectorAll('.msg-in>div').forEach(form => {
        if (form.firstElementChild?.textContent.trim() !== '信息确认') return;
        mark(form, 'confirmation');
        mark(form.children[0], 'confirmation-heading');
        const fields = form.children[1]; mark(fields, 'confirmation-fields');
        [...fields.children].forEach(group => {
          mark(group, 'question'); mark(group.firstElementChild, 'question-title');
          const options = [...group.children].find(n => n.classList.contains('flex-wrap'));
          if (options) {
            const long = [...options.children].some(n => n.tagName === 'BUTTON' && n.textContent.length > 24);
            mark(options, 'question-options', long ? 'long' : 'short');
            [...options.children].forEach(n => { if(n.tagName === 'BUTTON') mark(n, n.querySelector('svg') ? 'option' : 'custom-option'); });
          }
        });
        mark(form.children[2], 'confirmation-actions'); mark(form.children[3], 'confirmation-timer');
        const stream = form.closest('.msg-in')?.parentElement;
        mark(stream, 'confirmation-stream'); mark(stream?.parentElement, 'conversation-scroll');
        const pane = stream?.closest('section'); mark(pane, 'confirmation-pane');
        const input = pane?.querySelector('textarea');
        if (input) { const composer=input.parentElement?.parentElement;mark(composer, 'followup-composer');mark(composer?.parentElement?.parentElement, 'followup-dock');if(composer?.previousElementSibling?.classList.contains('pointer-events-auto'))mark(composer.previousElementSibling,'followup-status'); }
      });
    }
    document.querySelectorAll('button[aria-label="打开任务记录"]').forEach(n => { n.removeAttribute('data-paper-history-backdrop'); mark(n, 'history-toggle'); });
    document.querySelectorAll('button[aria-label="关闭任务记录"]').forEach(n => { n.removeAttribute('data-paper-history-toggle'); mark(n, 'history-backdrop'); });
    document.querySelectorAll('button[aria-label="折叠菜单"],button[aria-label="展开菜单"]').forEach(n => mark(n, 'menu-toggle'));
    document.querySelectorAll('.fixed[class*="z-[9999]"][class*="w-[148px]"]').forEach(n => mark(n, 'menu-flyout'));
    document.querySelectorAll('textarea').forEach(n => mark(n, 'input'));
    document.querySelectorAll('iframe').forEach(n => mark(n, 'artifact-frame'));
    syncListNavigation();
  }
  function syncListNavigation() {
    const destinations=[['/plaza/resource','教学资源'],['/plaza/app','教学应用'],['/?page=my-resources','我的资源']];
    const isLibrary=location.pathname==='/'&&new URLSearchParams(location.search).get('page')==='my-resources';
    const current=isLibrary?destinations[2][0]:location.pathname;
    if(!destinations.some(([href])=>href===current))return;
    const breadcrumb=isLibrary?document.querySelector('.rw-breadcrumb'):document.querySelector('main button[aria-label="返回首页"]')?.parentElement;
    if(!isLibrary&&breadcrumb&&!Object.keys(breadcrumb.querySelector('button')||{}).some(k=>k.startsWith('__reactProps$')))return;
    const heading=isLibrary?document.querySelector('.rw-title-row h1'):document.querySelector('main h1');
    if(!breadcrumb||!heading)return;
    const host=heading.parentElement;
    if(host.querySelector('.rw-list-switch'))return;
    document.querySelectorAll('.rw-list-switch').forEach(n=>n.remove());
    const nav=document.createElement('nav');nav.className='rw-list-switch';nav.setAttribute('aria-label','资源列表切换');nav.dataset.rwOwned='';
    nav.innerHTML=destinations.map(([href,label])=>`<a href="${href}" ${href===current?'aria-current="page"':''}>${label}</a>`).join('');
    heading.classList.add('rw-switch-heading');
    if(!isLibrary)host.classList.add('rw-list-title-row');
    heading.before(nav);
  }
  window.PaperListNavigation=syncListNavigation;
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(decorate); } }
  // Data annotations do not retrigger this observer; placeholder writes are equality-guarded.
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'src', 'href', 'aria-label', 'placeholder'] });
  addEventListener('popstate', schedule); addEventListener('pageshow', schedule);
  // Query-only navigation can reuse the React tree without a DOM mutation.
  let presentationURL = location.href;
  setInterval(() => { if (location.href !== presentationURL) { presentationURL = location.href; schedule(); } }, 200);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', decorate); else decorate();
})();
