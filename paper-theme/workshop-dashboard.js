(async () => {
  'use strict';
  const D = await window.WorkshopData.ready;
  await window.WorkshopPreviews?.ready;
  const Stats = await import('/paper-theme/workshop-dashboard-stats.js');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const number = value => Math.max(0, Number(value) || 0);
  const format = value => number(value).toLocaleString('zh-CN');
  const isApp = Stats.isApplication;
  const subject = r => r.subject || '其他';
  const grade = r => r.grade || '未标注';
  const colors = {语文:'#a66b4f', 数学:'#9b7653', 生物:'#75805d', 其他:'#8b8470'};
  const palette = {resource:['#f3eee8','#ead8cc','#d8b5a4','#c88970','#a85f4e'], app:['#f1f0e8','#e2e2d0','#c9c9ae','#a9aa88','#7b8065']};
  const featureColors = {'互动课件':'#a66b4f', '教学动画':'#b87858', '教育应用':'#75805d', '教学游戏':'#8b8d68', 'AI命题':'#a68a53', 'AI组题':'#a68a53'};
  const heading = (title, aside = '') => `<div class="wd-section-head"><h2>${title}</h2>${aside}</div>`;
  const groupHeading = (title, aside = '') => `<div class="wd-group-head"><h2>${title}</h2>${aside}</div>`;
  let root, original, period = '7', chosen = '', showAllSubjects = false, dialog, cloudFrame, resizeObserver;
  const sorts = {resource:{field:'downloads', direction:'desc'}, teacher:{field:'original', direction:'desc'}};
  let currentGroups = [], rankingDialog = null;
  let kpiFrame, kpiAnimation;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function dashboardResources() {
    return D.resources();
  }

  function range() { return Stats.rangeFor(period, D.base.currentTerm); }

  function kpis(resources) {
    const m = Stats.metricSummary(resources);
    const metrics = [
      ['生成成果总数', m.teaching + m.applications, '项', 'total'],
      ['原创成果', m.originalTeaching + m.originalApplications, '项', 'original'],
      ['创编成果', m.adaptedTeaching + m.adaptedApplications, '项', 'adapted'],
      ['教师人均成果', m.average, '项／人', 'average']
    ];
    return `<div class="wd-kpis" aria-label="累计成果关键指标">${metrics.map(([label, value, unit, key]) => `<section class="wd-metric wd-${key}"><div class="wd-metric-top"><span>${label}</span></div><div class="wd-metric-number"><strong data-kpi-value="${value}" data-kpi-decimals="${key === 'average' ? 1 : 0}" aria-label="${key === 'average' ? (value ? value.toFixed(1) : '0') : format(value)}">${key === 'average' ? (value ? value.toFixed(1) : '0') : format(value)}</strong><small>${unit}</small></div></section>`).join('')}</div>`;
  }

  function animateKpis() {
    cancelAnimationFrame(kpiFrame);
    const elements = [...root.querySelectorAll('[data-kpi-value]')];
    const signature = elements.map(el => el.dataset.kpiValue).join('|');
    if (kpiAnimation?.signature !== signature) kpiAnimation = {signature, start:performance.now()};
    const paint = now => {
      if (!root?.isConnected || !elements[0]?.isConnected) return;
      const progress = reducedMotion.matches ? 1 : Math.min(1, (now - kpiAnimation.start) / 1100);
      const eased = 1 - Math.pow(1 - progress, 3);
      for (const el of elements) {
        const target = number(el.dataset.kpiValue), decimals = Number(el.dataset.kpiDecimals);
        const value = progress === 1 ? target : Math.floor(target * eased * 10 ** decimals) / 10 ** decimals;
        const text = decimals && target ? value.toFixed(decimals) : format(value);
        if (el.textContent !== text) el.textContent = text;
      }
      if (progress < 1) kpiFrame = requestAnimationFrame(paint);
    };
    paint(performance.now());
  }

  function periodControls(active) {
    return `<div class="wd-recent-controls"><span class="wd-active-teachers">活跃教师 <strong>${active}</strong> 人</span><label class="wd-period-controls"><span>时间范围</span><select data-period-select aria-label="近期创作时间范围">${[['7','近7天'],['15','近15天'],['30','近30天'],['term',Stats.termLabel(D.base.currentTerm)]].map(([value,label]) => `<option value="${value}" ${period === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label></div>`;
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
    const days = Stats.trendBuckets(activities, resources, dates);
    const top = Math.max(1, ...days.flatMap(d => [d.uses, d.outcomes]));
    const step = Math.max(1, Math.ceil(top / 4)), ceiling = step * 4;
    const length = Math.max(1, days.length), tickStep = Math.max(1, Math.ceil(length / 7));
    const x = i => 48 + (i + .5) * 542 / length, y = value => 154 - value / ceiling * 124;
    const barWidth = Math.min(24, 542 / length * .58);
    const dayLabel = value => {const d = new Date(value); return `${d.getMonth() + 1}/${d.getDate()}`;};
    const label = bucket => `${dayLabel(bucket.start)}${dayLabel(bucket.start) === dayLabel(bucket.end) ? '' : '—' + dayLabel(bucket.end)}`;
    const total = days.reduce((sum, d) => sum + d.outcomes, 0);
    return `<section class="wd-panel wd-trend-panel">${heading('创作使用趋势', `<span>发起 ${format(activities.length)} 次 · 生成成果 ${format(total)} 份</span>`)}${days.length ? `<svg class="wd-trend" viewBox="0 0 602 190" role="img" aria-label="${dates.label}发起次数与生成成果数">${Array.from({length:5}, (_, i) => `<line x1="48" x2="590" y1="${y(i * step)}" y2="${y(i * step)}"/><text x="35" y="${y(i * step) + 4}" text-anchor="end">${i * step}</text>`).join('')}${days.map((d, i) => `<rect class="wd-trend-bar" x="${x(i) - barWidth / 2}" y="${y(d.uses)}" width="${barWidth}" height="${154 - y(d.uses)}"><title>${label(d)} · 发起 ${d.uses} 次 · 生成成果 ${d.outcomes} 份</title></rect>${i % tickStep === 0 || i === days.length - 1 ? `<text x="${x(i)}" y="180" text-anchor="middle">${dayLabel(d.start)}</text>` : ''}`).join('')}<polyline class="wd-trend-line" points="${days.map((d, i) => `${x(i)},${y(d.outcomes)}`).join(' ')}"/>${days.map((d, i) => `<circle class="wd-trend-point" cx="${x(i)}" cy="${y(d.outcomes)}" r="2.5"><title>${label(d)} · 生成成果 ${d.outcomes} 份</title></circle>`).join('')}</svg>` : '<div class="wd-trend wd-empty">暂无创作记录</div>'}<div class="wd-trend-legend"><span><i></i>发起次数</span><span><i class="wd-line-key"></i>生成成果数</span></div></section>`;
  }

  function features(activities) {
    const rows = D.base.features.map(name => ({name, count:activities.filter(a => (a.feature || '').replace(/\s/g, '') === name.replace(/\s/g, '')).length})).sort((a, b) => b.count - a.count);
    const total = rows.reduce((sum, r) => sum + r.count, 0), max = Math.max(1, ...rows.map(r => r.count));
    return `<section class="wd-panel wd-feature-panel">${heading('创作能力使用', '<span>次数 / 占比</span>')}<div class="wd-feature-bars">${rows.map(r => `<div><span>${esc(r.name.replace(/^AI/, 'AI '))}</span><i aria-hidden="true"><em style="width:${r.count / max * 100}%;background:${featureColors[r.name] || '#818979'}"></em></i><strong>${format(r.count)} 次 · ${total ? (r.count / total * 100).toFixed(1) : 0}%</strong></div>`).join('')}</div></section>`;
  }

  function questions(groups) {
    const source = chosen ? groups.filter(theme => theme.name === chosen) : groups.slice(0, 5);
    return source.map(theme => `<li class="wd-question-row"><div class="wd-question-title"><strong>${esc(theme.name)}</strong><p title="${esc(theme.items[0]?.prompt || theme.name)}">${esc(theme.items[0]?.prompt || theme.name)}</p></div><div class="wd-question-stats"><span>提问 ${format(theme.count)} 次</span><button type="button" class="wd-outcome-button" data-outcomes="${esc(theme.name)}" ${theme.outcomes.length ? '' : 'disabled'}>生成 ${format(theme.outcomes.length)} 次</button></div></li>`).join('') || '<li class="wd-empty">暂无提问记录</li>';
  }

  function cloud(groups) {
    const shown = groups.slice(0, 16), max = Math.max(1, ...shown.map(t => t.count));
    return `<section class="wd-panel wd-themes">${heading('高频创作主题', `<span>${range().label}</span>`)}<div class="wd-theme-body"><div class="wd-cloud-wrap"><div class="wd-cloud" role="group" aria-label="高频创作主题词云">${shown.map(t => `<button type="button" data-theme="${esc(t.name)}" aria-pressed="${chosen === t.name}" aria-label="${esc(t.name)} · 提问 ${t.count} 次 · 生成 ${t.outcomes.length} 份成果" title="${esc(t.name)} · 提问 ${t.count} 次 · 生成 ${t.outcomes.length} 份成果" style="--word-color:${colors[t.subject] || colors.其他};font-size:${Math.round(13 + 30 * Math.pow(t.count / max, 1.15))}px">${esc(t.name)}</button>`).join('') || '<p class="wd-empty">暂无创作主题</p>'}</div><div class="wd-cloud-legend">${[...new Set(shown.map(t => t.subject))].map(s => `<span><i style="background:${colors[s] || colors.其他}"></i>${esc(s)}</span>`).join('')}</div></div><div class="wd-question-wrap"><div class="wd-question-heading"><h3>高频问题</h3></div><ol class="wd-questions" aria-live="polite">${questions(groups)}</ol></div></div></section>`;
  }

  // Measure rendered words and pack bounding boxes from the centre outward.
  function layoutCloud() {
    const cloud = root?.querySelector('.wd-cloud');
    if (!cloud || !cloud.clientWidth) return;
    const words = [...cloud.querySelectorAll('button')];
    cloud.classList.remove('wd-cloud-flow');
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
    cloud.classList.add('wd-cloud-flow');
    words.forEach(word => {word.style.visibility = 'visible'; word.style.fontSize = '16px';});
  }

  function sortHeading(kind, field, label) {
    const sort = sorts[kind], active = sort.field === field;
    return `<th scope="col" aria-sort="${active ? (sort.direction === 'desc' ? 'descending' : 'ascending') : 'none'}"><button type="button" data-sort-kind="${kind}" data-sort-field="${field}">${label}<span aria-hidden="true">${active ? (sort.direction === 'desc' ? '↓' : '↑') : '↕'}</span></button></th>`;
  }

  function rankingTable(kind, resources, page = 0, size = 5) {
    const sort = sorts[kind];
    const all = kind === 'teacher' ? Stats.teacherRows(resources, sort.field, sort.direction) : Stats.rankResources(resources, sort.field, sort.direction);
    const rows = all.slice(page * size, (page + 1) * size);
    return `<div class="wd-rank-scroll"><table class="wd-rank-table wd-${kind}-table"><thead><tr><th scope="col">排名</th><th scope="col">${kind === 'teacher' ? '教师' : '资源名称'}</th>${kind === 'teacher' ? sortHeading(kind, 'original', '原创') + sortHeading(kind, 'adapted', '创编') : sortHeading(kind, 'downloads', '下载') + sortHeading(kind, 'saves', '收藏') + sortHeading(kind, 'likes', '点赞')}</tr></thead><tbody>${rows.map((row, i) => `<tr><td>${page * size + i + 1}</td><td>${kind === 'teacher' ? `<button type="button" class="wd-rank-link" data-teacher="${esc(row.key)}"><strong>${esc(row.name)}</strong><small>${esc([[...row.grades].join('、'), [...row.subjects].join('、')].filter(Boolean).join(' · '))}</small></button>` : `${row.href && !row.mock ? `<a class="wd-rank-link" href="${esc(row.href)}">` : '<span class="wd-rank-link">'}<strong title="${esc(row.title)}">${esc(row.title)}</strong><small>${esc(row.author || '未标注教师')} · ${esc(subject(row))}</small>${row.href && !row.mock ? '</a>' : '</span>'}`}</td>${(kind === 'teacher' ? ['original','adapted'] : ['downloads','saves','likes']).map(field => `<td class="${sort.field === field ? 'wd-sorted' : ''}">${format(row[field])}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${kind === 'teacher' ? 4 : 5}" class="wd-empty">暂无记录</td></tr>`}</tbody></table></div>`;
  }

  function rankings(resources) {
    return `${groupHeading('累计排行')}<div class="wd-grid wd-combined-ranks">${['resource','teacher'].map(kind => `<section class="wd-panel wd-${kind}-panel">${heading(kind === 'teacher' ? '教师贡献 Top5' : '资源排行 Top5', `<button type="button" class="wd-text-button" data-more="${kind}">更多</button>`)}${rankingTable(kind, resources)}</section>`).join('')}</div>`;
  }

  function draw() {
    if (!root?.isConnected) return;
    const resources = dashboardResources(), dates = range();
    const activities = D.activities().filter(a => Stats.inRange(a, dates));
    const groups = currentGroups = Stats.themeGroups(activities, resources, dates, D.allKnowledge());
    const active = new Set(activities.map(a => a.authorId || a.author).filter(Boolean)).size;
    if (!groups.some(t => t.name === chosen)) chosen = '';
    resizeObserver?.disconnect();
    root.innerHTML = `<div class="wd-content"><header class="wd-header"><nav aria-label="面包屑"><a href="/">首页</a><span>/</span><span>数据中心</span></nav><h1>资源工坊数据看板</h1></header>${kpis(resources)}${distribution(resources)}${groupHeading('近期创作', periodControls(active))}<div class="wd-grid wd-usage">${trend(activities, resources, dates)}${features(activities)}</div>${cloud(groups)}${rankings(resources)}</div>`;
    animateKpis();
    resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(cloudFrame);
      cloudFrame = requestAnimationFrame(layoutCloud);
    });
    resizeObserver.observe(root.querySelector('.wd-cloud'));
    document.fonts.ready.then(layoutCloud);
  }

  function makeDialog(title, invoker) {
    dialog?.remove();
    const element = dialog = document.createElement('dialog');
    element.className = 'wd-resource-dialog';
    element.setAttribute('aria-labelledby', 'wd-dialog-title');
    element.innerHTML = `<header><h2 id="wd-dialog-title">${esc(title)}</h2><button type="button" aria-label="关闭资源列表">×</button></header><div data-dialog-content></div>`;
    document.body.append(element);
    element.querySelector('header button').onclick = () => element.close();
    element.addEventListener('click', event => {if (event.target === element) element.close(); else handleClick(event);});
    element.addEventListener('close', () => {invoker?.focus({preventScroll:true}); element.remove(); if (dialog === element) {dialog = null; rankingDialog = null;}});
    return element;
  }

  function openList(title, resources, invoker) {
    rankingDialog = null;
    resources = resources.filter(resource => !resource.legacy && (resource.mock || resource.artifact || resource.href));
    const element = makeDialog(title, invoker);
    element.querySelector('[data-dialog-content]').innerHTML = `<div class="wd-result-cards">${resources.map(resource => `<article class="wd-result-card">${resource.href && !resource.mock ? `<a href="${esc(resource.href)}">` : '<div>'}<div class="wd-result-preview">${window.WorkshopPreviews?.markup(resource) || '<span>暂无预览</span>'}</div><strong>${esc(resource.title)}</strong><small>${esc(resource.author || '未标注教师')} · ${esc(resource.kind || subject(resource))}</small>${resource.href && !resource.mock ? '</a>' : '</div>'}</article>`).join('') || '<p class="wd-empty">暂无资源</p>'}</div>`;
    element.showModal();
  }

  function drawRankingDialog() {
    if (!dialog || !rankingDialog) return;
    const {kind} = rankingDialog, resources = dashboardResources();
    const total = kind === 'teacher' ? Stats.teacherRows(resources).length : resources.length;
    const pages = Math.max(1, Math.ceil(total / 10));
    rankingDialog.page = Math.max(0, Math.min(rankingDialog.page, pages - 1));
    dialog.querySelector('[data-dialog-content]').innerHTML = rankingTable(kind, resources, rankingDialog.page, 10) + `<div class="wd-pagination"><span>共 ${format(total)} 条</span><div><button type="button" data-rank-page="${rankingDialog.page - 1}" ${rankingDialog.page === 0 ? 'disabled' : ''}>上一页</button><span>${rankingDialog.page + 1} / ${pages}</span><button type="button" data-rank-page="${rankingDialog.page + 1}" ${rankingDialog.page === pages - 1 ? 'disabled' : ''}>下一页</button></div></div>`;
  }

  function selectTheme(name) {
    chosen = name;
    root.querySelectorAll('[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === chosen)));
    root.querySelector('.wd-questions').innerHTML = questions(currentGroups);
  }

  function handleClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-toggle-subjects')) {
      showAllSubjects = !showAllSubjects;
      draw();
      root.querySelector('[data-toggle-subjects]')?.focus({preventScroll:true});
    } else if (button.hasAttribute('data-theme')) {
      selectTheme(chosen === button.dataset.theme ? '' : button.dataset.theme);
    } else if (button.dataset.outcomes) {
      const theme = currentGroups.find(group => group.name === button.dataset.outcomes);
      if (theme) openList(`${theme.name} · 生成成果`, theme.outcomes, button);
    } else if (button.dataset.heat) {
      openList(`${button.dataset.subject} · ${button.dataset.grade}`, dashboardResources().filter(r => subject(r) === button.dataset.subject && grade(r) === button.dataset.grade && isApp(r) === (button.dataset.heat === 'app')), button);
    } else if (button.dataset.teacher) {
      const resources = dashboardResources().filter(r => Stats.teacherKey(r) === button.dataset.teacher);
      openList(button.querySelector('strong').textContent, resources, button);
    } else if (button.dataset.more) {
      const kind = button.dataset.more;
      const element = makeDialog(kind === 'teacher' ? '教师贡献排行' : '资源排行', button);
      element.classList.add('wd-ranking-dialog');
      rankingDialog = {kind, page:0};
      drawRankingDialog();
      element.showModal();
    } else if (button.dataset.sortKind) {
      const kind = button.dataset.sortKind, field = button.dataset.sortField, sort = sorts[kind];
      const inDialog = button.closest('dialog');
      sorts[kind] = {field, direction:sort.field === field && sort.direction === 'desc' ? 'asc' : 'desc'};
      if (rankingDialog) rankingDialog.page = 0;
      draw();
      drawRankingDialog();
      (inDialog || root).querySelector(`[data-sort-kind="${kind}"][data-sort-field="${field}"]`)?.focus({preventScroll:true});
    } else if (button.hasAttribute('data-rank-page') && rankingDialog) {
      rankingDialog.page = Number(button.dataset.rankPage);
      drawRankingDialog();
    }
  }

  function unmount() {
    cancelAnimationFrame(kpiFrame);
    kpiAnimation = null;
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
      if (event.target.matches('[data-period-select]')) {
        period = event.target.value;
        chosen = '';
        draw();
        root.querySelector('[data-period-select]')?.focus({preventScroll:true});
      }
    });
    draw();
    original.dataset.wdOriginal = '';
  }

  D.subscribe(() => {draw(); drawRankingDialog();});
  new MutationObserver(mount).observe(document.documentElement, {childList:true, subtree:true});
  addEventListener('popstate', mount);
  setInterval(mount, 350);
  mount();
})();
