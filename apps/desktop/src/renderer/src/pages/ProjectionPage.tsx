import React, { useEffect, useState } from "react";

type ProjectionContent = { title?: string; body?: string; mode?: "BLACK" | "WHITE" | "NORMAL" };

export function ProjectionPage() {
  const [content, setContent] = useState<ProjectionContent>({ title: "", body: "", mode: "NORMAL" });
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const off = window.cp.projection.onContent((p: ProjectionContent) => {
      setContent(p);
      setAnimKey((k) => k + 1); // déclenche la transition
    });
    return () => off();
  }, []);

  const mode = content.mode ?? "NORMAL";

  const bg = mode === "BLACK" ? "#000" : mode === "WHITE" ? "#fff" : "#000";
  const fg = mode === "BLACK" ? "#fff" : mode === "WHITE" ? "#000" : "#fff";

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: bg,
        color: fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 64,
        boxSizing: "border-box",
      }}
    >
      <div
        key={animKey}
        style={{
          maxWidth: 1600,
          width: "100%",
          transition: "opacity 120ms ease, transform 120ms ease",
          opacity: 1,
          transform: "translateY(0px)",
          animation: "cpFadeIn 120ms ease",
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 24, opacity: 0.9 }}>
          {content.title}
        </div>
        <div style={{ fontSize: 64, lineHeight: 1.18, fontWeight: 900, whiteSpace: "pre-wrap" }}>
          {content.body}
        </div>
      </div>

      <style>
        {`
          @keyframes cpFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0px); }
          }
        `}
      </style>
    </div>
  );
}
