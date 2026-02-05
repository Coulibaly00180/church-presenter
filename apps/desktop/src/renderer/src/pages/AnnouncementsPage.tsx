import React, { useEffect, useMemo, useState } from "react";

type MediaItem = { name: string; path: string; mediaType: "PDF" | "IMAGE" };
type PlanListItem = { id: string; title?: string | null; date?: string | Date };

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
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const panelStyle: React.CSSProperties = {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "var(--shadow)",
  };

  async function refreshFiles() {
    const res = await window.cp.files?.listMedia?.();
    if (res?.ok) setFiles(res.files || []);
  }

  async function refreshPlans() {
    try {
      const list = await window.cp.plans.list();
      setPlans(list || []);
      if (list?.length) setPlanId(list[0].id);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    refreshFiles();
    refreshPlans();
  }, []);

  const pdfs = useMemo(() => files.filter((f) => f.mediaType === "PDF"), [files]);

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Annonces</h1>
          <div style={{ opacity: 0.7 }}>Importer des PDF ou saisir une annonce texte puis ajouter au plan.</div>
        </div>
        <button
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
      </div>

      {err ? <div style={{ ...panelStyle, background: "#fef2f2", borderColor: "#fecdd3" }}>{err}</div> : null}
      {info ? <div style={{ ...panelStyle, background: "#ecfdf3", borderColor: "#bbf7d0" }}>{info}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 12, alignItems: "start" }}>
        <div style={panelStyle}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Annonce texte</div>
          <label>
            Titre
            <input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} style={{ width: "100%" }} />
          </label>
          <label>
            Contenu
            <textarea value={manualContent} onChange={(e) => setManualContent(e.target.value)} rows={6} style={{ width: "100%" }} />
          </label>
          <label>
            Plan
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} style={{ width: "100%" }}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || "Culte"} {formatDate(p)}
                </option>
              ))}
            </select>
          </label>
          <button
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
            style={{ marginTop: 8 }}
          >
            Ajouter au plan
          </button>
        </div>

        <div style={panelStyle}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>PDF importes ({pdfs.length})</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              Page
              <input type="number" min={1} value={pdfPage} onChange={(e) => setPdfPage(e.target.value)} style={{ width: 80 }} />
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              Plan
              <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title || "Culte"} {formatDate(p)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ maxHeight: "65vh", overflow: "auto", display: "grid", gap: 8 }}>
            {pdfs.map((f) => (
              <div
                key={f.path}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{f.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{f.mediaType}</div>
                </div>
                <button
                  onClick={async () => {
                    if (!planId) return;
                    const mediaPath = `${f.path}#page=${parseInt(pdfPage || "1", 10) || 1}`;
                    await window.cp.plans.addItem({
                      planId,
                      kind: "ANNOUNCEMENT_PDF",
                      title: f.name,
                      mediaPath,
                    });
                    setInfo("PDF ajoute au plan");
                  }}
                >
                  Ajouter au plan
                </button>
              </div>
            ))}
            {pdfs.length === 0 ? <div style={{ opacity: 0.6 }}>Aucun PDF importe pour le moment.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
