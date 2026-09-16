/* Lightweight creation flow used before a simulated chat task starts. */
(() => {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const PROMPT_KEY = 'resource-workshop.prompt.v2:';
  const STATE_KEY = 'resource-workshop.creation.v2:';
  const FEATURE_TYPES = { '17': '试卷', '18': '练习题', '19': '教案', '20': '互动课件' };
  const STYLE_SETS = {
    courseware: [{ value: 'clean', label: '清爽课堂' }, { value: 'paper', label: '纸张讲义' }, { value: 'orange-blue', label: '明快橙蓝' }],
    animation: [{ value: 'mint', label: '柔和薄荷' }, { value: 'lab', label: '实验室透视' }, { value: 'deep-sea', label: '深海荧光' }],
    document: [{ value: 'paper-doc', label: '教案纸面' }, { value: 'focus-doc', label: '清爽重点' }, { value: 'ink-doc', label: '墨色教学' }],
    worksheet: [{ value: 'clean-sheet', label: '清爽试卷' }, { value: 'layered-sheet', label: '分层练习' }, { value: 'answer-sheet', label: '答题卡风' }],
    activity: [{ value: 'active', label: '活力课堂' }, { value: 'task-card', label: '任务卡片' }, { value: 'color-block', label: '彩色磁贴' }],
  };

  let data;
  let graph;
  let base;
  let observer;
  let scheduled = false;
  let creation = null;
  let countdown = null;

  const readJSON = (key, fallback) => { try { return JSON.parse(sessionStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const writeJSON = (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const nodes = () => data.allKnowledge();
  const subject = name => graph.subjects.find(item => item.name === name);
  const units = state => (subject(state.subject)?.curriculum || []).filter(item => item.edition === state.edition && item.grade === state.grade);
  const unit = state => units(state).find(item => item.id === state.unitId);
  const topic = state => unit(state)?.topics.find(item => item.id === state.topicId);
  const allTopics = () => graph.subjects.flatMap(item => (item.curriculum || []).flatMap(section => section.topics.map(itemTopic => ({ subject: item.name, grade: section.grade, edition: section.edition, unitId: section.id, topicId: itemTopic.id, topic: itemTopic }))));

  function promptFor(chatId, query) {
    const pending = readJSON(PROMPT_KEY + chatId, {});
    return query.get('q') || pending.prompt || (query.get('adapt') ? `改编《${query.get('adapt')}》` : '') || '新创作';
  }

  function typeFor(query, prompt) {
    const raw = query.get('feat') || FEATURE_TYPES[query.get('featureId')] || '';
    if (raw) {
      if (/命题|试卷/.test(raw)) return '试卷';
      if (/组题|练习/.test(raw)) return '练习题';
      if (/教案/.test(raw)) return '教案';
      if (/动画/.test(raw)) return '教学动画';
      if (/游戏/.test(raw)) return '教学游戏';
      if (/应用/.test(raw)) return '教育应用';
      return raw;
    }
    if (/命题|试卷|出题|测试/.test(prompt)) return '试卷';
    if (/组题|练习|习题/.test(prompt)) return '练习题';
    if (/教案|教学设计/.test(prompt)) return '教案';
    if (/动画/.test(prompt)) return '教学动画';
    if (/游戏|闯关/.test(prompt)) return '教学游戏';
    if (/应用/.test(prompt)) return '教育应用';
    return '互动课件';
  }

  function styleSet(type) {
    if (type === '教学动画') return STYLE_SETS.animation;
    if (type === '教案') return STYLE_SETS.document;
    if (type === '试卷' || type === '练习题') return STYLE_SETS.worksheet;
    if (type === '教学游戏' || type === '教育应用') return STYLE_SETS.activity;
    return STYLE_SETS.courseware;
  }

  function settingsFor(type) {
    const styles = styleSet(type);
    const style = { key: 'style', label: '视觉风格', options: styles, default: styles[0].value };
    const target = { key: 'target', label: '教学目标', options: [{ value: 'understand', label: '理解知识' }, { value: 'method', label: '掌握方法' }, { value: 'transfer', label: '迁移应用' }], default: 'understand' };
    if (type === '试卷' || type === '练习题') return [
      { key: 'difficulty', label: '难度', options: [{ value: 'basic', label: '基础巩固' }, { value: 'balanced', label: '均衡提升' }, { value: 'advanced', label: '综合拔高' }], default: 'balanced' },
      { key: 'quantity', label: '题量', options: [{ value: '10', label: '10 题' }, { value: '20', label: '20 题' }, { value: '30', label: '30 题' }], default: '20' },
      style,
    ];
    if (type === '教学动画') return [
      target,
      { key: 'scene', label: '使用场景', options: [{ value: 'teacher', label: '教师投屏' }, { value: 'shared', label: '师生共探' }, { value: 'self', label: '学生自学' }], default: 'teacher' },
      style,
    ];
    if (type === '教学游戏' || type === '教育应用') return [
      { key: 'mode', label: '使用方式', options: [{ value: 'quiz', label: '课堂竞答' }, { value: 'explore', label: '合作探究' }, { value: 'self', label: '学生自学' }], default: 'quiz' },
      { key: 'difficulty', label: '难度', options: [{ value: 'basic', label: '轻量入门' }, { value: 'balanced', label: '均衡挑战' }, { value: 'advanced', label: '进阶挑战' }], default: 'balanced' },
      style,
    ];
    return [
      target,
      { key: 'duration', label: '课时', options: [{ value: 'one', label: '1 课时' }, { value: 'two', label: '2 课时' }, { value: 'custom', label: '自定义' }], default: 'one' },
      style,
    ];
  }

  function defaults(type) { return Object.fromEntries(settingsFor(type).map(field => [field.key, field.default])); }

  function normalize(state) {
    const availableUnits = units(state);
    if (!availableUnits.some(item => item.id === state.unitId)) state.unitId = availableUnits[0]?.id || '';
    const availableTopics = unit(state)?.topics || [];
    if (!availableTopics.some(item => item.id === state.topicId)) state.topicId = availableTopics[0]?.id || '';
    state.chapterId = topic(state)?.chapterId || '';
  }

  function recommended(state, prompt) {
    const currentTopic = topic(state);
    const currentIds = new Set(currentTopic?.knowledgeIds || []);
    const lower = String(prompt || '').toLowerCase();
    const matches = nodes().filter(item => lower.includes(item.name.toLowerCase()));
    return matches.map(item => item.id).concat([...currentIds]).filter((id, index, list) => list.indexOf(id) === index && nodes().some(item => item.id === id)).slice(0, 5);
  }

  function context(state) {
    return { subject: state.subject, grade: state.grade, edition: state.edition, unitId: state.unitId, topicId: state.topicId, chapterId: state.chapterId, knowledgeMode: 'textbook' };
  }

  function persist(state, patch = {}) {
    const payload = { phase: state.phase, subject: state.subject, grade: state.grade, edition: state.edition, unitId: state.unitId, topicId: state.topicId, chapterId: state.chapterId, selected: [...state.selected], customKnowledge: state.customKnowledge || [], settings: state.settings, resourceType: state.resourceType, resourceLabel: state.resourceLabel, prompt: state.prompt, ...patch };
    writeJSON(STATE_KEY + state.chatId, payload);
    if (state.phase !== 'basic') data.setKnowledge(state.resourceId, [...state.selected], context(state));
    if (Object.keys(patch).length || state.phase === 'settings' || state.phase === 'generating') data.patchResource(state.resourceId, { ...context(state), knowledgeIds: [...state.selected], customKnowledge: state.customKnowledge || [], teachingSettings: state.settings, resourceType: state.resourceType, visualStyle: state.settings.style || '', ...patch });
  }

  function initial(chatId, query) {
    const resourceId = `creation:${chatId}`;
    const saved = readJSON(STATE_KEY + chatId, {});
    const prompt = promptFor(chatId, query);
    const resource = data.resource(resourceId);
    const current = data.contextFor(resourceId);
    const lower = prompt.toLowerCase();
    const requestedKnowledge = nodes().find(item => item.id === query.get('knowledgeId'));
    const matches = requestedKnowledge ? [requestedKnowledge] : nodes().filter(item => item.name.length > 1 && lower.includes(item.name.toLowerCase()));
    const weighted = allTopics().map(item => ({ ...item, score: item.topic.knowledgeIds.filter(id => matches.some(match => match.id === id)).length * 10 + (lower.includes(item.topic.name.toLowerCase()) ? 100 : 0) })).sort((a, b) => b.score - a.score);
    const match = weighted[0]?.score ? weighted[0] : null;
    const type = saved.resourceType || typeFor(query, prompt);
    const state = {
      chatId,
      resourceId,
      prompt,
      resourceType: type,
      resourceLabel: saved.resourceLabel || query.get('feat') || FEATURE_TYPES[query.get('featureId')] || type,
      phase: saved.phase || (current.knowledgeConfirmed ? 'settings' : 'basic'),
      subject: saved.subject || current.subject || match?.subject || requestedKnowledge?.subjectName || base.profile.subject,
      grade: saved.grade || current.grade || match?.grade || base.profile.grade,
      edition: saved.edition || current.edition || match?.edition || base.profile.edition,
      unitId: saved.unitId || current.unitId || match?.unitId || '',
      topicId: saved.topicId || current.topicId || match?.topicId || '',
      chapterId: saved.chapterId || current.chapterId || match?.chapterId || '',
      selected: new Set(saved.selected || data.knowledge(resourceId).map(item => item.id)),
      customKnowledge: Array.isArray(saved.customKnowledge) ? saved.customKnowledge : [],
      settings: { ...defaults(type), ...(saved.settings || {}) },
      notice: '',
    };
    normalize(state);
    if (!state.selected.size && state.phase === 'basic') state.selected = new Set(requestedKnowledge ? [requestedKnowledge.id] : recommended(state, prompt));
    return state;
  }

  function selectOptions(items, value) { return items.map(item => `<option value="${esc(typeof item === 'string' ? item : item.value || item.id)}" ${String(typeof item === 'string' ? item : item.value || item.id) === String(value) ? 'selected' : ''}>${esc(typeof item === 'string' ? item : item.label || item.name)}</option>`).join(''); }
  function field(key, label, values, value) { return `<label class="wk-inline-field"><span>${esc(label)}</span><select data-wk-field="${esc(key)}" aria-label="${esc(label)}">${selectOptions(values, value)}</select></label>`; }

  function basicMarkup(state) {
    const availableUnits = units(state).map(item => ({ value: item.id, label: `${item.term} · ${item.name}` }));
    return `<section class="wk-card wk-basic-card"><div class="wk-card-head"><h2>基础信息</h2><span>1 / 3</span></div><div class="wk-inline-fields wk-basic-fields">${field('edition', '教材', base.editions, state.edition)}${field('subject', '学科', base.subjects, state.subject)}${field('grade', '年级', base.grades, state.grade)}${field('unitId', '单元', availableUnits, state.unitId)}${field('topicId', '课题', unit(state)?.topics || [], state.topicId)}</div></section>`;
  }

  function pointsMarkup(state) {
    const currentTopic = topic(state);
    const available = nodes().filter(item => currentTopic?.knowledgeIds?.includes(item.id));
    const selectedExtra = nodes().filter(item => state.selected.has(item.id) && !available.some(candidate => candidate.id === item.id));
    const relatedIds = new Set(units(state).flatMap(section => section.topics.flatMap(item => item.knowledgeIds || [])));
    const related = nodes().filter(item => relatedIds.has(item.id));
    const query = (state.pointSearch || '').trim().toLowerCase();
    const candidates = query ? nodes().filter(item => item.name.toLowerCase().includes(query)).slice(0, 30) : [...available, ...related].slice(0, 12);
    const selectable = [...selectedExtra, ...candidates].filter((item, index, list) => list.findIndex(candidate => candidate.id === item.id) === index);
    const list = selectable.length ? selectable.map(item => `<label class="wk-point"><input type="checkbox" value="${esc(item.id)}" ${state.selected.has(item.id) ? 'checked' : ''}><span>${esc(item.name)}</span></label>`).join('') : '<span class="wk-muted">暂无推荐内容</span>';
    const custom = (state.customKnowledge || []).map((item, index) => `<label class="wk-point wk-custom-point"><input type="checkbox" data-wk-custom-index="${index}" checked><span>${esc(item)}</span></label>`).join('');
    return `<section class="wk-card wk-points-card"><div class="wk-card-head"><h2>知识点</h2><span>2 / 3</span></div><div class="wk-points-note">核心内容已默认勾选</div><input class="wk-search" data-wk-search value="${esc(state.pointSearch || '')}" placeholder="搜索知识点" aria-label="搜索知识点"><div class="wk-points">${list}${custom}</div><div class="wk-add-point"><input data-wk-add placeholder="自定义知识点" aria-label="自定义知识点"><button type="button" data-wk-add-button>添加</button></div></section>`;
  }

  function settingsMarkup(state) {
    const fields = settingsFor(state.resourceType);
    const rows = fields.map(item => `<div class="wk-setting"><span>${esc(item.label)}</span><div class="wk-choice-row" role="group" aria-label="${esc(item.label)}">${item.options.map(option => `<button type="button" data-wk-setting="${esc(item.key)}" data-wk-value="${esc(option.value)}" aria-pressed="${String(state.settings[item.key] || item.default) === String(option.value)}">${esc(option.label)}</button>`).join('')}</div>${item.key === 'duration' && state.settings.duration === 'custom' ? '<input class="wk-custom-setting" data-wk-custom-setting="duration" type="number" min="1" max="20" value="' + esc(state.settings.customDuration || 1) + '" aria-label="自定义课时" />' : ''}</div>`).join('');
    const note = ['互动课件', '教学动画', '教案'].includes(state.resourceType) ? '<div class="wk-auto-note">重难点自动生成</div>' : '';
    return `<section class="wk-card wk-settings-card"><div class="wk-card-head"><h2>生成设置</h2><span>${esc(state.resourceLabel || state.resourceType)}</span></div>${rows}${note}</section>`;
  }

  function userPromptMarkup(state) {
    return `<div class="wk-user-message"><span>${esc(state.prompt || '新创作')}</span></div>`;
  }

  function summaryMarkup(state) {
    const basic = [state.edition, state.subject, state.grade, unit(state)?.name, topic(state)?.name].filter(Boolean).join(' · ');
    const pointNames = nodes().filter(item => state.selected.has(item.id)).map(item => item.name);
    const custom = state.customKnowledge || [];
    const points = [...pointNames, ...custom];
    const pointText = points.length > 3 ? `${points.slice(0, 3).join('、')} 等 ${points.length} 项` : (points.join('、') || '已跳过');
    let html = '';
    if (state.phase !== 'basic') html += `<div class="wk-summary"><strong>基础信息</strong><span>${esc(basic || '已填写')}</span></div>`;
    if (['settings', 'generating', 'complete'].includes(state.phase)) html += `<div class="wk-summary"><strong>知识点</strong><span>${esc(pointText)}</span></div>`;
    return html;
  }

  function render(state, root) {
    if (state.recognizing) { root.innerHTML = `${userPromptMarkup(state)}<div class="wk-generating" role="status"><span class="wk-spinner" aria-hidden="true"></span>正在识别…</div>`; return; }
    const timerLabel = state.phase === 'settings' ? '开始生成' : '下一步';
    const head = `${userPromptMarkup(state)}${summaryMarkup(state)}`;
    if (state.phase === 'basic') root.innerHTML = `${head}<div class="wk-flow-top"><span class="wk-resource-tag">${esc(state.resourceLabel || state.resourceType)}</span></div>${basicMarkup(state)}<div class="wk-actions"><span class="wk-notice" role="status">${esc(state.notice)}</span><button type="button" class="wk-primary" data-wk-next>${timerLabel}</button></div>`;
    else if (state.phase === 'points') root.innerHTML = `${head}<div class="wk-flow-top"><span class="wk-resource-tag">${esc(state.resourceLabel || state.resourceType)}</span></div>${pointsMarkup(state)}<div class="wk-actions"><span class="wk-notice" role="status">${esc(state.notice)}</span><button type="button" class="wk-primary" data-wk-next>${timerLabel}</button></div>`;
    else if (state.phase === 'settings') root.innerHTML = `${head}<div class="wk-flow-top"><span class="wk-resource-tag">${esc(state.resourceLabel || state.resourceType)}</span></div>${settingsMarkup(state)}<div class="wk-actions"><span class="wk-notice" role="status">${esc(state.notice)}</span><button type="button" class="wk-primary" data-wk-next>${timerLabel}</button></div>`;
    else if (state.phase === 'generating') root.innerHTML = `${head}<div class="wk-generating"><span class="wk-spinner" aria-hidden="true"></span><span>正在生成</span></div>`;
    else root.innerHTML = `${head}<div class="wk-generating wk-generated"><span aria-hidden="true">✓</span><span>已生成</span></div>`;
  }

  function cancelCountdown() { if (countdown) { clearInterval(countdown.id); countdown = null; } }
  function armCountdown(state) {
    cancelCountdown();
    if (!creation || state.phase === 'generating') return;
    const button = creation.root.querySelector('[data-wk-next]');
    if (!button) return;
    const seconds = state.phase === 'points' ? 10 : 8;
    let remaining = seconds;
    const label = state.phase === 'settings' ? '开始生成' : '下一步';
    const update = () => { if (!creation || creation.state !== state || !button.isConnected) return cancelCountdown(); button.textContent = `${label}（${remaining}）`; if (remaining <= 0) { cancelCountdown(); advance(state); } remaining -= 1; };
    update();
    countdown = { id: setInterval(update, 1000) };
  }

  function refresh(state, shouldArm = false) {
    if (!creation) return;
    creation.state = state;
    render(state, creation.root);
    if (shouldArm) armCountdown(state);
  }

  function setTextareaValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) setter.call(input, value); else input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function submitPrompt(prompt) {
    const started = Date.now();
    while (Date.now() - started < 7000) {
      const input = document.querySelector('[data-paper-content] textarea:not([data-wk-owned])') || document.querySelector('textarea');
      const send = document.querySelector('[data-paper-content] button[aria-label="发送"]') || [...document.querySelectorAll('[data-paper-content] button')].find(button => button.textContent.trim() === '发送');
      if (input && send) { setTextareaValue(input, prompt); send.click(); return true; }
      await new Promise(resolve => setTimeout(resolve, 120));
    }
    return false;
  }

  async function startGeneration(state) {
    cancelCountdown();
    state.phase = 'generating';
    persist(state, { knowledgeConfirmed: true });
    refresh(state);
    const query = new URLSearchParams(location.search);
    query.set('q', state.prompt);
    history.replaceState(history.state, '', `${location.pathname}?${query.toString()}${location.hash}`);
    const ok = await submitPrompt(state.prompt);
    if (!ok && creation?.state === state) { state.phase = 'settings'; state.notice = '暂时无法开始生成，请再点一次'; persist(state); refresh(state, true); }
  }

  function advance(state) {
    if (state.phase === 'basic') {
      cancelCountdown(); state.phase = 'points'; state.notice = ''; persist(state); refresh(state, true); return;
    }
    if (state.phase === 'points') {
      cancelCountdown(); state.phase = 'settings'; state.notice = ''; persist(state, { knowledgeConfirmed: true }); refresh(state, true); return;
    }
    if (state.phase === 'settings') startGeneration(state);
  }

  function addPoint(state, root) {
    const input = root.querySelector('[data-wk-add]');
    const query = input?.value.trim();
    if (!query) return;
    const found = nodes().filter(item => item.name.includes(query) || query.includes(item.name)).slice(0, 1)[0];
    if (found) state.selected.add(found.id);
    else { state.customKnowledge ||= []; if (!state.customKnowledge.includes(query)) state.customKnowledge.push(query); }
    state.notice = ''; input.value = ''; persist(state); render(state, root); armCountdown(state);
  }

  function hideLegacyConfirmation(main) {
    if (!main) return;
    const candidates = [...main.querySelectorAll('[data-paper-confirmation], [data-form-pending="1"], .msg-in')];
    for (const candidate of candidates) {
      if (candidate.closest('[data-rw-owned]')) continue;
      const text = (candidate.textContent || '').trim();
      const form = candidate.matches('[data-paper-confirmation], [data-form-pending="1"]') ? candidate : candidate.querySelector('[data-paper-confirmation], [data-form-pending="1"]');
      if (!form && !/^信息确认(?:\\s|$)/.test(text)) continue;
      const message = (form || candidate).closest('.msg-in') || candidate;
      if (message.dataset.wkLegacyHidden) continue;
      message.dataset.wkLegacyHidden = '1';
      message.style.display = 'none';
      const skip = [...(form || message).querySelectorAll('button')].find(button => button.textContent.trim() === '跳过');
      if (skip && !skip.disabled) skip.click();
    }
  }

  function hideNativePrompt(main, state) {
    if (!main || !state?.prompt) return;
    for (const message of [...main.querySelectorAll('.msg-in')]) {
      if (message.closest('[data-rw-owned]') || message.dataset.wkPromptHidden) continue;
      if ((message.textContent || '').trim() !== state.prompt) continue;
      message.dataset.wkPromptHidden = '1';
      message.style.display = 'none';
    }
  }

  function placeCreation(main) {
    if (!main || !creation?.root?.isConnected) return;
    const scroll = main.querySelector('.overflow-y-auto');
    const stream = scroll?.firstElementChild || scroll;
    if (!stream) return;
    if (creation.root.parentNode !== stream) stream.appendChild(creation.root);
    const prompt = [...stream.children].find(node => node !== creation.root && node.classList?.contains('msg-in') && (node.textContent || '').trim() === creation.state.prompt);
    if (prompt && prompt.nextElementSibling !== creation.root) prompt.after(creation.root);
  }

  function closeAutoPreview() {
    const title = [...document.querySelectorAll('p,h1,h2,h3,span')].find(node => node.textContent.trim() === '文件预览');
    const panel = title?.parentElement?.parentElement;
    const close = panel?.querySelector('button[aria-label="关闭"]');
    if (close) {
      // Remove the preview pane from layout before the original close handler runs.
      // This prevents a one-frame chat-width jump when the pane is mounted.
      panel.style.display = 'none';
      close.click();
      if (creation) creation.previewClosed = true;
      return true;
    }
    return false;
  }

  function schedulePreviewClose() {
    if (!creation || creation.previewCloseScheduled) return;
    creation.previewCloseScheduled = true;
    creation.previewCloseUntil = Date.now() + 3000;
    requestAnimationFrame(() => {
      closeAutoPreview();
      [250, 800, 1600, 2600].forEach(delay => setTimeout(closeAutoPreview, delay));
    });
    setTimeout(() => { if (creation) creation.previewClosed = true; }, 3100);
  }

  function markFinished(state, main) {
    if (state.phase !== 'generating' || !main) return;
    const done = [...main.querySelectorAll('button')].some(button => /重新生成|再次生成/.test(button.textContent.trim()));
    if (done) {
      state.phase = 'complete'; persist(state); refresh(state);
      schedulePreviewClose();
    }
  }

  function open(resourceId) {
    if (!data || !resourceId) return;
    const resource = data.resource(resourceId);
    if (!resource) return;
    const current = data.contextFor(resourceId);
    const state = { chatId: `editor-${resourceId}`, resourceId, prompt: resource.title || '', resourceType: resource.resourceType || resource.kind || '互动课件', phase: 'editor', subject: current.subject || resource.subject || base.profile.subject, grade: current.grade || resource.grade || base.profile.grade, edition: current.edition || resource.edition || base.profile.edition, unitId: current.unitId || '', topicId: current.topicId || '', chapterId: current.chapterId || '', selected: new Set(data.knowledge(resourceId).map(item => item.id)), customKnowledge: current.customKnowledge || [], settings: defaults(resource.resourceType || resource.kind || '互动课件'), notice: '' };
    normalize(state);
    const dialog = document.createElement('dialog');
    dialog.className = 'wk-dialog'; dialog.dataset.rwOwned = 'knowledge-picker'; dialog.setAttribute('aria-label', '知识点');
    dialog.innerHTML = '<header><h2>知识点</h2><button type="button" data-wk-close aria-label="关闭">×</button></header><div class="wk-editor-modal-body"></div><footer><span class="wk-notice" role="status"></span><button type="button" class="wk-primary" data-wk-save>保存</button></footer>';
    const body = dialog.querySelector('.wk-editor-modal-body');
    const renderEditor = () => { body.innerHTML = basicMarkup(state).replace('<span>1 / 3</span>', '').replace('<span>2 / 3</span>', '') + pointsMarkup(state).replace('<span>2 / 3</span>', ''); };
    const saveEditor = () => { data.setKnowledge(resourceId, [...state.selected], context(state)); data.patchResource(resourceId, { customKnowledge: state.customKnowledge || [] }); dialog.close(); dialog.remove(); };
    dialog.addEventListener('change', event => {
      const fieldElement = event.target.closest('[data-wk-field]');
      if (fieldElement) { state[fieldElement.dataset.wkField] = fieldElement.value; normalize(state); renderEditor(); return; }
      if (event.target.matches('.wk-point input')) { event.target.checked ? state.selected.add(event.target.value) : state.selected.delete(event.target.value); }
    });
    dialog.addEventListener('click', event => { const button = event.target.closest('button'); if (!button) return; if (button.matches('[data-wk-close]')) { dialog.close(); dialog.remove(); } if (button.matches('[data-wk-save]')) saveEditor(); if (button.matches('[data-wk-add-button]')) { const input = body.querySelector('[data-wk-add]'); const query = input?.value.trim(); if (query) { state.customKnowledge ||= []; state.customKnowledge.push(query); input.value = ''; renderEditor(); } } });
    dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); dialog.remove(); });
    renderEditor(); document.body.append(dialog); dialog.showModal();
  }

  function bind(state, root) {
    root.addEventListener('change', event => {
      const fieldElement = event.target.closest('[data-wk-field]');
      if (fieldElement) {
        state[fieldElement.dataset.wkField] = fieldElement.value;
        if (['edition', 'subject', 'grade'].includes(fieldElement.dataset.wkField)) state.selected = new Set();
        normalize(state);
        if (state.phase === 'basic' && !state.selected.size) state.selected = new Set(recommended(state, state.prompt));
        persist(state); render(state, root); cancelCountdown();
        return;
      }
      if (event.target.matches('.wk-point input')) {
        if (event.target.hasAttribute('data-wk-custom-index')) {
          const index = Number(event.target.dataset.wkCustomIndex);
          if (!event.target.checked) state.customKnowledge.splice(index, 1);
        } else event.target.checked ? state.selected.add(event.target.value) : state.selected.delete(event.target.value);
        persist(state); render(state, root); cancelCountdown();
      }
    });
    root.addEventListener('input', event => {
      if (event.target.matches('[data-wk-search]')) {
        state.pointSearch = event.target.value;
        const position = event.target.selectionStart;
        cancelCountdown(); render(state, root);
        const input = root.querySelector('[data-wk-search]'); input.focus(); input.setSelectionRange(position, position);
      }
      if (event.target.matches('[data-wk-add]')) state.notice = '';
      if (event.target.matches('[data-wk-custom-setting]')) { state.settings.customDuration = event.target.value; persist(state); cancelCountdown(); }
    });
    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.matches('[data-wk-next]')) { advance(state); return; }
      if (button.matches('[data-wk-add-button]')) { addPoint(state, root); return; }
      if (button.matches('[data-wk-setting]')) {
        state.settings[button.dataset.wkSetting] = button.dataset.wkValue;
        state.notice = '';
        persist(state);
        render(state, root);
        cancelCountdown();
      }
    });
    root.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.matches('[data-wk-add]')) { event.preventDefault(); addPoint(state, root); } });
  }

  function sync() {
    scheduled = false;
    if (!data || !window.PaperResources) return;
    const query = new URLSearchParams(location.search);
    const chatId = query.get('chatId');
    if (location.pathname !== '/chat' || !chatId?.startsWith('sim-')) { cancelCountdown(); creation?.root.remove(); creation = null; return; }
    const main = document.querySelector('[data-paper-content] main');
    if (creation?.chatId === chatId && creation.root.isConnected) {
      hideLegacyConfirmation(main);
      hideNativePrompt(main, creation.state);
      placeCreation(main);
      markFinished(creation.state, main);
      if (creation.state.phase === 'complete') {
        schedulePreviewClose();
        if (!creation.previewClosed && Date.now() < creation.previewCloseUntil) closeAutoPreview();
      }
      return;
    }
    if (creation) { cancelCountdown(); creation.root.remove(); creation = null; }
    const scroll = main?.querySelector('.overflow-y-auto');
    const stream = scroll?.firstElementChild || scroll;
    if (!stream || !Object.keys(main || {}).some(key => key.startsWith('__reactProps$'))) return;
    const state = initial(chatId, query);
    const root = document.createElement('section');
    root.className = 'wk-creation';
    root.dataset.rwOwned = 'knowledge-creation';
    root.setAttribute('aria-label', '创作流程');
    creation = { chatId, root, state };
    stream.appendChild(root);
    bind(state, root);
    state.recognizing = state.phase === 'basic' && !readJSON(STATE_KEY + chatId, {}).phase;
    refresh(state, !state.recognizing && state.phase !== 'generating');
    if (state.recognizing) setTimeout(() => { if (creation?.state !== state) return; state.recognizing = false; persist(state); refresh(state, true); }, 1500);
    hideLegacyConfirmation(main);
    hideNativePrompt(main, state);
    placeCreation(main);
  }

  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(sync); } }
  async function start() {
    if (!window.WorkshopData) { setTimeout(start, 100); return; }
    data = window.WorkshopData;
    await data.ready;
    graph = data.graph;
    base = data.base;
    window.WorkshopKnowledge = { sync: schedule, open };
    observer = new MutationObserver(changes => { if (changes.some(change => !change.target.closest?.('[data-rw-owned]'))) schedule(); });
    observer.observe(document.body, { subtree: true, childList: true });
    addEventListener('popstate', schedule);
    schedule();
  }
  start().catch(error => console.error('创作设置加载失败', error));
})();
