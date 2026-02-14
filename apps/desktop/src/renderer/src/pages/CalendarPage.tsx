import React, { useEffect, useMemo, useState } from "react";
import { Alert, PageHeader, Panel } from "../ui/primitives";

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
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!canUse) return;
    window.cp.plans.list().then(setPlans);
  }, [canUse]);

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);

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
      <div className="cp-page">
        <h1 className="cp-page-title">Calendrier</h1>
        <p className="cp-error-text cp-mb-0">Preload non charge (window.cp.plans indisponible).</p>
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
    <div className="cp-page">
      <PageHeader
        title="Calendrier"
        subtitle="Preparer en avance: une date correspond a un plan (si la date est prise, la prochaine date libre est utilisee)."
        actions={
          <>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>{"<"}</button>
          <div className="cp-calendar-month-title">{title}</div>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>{">"}</button>
          </>
        }
      />
      {msg ? <Alert tone="success">{msg}</Alert> : null}

      <Panel>
        <div className="cp-calendar-grid">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="cp-calendar-weekday">
              {d}
            </div>
          ))}

          {days.map((d) => {
            const key = ymd(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const list = byDate.get(key) ?? [];
            return (
              <div key={key} className={inMonth ? "cp-calendar-day" : "cp-calendar-day is-outside-month"}>
                <div className="cp-calendar-day-head">
                  <div className="cp-title-strong">{d.getDate()}</div>
                  <button
                    onClick={async () => {
                      const created = await window.cp.plans.create({ dateIso: key, title: "Culte" });
                      const createdDate = isoToYmd(created.date);
                      const next = await window.cp.plans.list();
                      setPlans(next);
                      setMsg(
                        createdDate === key
                          ? "Plan cree. Va dans Plan pour l'editer."
                          : `Date deja prise, plan cree le ${createdDate}.`
                      );
                      setTimeout(() => setMsg(null), 2400);
                    }}
                    className="cp-btn-compact"
                  >
                    + Plan
                  </button>
                </div>

                <div className="cp-calendar-plan-list">
                  {list.slice(0, 2).map((p) => (
                    <div key={p.id} className="cp-calendar-plan-item">
                      {p.title || "Culte"}
                    </div>
                  ))}
                  {list.length > 2 && <div className="cp-help-text-flat">+{list.length - 2}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="cp-page-subtitle cp-subtitle-xs">
        Astuce: cree un plan depuis un jour, puis ouvre la page Plan pour l'editer.
      </div>
    </div>
  );
}
