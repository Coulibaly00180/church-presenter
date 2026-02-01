import React, { useEffect, useState } from "react";

type PlanListItem = { id: string; date: string; title?: string | null; updatedAt: string };

function isoToYmd(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function HistoryPage() {
  const canUse = !!window.cp?.plans;

  const [plans, setPlans] = useState<PlanListItem[]>([]);

  useEffect(() => {
    if (!canUse) return;
    window.cp.plans.list().then(setPlans);
  }, [canUse]);

  if (!canUse) {
    return (
      <div style={{ fontFamily: "system-ui", padding: 16 }}>
        <h1 style={{ margin: 0 }}>Historique</h1>
        <p style={{ color: "crimson" }}>Preload non chargé (window.cp.plans indisponible).</p>
      </div>
    );
  }

  // Pour l’instant : on affiche tous les plans. Ensuite : filtre "passés" et duplication.
  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <h1 style={{ margin: 0 }}>Historique</h1>
      <p style={{ opacity: 0.75, marginTop: 8 }}>
        Plans passés (la duplication/export arrive ensuite).
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {plans.map((p) => (
          <div
            key={p.id}
            style={{ border: "1px solid #e6e6e6", borderRadius: 12, padding: 12, background: "white" }}
          >
            <div style={{ fontWeight: 900 }}>{p.title || "Culte"}</div>
            <div style={{ opacity: 0.75, fontSize: 13 }}>{isoToYmd(p.date)}</div>
            <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
              (Bientôt) Dupliquer • Exporter • Ouvrir
            </div>
          </div>
        ))}
        {plans.length === 0 && <div style={{ opacity: 0.7 }}>Aucun plan.</div>}
      </div>
    </div>
  );
}
