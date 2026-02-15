import React, { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

function getScreenKey(): "A" | "B" | "C" {
  const hash = window.location.hash || "";
  const q = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(q);
  const key = (params.get("screen") || "A").toUpperCase();
  if (key === "B" || key === "C") return key;
  return "A";
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

function toFileUrl(p?: string) {
  if (!p) return "";
  if (p.startsWith("file://") || p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) return p;
  const [pathOnly, frag] = p.split("#");
  const base =
    pathOnly.startsWith("\\\\")
      ? `file:${pathOnly.replace(/\\/g, "/")}`
      : `file:///${pathOnly.replace(/\\/g, "/")}`;
  return frag ? `${base}#${frag}` : base;
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

  // Live controls: arrows/Q/D + click left/right (skip when PDF to avoid conflict with PDF paging)
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
        setBlockCursor((idx) => Math.min(Math.max(idx + (isNext ? 1 : -1), 0), max));
        return;
      }

      if (isNext) { e.preventDefault(); window.cp.live?.next?.(); }
      if (isPrev) { e.preventDefault(); window.cp.live?.prev?.(); }
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
    if (!window.cp?.projection) return;
    window.cp.projection.getState().then(setState);
    const off = window.cp.projection.onState(setState);
    return () => off();
  }, [screenKey]);

  useEffect(() => {
    setAnimKey((k) => k + 1);
    setBlockCursor(0);
  }, [state?.current?.kind, state?.current?.title, state?.current?.body]);

  const mode = state?.mode ?? "NORMAL";
  const current: CpProjectionCurrent = state?.current ?? { kind: "EMPTY" };
  const isPdf = current.kind === "MEDIA" && current.mediaType === "PDF";
  const lowerThird = !!state?.lowerThirdEnabled;
  const textBlocks = useMemo(
    () => String(current.body || "").split(/\n\s*\n/g).map((part) => part.trim()).filter(Boolean),
    [current.body]
  );
  const projectedBody =
    textBlocks.length > 0 ? textBlocks[Math.max(0, Math.min(blockCursor, textBlocks.length - 1))] : String(current.body ?? "");

  const textScale = state?.textScale ?? 1;
  const bg = mode === "BLACK" ? "black" : mode === "WHITE" ? "white" : state?.background || "#050505";
  const fg = mode === "BLACK" ? "white" : mode === "WHITE" ? "black" : state?.foreground || "white";
  const bgImage = mode === "NORMAL" ? state?.backgroundImage : undefined;

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

  // Render PDF page to image
  useEffect(() => {
    let cancelled = false;
    async function renderPdf() {
      setPdfImage(null);
      setPdfError(null);
      if (!isPdf || !current.mediaPath) return;
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
    return () => { cancelled = true; };
  }, [isPdf, current.mediaPath, pdfPage]);

  // PDF key navigation
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
      className="outline-none"
    >
      {/* Background image */}
      {bgImage && (
        <img
          src={toFileUrl(bgImage)}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0, pointerEvents: "none" }}
        />
      )}

      {/* Click areas for prev/next */}
      <button
        type="button"
        aria-label="Precedent"
        onClick={() => { if (!isPdf) window.cp.live?.prev?.(); }}
        className={cn(
          "absolute top-0 left-0 w-1/2 h-full bg-transparent border-none p-0 m-0 appearance-none cursor-pointer",
          "focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2",
          isPdf && "pointer-events-none cursor-default",
        )}
        disabled={isPdf}
      />
      <button
        type="button"
        aria-label="Suivant"
        onClick={() => { if (!isPdf) window.cp.live?.next?.(); }}
        className={cn(
          "absolute top-0 right-0 w-1/2 h-full bg-transparent border-none p-0 m-0 appearance-none cursor-pointer",
          "focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2",
          isPdf && "pointer-events-none cursor-default",
        )}
        disabled={isPdf}
      />

      <div style={{ ...cardStyle, position: "relative", zIndex: 1 }} key={animKey}>
        {/* Watermark screen ID */}
        <div className="fixed top-5 right-5 opacity-35 font-black tracking-widest" style={{ fontFamily: "system-ui" }}>
          SCREEN {screenKey}
        </div>

        {current.kind === "EMPTY" ? (
          <div className="opacity-70 text-4xl">Pret.</div>
        ) : current.kind === "MEDIA" && current.mediaPath ? (
          <>
            {current.mediaType === "PDF" ? (
              pdfImage ? (
                <>
                  <img
                    src={pdfImage}
                    className="w-full max-h-[92vh] object-contain rounded-lg"
                    alt="PDF"
                  />
                  <div className="absolute bottom-6 right-7 bg-black/60 text-white px-4 py-2 rounded-md font-extrabold text-base">
                    {pdfPage} / {pdfPageCount || "?"}
                  </div>
                </>
              ) : pdfLoading ? (
                <div className="opacity-80">Chargement du PDF...</div>
              ) : pdfError ? (
                <div className="text-red-400">PDF: {pdfError}</div>
              ) : null
            ) : (
              <>
                {current.title ? <div style={titleStyle}>{current.title}</div> : null}
                <img
                  src={toFileUrl(current.mediaPath)}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  alt={current.title || "Media"}
                />
              </>
            )}
          </>
        ) : (
          <>
            <div style={bodyStyle}>{projectedBody}</div>
            {(current.metaSong || current.title) ? (
              <div className="absolute bottom-9 left-1/2 -translate-x-1/2 bg-black/60 text-white px-6 py-3 rounded-full flex items-center gap-3 text-sm font-semibold max-w-[95%] flex-wrap justify-center text-center">
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
