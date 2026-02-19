import type { CpPlanItemKind } from "../../../shared/planKinds";
import { isCpPlanItemKind } from "../../../shared/planKinds";

export type TemplateItem = {
  kind: CpPlanItemKind;
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
  builtin?: boolean;
};

const BUILTIN_TEMPLATE_PREFIX = "builtin:";
const BUILTIN_TEMPLATES: PlanTemplate[] = [
  {
    id: `${BUILTIN_TEMPLATE_PREFIX}standard`,
    name: "Standard (Culte)",
    builtin: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    items: [
      { kind: "ANNOUNCEMENT_TEXT", title: "Accueil", content: "Bienvenue a tous." },
      { kind: "ANNOUNCEMENT_TEXT", title: "Louange", content: "Temps de louange." },
      { kind: "BIBLE_PASSAGE", title: "Lecture biblique", content: "" },
      { kind: "ANNOUNCEMENT_TEXT", title: "Predication", content: "Message du jour." },
      { kind: "ANNOUNCEMENT_TEXT", title: "Annonces", content: "Infos de la semaine." },
    ],
  },
  {
    id: `${BUILTIN_TEMPLATE_PREFIX}veilee`,
    name: "Veillee de priere",
    builtin: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    items: [
      { kind: "ANNOUNCEMENT_TEXT", title: "Accueil", content: "Bienvenue a la veillee." },
      { kind: "ANNOUNCEMENT_TEXT", title: "Priere 1", content: "Intercession." },
      { kind: "ANNOUNCEMENT_TEXT", title: "Priere 2", content: "Actions de grace." },
      { kind: "BIBLE_PASSAGE", title: "Lecture biblique", content: "" },
      { kind: "ANNOUNCEMENT_TEXT", title: "Cloture", content: "Benediction finale." },
    ],
  },
  {
    id: `${BUILTIN_TEMPLATE_PREFIX}evenement`,
    name: "Evenement special",
    builtin: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    items: [
      { kind: "ANNOUNCEMENT_TEXT", title: "Introduction", content: "Presentation de l'evenement." },
      { kind: "ANNOUNCEMENT_TEXT", title: "Programme", content: "Deroulement de la soiree." },
      { kind: "ANNOUNCEMENT_TEXT", title: "Intervenant", content: "Presentation de l'invite." },
      { kind: "ANNOUNCEMENT_TEXT", title: "Informations", content: "Contacts et suite." },
    ],
  },
];

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

function cloneTemplateItem(item: TemplateItem): TemplateItem {
  return { ...item };
}

function clonePlanTemplate(template: PlanTemplate): PlanTemplate {
  return { ...template, items: template.items.map(cloneTemplateItem) };
}

function cloneTemplates(templates: PlanTemplate[]): PlanTemplate[] {
  return templates.map((template) => clonePlanTemplate(template));
}

function withBuiltinTemplates(userTemplates: PlanTemplate[]): PlanTemplate[] {
  return [...cloneTemplates(BUILTIN_TEMPLATES), ...cloneTemplates(userTemplates)];
}

function sanitizeTemplateItem(value: unknown): TemplateItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  if (!isCpPlanItemKind(rec.kind)) return null;
  const out: TemplateItem = { kind: rec.kind as CpPlanItemKind };
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
  return value
    .map((entry) => sanitizeTemplate(entry))
    .filter((entry): entry is PlanTemplate => !!entry)
    .filter((entry) => !isBuiltinTemplateId(entry.id));
}

function toPersistedTemplates(templates: PlanTemplate[]): PlanTemplate[] {
  return templates
    .filter((template) => !isBuiltinTemplateId(template.id))
    .map((template) => ({ ...template, builtin: undefined, items: template.items.map(cloneTemplateItem) }));
}

export function isBuiltinTemplateId(id: string): boolean {
  return id.startsWith(BUILTIN_TEMPLATE_PREFIX);
}

export function isBuiltinTemplate(template: Pick<PlanTemplate, "id">): boolean {
  return isBuiltinTemplateId(template.id);
}

async function persistTemplates(templates: PlanTemplate[]): Promise<void> {
  templatesCache = toPersistedTemplates(templates);
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
  return withBuiltinTemplates(templatesCache);
}

export async function saveAsTemplate(name: string, items: TemplateItem[]): Promise<PlanTemplate> {
  await hydrateTemplates();
  const template: PlanTemplate = { id: generateId(), name, items, createdAt: new Date().toISOString() };
  await persistTemplates([...templatesCache, template]);
  return template;
}

export async function deleteTemplate(id: string): Promise<void> {
  if (isBuiltinTemplateId(id)) return;
  await hydrateTemplates();
  const next = templatesCache.filter((template) => template.id !== id);
  await persistTemplates(next);
}

export async function renameTemplate(id: string, name: string): Promise<void> {
  if (isBuiltinTemplateId(id)) return;
  await hydrateTemplates();
  const next = templatesCache.map((template) => {
    if (template.id !== id) return template;
    return { ...template, name };
  });
  await persistTemplates(next);
}

export function getTemplatesSnapshot(): PlanTemplate[] {
  return withBuiltinTemplates(templatesCache);
}
