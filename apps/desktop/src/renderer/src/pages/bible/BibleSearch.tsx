import React from "react";
import type { BollsVerse } from "../../bible/bollsApi";
import { Panel } from "../../ui/primitives";

function verseKey(v: BollsVerse) {
  return `${v.book}-${v.chapter}-${v.verse}`;
}

type BibleSearchProps = {
  searchText: string;
  onSetSearchText: (v: string) => void;
  searchResults: BollsVerse[];
  searchLoading: boolean;
  onJumpToResult: (v: BollsVerse) => void;
};

export function BibleSearch({ searchText, onSetSearchText, searchResults, searchLoading, onJumpToResult }: BibleSearchProps) {
  return (
    <Panel>
      <div className="cp-section-label cp-mb-6">Recherche texte (API bolls)</div>
      <input
        value={searchText}
        onChange={(e) => onSetSearchText(e.target.value)}
        placeholder="mot ou expression"
        className="cp-input-full"
      />
      {searchLoading ? <div className="cp-muted">Recherche...</div> : null}
      <div className="cp-bible-search-list">
        {searchResults.map((r) => (
          <button
            key={verseKey(r)}
            onClick={() => onJumpToResult(r)}
            className="cp-search-result-btn"
          >
            <b>Livre {r.book} {r.chapter}:{r.verse}</b>
            <div className="cp-search-result-text">{r.text}</div>
          </button>
        ))}
        {searchText && !searchResults.length && !searchLoading ? (
          <div className="cp-help-text-muted">Aucun resultat.</div>
        ) : null}
      </div>
    </Panel>
  );
}
