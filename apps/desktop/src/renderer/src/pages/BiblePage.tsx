import React, { useEffect, useMemo, useState } from "react";
import { lookupLSG1910 } from "../bible/lookupLSG1910";

type ScreenKey = "A" | "B" | "C";

type BibleApiVerse = { book_id?: string; book_name?: string; chapter: number; verse: number; text: string };
type BibleApiResp = { reference?: string; verses?: BibleApiVerse[]; text?: string; translation_id?: string; translation_name?: string };

function parseLines(verses: { chapter: number; verse: number; text: string }[]) {
  return verses.map((v) => ({
    key: `${v.chapter}:${v.verse}`,
    label: `${v.chapter}:${v.verse}`,
    text: (v.text || "").trim(),
  }));
}

function versesToBody(verses: BibleApiVerse[], fallbackText?: string) {
  if (!verses?.length) return (fallbackText || "").trim();
  return verses.map((v) => `${v.chapter}:${v.verse}  ${v.text.trim()}`).join("\n\n");
}

async function projectTextToTarget(target: ScreenKey, title: string | undefined, body: string) {
  const screensApi = window.cp.screens;
  const list = screensApi ? await screensApi.list() : [];
  const meta = list.find((s: any) => s.key === target);

  if (target === "A") {
    await window.cp.projectionWindow.open();
  } else if (!meta?.isOpen && screensApi) {
    await screensApi.open(target);
  }

  const isMirrorA = target !== "A" && meta?.mirror?.kind === "MIRROR" && meta.mirror.from === "A";
  const dest = isMirrorA ? "A" : target;

  if (dest === "A" || !screensApi) {
    await window.cp.projection.setContentText({ title, body });
    return;
  }

  const res: any = await screensApi.setContentText(dest, { title, body });
  if (res?.ok === false && res?.reason === "MIRROR") {
    await window.cp.projection.setContentText({ title, body });
  }
}

export function BiblePage() {
  const [ref, setRef] = useState("Jean 3:16-18");
  const [translation, setTranslation] = useState<"LSG1910" | "WEB">("LSG1910");
  const [addMode, setAddMode] = useState<"PASSAGE" | "VERSES">("VERSES");
  const [target, setTarget] = useState<ScreenKey>("A");

  const [plans, setPlans] = useState<any[]>([]);
  const [planId, setPlanId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resp, setResp] = useState<BibleApiResp | null>(null);

  const lines = useMemo(() => (resp?.verses ? parseLines(resp.verses) : []), [resp]);

  useEffect(() => {
    (async () => {
      try {
        const ps = await window.cp.plans.list();
        setPlans(ps || []);
        if (ps?.length) setPlanId(ps[0].id);
      } catch (e) {
        // ignore if plans API not ready
      }
    })();
  }, []);

  async function fetchPassage() {
    setLoading(true);
    setErr(null);
    setResp(null);

    try {
      if (translation === "LSG1910") {
        const r = lookupLSG1910(ref.trim());
        if (!r) throw new Error("Pas trouve dans le dataset offline (mini).");
        setResp({
          reference: r.reference,
          translation_id: "LSG1910",
          translation_name: "Louis Segond 1910 (offline)",
          verses: r.verses.map((v) => ({ chapter: v.chapter, verse: v.verse, text: v.text })),
        });
        return;
      }

      const q = encodeURIComponent(ref.trim());
      const url = `https://bible-api.com/${q}?translation=web`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = (await r.json()) as BibleApiResp;
      if (!json.verses?.length && !json.text) throw new Error("Aucun resultat.");
      setResp(json);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function addToPlan() {
    if (!planId) {
      setErr("Choisis d'abord un plan.");
      return;
    }
    if (!resp) {
      setErr("Fais d'abord une recherche.");
      return;
    }

    const reference = resp.reference || ref.trim();
    const label = translation === "LSG1910" ? "LSG1910" : resp.translation_id || "WEB";
    const verses = resp.verses || [];

    if (addMode === "PASSAGE" || !verses.length) {
      const body = versesToBody(verses, resp.text);
      await window.cp.plans.addItem({
        planId,
        kind: "BIBLE_PASSAGE",
        title: `${reference} (${label})`,
        content: body,
        refId: reference,
        refSubId: label,
      });
      return;
    }

    for (const v of verses) {
      const verseRef = `${reference.split(":")[0]}:${v.verse}`;
      const body = `${v.chapter}:${v.verse}  ${String(v.text || "").trim()}`;
      await window.cp.plans.addItem({
        planId,
        kind: "BIBLE_VERSE",
        title: `${verseRef} (${label})`,
        content: body,
        refId: reference,
        refSubId: `${v.chapter}:${v.verse}`,
      });
    }
  }

  async function projectNow() {
    if (!resp) {
      setErr("Fais d'abord une recherche.");
      return;
    }
    const reference = resp.reference || ref.trim();
    const label = translation === "LSG1910" ? "LSG1910" : resp.translation_id || "WEB";
    const body = versesToBody(resp.verses || [], resp.text);
    await projectTextToTarget(target, `${reference} (${label})`, body);
  }

  return (
    <div style={{ padding: 18, maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Bible</h1>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            Cherche un passage puis ajoute-le au plan ou projette-le directement.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Traduction
            <select value={translation} onChange={(e) => setTranslation(e.target.value as any)}>
              <option value="LSG1910">LSG 1910 (offline)</option>
              <option value="WEB">WEB (API)</option>
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Mode ajout
            <select value={addMode} onChange={(e) => setAddMode(e.target.value as "PASSAGE" | "VERSES")}>
              <option value="PASSAGE">Passage (1 item)</option>
              <option value="VERSES">Verset par verset</option>
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Projeter vers
            <select value={target} onChange={(e) => setTarget(e.target.value as ScreenKey)}>
              <option value="A">Ecran A</option>
              <option value="B">Ecran B</option>
              <option value="C">Ecran C</option>
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Plan
            <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {String(p.date || p.title || p.id)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 10, border: "1px solid #eee", padding: 12, borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="Ex: Jean 3:16-18"
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", minWidth: 260, flex: "1 1 260px" }}
          />

          <button
            onClick={fetchPassage}
            disabled={loading}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "white", fontWeight: 800 }}
          >
            {loading ? "Recherche..." : "Rechercher"}
          </button>

          <button
            onClick={addToPlan}
            disabled={!resp || !planId}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e6e6e6", background: "white", fontWeight: 800 }}
          >
            Ajouter au plan
          </button>

          <button
            onClick={projectNow}
            disabled={!resp}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e6e6e6", background: "white", fontWeight: 800 }}
          >
            Projeter maintenant
          </button>
        </div>

        {err ? <div style={{ color: "#b00020", fontWeight: 700 }}>Erreur : {err}</div> : null}

        {resp ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>
              {resp.reference || ref}{" "}
              <span style={{ opacity: 0.6, fontWeight: 700 }}>
                ({(resp.translation_name || resp.translation_id || translation).toString()})
              </span>
            </div>

            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 14,
                background: "#fafafa",
                whiteSpace: "pre-wrap",
                lineHeight: 1.45,
              }}
            >
              {lines.length ? lines.map((l) => `${l.label}  ${l.text}`).join("\n\n") : (resp.text || "").trim()}
            </div>

            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Mode "Verses" ajoute un item par verset pour une navigation live fluide. Le mode "Passage" ajoute un seul bloc.
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Exemple : <b>Jean 3:16-18</b>, <b>Psaume 23</b>.
          </div>
        )}
      </div>
    </div>
  );
}
