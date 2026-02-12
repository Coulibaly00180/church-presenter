import React from "react";
import { isoToYmd } from "./date";
import { PlanListItem } from "./types";

type PlanSidebarSectionProps = {
  newDate: string;
  newTitle: string;
  plans: PlanListItem[];
  selectedPlanId: string | null;
  livePlanId: string | null;
  onSetNewDate: (value: string) => void;
  onSetNewTitle: (value: string) => void;
  onCreatePlan: () => void | Promise<void>;
  onSelectPlan: (planId: string) => void | Promise<void>;
};

export function PlanSidebarSection(props: PlanSidebarSectionProps) {
  const { newDate, newTitle, plans, selectedPlanId, livePlanId, onSetNewDate, onSetNewTitle, onCreatePlan, onSelectPlan } = props;

  return (
    <div className="cp-stack">
      <div className="panel cp-panel">
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Creer un plan</div>
        <div style={{ display: "grid", gap: 8 }}>
          <label>
            <div style={{ fontWeight: 600 }}>Date</div>
            <input value={newDate} onChange={(e) => onSetNewDate(e.target.value)} type="date" className="cp-input-full" />
          </label>
          <label>
            <div style={{ fontWeight: 600 }}>Titre</div>
            <input value={newTitle} onChange={(e) => onSetNewTitle(e.target.value)} className="cp-input-full" />
          </label>
          <button onClick={() => onCreatePlan()} className="btn-primary">
            + Creer
          </button>
        </div>
      </div>

      <div className="panel cp-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 800 }}>Plans</div>
          <span style={{ fontSize: 12, opacity: 0.6 }}>{plans.length} plan(s)</span>
        </div>
        <div style={{ display: "grid", gap: 8, maxHeight: "70vh", overflow: "auto" }}>
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPlan(p.id)}
              className="panel"
              style={{
                textAlign: "left",
                padding: 12,
                borderRadius: 12,
                border: selectedPlanId === p.id ? "2px solid var(--primary)" : "1px solid var(--border)",
                background: selectedPlanId === p.id ? "var(--primary-soft)" : "white",
                boxShadow: "none",
              }}
            >
              <div style={{ fontWeight: 800 }}>{p.title || "Culte"}</div>
              <div style={{ opacity: 0.75, fontSize: 13 }}>{isoToYmd(p.date)}</div>
              {livePlanId === p.id ? <div style={{ marginTop: 4, fontSize: 11, fontWeight: 800, color: "#0a6847" }}>LIVE</div> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
