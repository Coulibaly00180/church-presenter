import React, { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

function TimerDisplay({
  durationSeconds,
  textScale,
  solidColor,
  textFillStyle,
}: {
  durationSeconds: number;
  textScale: number;
  solidColor: string;
  textFillStyle: React.CSSProperties;
}) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const startRef = useRef(Date.now());

  useEffect(() => {
    setRemaining(durationSeconds);
    startRef.current = Date.now();
  }, [durationSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const left = Math.max(0, durationSeconds - elapsed);
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [durationSeconds]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const isUrgent = remaining <= 10 && remaining > 0;
  const isDone = remaining <= 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={cn("font-mono font-black tabular-nums transition-colors", isDone && "opacity-50")}
        style={{
          fontSize: 180 * textScale,
          lineHeight: 1,
          ...(isUrgent ? { color: "#ef4444" } : textFillStyle),
        }}
      >
        {mm}:{ss}
      </div>
      {isDone && (
        <div style={{ fontSize: 36 * textScale, color: solidColor, opacity: 0.7, fontWeight: 700 }}>
          Temps ecoule
        </div>
      )}
    </div>
  );
}

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
  const [logoFailed, setLogoFailed] = useState(false);
  const [runtimeFontFamily, setRuntimeFontFamily] = useState<string | null>(null);

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
  const isTimer = current.kind === "TEXT" && (current.title || "").startsWith("TIMER:");
  const timerTitle = isTimer ? (current.title || "").replace(/^TIMER:/, "") : "";
  const timerDuration = isTimer ? parseInt(current.body || "0", 10) : 0;
  const lowerThird = !!state?.lowerThirdEnabled;
  const textBlocks = useMemo(
    () => String(current.body || "").split(/\n\s*\n/g).map((part) => part.trim()).filter(Boolean),
    [current.body]
  );
  const projectedBody =
    textBlocks.length > 0 ? textBlocks[Math.max(0, Math.min(blockCursor, textBlocks.length - 1))] : String(current.body ?? "");

  const textScale = state?.textScale ?? 1;
  const configuredTextFont = state?.textFont || "system-ui";
  const textFontPath = state?.textFontPath || "";
  const textFont = textFontPath ? (runtimeFontFamily || "system-ui") : configuredTextFont;
  const bgMode = state?.backgroundMode ?? "SOLID";
  const bgSolid = state?.background || "#050505";
  const bgGradientFrom = state?.backgroundGradientFrom || "#2563eb";
  const bgGradientTo = state?.backgroundGradientTo || "#7c3aed";
  const bgGradientAngle = state?.backgroundGradientAngle ?? 135;
  const fgMode = state?.foregroundMode ?? "SOLID";
  const fgSolid = mode === "BLACK" ? "white" : mode === "WHITE" ? "black" : state?.foreground || "white";
  const fgGradientFrom = state?.foregroundGradientFrom || fgSolid;
  const fgGradientTo = state?.foregroundGradientTo || "#93c5fd";
  const bg =
    mode === "BLACK"
      ? "black"
      : mode === "WHITE"
        ? "white"
        : bgMode === "GRADIENT_LINEAR"
          ? `linear-gradient(${bgGradientAngle}deg, ${bgGradientFrom} 0%, ${bgGradientTo} 100%)`
          : bgMode === "GRADIENT_RADIAL"
            ? `radial-gradient(circle at center, ${bgGradientFrom} 0%, ${bgGradientTo} 100%)`
            : bgSolid;
  const textFillStyle: React.CSSProperties =
    mode === "NORMAL" && fgMode === "GRADIENT"
      ? {
          backgroundImage: `linear-gradient(120deg, ${fgGradientFrom} 0%, ${fgGradientTo} 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
        }
      : { color: fgSolid };
  const bgImage = mode === "NORMAL" ? state?.backgroundImage : undefined;
  const logoPath = mode === "NORMAL" ? state?.logoPath : undefined;
  const meta = current.metaSong;
  const metaLine = [meta?.artist, meta?.album, meta?.year].filter(Boolean).join(" - ");
  const overlayTitle = useMemo(() => {
    if (current.kind === "EMPTY") return "";
    if (isTimer) return timerTitle || "Timer";
    const songTitle = (current.metaSong?.title || "").trim();
    const itemTitle = (current.title || "").trim();
    if (songTitle && itemTitle && itemTitle.toLowerCase() !== songTitle.toLowerCase()) {
      return `${songTitle} - ${itemTitle}`;
    }
    return songTitle || itemTitle;
  }, [current.kind, current.metaSong?.title, current.title, isTimer, timerTitle]);

  useEffect(() => {
    setLogoFailed(false);
  }, [logoPath]);

  useEffect(() => {
    let cancelled = false;
    let mountedFace: FontFace | null = null;

    const loadCustomFont = async () => {
      setRuntimeFontFamily(null);
      if (!textFontPath) return;

      const fontName = (configuredTextFont || "CustomFont").replace(/["']/g, "").trim() || "CustomFont";
      const runtimeFamily = `cpfont_${fontName.replace(/\s+/g, "_")}`;
      try {
        const face = new FontFace(runtimeFamily, `url("${toFileUrl(textFontPath)}")`);
        const loaded = await face.load();
        const fontSet = document.fonts as unknown as { add?: (font: FontFace) => void; delete?: (font: FontFace) => void };
        fontSet.add?.(loaded);
        mountedFace = loaded;
        if (!cancelled) setRuntimeFontFamily(`"${runtimeFamily}", system-ui`);
      } catch {
        if (!cancelled) setRuntimeFontFamily(null);
      }
    };

    void loadCustomFont();
    return () => {
      cancelled = true;
      if (mountedFace) {
        const fontSet = document.fonts as unknown as { add?: (font: FontFace) => void; delete?: (font: FontFace) => void };
        fontSet.delete?.(mountedFace);
      }
    };
  }, [textFontPath, configuredTextFont]);

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
    color: fgSolid,
    display: "flex",
    alignItems: lowerThird ? "flex-end" : "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: lowerThird ? "0 4vw 5vh" : "4vh 4vw",
  };

  const cardStyle: React.CSSProperties = {
    width: lowerThird ? "min(96vw,1780px)" : "min(92vw,1780px)",
    maxWidth: 1780,
    textAlign: lowerThird ? "left" : "center",
    fontFamily: textFont,
    padding: lowerThird ? "14px 28px 18px" : "clamp(24px, 4.5vw, 72px) clamp(22px, 4.2vw, 76px)",
    background: lowerThird ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.06)",
    backdropFilter: lowerThird ? "blur(2px)" : undefined,
    borderRadius: lowerThird ? 18 : 24,
  };

  const bodyStyle: React.CSSProperties = {
    fontSize: (lowerThird ? 36 : 60) * textScale,
    fontWeight: 800,
    lineHeight: lowerThird ? 1.14 : 1.2,
    letterSpacing: lowerThird ? "0.01em" : "0.005em",
    textShadow: mode === "WHITE" ? "0 1px 2px rgba(255,255,255,0.2)" : "0 3px 22px rgba(0,0,0,0.45)",
    whiteSpace: "pre-wrap",
    maxWidth: lowerThird ? "90vw" : "88vw",
    margin: "0 auto",
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

      {/* Top overlays: title (left) + logo (right) */}
      {(overlayTitle || logoPath) && (
        <div className="absolute top-6 left-8 right-8 z-[3] pointer-events-none flex items-start justify-between gap-5">
          <div className="min-w-0">
            {overlayTitle && (
              <div
                className="inline-flex max-w-[72vw] truncate rounded-lg border border-white/20 bg-black/55 px-5 py-2.5 font-extrabold tracking-wide text-[clamp(16px,2.1vw,32px)] shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-[2px]"
                style={{ ...textFillStyle, fontFamily: textFont }}
              >
                {overlayTitle}
              </div>
            )}
          </div>
          {logoPath && !logoFailed && (
            <img
              src={toFileUrl(logoPath)}
              alt="Logo"
              className="max-h-[12vh] max-w-[20vw] min-w-[72px] object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.55)]"
              onError={() => setLogoFailed(true)}
            />
          )}
        </div>
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
        <div className="fixed bottom-4 right-5 opacity-35 font-black tracking-widest" style={{ fontFamily: "system-ui" }}>
          SCREEN {screenKey}
        </div>

        {current.kind === "EMPTY" ? (
          <div className="opacity-70 text-4xl">Pret.</div>
        ) : isTimer && timerDuration > 0 ? (
          <>
            <TimerDisplay durationSeconds={timerDuration} textScale={textScale} solidColor={fgSolid} textFillStyle={textFillStyle} />
          </>
        ) : current.kind === "MEDIA" && current.mediaPath ? (
          <>
            {current.mediaType === "PDF" ? (
              pdfImage ? (
                <>
                  <img
                    src={pdfImage}
                    className="w-full max-h-[90vh] object-contain rounded-lg"
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
                <img
                  src={toFileUrl(current.mediaPath)}
                  className="max-w-full max-h-[86vh] object-contain rounded-lg"
                  alt={current.title || "Media"}
                />
              </>
            )}
          </>
        ) : (
          <>
            <div className={cn("mx-auto", lowerThird ? "max-w-[90vw]" : "max-w-[86vw]")} style={{ ...bodyStyle, ...textFillStyle }}>
              {projectedBody}
            </div>
            {metaLine ? (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/62 border border-white/15 text-white px-6 py-3 rounded-full flex items-center gap-3 text-sm font-semibold max-w-[95%] flex-wrap justify-center text-center shadow-[0_6px_18px_rgba(0,0,0,0.4)]">
                <span>{metaLine}</span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
