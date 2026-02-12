import React, { useEffect, useMemo, useState } from "react";

type PlanListItem = { id: string; date: string | Date; title?: string | null; updatedAt: string | Date };

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function isoToYmd(iso: string | Date) {
  if (iso instanceof Date) {
    if (Number.isNaN(iso.getTime())) return "";
    return `${iso.getUTCFullYear()}-${String(iso.getUTCMonth() + 1).padStart(2, "0")}-${String(iso.getUTCDate()).padStart(2, "0")}`;
  }

  const fromIso = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (fromIso) return `${fromIso[1]}-${fromIso[2]}-${fromIso[3]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function CalendarPage() {
  const canUse = !!window.cp?.plans;

  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [cursor, setCursor] = useState<Date>(() => new Date());

  useEffect(() => {
    if (!canUse) return;
    window.cp.plans.list().then(setPlans);
  }, [canUse]);

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const monthEnd = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor]);

  const byDate = useMemo(() => {
    const map = new Map<string, PlanListItem[]>();
    for (const p of plans) {
      const key = isoToYmd(p.date);
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [plans]);

  if (!canUse) {
    return (
      <div style={{ fontFamily: "system-ui", padding: 16 }}>
        <h1 style={{ margin: 0 }}>Calendrier</h1>
        <p style={{ color: "crimson" }}>Preload non chargé (window.cp.plans indisponible).</p>
      </div>
    );
  }

  const days: Date[] = [];
  {
    const first = new Date(monthStart);
    // align to Monday
    const dow = (first.getDay() + 6) % 7; // 0=Mon
    first.setDate(first.getDate() - dow);
    for (let i = 0; i < 42; i++) {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      days.push(d);
    }
  }

  const title = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Calendrier</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} style={{ padding: "10px 14px" }}>
            ←
          </button>
          <div style={{ fontWeight: 900, minWidth: 220, textAlign: "center", paddingTop: 10 }}>{title}</div>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} style={{ padding: "10px 14px" }}>
            →
          </button>
        </div>
      </div>

      <p style={{ opacity: 0.75, marginTop: 8 }}>
        Préparer en avance : chaque date peut avoir un ou plusieurs plans (culte, veillée, événement).
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 8,
          marginTop: 12,
        }}
      >
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>
            {d}
          </div>
        ))}

        {days.map((d) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const list = byDate.get(key) ?? [];
          return (
            <div
              key={key}
              style={{
                border: "1px solid #e6e6e6",
                borderRadius: 12,
                padding: 10,
                minHeight: 90,
                background: inMonth ? "white" : "#fbfbfb",
                opacity: inMonth ? 1 : 0.7,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 900 }}>{d.getDate()}</div>
                <button
                  onClick={async () => {
                    const created = await window.cp.plans.create({ dateIso: key, title: "Culte" });
                    const next = await window.cp.plans.list();
                    setPlans(next);
                    alert("Plan créé. Va dans Plan pour l’éditer.");
                  }}
                  style={{ padding: "4px 8px", fontSize: 12 }}
                >
                  + Plan
                </button>
              </div>

              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {list.slice(0, 2).map((p) => (
                  <div key={p.id} style={{ fontSize: 12, borderLeft: "3px solid #111", paddingLeft: 8 }}>
                    {p.title || "Culte"}
                  </div>
                ))}
                {list.length > 2 && <div style={{ fontSize: 12, opacity: 0.7 }}>+{list.length - 2}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, opacity: 0.7, fontSize: 12 }}>
        (Prochaine étape) ouvrir directement un plan depuis le calendrier + filtrer passé/avenir.
      </div>
    </div>
  );
}
