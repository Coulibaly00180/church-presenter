import React, { useEffect, useState } from "react";

type PlanListItem = { id: string; date: string; title?: string | null; updatedAt: string };

function isoToYmd(iso: string) {
  const fromIso = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (fromIso) return `${fromIso[1]}-${fromIso[2]}-${fromIso[3]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localNowYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function HistoryPage() {
  const canUse = !!window.cp?.plans;

  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [importDetail, setImportDetail] = useState<{ counts: { songs: number; plans: number }; errors: any[] } | null>(null);

  useEffect(() => {
    if (!canUse) return;
    window.cp.plans.list().then(setPlans);
  }, [canUse]);

  if (!canUse) {
    return (
      <div style={{ fontFamily: "system-ui", padding: 16 }}>
        <h1 style={{ margin: 0 }}>Historique</h1>
        <p style={{ color: "crimson" }}>Preload non charge (window.cp.plans indisponible).</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <h1 style={{ margin: 0 }}>Historique</h1>
      <p style={{ opacity: 0.75, marginTop: 8 }}>
        Plans passes (duplication et export JSON).
      </p>

      {msg ? (
        <div style={{ marginTop: 8, padding: 10, border: "1px solid #cbd5ff", background: "#eef2ff", borderRadius: 10 }}>
          {msg}
        </div>
      ) : null}

      {importDetail ? (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            border: "1px solid #e4e4e7",
            background: "#fafafa",
            borderRadius: 12,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            Récap import : {importDetail.counts.songs} chants, {importDetail.counts.plans} plans
          </div>
          {importDetail.errors.length === 0 ? (
            <div style={{ color: "#166534" }}>Aucune erreur.</div>
          ) : (
            <div style={{ maxHeight: 200, overflow: "auto", borderTop: "1px solid #e4e4e7", paddingTop: 6 }}>
              {importDetail.errors.map((e, idx) => (
                <div key={idx} style={{ fontSize: 13, marginBottom: 4, color: "#b91c1c" }}>
                  [{e.kind}] {e.title || "??"} — {e.message}
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setImportDetail(null)} style={{ marginTop: 6 }}>
            Fermer
          </button>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button
          onClick={async () => {
            const r = await window.cp.data?.exportAll();
            if (r?.ok) setMsg(`Export global -> ${r.path}`);
          }}
        >
          Export JSON global
        </button>
        <button
          onClick={async () => {
            const replace = window.confirm("Remplacer les donnees existantes ? OK = REPLACE, Annuler = MERGE");
            let backupPath: string | undefined;
            if (replace) {
              const bk = await window.cp.data?.exportAll();
              if (bk?.ok) backupPath = bk.path;
            }
            const r = await window.cp.data?.importAll({ mode: replace ? "REPLACE" : "MERGE" });
            if (r?.ok) {
              setPlans(await window.cp.plans.list());
              setMsg(
                `Import global OK (${r.counts?.songs || 0} chants, ${r.counts?.plans || 0} plans)${
                  backupPath ? ` • Backup: ${backupPath}` : ""
                }`
              );
              setImportDetail({ counts: r.counts || { songs: 0, plans: 0 }, errors: r.errors || [] });
            } else if (r?.canceled) {
              setMsg("Import annule.");
            } else {
              setMsg("Import echoue.");
            }
          }}
        >
          Import JSON global
        </button>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {plans.map((p) => (
          <div
            key={p.id}
            style={{ border: "1px solid #e6e6e6", borderRadius: 12, padding: 12, background: "white" }}
          >
            <div style={{ fontWeight: 900 }}>{p.title || "Culte"}</div>
            <div style={{ opacity: 0.75, fontSize: 13 }}>{isoToYmd(p.date)}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button
                onClick={async () => {
                  await window.cp.plans.duplicate({ planId: p.id, dateIso: localNowYmd() });
                  setPlans(await window.cp.plans.list());
                  setMsg("Plan duplique.");
                }}
              >
                Dupliquer
              </button>
              <button
                onClick={async () => {
                  const res = await window.cp.plans.export({ planId: p.id });
                  if (res?.ok) setMsg(`Plan exporte -> ${res.path}`);
                  else if (!res?.canceled) setMsg("Export echoue.");
                }}
              >
                Exporter JSON
              </button>
            </div>
          </div>
        ))}
        {plans.length === 0 && <div style={{ opacity: 0.7 }}>Aucun plan.</div>}
      </div>
    </div>
  );
}
