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

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function ProjectionPage() {
  const screenKey = useMemo(() => getScreenKey(), []);
  const [state, setState] = useState<CpProjectionState | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [pdfImage, setPdfImage] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [pdfPageCount, setPdfPageCount] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<{ path: string; doc: pdfjsLib.PDFDocumentProxy } | null>(null);
  const [blockCursor, setBlockCursor] = useState<number>(0);

  function getErrorMessage(err: unknown) {
    if (err instanceof Error) return err.message;
    return String(err);
  }

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

  // Live controls from projection window: arrows/Q/D + click left/right (skip when PDF to avoid conflict with PDF paging)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isPdf = state?.current?.mediaType === "PDF";
      if (isPdf) return;
      const isText = state?.current?.kind === "TEXT";
      const isNext = e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown" || e.key === " " || e.key.toLowerCase() === "d";
      const isPrev = e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp" || e.key.toLowerCase() === "q";

      if (isText && (isNext || isPrev)) {
        e.preventDefault();
        const parts = String(state?.current?.body || "")
          .split(/\n\s*\n/g)
          .map((part: string) => part.trim())
          .filter(Boolean);
        const max = Math.max(parts.length - 1, 0);
        setBlockCursor((idx) => {
          const next = Math.min(Math.max(idx + (isNext ? 1 : -1), 0), max);
          return next;
        });
        return;
      }

      if (isNext) {
        e.preventDefault();
        window.cp.live?.next?.();
      }
      if (isPrev) {
        e.preventDefault();
        window.cp.live?.prev?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state?.current?.kind, state?.current?.mediaType, state?.current?.body]);

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
    setBlockCursor(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.current?.kind, state?.current?.title, state?.current?.body]);

  const mode = state?.mode ?? "NORMAL";
  const current: CpProjectionCurrent = state?.current ?? { kind: "EMPTY" };
  const isPdf = current.kind === "MEDIA" && current.mediaType === "PDF";
  const lowerThird = !!state?.lowerThirdEnabled;
  const textBlocks = useMemo(
    () =>
      String(current.body || "")
        .split(/\n\s*\n/g)
        .map((part) => part.trim())
        .filter(Boolean),
    [current.body]
  );
  const projectedBody =
    textBlocks.length > 0 ? textBlocks[Math.max(0, Math.min(blockCursor, textBlocks.length - 1))] : String(current.body ?? "");

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
      if (!isPdf || !current.mediaPath) {
        return;
      }
      setPdfLoading(true);
      try {
        const [pathOnly, frag] = current.mediaPath.split("#");
        const pageParam = frag?.match(/page=(\d+)/i);
        const initialPage = pageParam ? parseInt(pageParam[1], 10) || 1 : 1;
        const targetPage = pdfPage || initialPage;
        const cachedPdf = pdfDocRef.current;
        let pdf: pdfjsLib.PDFDocumentProxy | null = cachedPdf && cachedPdf.path === pathOnly ? cachedPdf.doc : null;
        if (!pdf) {
          const url = toFileUrl(pathOnly);
          pdf = await pdfjsLib.getDocument(url).promise;
          pdfDocRef.current = { path: pathOnly, doc: pdf };
        }
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
      } catch (e: unknown) {
        if (!cancelled) setPdfError(getErrorMessage(e));
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    }
    renderPdf();
    return () => {
      cancelled = true;
    };
  }, [isPdf, current.mediaPath, pdfPage]);

  // Global key navigation for PDF (single handler to avoid duplicate page jumps)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isPdf) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setPdfPage((p) => Math.min(p + 1, pdfPageCount || 1));
      }
      if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setPdfPage((p) => Math.max(p - 1, 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPdf, pdfPageCount]);

  // Clamp when page count changes
  useEffect(() => {
    if (pdfPage > pdfPageCount) setPdfPage(pdfPageCount || 1);
  }, [pdfPageCount, pdfPage]);

  const containerStyle: React.CSSProperties = {
    position: "relative",
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
      style={containerStyle}
      onWheel={(e) => {
        if (isPdf) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? 1 : -1;
          setPdfPage((p) => Math.min(Math.max(p + delta, 1), pdfPageCount || 1));
        }
      }}
      tabIndex={0}
    >
      {/* click areas */}
      <button
        type="button"
        aria-label="Precedent"
        onClick={() => {
          if (!isPdf) window.cp.live?.prev?.();
        }}
        className={cls("cp-projection-click", "cp-projection-click-btn", "cp-projection-click--left", isPdf && "is-disabled")}
        disabled={isPdf}
      />
      <button
        type="button"
        aria-label="Suivant"
        onClick={() => {
          if (!isPdf) window.cp.live?.next?.();
        }}
        className={cls("cp-projection-click", "cp-projection-click-btn", "cp-projection-click--right", isPdf && "is-disabled")}
        disabled={isPdf}
      />
      <div style={cardStyle} key={animKey}>
        {/* watermark screen id */}
        <div className="cp-projection-watermark">
          SCREEN {screenKey}
        </div>

        {current.kind === "EMPTY" ? (
          <div className="cp-projection-empty">Pret.</div>
        ) : current.kind === "MEDIA" && current.mediaPath ? (
          <>
            {/* Pas de titre pour les PDF, seulement l'image rendue */}
            {current.mediaType === "PDF" ? (
              pdfImage ? (
                <>
                  <img
                    src={pdfImage}
                    className="cp-projection-pdf-image"
                  />
                  <div className="cp-projection-page-indicator">
                    {pdfPage} / {pdfPageCount || "?"}
                  </div>
                </>
              ) : pdfLoading ? (
                <div className="cp-muted-80">Chargement du PDF...</div>
              ) : pdfError ? (
                <div className="cp-error-pdf">PDF: {pdfError}</div>
              ) : null
            ) : (
              <>
                {current.title ? <div style={titleStyle}>{current.title}</div> : null}
                <img
                  src={toFileUrl(current.mediaPath)}
                  className="cp-projection-media-image"
                />
              </>
            )}
          </>
        ) : (
          <>
            <div style={bodyStyle}>{projectedBody}</div>
            {(current.metaSong || current.title) ? (
              <div className="cp-projection-meta-badge">
                <span>{current.metaSong?.title || current.title || "Chant"}</span>
                {current.metaSong?.artist ? <span>• {current.metaSong.artist}</span> : null}
                {current.metaSong?.album ? <span>• {current.metaSong.album}</span> : null}
                {current.metaSong?.year ? <span>• {current.metaSong.year}</span> : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}




