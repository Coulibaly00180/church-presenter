import React, { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

function getScreenKey(): "A" | "B" | "C" {
  // HashRouter: "#/projection?screen=B"
  const hash = window.location.hash || "";
  const q = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(q);
  const key = (params.get("screen") || "A").toUpperCase();
  if (key === "B" || key === "C") return key;
  return "A";
}

export function ProjectionPage() {
  const screenKey = useMemo(() => getScreenKey(), []);
  const [state, setState] = useState<any>(null);
  const [animKey, setAnimKey] = useState(0);
  const [pdfImage, setPdfImage] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [pdfPageCount, setPdfPageCount] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  function toFileUrl(p?: string) {
    if (!p) return "";
    if (p.startsWith("file://") || p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) return p;
    // preserve #fragment (used for page selection)
    const [pathOnly, frag] = p.split("#");
    const base =
      pathOnly.startsWith("\\\\") // UNC
        ? `file:${pathOnly.replace(/\\/g, "/")}`
        : `file:///${pathOnly.replace(/\\/g, "/")}`;
    return frag ? `${base}#${frag}` : base;
  }


  // Live controls from projection window: arrows + click left/right
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        window.cp.live?.next?.();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        window.cp.live?.prev?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screenKey]);

  useEffect(() => {
    const hasScreens = !!window.cp?.screens?.getState && !!window.cp?.screens?.onState;

    if (hasScreens) {
      window.cp.screens.getState(screenKey).then(setState);
      const off = window.cp.screens.onState(screenKey, setState);
      return () => off();
    }

    // fallback legacy
    if (!window.cp?.projection) {
      console.error("window.cp.projection not available (preload not loaded?)");
      return;
    }
    window.cp.projection.getState().then(setState);
    const off = window.cp.projection.onState(setState);
    return () => off();
  }, [screenKey]);

  // Declenche une transition douce a chaque changement de "current"
  useEffect(() => {
    setAnimKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.current?.kind, state?.current?.title, state?.current?.body]);

  const mode = state?.mode ?? "NORMAL";
  const current = state?.current ?? { kind: "EMPTY" };
  const lowerThird = !!state?.lowerThirdEnabled;

  const textScale = state?.textScale ?? 1;
  const bg = mode === "BLACK" ? "black" : mode === "WHITE" ? "white" : state?.background || "#050505";
  const fg = mode === "BLACK" ? "white" : mode === "WHITE" ? "black" : state?.foreground || "white";

  // Reset page when media changes
  useEffect(() => {
    if (current.kind === "MEDIA" && current.mediaType === "PDF" && current.mediaPath) {
      const [, frag] = current.mediaPath.split("#");
      const m = frag?.match(/page=(\d+)/i);
      const p = m ? parseInt(m[1], 10) || 1 : 1;
      setPdfPage(Math.max(1, p));
      setTimeout(() => containerRef.current?.focus(), 30);
    } else {
      setPdfPage(1);
    }
  }, [current.kind, current.mediaType, current.mediaPath]);

  // Render PDF page to image for clean display (no viewer UI)
  useEffect(() => {
    let cancelled = false;
    async function renderPdf() {
      setPdfImage(null);
      setPdfError(null);
      if (current.kind !== "MEDIA" || current.mediaType !== "PDF" || !current.mediaPath) {
        return;
      }
      setPdfLoading(true);
      try {
        const [pathOnly, frag] = current.mediaPath.split("#");
        const pageParam = frag?.match(/page=(\d+)/i);
        const initialPage = pageParam ? parseInt(pageParam[1], 10) || 1 : 1;
        const targetPage = pdfPage || initialPage;
        const url = toFileUrl(pathOnly);
        const pdf = await pdfjsLib.getDocument(url).promise;
        setPdfPageCount(pdf.numPages);
        const page = await pdf.getPage(Math.min(targetPage, pdf.numPages));
        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = Math.max(window.innerWidth * 0.95, 1400);
        const scale = Math.min(4, Math.max(1.5, targetWidth / baseViewport.width));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context non disponible");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setPdfImage(canvas.toDataURL("image/png"));
      } catch (e: any) {
        if (!cancelled) setPdfError(e?.message || String(e));
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    }
    renderPdf();
    return () => {
      cancelled = true;
    };
  }, [current.kind, current.mediaType, current.mediaPath, pdfPage]);

  // Global key navigation in case container loses focus (haut/bas seulement, gauche/droite gérés sur le container)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (current.mediaType !== "PDF") return;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        setPdfPage((p) => Math.min(p + 1, pdfPageCount || 1));
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setPdfPage((p) => Math.max(p - 1, 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current.mediaType, pdfPageCount]);

  // Clamp when page count changes
  useEffect(() => {
    if (pdfPage > pdfPageCount) setPdfPage(pdfPageCount || 1);
  }, [pdfPageCount, pdfPage]);

  const containerStyle: React.CSSProperties = {
    width: "100vw",
    height: "100vh",
    background: bg,
    color: fg,
    display: "flex",
    alignItems: lowerThird ? "flex-end" : "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingBottom: lowerThird ? "6vh" : 0,
  };

  const cardStyle: React.CSSProperties = {
    width: "92%",
    maxWidth: 1600,
    textAlign: lowerThird ? "left" : "center",
    fontFamily: "system-ui",
    padding: lowerThird ? "10px 24px 12px" : 24,
    background: lowerThird ? "rgba(0,0,0,0.35)" : "transparent",
    borderRadius: lowerThird ? 16 : 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: (lowerThird ? 32 : 46) * textScale,
    fontWeight: 900,
    marginBottom: lowerThird ? 8 : 18,
    letterSpacing: -0.5,
  };

  const bodyStyle: React.CSSProperties = {
    fontSize: (lowerThird ? 40 : 56) * textScale,
    fontWeight: 800,
    lineHeight: lowerThird ? 1.1 : 1.15,
    whiteSpace: "pre-wrap",
  };

  return (
    <div
      ref={containerRef}
      style={{ ...containerStyle, position: "relative" }}
      onWheel={(e) => {
        if (current.mediaType === "PDF") {
          e.preventDefault();
          setPdfPage((p) => Math.min(Math.max(p + (e.deltaY > 0 ? 1 : -1), 1), pdfPageCount || 1));
        }
      }}
      onKeyDown={(e) => {
        if (current.mediaType === "PDF") {
          if (e.key === "ArrowDown" || e.key === "PageDown") {
            e.preventDefault();
            setPdfPage((p) => Math.min(p + 1, pdfPageCount || 1));
          }
          if (e.key === "ArrowUp" || e.key === "PageUp") {
            e.preventDefault();
            setPdfPage((p) => Math.max(p - 1, 1));
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            setPdfPage((p) => Math.min(p + 1, pdfPageCount || 1));
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setPdfPage((p) => Math.max(p - 1, 1));
          }
        }
      }}
      tabIndex={0}
    >
      {/* click areas */}
      <div
        onClick={() => window.cp.live?.prev?.()}
        style={{ position: "absolute", left: 0, top: 0, width: "50%", height: "100%", cursor: "pointer" }}
      />
      <div
        onClick={() => window.cp.live?.next?.()}
        style={{ position: "absolute", right: 0, top: 0, width: "50%", height: "100%", cursor: "pointer" }}
      />
      <div style={cardStyle} key={animKey}>
        {/* watermark screen id */}
        <div
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            opacity: 0.35,
            fontFamily: "system-ui",
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          SCREEN {screenKey}
        </div>

        {current.kind === "EMPTY" ? (
          <div style={{ opacity: 0.7, fontSize: 28 }}>Pret.</div>
        ) : current.kind === "MEDIA" && current.mediaPath ? (
          <>
            {/* Pas de titre pour les PDF, seulement l'image rendue */}
            {current.mediaType === "PDF" ? (
              pdfImage ? (
                <>
                  <img
                    src={pdfImage}
                    style={{ width: "100%", maxHeight: "92vh", objectFit: "contain", borderRadius: 12 }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 14,
                      right: 16,
                      background: "rgba(0,0,0,0.55)",
                      color: "white",
                      padding: "6px 10px",
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    {pdfPage} / {pdfPageCount || "?"}
                  </div>
                </>
              ) : pdfLoading ? (
                <div style={{ opacity: 0.8 }}>Chargement du PDF...</div>
              ) : pdfError ? (
                <div style={{ color: "#f87171" }}>PDF: {pdfError}</div>
              ) : null
            ) : (
              <>
                {current.title ? <div style={titleStyle}>{current.title}</div> : null}
                <img
                  src={toFileUrl(current.mediaPath)}
                  style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 12 }}
                />
              </>
            )}
          </>
        ) : (
          <>
            {current.title ? <div style={titleStyle}>{current.title}</div> : null}
            <div style={bodyStyle}>{current.body ?? ""}</div>
          </>
        )}
      </div>
    </div>
  );
}
