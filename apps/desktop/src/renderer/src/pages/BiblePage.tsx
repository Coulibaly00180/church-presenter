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

async function ensureScreenOpen(target: ScreenKey) {
  if (target === "A") {
    await window.cp.projectionWindow.open();
    return;
  }
  const screens = await window.cp.screens.list();
  const meta = screens.find((s: any) => s.key === target);
  if (!meta?.isOpen) {
    await window.cp.screens.open(target);
  }
}

async function projectText(target: ScreenKey, title: string | undefined, body: string) {
  await ensureScreenOpen(target);

  // Prefer multiscreen API
  if (window.cp?.screens?.setContentText) {
    await window.cp.screens.setContentText(target, { title, body });
    return;
  }

  // fallback
  await window.cp.projection.setContentText({ title, body });
}

export function BiblePage() {
  const [ref, setRef] = useState("Jean 3:16-18");

  // translation ids:
  // - LSG1910 = offline dataset (mini for now)
  // - WEB = bible-api.com (no key)
  const [translation, setTranslation] = useState<"LSG1910" | "WEB">("LSG1910");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resp, setResp] = useState<BibleApiResp | null>(null);

  const [plans, setPlans] = useState<any[]>([]);
  const [addMode, setAddMode] = useState<"PASSAGE" | "VERSES">("VERSES");
  const [planId, setPlanId] = useState<string>("");
  const [target, setTarget] = useState<ScreenKey>("A");

  const lines = useMemo(() => (resp?.verses ? parseLines(resp.verses) : []), [resp]);

  useEffect(() => {
    (async () => {
      try {
        const ps = await window.cp.plans.list();
        setPlans(ps || []);
        if (!planId && ps?.length) setPlanId(ps[0].id);
      } catch (e: any) {
        console.warn("plans.list failed", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchPassage() {
    setLoading(true);
    setErr(null);
    setResp(null);

    try {
      if (translation === "LSG1910") {
        const r = lookupLSG1910(ref.trim());
        if (!r) throw new Error("Pas trouvé dans le dataset offline (mini).");
        setResp({
          reference: r.reference,
          translation_id: "LSG1910",
          translation_name: "Louis Segond 1910 (offline)",
          verses: r.verses.map((v) => ({ chapter: v.chapter, verse: v.verse, text: v.text })),
        });
        return;
      }

      // WEB via bible-api.com
      const q = encodeURIComponent(ref.trim());
      const url = `https://bible-api.com/${q}?translation=web`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = (await r.json()) as BibleApiResp;
      if (!json.verses?.length && !json.text) throw new Error("Aucun résultat.");
      setResp(json);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function addToPlan() {
  if (!planId) {
    setErr("Choisis d’abord un plan.");
    return;
  }
  if (!resp) {
    setErr("Fais d’abord une recherche.");
    return;
  }

  const reference = resp.reference || ref.trim();
  const tLabel = translation === "LSG1910" ? "LSG1910" : (resp.translation_id || "WEB");

  const api: any = window.cp.plans as any;

  // Helper: add a single item (supports addItem or setItems fallback)
  async function addOne(item: any) {
    if (api.addItem) {
      await api.addItem({ planId, item });
      return;
    }
    const p = await api.get(planId);
    const items = Array.isArray(p?.items) ? p.items.slice() : [];
    items.push(item);
    await api.setItems({ id: planId, items });
  }

  if (addMode === "PASSAGE") {
    // Cache : on stocke le texte complet dans l’item
    const body = resp.verses?.length
      ? resp.verses.map((v) => `${v.chapter}:${v.verse}  ${v.text.trim()}`).join("\n\n")
      : (resp.text || "").trim();

    const item = {
      kind: "BIBLE_PASSAGE",
      reference,
      translation: tLabel,
      title: `${reference} (${tLabel})`,
      body,
      verses: resp.verses || [],
      createdAt: new Date().toISOString(),
    };

    await addOne(item);
    return;
  }

  // VERSES: on éclate en items (navigation live = plus fluide)
  const verses = resp.verses || [];
  if (!verses.length) {
    setErr("Ce passage ne contient pas de versets structurés (utilise 'Passage (1 item)').");
    return;
  }

  for (const v of verses) {
    const verseRef = `${reference.split(":")[0]}:${v.verse}`;
    const body = `${v.chapter}:${v.verse}  ${String(v.text || "").trim()}`;
    const item = {
      kind: "BIBLE_VERSE",
      reference: verseRef,
      translation: tLabel,
      title: `${verseRef} (${tLabel})`,
      body,
      verses: [v],
      createdAt: new Date().toISOString(),
    };
    await addOne(item);
  }
}
    if (!resp) {
      setErr("Fais d’abord une recherche.");
      return;
    }

    const reference = resp.reference || ref.trim();
    const tLabel = translation === "LSG1910" ? "LSG1910" : (resp.translation_id || "WEB");

    // Cache : on stocke le texte dans l’item pour être robuste en live (pas d’API nécessaire).
    const body = resp.verses?.length
      ? resp.verses.map((v) => `${v.chapter}:${v.verse}  ${v.text.trim()}`).join("\n\n")
      : (resp.text || "").trim();

    const item = {
      kind: "BIBLE_PASSAGE",
      reference,
      translation: tLabel,
      title: `${reference} (${tLabel})`,
      body,
      verses: resp.verses || [],
      createdAt: new Date().toISOString(),
    };

    const api: any = window.cp.plans as any;
    if (api.addItem) {
      await api.addItem({ planId, item });
    } else {
      const p = await api.get(planId);
      const items = Array.isArray(p?.items) ? p.items.slice() : [];
      items.push(item);
      await api.setItems({ id: planId, items });
    }
  }

  async function projectNow() {
    if (!resp) {
      setErr("Fais d’abord une recherche.");
      return;
    }

    const reference = resp.reference || ref.trim();
    const tLabel = translation === "LSG1910" ? "LSG1910" : (resp.translation_id || "WEB");

    const body = resp.verses?.length
      ? resp.verses.map((v) => `${v.chapter}:${v.verse}  ${v.text.trim()}`).join("\n\n")
      : (resp.text || "").trim();

    // ✅ On inclut la traduction dans le titre projeté (demande)
    await projectText(target, `${reference} (${tLabel})`, body);
  }

  return (
    <div style={{ padding: 18, maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Bible</h1>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            Cherche un passage puis <b>ajoute au plan</b> (cache) ou <b>projette</b>.
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
            Projeter vers
            <select value={target} onChange={(e) => setTarget(e.target.value as ScreenKey)}>
              <option value="A">Écran A</option>
              <option value="B">Écran B</option>
              <option value="C">Écran C</option>
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
            disabled={!resp}
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

            {translation === "LSG1910" ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Offline: dataset <b>mini</b> pour test. Astuce: “Verset par verset” = navigation live super fluide. Prochaine étape: importer le dataset complet LSG1910.
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Online: bible-api.com (pas de clé). Pour traductions FR sous licence, on passera par un provider autorisé.
              </div>
            )}
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
