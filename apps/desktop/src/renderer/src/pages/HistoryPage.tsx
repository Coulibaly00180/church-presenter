import React, { useEffect, useState } from "react";
import { ActionRow, Alert, PageHeader, Panel } from "../ui/primitives";

type PlanListItem = { id: string; date: string | Date; title?: string | null; updatedAt: string | Date };
type ImportDetail = { counts: CpDataImportCounts; errors: CpDataImportError[] };

function isoToYmd(iso: string | Date) {
  if (iso instanceof Date) {
    if (Number.isNaN(iso.getTime())) return "";
    const y = iso.getUTCFullYear();
    const m = String(iso.getUTCMonth() + 1).padStart(2, "0");
    const day = String(iso.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

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

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function HistoryPage() {
  const canUse = !!window.cp?.plans;

  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [importDetail, setImportDetail] = useState<ImportDetail | null>(null);

  useEffect(() => {
    if (!canUse) return;
    window.cp.plans.list().then(setPlans);
  }, [canUse]);

  if (!canUse) {
    return (
      <div className="cp-page">
        <h1 className="cp-page-title">Historique</h1>
        <p className="cp-error-text cp-mb-0">Preload non charge (window.cp.plans indisponible).</p>
      </div>
    );
  }

  return (
    <div className="cp-page">
      <PageHeader title="Historique" subtitle="Plans passes (duplication et export JSON)." />

      {msg ? <Alert>{msg}</Alert> : null}

      {importDetail ? (
        <Panel soft>
          <div className="cp-section-label cp-mb-6">
            Recap import: {importDetail.counts.songs} chants, {importDetail.counts.plans} plans
          </div>
          {importDetail.errors.length === 0 ? (
            <div className="cp-success-text">Aucune erreur.</div>
          ) : (
            <div className="cp-import-error-list">
              {importDetail.errors.map((e, idx) => (
                <div key={idx} className="cp-import-error-item">
                  [{e.kind}] {e.title || "??"} - {e.message}
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setImportDetail(null)} className="cp-mt-6">
            Fermer
          </button>
        </Panel>
      ) : null}

      <ActionRow>
        <button
          onClick={async () => {
            try {
              if (!window.cp.data) {
                setMsg("API data indisponible.");
                return;
              }
              const r = await window.cp.data.exportAll();
              if (r.ok) setMsg(`Export global -> ${r.path}`);
              else if (r.canceled) setMsg("Export annule.");
            } catch (e) {
              setMsg(`Export echoue: ${getErrorMessage(e)}`);
            }
          }}
        >
          Export JSON global
        </button>

        <button
          onClick={async () => {
            try {
              if (!window.cp.data) {
                setMsg("API data indisponible.");
                return;
              }

              const replace = window.confirm("Remplacer les donnees existantes ? OK = REPLACE, Annuler = MERGE");
              let backupPath: string | undefined;

              if (replace) {
                const bk = await window.cp.data.exportAll();
                if (!bk.ok) {
                  if (bk.canceled) {
                    setMsg("Import annule: backup obligatoire en mode REPLACE.");
                    return;
                  }
                  setMsg("Backup echoue. Import REPLACE annule.");
                  return;
                }
                backupPath = bk.path;
              }

              const r = await window.cp.data.importAll({ mode: replace ? "REPLACE" : "MERGE" });
              if (r.ok) {
                setPlans(await window.cp.plans.list());
                setMsg(
                  `Import global OK (${r.counts?.songs || 0} chants, ${r.counts?.plans || 0} plans)${
                    backupPath ? ` | Backup: ${backupPath}` : ""
                  }`
                );
                setImportDetail({ counts: r.counts || { songs: 0, plans: 0 }, errors: r.errors || [] });
              } else if ("canceled" in r && r.canceled) {
                setMsg("Import annule.");
              } else {
                setMsg(`Import echoue${"error" in r && r.error ? `: ${r.error}` : "."}`);
              }
            } catch (e) {
              setMsg(`Import echoue: ${getErrorMessage(e)}`);
            }
          }}
        >
          Import JSON global
        </button>
      </ActionRow>

      <div className="cp-stack">
        {plans.map((p) => (
          <Panel key={p.id}>
            <div className="cp-title-strong">{p.title || "Culte"}</div>
            <div className="cp-date-muted">{isoToYmd(p.date)}</div>
            <ActionRow className="cp-mt-10">
              <button
                onClick={async () => {
                  try {
                    const duplicated = await window.cp.plans.duplicate({ planId: p.id, dateIso: localNowYmd() });
                    if (!duplicated) {
                      setMsg("Duplication echouee: plan introuvable.");
                      return;
                    }
                    setPlans(await window.cp.plans.list());
                    const duplicatedDate = duplicated.date ? isoToYmd(duplicated.date) : null;
                    setMsg(duplicatedDate ? `Plan duplique au ${duplicatedDate}.` : "Plan duplique.");
                  } catch (e) {
                    setMsg(`Duplication echouee: ${getErrorMessage(e)}`);
                  }
                }}
              >
                Dupliquer
              </button>

              <button
                onClick={async () => {
                  try {
                    const res = await window.cp.plans.export({ planId: p.id });
                    if (res.ok) setMsg(`Plan exporte -> ${res.path}`);
                    else if (res.canceled) setMsg("Export annule.");
                  } catch (e) {
                    setMsg(`Export echoue: ${getErrorMessage(e)}`);
                  }
                }}
              >
                Exporter JSON
              </button>
            </ActionRow>
          </Panel>
        ))}
        {plans.length === 0 && <div className="cp-muted">Aucun plan.</div>}
      </div>
    </div>
  );
}
