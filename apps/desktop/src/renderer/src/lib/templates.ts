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

let templatesCache: PlanTemplate[] = [];
let hydrated = false;
let hydratingPromise: Promise<void> | null = null;

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sanitizeNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function sanitizeTemplateItem(value: unknown): TemplateItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.kind !== "string" || rec.kind.length === 0) return null;
  const out: TemplateItem = { kind: rec.kind };
  const title = sanitizeNullableString(rec.title);
  const content = sanitizeNullableString(rec.content);
  const refId = sanitizeNullableString(rec.refId);
  const refSubId = sanitizeNullableString(rec.refSubId);
  const mediaPath = sanitizeNullableString(rec.mediaPath);
  if (title !== undefined) out.title = title;
  if (content !== undefined) out.content = content;
  if (refId !== undefined) out.refId = refId;
  if (refSubId !== undefined) out.refSubId = refSubId;
  if (mediaPath !== undefined) out.mediaPath = mediaPath;
  return out;
}

function sanitizeTemplate(value: unknown): PlanTemplate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.id !== "string" || rec.id.length === 0) return null;
  if (typeof rec.name !== "string" || rec.name.length === 0) return null;
  if (!Array.isArray(rec.items)) return null;
  if (typeof rec.createdAt !== "string" || rec.createdAt.length === 0) return null;
  const items = rec.items.map((entry) => sanitizeTemplateItem(entry)).filter((entry): entry is TemplateItem => !!entry);
  return {
    id: rec.id,
    name: rec.name,
    items,
    createdAt: rec.createdAt,
  };
}

function sanitizeTemplates(value: unknown): PlanTemplate[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => sanitizeTemplate(entry)).filter((entry): entry is PlanTemplate => !!entry);
}

async function persistTemplates(templates: PlanTemplate[]): Promise<void> {
  templatesCache = templates;
  try {
    await window.cp.settings.setTemplates(templatesCache);
  } catch {
    // Ignore persistence errors; local cache remains usable.
  }
}

export async function hydrateTemplates(): Promise<void> {
  if (hydrated) return;
  if (hydratingPromise) return hydratingPromise;
  hydratingPromise = (async () => {
    try {
      const result = await window.cp.settings.getTemplates();
      if (result.ok) {
        templatesCache = sanitizeTemplates(result.templates);
      } else {
        templatesCache = [];
      }
    } catch {
      templatesCache = [];
    }
    hydrated = true;
    hydratingPromise = null;
  })();
  return hydratingPromise;
}

export async function getTemplates(): Promise<PlanTemplate[]> {
  await hydrateTemplates();
  return templatesCache.map((template) => ({ ...template, items: template.items.map((item) => ({ ...item })) }));
}

export async function saveAsTemplate(name: string, items: TemplateItem[]): Promise<PlanTemplate> {
  await hydrateTemplates();
  const template: PlanTemplate = { id: generateId(), name, items, createdAt: new Date().toISOString() };
  await persistTemplates([...templatesCache, template]);
  return template;
}

export async function deleteTemplate(id: string): Promise<void> {
  await hydrateTemplates();
  const next = templatesCache.filter((template) => template.id !== id);
  await persistTemplates(next);
}

export async function renameTemplate(id: string, name: string): Promise<void> {
  await hydrateTemplates();
  const next = templatesCache.map((template) => {
    if (template.id !== id) return template;
    return { ...template, name };
  });
  await persistTemplates(next);
}

export function getTemplatesSnapshot(): PlanTemplate[] {
  return templatesCache.map((template) => ({ ...template, items: template.items.map((item) => ({ ...item })) }));
}
