export type TemplateItem = {
  kind: string;
  title?: string | null;
  content?: string | null;
  refId?: string | null;
  refSubId?: string | null;
  mediaPath?: string | null;
};

export type PlanTemplate = {
  id: string;
  name: string;
  items: TemplateItem[];
  createdAt: string;
};

const STORAGE_KEY = "cp-plan-templates";

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getTemplates(): PlanTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: PlanTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function saveAsTemplate(name: string, items: TemplateItem[]): PlanTemplate {
  const templates = getTemplates();
  const t: PlanTemplate = { id: generateId(), name, items, createdAt: new Date().toISOString() };
  templates.push(t);
  saveTemplates(templates);
  return t;
}

export function deleteTemplate(id: string): void {
  const templates = getTemplates().filter((t) => t.id !== id);
  saveTemplates(templates);
}

export function renameTemplate(id: string, name: string): void {
  const templates = getTemplates();
  const t = templates.find((t) => t.id === id);
  if (t) {
    t.name = name;
    saveTemplates(templates);
  }
}
