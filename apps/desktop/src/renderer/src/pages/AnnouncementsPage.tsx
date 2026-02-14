import React, { useEffect, useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Alert, Field, InlineField, PageHeader, Panel, ToolbarPanel, ToolbarRow } from "../ui/primitives";
import { PlanSelectField, ProjectionTargetField } from "../ui/headerControls";
import { projectMediaToScreen, projectTextToScreen } from "../projection/target";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

function formatDate(p: CpPlanListItem) {
  if (!p.date) return "";
  const d = p.date instanceof Date ? p.date : new Date(p.date);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function AnnouncementsPage() {
  const [files, setFiles] = useState<CpMediaFile[]>([]);
  const [plans, setPlans] = useState<CpPlanListItem[]>([]);
  const [planId, setPlanId] = useState<string>("");
  const [pdfPage, setPdfPage] = useState("1");
  const [manualTitle, setManualTitle] = useState("Annonce");
  const [manualContent, setManualContent] = useState("");
  const [target, setTarget] = useState<ScreenKey>("A");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});

  async function refreshFiles() {
    const res = await window.cp.files?.listMedia?.();
    if (res?.ok) setFiles(res.files || []);
  }

  async function refreshPlans() {
    try {
      const list = await window.cp.plans.list();
      setPlans(list || []);
      if (list?.length) setPlanId((prev) => prev || list[0].id);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refreshFiles();
    refreshPlans();
  }, []);

  const pdfs = useMemo(() => files.filter((f) => f.mediaType === "PDF"), [files]);

  // Load page counts for PDFs
  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      const entries: Record<string, number> = {};
      for (const f of pdfs) {
        try {
          const url = f.path.startsWith("file://") ? f.path : `file:///${f.path.replace(/\\/g, "/")}`;
          const pdf = await pdfjsLib.getDocument(url).promise;
          entries[f.path] = pdf.numPages;
        } catch {
          // ignore
        }
      }
      if (!cancelled) setPageCounts(entries);
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [pdfs]);

  return (
    <div className="cp-page">
      <PageHeader title="Annonces" subtitle="Importer des PDF ou saisir une annonce texte puis ajouter au plan." />

      {err ? <Alert tone="error">{err}</Alert> : null}
      {info ? <Alert tone="success">{info}</Alert> : null}

      <ToolbarPanel>
          <button
            className="btn-primary"
            onClick={async () => {
              setLoading(true);
              setErr(null);
              const r = await window.cp.files?.pickMedia?.();
              setLoading(false);
              if (r?.ok) {
                setInfo("Fichier importe avec succes.");
                refreshFiles();
              }
            }}
            disabled={loading}
          >
            Importer un PDF
          </button>
          <ProjectionTargetField value={target} onChange={setTarget} />
      </ToolbarPanel>

      <div className="cp-grid-main">
        <Panel>
          <div className="cp-section-label">Annonce texte</div>
          <Field label="Titre">
            <input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className="cp-input-full" />
          </Field>
          <Field label="Contenu">
            <textarea value={manualContent} onChange={(e) => setManualContent(e.target.value)} rows={6} className="cp-input-full" />
          </Field>
          <Field label="Plan">
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="cp-input-full">
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || "Culte"} {formatDate(p)}
                </option>
              ))}
            </select>
          </Field>
          <ToolbarRow className="cp-mt-8">
            <button
              className="btn-primary"
              onClick={async () => {
                if (!planId) return;
                await window.cp.plans.addItem({
                  planId,
                  kind: "ANNOUNCEMENT_TEXT",
                  title: manualTitle.trim() || "Annonce",
                  content: manualContent,
                });
                setInfo("Annonce texte ajoutee au plan.");
                setManualContent("");
              }}
            >
              Ajouter au plan
            </button>
            <button
              onClick={() => projectTextToScreen({ target, title: manualTitle, body: manualContent })}
              disabled={!manualContent && !manualTitle}
            >
              Projeter maintenant
            </button>
          </ToolbarRow>
        </Panel>

        <Panel>
          <div className="cp-section-label">PDF importes ({pdfs.length})</div>
          <ToolbarRow className="cp-mb-8">
            <InlineField label="Page">
              <input
                type="number"
                min={1}
                value={pdfPage}
                onChange={(e) => setPdfPage(e.target.value)}
                className="cp-input-narrow"
              />
            </InlineField>
            <PlanSelectField
              value={planId}
              plans={plans}
              getPlanId={(p) => p.id}
              getPlanLabel={(p) => (
                <>
                  {p.title || "Culte"} {formatDate(p)}
                </>
              )}
              onChange={setPlanId}
            />
          </ToolbarRow>

          <div className="cp-grid-card-list">
            {pdfs.map((f) => (
              <div key={f.path} className="cp-media-card">
                <div className="cp-media-meta">
                  <div className="cp-field-label">{f.name}</div>
                  <div className="cp-help-text-flat">
                    {f.mediaType} {pageCounts[f.path] ? `- ${pageCounts[f.path]} page(s)` : ""}
                  </div>
                  {pageCounts[f.path] ? (
                    <div className="cp-help-text-muted">
                      Page choisie: {parseInt(pdfPage || "1", 10) || 1} / {pageCounts[f.path]}
                    </div>
                  ) : null}
                  <ToolbarRow>
                    <button
                      className="btn-primary"
                      onClick={async () => {
                        if (!planId) return;
                        const mediaPath = `${f.path}#page=${parseInt(pdfPage || "1", 10) || 1}`;
                        await window.cp.plans.addItem({
                          planId,
                          kind: "ANNOUNCEMENT_PDF",
                          title: f.name,
                          mediaPath,
                          content: mediaPath,
                        });
                        setInfo("PDF ajoute au plan.");
                      }}
                    >
                      Ajouter au plan
                    </button>
                    <button
                      onClick={() => {
                        const mediaPath = `${f.path}#page=${parseInt(pdfPage || "1", 10) || 1}`;
                        projectMediaToScreen({
                          target,
                          title: `${f.name} (p.${pdfPage || "1"})`,
                          mediaPath,
                          mediaType: "PDF",
                        });
                      }}
                    >
                      Projeter
                    </button>
                  </ToolbarRow>
                </div>
                <div className="cp-media-actions">
                  <button
                    className="cp-danger"
                    onClick={async () => {
                      const ok = window.confirm("Supprimer ce fichier importe ?");
                      if (!ok) return;
                      await window.cp.files?.deleteMedia?.({ path: f.path });
                      await refreshFiles();
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
            {pdfs.length === 0 ? <div className="cp-muted">Aucun PDF importe pour le moment.</div> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}
