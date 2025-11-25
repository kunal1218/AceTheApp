const STORAGE_KEY = 'pdSkills';

export const CARD_COLORS = [
  '#6366F1', '#EF4444', '#10B981', '#F59E0B', '#3B82F6',
  '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#0EA5E9'
];

const normalizeItems = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') {
      return { id: Date.now().toString(), title: item, type: 'task', color: CARD_COLORS[0], revealed: false };
    }
    return {
      id: item.id || Date.now().toString(),
      title: item.title || item.name || 'Untitled',
      type: item.type || 'task',
      color: item.color || CARD_COLORS[0],
      revealed: item.revealed !== undefined ? item.revealed : false,
      syllabus: item.syllabus || [],
      deadlines: item.deadlines || [],
      calendarEvents: item.calendarEvents || [],
      createdAt: item.createdAt || new Date().toISOString(),
    };
  });
};

export const loadItems = () => {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return normalizeItems(JSON.parse(raw));
  } catch {
    return [];
  }
};

export const saveItems = (items) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const addSemester = (semester) => {
  const items = loadItems();
  const newItem = {
    id: semester.id || crypto.randomUUID?.() || Date.now().toString(),
    title: semester.title,
    type: 'semester',
    color: semester.color || CARD_COLORS[0],
    syllabus: semester.syllabus || [],
    deadlines: semester.deadlines || [],
    calendarEvents: semester.calendarEvents || [],
    revealed: false,
    createdAt: new Date().toISOString(),
  };
  items.unshift(newItem);
  saveItems(items);
  return newItem;
};

export const updateItem = (id, updates) => {
  const items = loadItems();
  const updated = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
  saveItems(updated);
  return updated.find((i) => i.id === id);
};

export const getItemById = (id) => loadItems().find((i) => i.id === id);

export const addDeadline = (id, deadline) => {
  const item = getItemById(id);
  if (!item) return null;
  const updated = updateItem(id, { deadlines: [...(item.deadlines || []), deadline] });
  return updated;
};

export const addSyllabusEntry = (id, entry) => {
  const item = getItemById(id);
  if (!item) return null;
  const updated = updateItem(id, { syllabus: [...(item.syllabus || []), entry] });
  return updated;
};

const dedupeCalendarEvents = (existing = [], incoming = []) => {
  const seen = new Set(existing.map((e) => `${e.date || 'nodate'}|${e.title}`));
  const merged = [...existing];
  for (const ev of incoming) {
    const key = `${ev.date || 'nodate'}|${ev.title}`;
    if (seen.has(key)) continue;
    merged.push(ev);
    seen.add(key);
  }
  return merged;
};

export const addCalendarEvents = (id, events) => {
  if (!Array.isArray(events) || events.length === 0) return getItemById(id) || null;
  const item = getItemById(id);
  if (!item) return null;
  const merged = dedupeCalendarEvents(item.calendarEvents || [], events);
  return updateItem(id, { calendarEvents: merged });
};
