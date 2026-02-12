export type PlanListItem = {
  id: string;
  date: string;
  title?: string | null;
  updatedAt: string;
};

export type PlanItem = {
  id: string;
  order: number;
  kind: string;
  title?: string | null;
  content?: string | null;
  refId?: string | null;
  refSubId?: string | null;
  mediaPath?: string | null;
};

export type Plan = {
  id: string;
  date: string;
  title?: string | null;
  items: PlanItem[];
};

export type ScreenKey = "A" | "B" | "C";
export type ScreenMirrorMode = { kind: "FREE" } | { kind: "MIRROR"; from: ScreenKey };
export type ScreenMeta = { key: ScreenKey; isOpen: boolean; mirror: ScreenMirrorMode };

export type LiveState = {
  enabled: boolean;
  planId: string | null;
  cursor: number;
  target: ScreenKey;
  black: boolean;
  white: boolean;
  lockedScreens: Record<ScreenKey, boolean>;
  updatedAt: number;
};
