import React from "react";
import type { BollsBook, BollsVerse } from "../../bible/bollsApi";
import { InlineField, Panel } from "../../ui/primitives";
import { cls } from "../../ui/cls";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, "").trim();
}

function verseKey(v: BollsVerse) {
  return `${v.book}-${v.chapter}-${v.verse}`;
}

type VersePanelProps = {
  currentBook: BollsBook | undefined;
  referenceLabel: string;
  activeTranslation: string;
  verses: BollsVerse[];
  selectedVerses: Set<number>;
  onToggleVerse: (n: number) => void;
  addMode: "PASSAGE" | "VERSES";
  onSetAddMode: (mode: "PASSAGE" | "VERSES") => void;
  onProjectNow: () => void;
  onAddToPlan: () => void;
  planId: string;
};

export function VersePanel({
  currentBook, referenceLabel, activeTranslation,
  verses, selectedVerses, onToggleVerse,
  addMode, onSetAddMode, onProjectNow, onAddToPlan, planId,
}: VersePanelProps) {
  return (
    <Panel>
      <div className="cp-panel-header-split">
        <div>
          <div className="cp-title-strong">{currentBook?.name ?? "\u2014"}</div>
          <div className="cp-muted">{referenceLabel} ({activeTranslation})</div>
        </div>
        <div className="cp-actions">
          <InlineField label="Mode ajout">
            <select value={addMode} onChange={(e) => onSetAddMode(e.target.value === "PASSAGE" ? "PASSAGE" : "VERSES")}>
              <option value="PASSAGE">Passage</option>
              <option value="VERSES">Verset par verset</option>
            </select>
          </InlineField>
          <button onClick={onProjectNow} disabled={!verses.length}>Projeter</button>
          <button onClick={onAddToPlan} disabled={!verses.length || !planId}>Ajouter au plan</button>
        </div>
      </div>

      <div className="cp-verse-list">
        {verses.map((v) => (
          <label
            key={verseKey(v)}
            className={cls("cp-verse-card", selectedVerses.has(v.verse) && "is-selected")}
          >
            <div className="cp-verse-head">
              <input type="checkbox" checked={selectedVerses.has(v.verse)} onChange={() => onToggleVerse(v.verse)} />
              <b>{v.chapter}:{v.verse}</b>
            </div>
            <div className="cp-verse-text">{stripHtml(v.text)}</div>
          </label>
        ))}
        {!verses.length ? <div className="cp-muted">Charge un chapitre pour voir les versets.</div> : null}
      </div>

      <div className="cp-help-text">
        Passage = un seul item avec tout le texte. Verset par verset = un item par verset pour faciliter la navigation live.
      </div>
    </Panel>
  );
}
