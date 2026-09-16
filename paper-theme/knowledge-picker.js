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
  const units = state => graph.subjects.filter(item => !state.subject || item.name === state.subject).flatMap(item => item.curriculum || []).filter(item => (!state.edition || item.edition === state.edition) && (!state.grade || item.grade === state.grade));
  const unit = state => units(state).find(item => item.id === state.unitId);
  const topics = state => (state.unitId ? (unit(state) ? [unit(state)] : []) : units(state)).flatMap(item => item.topics);
  const topic = state => topics(state).find(item => item.id === state.topicId);
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
    if (!units(state).some(item => item.id === state.unitId)) state.unitId = '';
    if (!topics(state).some(item => item.id === state.topicId)) state.topicId = '';
    state.chapterId = topic(state)?.chapterId || '';
  }

  function scopeNodes(state) {
    let candidates = nodes().filter(item => !state.subject || item.subjectName === state.subject);
    if (state.edition || state.grade || state.unitId || state.topicId) {
      const ids = new Set((state.topicId ? [topic(state)].filter(Boolean) : topics(state)).flatMap(item => item.knowledgeIds || []));
      candidates = candidates.filter(item => ids.has(item.id));
    }
    return candidates;
  }

  function recommended(state, prompt) {
    const lower = String(prompt || '').toLowerCase();
    const currentIds = new Set(topic(state)?.knowledgeIds || []);
    return scopeNodes(state).filter(item => lower.includes(item.name.toLowerCase()) || currentIds.has(item.id)).slice(0, 5).map(item => item.id);
  }

  // Local prototype synonym normalization; production semantic matching belongs to the AI service.
  const synonyms = {
    '勾股定理': ['毕达哥拉斯定理', '勾股关系', '勾股定律'],
    '光合作用': ['植物光合作用', '绿色植物光合作用', '光合反应', 'photosynthesis'],
    '呼吸作用': ['细胞呼吸', '生物呼吸作用'],
    '细胞结构': ['细胞的结构', '细胞基本结构', '细胞的基本结构'],
    '植物细胞': ['植物细胞结构', '植物细胞的结构'],
    '动物细胞': ['动物细胞结构', '动物细胞的结构'],
    '控制变量': ['控制变量法', '变量控制法'],
    '相似三角形': ['三角形相似', '三角形的相似'],
    '全等三角形': ['三角形全等', '三角形的全等'],
    '时间单位换算': ['时间换算', '时间单位的换算'],
    '平面直角坐标系': ['直角坐标系', '笛卡尔坐标系'],
    '二次函数': ['二次函数图像', '二次函数的图像'],
    '文言翻译': ['文言文翻译', '古文翻译'],
    '文言词义': ['文言文词义', '文言实词词义'],
    '桃花源记': ['桃花源记课文'],
    '动植物细胞比较': ['动物植物细胞比较', '植物细胞与动物细胞比较'],
    '三角形内角和': ['三角形的内角和', '三角形内角和定理'],
  };
  const normalizeTerm = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s《》〈〉“”"'，。！？、：:;；·•()（）\-]/g, '');
  function standardFor(value, state) {
    const query = normalizeTerm(value);
    return nodes().find(item => [item.name, ...(item.aliases || []), ...(synonyms[item.name] || [])].some(name => normalizeTerm(name) === query));
  }
  function addKnowledge(state, value) {
    const label = String(value || '').trim();
    if (!label) return false;
    const found = standardFor(label, state);
    if (found) state.selected.add(found.id);
    else {
      state.customKnowledge ||= [];
      if (!state.customKnowledge.some(item => normalizeTerm(item) === normalizeTerm(label))) state.customKnowledge.push(label);
    }
    return true;
  }
  function changeScope(state, key, value) {
    state[key] = value;
    state.changedFields ||= new Set();
    state.changedFields.add(key);
    const descendants = ['edition', 'subject', 'grade'].includes(key) ? ['unitId', 'topicId', 'chapterId'] : key === 'unitId' ? ['topicId', 'chapterId'] : ['chapterId'];
    descendants.forEach(field => { state[field] = ''; state.changedFields.add(field); });
    normalize(state);
    const allowed = new Set(scopeNodes(state).map(item => item.id));
    state.selected = new Set([...state.selected].filter(id => allowed.has(id)));
    state.pointSearch = '';
  }

  function context(state) {
    return { subject: state.subject, grade: state.grade, edition: state.edition, unitId: state.unitId, topicId: state.topicId, chapterId: state.chapterId, knowledgeMode: state.edition || state.unitId || state.topicId ? 'textbook' : 'free' };
  }

  function persist(state, patch = {}) {
    const payload = { phase: state.phase, subject: state.subject, grade: state.grade, edition: state.edition, unitId: state.unitId, topicId: state.topicId, chapterId: state.chapterId, selected: [...state.selected], customKnowledge: state.customKnowledge || [], settings: state.settings, resourceType: state.resourceType, resourceLabel: state.resourceLabel, prompt: state.prompt, ...patch };
    writeJSON(STATE_KEY + state.chatId, payload);
    if (['generating', 'complete'].includes(state.phase)) data.setKnowledge(state.resourceId, [...state.selected], context(state));
    if (Object.keys(patch).length || ['generating', 'complete'].includes(state.phase)) data.patchResource(state.resourceId, { ...context(state), knowledgeIds: [...state.selected], customKnowledge: state.customKnowledge || [], teachingSettings: state.settings, resourceType: state.resourceType, visualStyle: state.settings.style || '', ...patch });
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
      phase: ['generating', 'complete'].includes(saved.phase) ? saved.phase : 'form',
      subject: saved.subject ?? (current.subject || match?.subject || requestedKnowledge?.subjectName || base.profile.subject),
      grade: saved.grade ?? (current.grade || match?.grade || base.profile.grade),
      edition: saved.edition ?? (current.edition || match?.edition || base.profile.edition),
      unitId: saved.unitId || current.unitId || match?.unitId || '',
      topicId: saved.topicId || current.topicId || match?.topicId || '',
      chapterId: saved.chapterId || current.chapterId || match?.chapterId || '',
      selected: new Set(saved.selected || data.knowledge(resourceId).map(item => item.id)),
      customKnowledge: Array.isArray(saved.customKnowledge) ? saved.customKnowledge : [],
      settings: { ...defaults(type), ...(saved.settings || {}) },
      notice: '',
    };
    normalize(state);
    if (!saved.selected && !state.selected.size && state.phase === 'form') state.selected = new Set(requestedKnowledge ? [requestedKnowledge.id] : recommended(state, prompt));
    return state;
  }

  function selectOptions(items, value) { return items.map(item => `<option value="${esc(typeof item === 'string' ? item : item.value ?? item.id)}" ${String(typeof item === 'string' ? item : item.value ?? item.id) === String(value) ? 'selected' : ''}>${esc(typeof item === 'string' ? item : item.label || item.name)}</option>`).join(''); }
  function field(key, label, values, value) { return `<label class="wk-inline-field"><span>${esc(label)}</span><select data-wk-field="${esc(key)}" aria-label="${esc(label)}">${selectOptions(values, value)}</select></label>`; }

  function basicMarkup(state) {
    const any = [{ value: '', label: '不限' }];
    const availableUnits = units(state).map(item => ({ value: item.id, label: `${item.term} · ${item.name}` }));
    return `<section class="wk-card wk-basic-card"><div class="wk-card-head"><h2>基础信息</h2></div><div class="wk-inline-fields wk-basic-fields">${field('edition', '教材', [...any, ...base.editions], state.edition)}${field('subject', '学科', [...any, ...base.subjects], state.subject)}${field('grade', '年级', [...any, ...base.grades], state.grade)}${field('unitId', '单元', [...any, ...availableUnits], state.unitId)}${field('topicId', '课题', [...any, ...topics(state)], state.topicId)}</div></section>`;
  }

  function pointsMarkup(state) {
    const scoped = !!(state.edition || state.subject || state.grade || state.unitId || state.topicId);
    if (state.phase === 'editor' && !(state.subject && state.grade)) return '';
    const available = scopeNodes(state);
    const query = normalizeTerm(state.pointSearch);
    const candidates = query ? available.filter(item => [item.name, ...(item.aliases || []), ...(synonyms[item.name] || [])].some(name => normalizeTerm(name).includes(query))) : scoped ? available : [];
    const selected = nodes().filter(item => state.selected.has(item.id));
    const point = item => `<label class="wk-point"><input type="checkbox" value="${esc(item.id)}" ${state.selected.has(item.id) ? 'checked' : ''}><span>${esc(item.name)}</span><small>${esc(item.subjectName)}</small></label>`;
    const list = candidates.length ? candidates.map(point).join('') : `<span class="wk-muted">${query || scoped ? '暂无匹配知识点' : '输入关键词搜索'}</span>`;
    const selectedNames = [...selected.map(item => `<button type="button" data-wk-remove="${esc(item.id)}" aria-label="移除${esc(item.name)}">${esc(item.name)} <span aria-hidden="true">×</span></button>`), ...(state.customKnowledge || []).map((item, index) => `<button type="button" data-wk-remove-custom="${index}" aria-label="移除${esc(item)}">${esc(item)} <span aria-hidden="true">×</span></button>`)];
    const scopeLabel = [state.edition, state.subject, state.grade, unit(state)?.name, topic(state)?.name].filter(Boolean).join(' · ') || '全部知识点';
    return `<section class="wk-card wk-points-card"><div class="wk-card-head"><h2>知识点</h2><span>已选 ${selectedNames.length} 项</span></div><input class="wk-search" data-wk-search value="${esc(state.pointSearch || '')}" placeholder="搜索知识点" aria-label="搜索知识点"><div class="wk-candidate-heading"><span>${esc(scopeLabel)}</span><span>${query || scoped ? candidates.length : available.length} 项</span></div><div class="wk-points">${list}</div>${selectedNames.length ? `<div class="wk-selected">${selectedNames.join('')}</div>` : ''}<div class="wk-add-point"><input data-wk-add placeholder="自定义知识点" aria-label="自定义知识点"><button type="button" data-wk-add-button>添加</button></div></section>`;
  }

  function settingsMarkup(state) {
    const fields = settingsFor(state.resourceType);
    const rows = fields.map(item => `<div class="wk-setting"><span>${esc(item.label)}</span><div class="wk-choice-row" role="group" aria-label="${esc(item.label)}">${item.options.map(option => `<button type="button" data-wk-setting="${esc(item.key)}" data-wk-value="${esc(option.value)}" aria-pressed="${String(state.settings[item.key] || item.default) === String(option.value)}">${esc(option.label)}</button>`).join('')}</div>${item.key === 'duration' && state.settings.duration === 'custom' ? '<input class="wk-custom-setting" data-wk-custom-setting="duration" type="number" min="1" max="20" value="' + esc(state.settings.customDuration || 1) + '" aria-label="自定义课时" />' : ''}</div>`).join('');

    return `<section class="wk-card wk-settings-card"><div class="wk-card-head"><h2>生成设置</h2><span>${esc(state.resourceLabel || state.resourceType)}</span></div>${rows}</section>`;
  }

  function userPromptMarkup(state) {
    return `<div class="wk-user-message"><span>${esc(state.prompt || '新创作')}</span></div>`;
  }

  function summaryMarkup(state) {
    const basic = [state.edition, state.subject, state.grade, unit(state)?.name, topic(state)?.name].filter(Boolean).join(' · ');
    const points = [...nodes().filter(item => state.selected.has(item.id)).map(item => item.name), ...(state.customKnowledge || [])];
    return `<div class="wk-summary"><strong>基础信息</strong><span>${esc(basic || '不限')}</span></div><div class="wk-summary"><strong>知识点</strong><span>${esc(points.join('、') || '未选择')}</span></div>`;
  }

  function render(state, root) {
    const pointsScroll = root.querySelector('.wk-points')?.scrollTop || 0;
    if (state.recognizing) { root.innerHTML = `${userPromptMarkup(state)}<div class="wk-generating" role="status"><span class="wk-spinner" aria-hidden="true"></span>正在识别…</div>`; return; }
    if (state.phase === 'form') root.innerHTML = `${userPromptMarkup(state)}<div class="wk-flow-top"><span class="wk-resource-tag">${esc(state.resourceLabel || state.resourceType)}</span></div><div class="wk-combined-form">${basicMarkup(state)}${pointsMarkup(state)}${settingsMarkup(state)}<div class="wk-actions"><span class="wk-notice" role="status">${esc(state.notice)}</span><button type="button" class="wk-primary" data-wk-next>开始生成</button></div></div>`;
    else root.innerHTML = `${userPromptMarkup(state)}${summaryMarkup(state)}<div class="wk-generating ${state.phase === 'complete' ? 'wk-generated' : ''}" role="status">${state.phase === 'complete' ? '<span aria-hidden="true">✓</span><span>已生成</span>' : '<span class="wk-spinner" aria-hidden="true"></span><span>正在生成</span>'}</div>`;
    const pointsList = root.querySelector('.wk-points'); if (pointsList) pointsList.scrollTop = pointsScroll;
  }

  function cancelCountdown() { if (countdown) { clearInterval(countdown.id); countdown = null; } }
  function armCountdown() { cancelCountdown(); }

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
    if (!ok && creation?.state === state) { state.phase = 'form'; state.notice = '暂时无法开始生成，请再点一次'; persist(state); refresh(state, true); }
  }

  function advance(state) {
    if (state.phase !== 'form') return;
    if (state.settings.duration === 'custom') {
      const duration = Number(state.settings.customDuration || 1);
      if (!Number.isInteger(duration) || duration < 1 || duration > 20) { state.notice = '课时请输入 1–20 的整数'; refresh(state); return; }
    }
    startGeneration(state);
  }

  function addPoint(state, root) {
    if (!addKnowledge(state, root.querySelector('[data-wk-add]')?.value)) return;
    state.notice = ''; persist(state); render(state, root);
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

  function tidyGenerationProgress(main) {
    if (!main) return;
    const internalTitles = new Set(['准备任务选项', '读取动画文件', '定位公式内容', '重新验收动画', '完成交互验收', '验收最终动画', '完成最终验收']);
    const internalRepairs = /\.html\s*(修复页面标记|修复公式加载|修复公式显示|修复移动端适配|修复窄屏布局)$/;
    for (const message of main.querySelectorAll('.msg-in')) {
      if (message.closest('[data-rw-owned]') || message.hasAttribute('data-wk-legacy-hidden')) continue;
      const text = (message.textContent || '').trim();
      // Never conceal an error, even when an existing progress row changes into one.
      if (/失败|错误|出错|异常|无法|\berror\b|\bfailed\b|\bexception\b/i.test(text)) {
        message.removeAttribute('data-wk-internal-progress');
        message.querySelectorAll('[data-wk-internal-detail]').forEach(element => element.removeAttribute('data-wk-internal-detail'));
        continue;
      }
      const row = message.firstElementChild;
      const spans = row?.matches('.flex.items-center') ? [...row.children].filter(element => element.tagName === 'SPAN') : [];
      const title = spans[0]?.textContent.trim(), detail = spans[1]?.textContent.trim();
      const internal = (title === '步骤' && detail === '已跳过') || internalTitles.has(title) || internalRepairs.test(text);
      if (internal) message.setAttribute('data-wk-internal-progress', '');
      else message.removeAttribute('data-wk-internal-progress');
      if (spans[1]) spans[1].toggleAttribute('data-wk-internal-detail', /^(education-visual-design(?:\s+v\d+)?|html-authoring)$/.test(detail));
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

  function keepPreview(main) {
    if (!main || creation?.previewOpened) return;
    const existing = [...main.querySelectorAll('p,h1,h2,h3,span')].find(node => node.textContent.trim() === '文件预览');
    if (existing) { creation.previewOpened = true; return; }
    const view = [...main.querySelectorAll('button')].find(button => button.textContent.trim() === '查看');
    if (view) { view.click(); creation.previewOpened = true; }
  }

  function markFinished(state, main) {
    if (state.phase !== 'generating' || !main) return;
    const done = [...main.querySelectorAll('button')].some(button => /重新生成|再次生成/.test(button.textContent.trim()));
    if (done) {
      state.phase = 'complete'; persist(state); refresh(state);
      keepPreview(main);
    }
  }

  function open(resourceId) { return openEditor([resourceId]); }
  function openBatch(resourceIds) { return openEditor(resourceIds); }
  function openEditor(resourceIds) {
    if (!data) return;
    const records = [...new Set(resourceIds || [])].map(id => data.resource(id)).filter(Boolean);
    if (!records.length) return;
    const batch = records.length > 1;
    const resource = records[0];
    const same = key => records.every(item => (item[key] || '') === (resource[key] || '')) ? resource[key] || '' : '';
    const state = { resourceId: resource.id, phase: 'editor', subject: same('subject'), grade: same('grade'), edition: same('edition'), unitId: same('unitId'), topicId: same('topicId'), chapterId: same('chapterId'), selected: new Set(batch ? [] : data.knowledge(resource.id).map(item => item.id)), customKnowledge: batch ? [] : [...(resource.customKnowledge || [])], changedFields: new Set(), pointSearch: '' };
    normalize(state);
    const dialog = document.createElement('dialog');
    dialog.className = 'wk-dialog'; dialog.dataset.rwOwned = 'knowledge-picker'; dialog.setAttribute('aria-label', batch ? '批量设置知识点' : '设置知识点');
    dialog.innerHTML = `<header><h2>${batch ? '批量设置知识点' : '设置知识点'}${batch ? ` · ${records.length} 份资源` : ''}</h2><button type="button" data-wk-close aria-label="关闭">×</button></header><div class="wk-editor-modal-body"></div><footer><span class="wk-notice" role="status"></span><button type="button" class="wk-primary" data-wk-save>保存</button></footer>`;
    const body = dialog.querySelector('.wk-editor-modal-body');
    const renderEditor = () => { const scroll = body.querySelector('.wk-points')?.scrollTop || 0; body.innerHTML = basicMarkup(state) + pointsMarkup(state); const points = body.querySelector('.wk-points'); if (points) points.scrollTop = scroll; };
    const close = () => { dialog.close(); dialog.remove(); };
    const saveEditor = () => {
      const common = context(state);
      const ok = records.every(record => {
        const patch = batch ? Object.fromEntries(Object.entries(common).filter(([key, value]) => key !== 'knowledgeMode' && (value || state.changedFields.has(key)))) : common;
        if (batch) { const merged = { ...record, ...patch }; patch.knowledgeMode = merged.edition || merged.unitId || merged.topicId ? 'textbook' : 'free'; }
        return data.setKnowledge(record.id, [...state.selected], { ...patch, customKnowledge: state.customKnowledge || [] });
      });
      if (ok) close(); else dialog.querySelector('.wk-notice').textContent = '保存失败，请重试';
    };
    dialog.addEventListener('change', event => {
      const fieldElement = event.target.closest('[data-wk-field]');
      if (fieldElement) { changeScope(state, fieldElement.dataset.wkField, fieldElement.value); renderEditor(); return; }
      if (event.target.matches('.wk-point input')) { event.target.checked ? state.selected.add(event.target.value) : state.selected.delete(event.target.value); renderEditor(); }
    });
    dialog.addEventListener('input', event => {
      if (!event.target.matches('[data-wk-search]')) return;
      state.pointSearch = event.target.value; const position = event.target.selectionStart;
      renderEditor(); const input = body.querySelector('[data-wk-search]'); input.focus(); input.setSelectionRange(position, position);
    });
    const add = () => { if (addKnowledge(state, body.querySelector('[data-wk-add]')?.value)) renderEditor(); };
    dialog.addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button) return;
      if (button.matches('[data-wk-close]')) close();
      else if (button.matches('[data-wk-save]')) saveEditor();
      else if (button.matches('[data-wk-add-button]')) add();
      else if (button.hasAttribute('data-wk-remove')) { state.selected.delete(button.dataset.wkRemove); renderEditor(); }
      else if (button.hasAttribute('data-wk-remove-custom')) { state.customKnowledge.splice(Number(button.dataset.wkRemoveCustom), 1); renderEditor(); }
    });
    dialog.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.matches('[data-wk-add]')) { event.preventDefault(); add(); } });
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    renderEditor(); document.body.append(dialog); dialog.showModal();
  }

  function bind(state, root) {
    root.addEventListener('change', event => {
      const fieldElement = event.target.closest('[data-wk-field]');
      if (fieldElement) {
        changeScope(state, fieldElement.dataset.wkField, fieldElement.value);
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
      if (button.hasAttribute('data-wk-remove')) { state.selected.delete(button.dataset.wkRemove); persist(state); render(state, root); return; }
      if (button.hasAttribute('data-wk-remove-custom')) { state.customKnowledge.splice(Number(button.dataset.wkRemoveCustom), 1); persist(state); render(state, root); return; }
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
    const progressMain = location.pathname === '/chat' ? document.querySelector('[data-paper-content] main') : null;
    tidyGenerationProgress(progressMain);
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
        keepPreview(main);

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
    state.recognizing = state.phase === 'form' && !readJSON(STATE_KEY + chatId, {}).phase;
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
    window.WorkshopKnowledge = { sync: schedule, open, openBatch };
    observer = new MutationObserver(changes => { if (changes.some(change => !change.target.closest?.('[data-rw-owned]'))) schedule(); });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    addEventListener('popstate', schedule);
    schedule();
  }
  start().catch(error => console.error('创作设置加载失败', error));
})();
