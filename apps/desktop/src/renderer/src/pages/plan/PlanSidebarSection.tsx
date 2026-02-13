import React from "react";
import { isoToYmd } from "./date";
import { PlanListItem } from "./types";
import { Field, Panel } from "../../ui/primitives";

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

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function PlanSidebarSection(props: PlanSidebarSectionProps) {
  const { newDate, newTitle, plans, selectedPlanId, livePlanId, onSetNewDate, onSetNewTitle, onCreatePlan, onSelectPlan } = props;

  return (
    <div className="cp-stack">
      <Panel>
        <div className="cp-section-label">Creer un plan</div>
        <div className="cp-stack-8">
          <Field label="Date">
            <input value={newDate} onChange={(e) => onSetNewDate(e.target.value)} type="date" className="cp-input-full" />
          </Field>
          <Field label="Titre">
            <input value={newTitle} onChange={(e) => onSetNewTitle(e.target.value)} className="cp-input-full" />
          </Field>
          <button onClick={() => onCreatePlan()} className="btn-primary">
            + Creer
          </button>
        </div>
      </Panel>

      <Panel>
        <div className="cp-panel-header-split cp-mb-8">
          <div className="cp-section-label cp-mb-0">Plans</div>
          <span className="cp-count-muted">{plans.length} plan(s)</span>
        </div>
        <div className="cp-scroll-list-70">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPlan(p.id)}
              className={cls("panel", "cp-plan-card", selectedPlanId === p.id && "is-active")}
            >
              <div className="cp-field-label">{p.title || "Culte"}</div>
              <div className="cp-date-muted">{isoToYmd(p.date)}</div>
              {livePlanId === p.id ? <div className="cp-live-tag">Live</div> : null}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
