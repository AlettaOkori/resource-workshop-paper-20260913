(async () => {
  'use strict';
  const D = await window.WorkshopData.ready;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const number = value => Math.max(0, Number(value) || 0);
  const format = value => number(value).toLocaleString('zh-CN');
  const isApp = r => ['教学应用','教育应用','教学游戏'].includes(r.kind);
  const subject = r => r.subject || '其他';
  const grade = r => r.grade || '未标注';
  const colors = {语文:'#a66b4f', 数学:'#9b7653', 生物:'#75805d', 其他:'#8b8470'};
  const palette = {resource:['#f3eee8','#ead8cc','#d8b5a4','#c88970','#a85f4e'], app:['#f1f0e8','#e2e2d0','#c9c9ae','#a9aa88','#7b8065']};
  const featureColors = {'互动课件':'#a66b4f', '教学动画':'#b87858', '教育应用':'#75805d', '教学游戏':'#8b8d68', 'AI命题':'#a68a53', 'AI组题':'#a68a53'};
  const icons = {
    total:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    original:'<path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM14 5l5 5M13 21h8"/>',
    adapted:'<rect x="3" y="3" width="12" height="12" rx="2"/><path d="M9 15v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-4M7 9h4M9 7v4"/>',
    downloads:'<path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5"/>'
  };
  const icon = key => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key]}</svg>`;
  const heading = (title, aside = '') => `<div class="wd-section-head"><h2>${title}</h2>${aside}</div>`;
  const groupHeading = (title, aside = '') => `<div class="wd-group-head"><h2>${title}</h2>${aside}</div>`;
  let root, original, period = 7, chosen = '', showAllSubjects = false, dialog, cloudFrame, resizeObserver;

  function dashboardResources() {
    return D.resources();
  }

  // Display-only examples for the requested topic preview; never persist them.
  function displayThemes() {
    const examples = [
      ['光合作用', '生物', 28, '生成光合作用教学动画，演示叶片如何利用光能制造有机物。'],
      ['勾股定理', '数学', 24, '设计勾股定理互动课件，让学生通过拼图验证三边关系。'],
      ['桃花源记', '语文', 21, '围绕《桃花源记》设计沉浸式学习活动，帮助学生理解文章情境。'],
      ['细胞结构', '生物', 18, '制作动植物细胞对比动画，突出细胞各部分的结构与功能。'],
      ['有理数', '数学', 16, '生成有理数运算练习，包含分层题目和解题过程。'],
      ['望庐山瀑布', '语文', 14, '制作《望庐山瀑布》互动课件，结合意象与朗读理解诗意。'],
      ['行程问题', '数学', 12, '设计相遇和追及问题的动态演示，展示速度、时间与路程的关系。'],
      ['古诗词闯关', '语文', 10, '设计古诗词闯关游戏，通过诗句补全和意象配对巩固所学。'],
      ['课堂活动', '其他', 8, '制作课堂分组活动工具，支持随机分组、计时和成果展示。'],
      ['分层练习', '数学', 6, '围绕本单元知识点生成基础、提高和拓展三个层次的练习。']
    ];
    return examples.map(([name, subject, count, prompt]) => ({
      name, subject, count:count * (period === 30 ? 4 : 1),
      items:Array.from({length:count * (period === 30 ? 4 : 1)}, () => ({prompt}))
    }));
  }

  function range() {
    const now = Date.now(), start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - period + 1);
    return {start:+start, now};
  }

  function kpis(resources) {
    const total = resources.length, originals = resources.filter(r => r.origin !== 'adapted').length;
    const share = count => total ? Math.round(count / total * 100) : 0;
    const metrics = [
      ['累计生成资源', total, '份', `教学资源 ${resources.filter(r => !isApp(r)).length} · 教学应用 ${resources.filter(isApp).length}`, 'total'],
      ['原创资源', originals, '份', `占生成资源 ${share(originals)}%`, 'original', share(originals)],
      ['改编资源', total - originals, '份', `占生成资源 ${share(total - originals)}%`, 'adapted', share(total - originals)],
      ['累计下载次数', resources.reduce((sum, r) => sum + number(r.downloads), 0), '次', '全部时间', 'downloads']
    ];
    return `<div class="wd-kpis" aria-label="资源关键指标">${metrics.map(([label, value, unit, foot, key, percent]) => `<section class="wd-metric wd-${key}"><div class="wd-metric-top"><span>${label}</span><span class="wd-metric-icon">${icon(key)}</span></div><div class="wd-metric-number"><strong>${format(value)}</strong><small>${unit}</small></div><div class="wd-metric-foot"><span>${foot}</span>${percent === undefined ? '' : `<span class="wd-mini-track" aria-hidden="true"><i style="width:${percent}%"></i></span>`}</div></section>`).join('')}</div>`;
  }

  function distribution(resources) {
    const allSubjects = D.base.subjects.filter(s => s !== '推荐');
    const preferred = ['语文', '数学', '生物', '其他'];
    const defaults = [...preferred.filter(s => allSubjects.includes(s)), ...allSubjects.filter(s => !preferred.includes(s))].slice(0, 4);
    const subjects = showAllSubjects ? allSubjects : defaults;
    const grades = [...new Set([...D.base.grades, ...resources.map(grade), '未标注'])];
    const counts = new Map();
    const key = (kind, s, g) => JSON.stringify([kind, s, g]);
    for (const r of resources) {
      const k = key(isApp(r) ? 'app' : 'resource', subject(r), grade(r));
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    return `${groupHeading('资源分布')}<div class="wd-grid wd-distribution">${['resource', 'app'].map(kind => {
      const p = palette[kind], total = resources.filter(r => isApp(r) === (kind === 'app')).length;
      return `<section class="wd-panel wd-heat-panel wd-${kind}">${heading(`<i class="wd-title-dot" aria-hidden="true"></i>${kind === 'app' ? '教学应用分布' : '教学资源分布'}`, `<span>累计 ${format(total)} 份</span>`)}<div class="wd-heat-scroll"><table class="wd-heatmap"><thead><tr><th scope="col">学科 / 年级</th>${grades.map(g => `<th scope="col" title="${esc(g)}">${esc(g.replace('年级', ''))}</th>`).join('')}</tr></thead><tbody>${subjects.map(s => `<tr><th scope="row">${esc(s)}</th>${grades.map(g => {
        const value = counts.get(key(kind, s, g)) || 0, level = value ? Math.ceil(value / max * 4) : 0;
        return `<td><button type="button" data-heat="${kind}" data-subject="${esc(s)}" data-grade="${esc(g)}" aria-label="${esc(s)} · ${esc(g)} · ${value} 份" title="${esc(s)} · ${esc(g)} · ${value} 份" style="--cell:${p[level]};--cell-ink:${level > 2 ? '#fff' : '#536258'}" ${value ? '' : 'disabled'}>${value || '·'}</button></td>`;
      }).join('')}</tr>`).join('')}</tbody></table>${subjects.length ? '' : '<p class="wd-empty">暂无资源</p>'}</div><div class="wd-heat-footer"><button type="button" class="wd-text-button" data-toggle-subjects aria-expanded="${showAllSubjects}">${showAllSubjects ? '收起其余学科' : `展开全部 ${allSubjects.length} 个学科`}</button><div class="wd-heat-key" aria-label="颜色越深，资源数量越多"><span>0</span>${p.map(color => `<i style="background:${color}"></i>`).join('')}<span>${max} 份</span></div></div></section>`;
    }).join('')}</div>`;
  }

  function trend(activities, resources, dates) {
    const dated = resources.filter(r => number(r.createdAt) > 0);
    const days = Array.from({length:period}, (_, i) => {
      const day = new Date(dates.start);
      day.setDate(day.getDate() + i);
      const end = new Date(day);
      end.setDate(end.getDate() + 1);
      return {day, uses:activities.filter(a => a.createdAt >= +day && a.createdAt < +end).length, archived:dated.filter(r => r.createdAt >= +day && r.createdAt < +end).length};
    });
    const top = Math.max(1, ...days.flatMap(d => [d.uses, d.archived]));
    const step = Math.max(1, Math.ceil(top / 4)), ceiling = step * 4;
    const x = i => 48 + (i + .5) * 542 / period, y = value => 154 - value / ceiling * 124;
    const barWidth = Math.min(24, 542 / period * .58);
    const totalArchived = days.reduce((sum, d) => sum + d.archived, 0);
    return `<section class="wd-panel wd-trend-panel">${heading('创作使用趋势', `<span>发起 ${format(activities.length)} 次${dated.length ? ` · 归档 ${format(totalArchived)} 份` : ''}</span>`)}<svg class="wd-trend" viewBox="0 0 602 190" role="img" aria-label="近 ${period} 天每日创作发起次数${dated.length ? '与归档作品数' : ''}">${Array.from({length:5}, (_, i) => `<line x1="48" x2="590" y1="${y(i * step)}" y2="${y(i * step)}"/><text x="35" y="${y(i * step) + 4}" text-anchor="end">${i * step}</text>`).join('')}${days.map((d, i) => `<rect class="wd-trend-bar" x="${x(i) - barWidth / 2}" y="${y(d.uses)}" width="${barWidth}" height="${154 - y(d.uses)}"><title>${d.day.getMonth() + 1}/${d.day.getDate()} · 发起 ${d.uses} 次${dated.length ? ` · 归档 ${d.archived} 份` : ''}</title></rect>${period === 7 || i % 5 === 0 || i === period - 1 ? `<text x="${x(i)}" y="180" text-anchor="middle">${d.day.getMonth() + 1}/${d.day.getDate()}</text>` : ''}`).join('')}${dated.length ? `<polyline class="wd-trend-line" points="${days.map((d, i) => `${x(i)},${y(d.archived)}`).join(' ')}"/>${days.map((d, i) => `<circle class="wd-trend-point" cx="${x(i)}" cy="${y(d.archived)}" r="2.5"><title>${d.day.getMonth() + 1}/${d.day.getDate()} · 归档 ${d.archived} 份</title></circle>`).join('')}` : ''}</svg><div class="wd-trend-legend"><span><i></i>发起次数</span>${dated.length ? '<span><i class="wd-line-key"></i>归档作品数</span>' : ''}</div></section>`;
  }

  function features(activities) {
    const rows = D.base.features.map(name => ({name, count:activities.filter(a => (a.feature || '').replace(/\s/g, '') === name.replace(/\s/g, '')).length})).sort((a, b) => b.count - a.count);
    const total = rows.reduce((sum, r) => sum + r.count, 0), max = Math.max(1, ...rows.map(r => r.count));
    return `<section class="wd-panel wd-feature-panel">${heading('创作能力使用', '<span>次数 / 占比</span>')}<div class="wd-feature-bars">${rows.map(r => `<div><span>${esc(r.name.replace(/^AI/, 'AI '))}</span><i aria-hidden="true"><em style="width:${r.count / max * 100}%;background:${featureColors[r.name] || '#818979'}"></em></i><strong>${format(r.count)} 次 · ${total ? (r.count / total * 100).toFixed(1) : 0}%</strong></div>`).join('')}</div></section>`;
  }

  function questions(groups) {
    const source = chosen ? groups.filter(t => t.name === chosen) : groups;
    const items = [];
    for (const theme of source) {
      const prompts = new Map();
      for (const activity of theme.items) {
        const prompt = activity.prompt || theme.name;
        prompts.set(prompt, (prompts.get(prompt) || 0) + 1);
      }
      for (const [prompt, count] of prompts) items.push({name:theme.name, prompt, count});
    }
    const fallback = [
      {name:'细胞结构', count:18, prompt:'制作动植物细胞对比动画，突出细胞各部分的结构与功能。'},
      {name:'有理数', count:16, prompt:'生成有理数运算练习，包含分层题目和解题过程。'},
      {name:'课堂活动', count:8, prompt:'制作课堂分组活动工具，支持随机分组、计时和成果展示。'}
    ];
    return [...items, ...fallback.filter(f => !items.some(item => item.name === f.name))].slice(0, 5).map(item => `<li><div><strong>${esc(item.name)}</strong><span>${item.count} 次</span></div><p title="${esc(item.prompt)}">${esc(item.prompt)}</p></li>`).join('') || '<li class="wd-empty">暂无提问记录</li>';
  }

  function cloud(groups) {
    const shown = groups.slice(0, 16), max = Math.max(1, ...shown.map(t => t.count));
    return `<section class="wd-panel wd-themes">${heading('高频创作主题', `<span>近 ${period} 天</span>`)}<div class="wd-theme-body"><div class="wd-cloud-wrap"><div class="wd-cloud" role="group" aria-label="高频创作主题词云">${shown.map(t => `<button type="button" data-theme="${esc(t.name)}" aria-pressed="${chosen === t.name}" aria-label="${esc(t.name)} · ${t.count} 次" title="${esc(t.name)} · ${t.count} 次" style="--word-color:${colors[t.subject] || colors.其他};font-size:${Math.round(11 + 43 * Math.pow(t.count / max, 1.15))}px">${esc(t.name)}</button>`).join('') || '<p class="wd-empty">暂无创作主题</p>'}</div><div class="wd-cloud-legend">${[...new Set(shown.map(t => t.subject))].map(s => `<span><i style="background:${colors[s] || colors.其他}"></i>${esc(s)}</span>`).join('')}</div></div><div class="wd-question-wrap"><div class="wd-question-heading"><h3>高频问题</h3><button type="button" class="wd-text-button" data-clear ${chosen ? '' : 'hidden'}>全部主题</button></div><ol class="wd-questions" aria-live="polite">${questions(groups)}</ol></div></div></section>`;
  }

  // Measure rendered words and pack bounding boxes from the centre outward.
  function layoutCloud() {
    const cloud = root?.querySelector('.wd-cloud');
    if (!cloud || !cloud.clientWidth) return;
    const words = [...cloud.querySelectorAll('button')];
    const width = cloud.clientWidth, height = cloud.clientHeight;
    words.forEach(word => {word.dataset.baseFont ||= parseFloat(word.style.fontSize);});
    for (let scale = 1; scale >= .4; scale -= .05) {
      const placed = [];
      let complete = true;
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        word.style.fontSize = Math.max(12, Math.round(Number(word.dataset.baseFont) * scale)) + 'px';
        word.style.visibility = 'hidden';
        let box, found = false;
        const w = word.offsetWidth + 8, h = word.offsetHeight + 6;
        for (let step = 0; step < 3000; step++) {
          const angle = step * .17 + i * .65, radius = step * .16;
          const x = width / 2 + Math.cos(angle) * radius * 1.5;
          const y = height / 2 + Math.sin(angle) * radius * .78;
          box = {left:x - w / 2, top:y - h / 2, right:x + w / 2, bottom:y + h / 2, x, y};
          if (box.left < 0 || box.top < 0 || box.right > width || box.bottom > height) continue;
          if (placed.some(b => box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top)) continue;
          found = true;
          break;
        }
        if (!found) {complete = false; break;}
        placed.push(box);
        word.style.left = box.x + 'px';
        word.style.top = box.y + 'px';
        word.style.visibility = 'visible';
      }
      if (complete) return;
    }
  }

  function teacherRanking(resources, origin) {
    const map = new Map();
    resources.filter(r => (r.origin !== 'adapted') === (origin === 'original')).forEach(r => {
      const key = r.authorId || r.author || '未标注教师';
      const entry = map.get(key) || {key, name:r.author || '未标注教师', count:0, grades:new Set(), subjects:new Set()};
      entry.count++;
      if (r.authorGrade) entry.grades.add(r.authorGrade);
      if (r.authorSubject) entry.subjects.add(r.authorSubject);
      map.set(key, entry);
    });
    const rows = [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
    const fallback = ['王红敏','刘瑞鹏','陈欣老师','李东辉老师','周老师'].map((name, i) => ({key:'demo-teacher-'+i, name, count:Math.max(1, 5 - i), grades:new Set(['七年级']), subjects:new Set(['语文'])}));
    for (const item of fallback) if (rows.length < 5) rows.push(item);
    rows.splice(5);
    return `<section class="wd-panel wd-teacher-panel wd-${origin}">${heading(origin === 'original' ? '教师原创排行' : '教师改编排行', '<span>资源数 / 份</span>')}<ol class="wd-ranking">${rows.map((r, i) => `<li><span class="wd-rank-number">${i + 1}</span><button type="button" class="wd-rank-link" data-teacher="${esc(r.key)}" data-origin="${origin}"><strong>${esc(r.name)}</strong><small>${esc([[...r.grades].join('、'), [...r.subjects].join('、')].filter(Boolean).join(' · '))}</small></button><b>${format(r.count)}</b></li>`).join('') || '<li class="wd-empty">暂无创作记录</li>'}</ol></section>`;
  }

  function resourceRanking(resources, field) {
    const labels = {likes:'点赞排行', saves:'收藏排行', downloads:'下载排行'};
    const rows = resources.filter(r => number(r[field]) > 0).sort((a, b) => number(b[field]) - number(a[field]) || a.title.localeCompare(b.title, 'zh-CN')).slice(0, 5);
    return `<section class="wd-panel wd-resource-panel wd-${field}">${heading(labels[field], '<span>次</span>')}<ol class="wd-ranking">${rows.map((r, i) => `<li><span class="wd-rank-number">${i + 1}</span><a class="wd-rank-link" ${r.mock ? 'aria-disabled="true"' : `href="${esc(r.href)}"`}><strong title="${esc(r.title)}">${esc(r.title)}</strong><small>${esc(r.author || '未标注教师')} · ${esc(subject(r))}</small></a><b>${format(r[field])}</b></li>`).join('') || '<li class="wd-empty">暂无记录</li>'}</ol></section>`;
  }

  function draw() {
    if (!root?.isConnected) return;
    const resources = dashboardResources(), dates = range();
    const activities = D.activities().filter(a => a.createdAt >= dates.start && a.createdAt <= dates.now);
    const groups = displayThemes(), active = new Set(activities.map(a => a.authorId || a.author).filter(Boolean)).size;
    if (!groups.some(t => t.name === chosen)) chosen = '';
    resizeObserver?.disconnect();
    root.innerHTML = `<div class="wd-content"><header class="wd-header"><nav aria-label="面包屑"><a href="/">首页</a><span>/</span><span>数据中心</span></nav><h1>资源工坊数据看板</h1></header>${kpis(resources)}${distribution(resources)}${groupHeading('近期创作', `<div class="wd-recent-controls"><span>活跃教师 <strong>${active}</strong> 人</span><select data-period aria-label="近期创作统计周期"><option value="7" ${period === 7 ? 'selected' : ''}>近 7 天</option><option value="30" ${period === 30 ? 'selected' : ''}>近 30 天</option></select></div>`)}<div class="wd-grid wd-usage">${trend(activities, resources, dates)}${features(activities)}</div>${cloud(groups)}${groupHeading('教师贡献', '<span>累计 · Top5</span>')}<div class="wd-grid wd-teacher-ranks">${teacherRanking(resources, 'original')}${teacherRanking(resources, 'adapted')}</div>${groupHeading('资源排行', '<span>累计 · Top5</span>')}<div class="wd-grid wd-resource-ranks">${['likes', 'saves', 'downloads'].map(field => resourceRanking(resources, field)).join('')}</div></div>`;
    resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(cloudFrame);
      cloudFrame = requestAnimationFrame(layoutCloud);
    });
    resizeObserver.observe(root.querySelector('.wd-cloud'));
    document.fonts.ready.then(layoutCloud);
  }

  function openList(title, resources, invoker) {
    dialog?.remove();
    dialog = document.createElement('dialog');
    dialog.className = 'wd-resource-dialog';
    dialog.setAttribute('aria-labelledby', 'wd-dialog-title');
    dialog.innerHTML = `<header><h2 id="wd-dialog-title">${esc(title)}</h2><button type="button" aria-label="关闭资源列表">×</button></header><div>${resources.map(r => `<a ${r.mock ? 'aria-disabled="true"' : `href="${esc(r.href)}"`}><strong>${esc(r.title)}</strong><small>${esc(r.author || '未标注教师')} · ${esc(subject(r))}</small></a>`).join('') || '<p>暂无资源</p>'}</div>`;
    document.body.append(dialog);
    dialog.querySelector('button').onclick = () => dialog.close();
    dialog.addEventListener('click', e => {if (e.target === dialog) dialog.close();});
    dialog.addEventListener('close', () => {invoker?.focus({preventScroll:true}); dialog?.remove();});
    dialog.showModal();
  }

  function handleClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-toggle-subjects')) {
      showAllSubjects = !showAllSubjects;
      draw();
      root.querySelector('[data-toggle-subjects]')?.focus({preventScroll:true});
    } else if (button.hasAttribute('data-theme') || button.hasAttribute('data-clear')) {
      const theme = button.dataset.theme || '';
      chosen = chosen === theme ? '' : theme;
      const groups = displayThemes();
      root.querySelectorAll('[data-theme]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === chosen)));
      root.querySelector('[data-clear]').hidden = !chosen;
      root.querySelector('.wd-questions').innerHTML = questions(groups);
    } else if (button.dataset.heat) {
      openList(`${button.dataset.subject} · ${button.dataset.grade}`, dashboardResources().filter(r => subject(r) === button.dataset.subject && grade(r) === button.dataset.grade && isApp(r) === (button.dataset.heat === 'app')), button);
    } else if (button.dataset.teacher) {
      const resources = dashboardResources().filter(r => (r.authorId || r.author || '未标注教师') === button.dataset.teacher && (r.origin !== 'adapted') === (button.dataset.origin === 'original'));
      openList(button.querySelector('strong').textContent, resources, button);
    }
  }

  function unmount() {
    resizeObserver?.disconnect();
    cancelAnimationFrame(cloudFrame);
    dialog?.remove();
    original?.removeAttribute('data-wd-original');
    root?.remove();
    root = null;
    original = null;
  }

  function mount() {
    if (location.pathname !== '/dashboard') {if (root) unmount(); return;}
    if (root?.isConnected) return;
    const host = document.querySelector('[data-paper-content] > div.flex-1');
    const candidate = host?.querySelector(':scope > div');
    if (!candidate || !Object.keys(candidate).some(k => k.startsWith('__reactProps$'))) return;
    original = candidate;
    root = document.createElement('main');
    root.id = 'workshop-dashboard';
    root.className = 'wd-dashboard';
    root.dataset.rwOwned = '';
    host.append(root);
    root.addEventListener('click', handleClick);
    root.addEventListener('change', event => {
      if (!event.target.matches('[data-period]')) return;
      period = Number(event.target.value);
      chosen = '';
      draw();
      root.querySelector('[data-period]').focus({preventScroll:true});
    });
    draw();
    original.dataset.wdOriginal = '';
  }

  D.subscribe(draw);
  new MutationObserver(mount).observe(document.documentElement, {childList:true, subtree:true});
  addEventListener('popstate', mount);
  setInterval(mount, 350);
  mount();
})();
