const DAY = 86400000;
const count = value => Math.max(0, Number(value) || 0);
export const isApplication = resource => ['教学应用', '教育应用', '教学游戏'].includes(resource.kind);
export const teacherKey = resource => resource.authorId || resource.author || '';
export const termLabel = term => String(term?.name || '学期').replace(/[—–~-]/g, '～').replace('学年', '');

export function metricSummary(resources) {
  const teaching = resources.filter(resource => !isApplication(resource));
  const applications = resources.filter(isApplication);
  const teachers = new Set(resources.map(teacherKey).filter(Boolean));
  const original = rows => rows.filter(resource => resource.origin !== 'adapted').length;
  return {
    teaching: teaching.length, applications: applications.length,
    originalTeaching: original(teaching), originalApplications: original(applications),
    adaptedTeaching: teaching.length - original(teaching), adaptedApplications: applications.length - original(applications),
    productiveTeachers: teachers.size, average: teachers.size ? resources.length / teachers.size : 0,
    downloads: resources.reduce((sum, resource) => sum + count(resource.downloads), 0)
  };
}

export function rangeFor(period, term, now = Date.now()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (period === 'term') {
    const start = new Date(`${term?.startDate}T00:00:00`).getTime();
    const configuredEnd = new Date(`${term?.endDate}T23:59:59.999`).getTime();
    if (Number.isFinite(start) && Number.isFinite(configuredEnd) && configuredEnd >= start) {
      return {start, end: Math.min(now, configuredEnd), label: termLabel(term), valid: true};
    }
    return {start: now + 1, end: now, label: termLabel(term), valid: false};
  }
  const days = [7, 15, 30].includes(Number(period)) ? Number(period) : 7;
  today.setDate(today.getDate() - days + 1);
  return {start: +today, end: now, label: `近 ${days} 天`, valid: true};
}

export const inRange = (record, range) => count(record.createdAt) > 0 && record.createdAt >= range.start && record.createdAt <= range.end;

export function trendBuckets(activities, resources, range) {
  if (range.end < range.start) return [];
  const length = Math.floor((range.end - range.start) / DAY) + 1;
  // Long terms are grouped by week; counts remain exact and date ticks stay readable.
  const width = length > 45 ? 7 : 1;
  const buckets = [];
  for (let offset = 0; offset < length; offset += width) {
    const start = new Date(range.start);
    start.setDate(start.getDate() + offset);
    const next = new Date(start);
    next.setDate(next.getDate() + width);
    const end = Math.min(+next - 1, range.end);
    const bounds = {start: +start, end};
    buckets.push({start: +start, end, uses: activities.filter(a => inRange(a, bounds)).length, outcomes: resources.filter(r => inRange(r, bounds)).length});
  }
  return buckets;
}

export function teacherRows(resources, field = 'original', direction = 'desc') {
  const map = new Map();
  for (const resource of resources) {
    const key = teacherKey(resource);
    if (!key) continue;
    const row = map.get(key) || {key, name: resource.author || '未标注教师', original: 0, adapted: 0, grades: new Set(), subjects: new Set()};
    row[resource.origin === 'adapted' ? 'adapted' : 'original']++;
    if (resource.authorGrade) row.grades.add(resource.authorGrade);
    if (resource.authorSubject) row.subjects.add(resource.authorSubject);
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => (direction === 'asc' ? 1 : -1) * (a[field] - b[field]) || a.name.localeCompare(b.name, 'zh-CN'));
}

export function rankResources(resources, field = 'downloads', direction = 'desc') {
  return [...resources].sort((a, b) => (direction === 'asc' ? 1 : -1) * (count(a[field]) - count(b[field])) || a.title.localeCompare(b.title, 'zh-CN'));
}

// Explicit sample provenance: a generated, navigable artifact is attached to one
// earlier prompt with the same teacher, capability and teaching topic. Other
// prompts have no completion link; metadata-only samples are not invented here.
export const sampleOutcomes = Object.freeze({
  'demo-usage-0-0': ['A45760493DA8ECA44A316EA2BB54A041'],
  'demo-usage-9-19': ['314B268E642DBAE685F47391A9CCDDC4'],
  'demo-usage-26-10': ['2D1E52CBB465EE8981405653A46D4C37'],
  'demo-usage-9-5': ['66FEA6B38E058EDAB62E4117D0F43DE7'],
  'demo-usage-12-12': ['8A7E82D22F0DF49599F56674103EC2ED'],
  'demo-usage-15-10': ['A99596AA4DC295A7B8EA5548673DFCEB'],
  'demo-usage-18-15': ['EB5C20A95266A25203329ED8CCB90EEC'],
  'demo-usage-27-34': ['637002DEE96D4D5D827A22362815BC60'],
  'demo-usage-24-22': ['70E7FC456B42800E7B8D3EB4CE2BA542']
});

const topicRules = [
  ['光合作用', /光合作用|叶片制造有机物/], ['勾股定理', /勾股定理/],
  ['细胞结构', /细胞结构与功能|动物细胞与植物细胞/], ['人生有几万天', /人生.*(?:万天|天数)/],
  ['行程问题', /行程问题/], ['古诗词闯关', /古诗词闯关/], ['桃花源记', /桃花源记/],
  ['望庐山瀑布', /望庐山瀑布/], ['课堂活动', /课堂活动管理/]
];

export function topicFor(activity, knowledge = []) {
  const text = activity.topic || activity.prompt || '自由创作';
  for (const [name, pattern] of topicRules) if (pattern.test(text)) return name;
  if (activity.topic) return activity.topic;
  const found = knowledge.map(node => node.label || node.title || node.name || '').filter(Boolean).sort((a, b) => b.length - a.length).find(label => text.includes(label));
  return found || text;
}

export function linkedOutcomes(activity, resources, range) {
  const ids = new Set([...(sampleOutcomes[activity.id] || []), ...(activity.resourceIds || []), ...(activity.resourceId ? [activity.resourceId] : []), ...(activity.chatId ? [`creation:${activity.chatId}`] : [])]);
  return resources.filter(resource => ids.has(resource.id) && !resource.mock && resource.href && inRange(resource, range) && resource.createdAt >= activity.createdAt);
}

export function themeGroups(activities, resources, range, knowledge = []) {
  const groups = new Map();
  for (const activity of activities.filter(item => inRange(item, range))) {
    const name = topicFor(activity, knowledge);
    const group = groups.get(name) || {name, subject: activity.subject || '其他', count: 0, items: [], outcomes: new Map()};
    group.count++;
    group.items.push(activity);
    for (const resource of linkedOutcomes(activity, resources, range)) group.outcomes.set(resource.id, resource);
    groups.set(name, group);
  }
  return [...groups.values()].map(group => ({...group, outcomes: [...group.outcomes.values()]})).sort((a, b) => b.count - a.count || b.outcomes.length - a.outcomes.length || a.name.localeCompare(b.name, 'zh-CN'));
}
