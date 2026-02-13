import React, { useEffect, useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ActionRow, Alert, Field, InlineField, PageHeader, Panel } from "../ui/primitives";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type MediaItem = { name: string; path: string; mediaType: "PDF" | "IMAGE" };
type PlanListItem = { id: string; title?: string | null; date?: string | Date };
type ScreenKey = "A" | "B" | "C";

function formatDate(p: PlanListItem) {
  if (!p.date) return "";
  const d = p.date instanceof Date ? p.date : new Date(p.date);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function AnnouncementsPage() {
  const [files, setFiles] = useState<MediaItem[]>([]);
  const [plans, setPlans] = useState<PlanListItem[]>([]);
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

  async function ensureScreenOpen(key: ScreenKey) {
    if (key === "A") {
      await window.cp.projectionWindow.open();
      return;
    }
    const list: CpScreenMeta[] = (await window.cp.screens?.list?.()) || [];
    const meta = list.find((s) => s.key === key);
    if (!meta?.isOpen) {
      await window.cp.screens?.open?.(key);
    }
  }

  async function projectText(title: string | undefined, body: string) {
    const dest = target;
    await ensureScreenOpen(dest);
    if (dest === "A" || !window.cp.screens) {
      await window.cp.projection.setContentText({ title, body });
      return;
    }
    const res = (await window.cp.screens.setContentText(dest, { title, body })) as { ok?: boolean; reason?: string };
    if (res?.ok === false && res?.reason === "MIRROR") {
      await window.cp.projection.setContentText({ title, body });
    }
  }

  async function projectPdf(title: string | undefined, mediaPath: string) {
    const dest = target;
    await ensureScreenOpen(dest);
    if (dest === "A" || !window.cp.screens) {
      await window.cp.projection.setContentMedia({ title, mediaPath, mediaType: "PDF" });
      return;
    }
    const res = (await window.cp.screens.setContentMedia(dest, { title, mediaPath, mediaType: "PDF" })) as {
      ok?: boolean;
      reason?: string;
    };
    if (res?.ok === false && res?.reason === "MIRROR") {
      await window.cp.projection.setContentMedia({ title, mediaPath, mediaType: "PDF" });
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
      <PageHeader
        title="Annonces"
        subtitle="Importer des PDF ou saisir une annonce texte puis ajouter au plan."
        actions={
          <>
            <button
              className="btn-primary"
              onClick={async () => {
                setLoading(true);
                setErr(null);
                const r = await window.cp.files?.pickMedia?.();
                setLoading(false);
                if (r?.ok) {
                  setInfo("Fichier importe.");
                  refreshFiles();
                }
              }}
              disabled={loading}
            >
              Importer un PDF
            </button>
            <InlineField label="Projeter vers">
              <select value={target} onChange={(e) => setTarget(e.target.value as ScreenKey)}>
                <option value="A">Ecran A</option>
                <option value="B">Ecran B</option>
                <option value="C">Ecran C</option>
              </select>
            </InlineField>
          </>
        }
      />

      {err ? <Alert tone="error">{err}</Alert> : null}
      {info ? <Alert tone="success">{info}</Alert> : null}

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
          <ActionRow className="cp-mt-8">
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
            <button onClick={() => projectText(manualTitle, manualContent)} disabled={!manualContent && !manualTitle}>
              Projeter maintenant
            </button>
          </ActionRow>
        </Panel>

        <Panel>
          <div className="cp-section-label">PDF importes ({pdfs.length})</div>
          <ActionRow className="cp-mb-8">
            <InlineField label="Page">
              <input
                type="number"
                min={1}
                value={pdfPage}
                onChange={(e) => setPdfPage(e.target.value)}
                className="cp-input-narrow"
              />
            </InlineField>
            <InlineField label="Plan">
              <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title || "Culte"} {formatDate(p)}
                  </option>
                ))}
              </select>
            </InlineField>
          </ActionRow>

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
                  <ActionRow>
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
                        setInfo("PDF ajoute au plan");
                      }}
                    >
                      Ajouter au plan
                    </button>
                    <button
                      onClick={() => {
                        const mediaPath = `${f.path}#page=${parseInt(pdfPage || "1", 10) || 1}`;
                        projectPdf(`${f.name} (p.${pdfPage || "1"})`, mediaPath);
                      }}
                    >
                      Projeter
                    </button>
                  </ActionRow>
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
