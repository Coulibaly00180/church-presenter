import React from "react";
import type { BollsBook } from "../../bible/bollsApi";
import { ActionRow, Field, Panel } from "../../ui/primitives";
import { cls } from "../../ui/cls";

type BibleNavProps = {
  books: BollsBook[];
  bookId: number | null;
  onSetBookId: (id: number) => void;
  chapter: number;
  onSetChapter: (ch: number) => void;
  currentBook: BollsBook | undefined;
  loadingBooks: boolean;
  loadingChapter: boolean;
  onLoadChapter: (bookId: number, chapter: number) => void;
  versesCount: number;
  onSelectAll: (flag: boolean) => void;
};

export function BibleNav({
  books, bookId, onSetBookId, chapter, onSetChapter,
  currentBook, loadingBooks, loadingChapter, onLoadChapter,
  versesCount, onSelectAll,
}: BibleNavProps) {
  return (
    <Panel>
      <div className="cp-section-label">Naviguer</div>
      <div className="cp-stack-8">
        <Field label="Livre">
          <select
            value={bookId ?? ""}
            onChange={(e) => onSetBookId(Number(e.target.value))}
            disabled={loadingBooks || !books.length}
            className="cp-input-full"
          >
            {books.map((b) => (
              <option key={b.bookid} value={b.bookid}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Chapitre">
          <input
            type="number"
            min={1}
            max={currentBook?.chapters || 150}
            value={chapter}
            onChange={(e) => onSetChapter(Math.max(1, Number(e.target.value)))}
            className="cp-input-full"
          />
        </Field>
        {currentBook?.chapters ? (
          <div className="cp-stack-6">
            <div className="cp-help-text-flat">Chapitres de {currentBook.name}</div>
            <div className="cp-chapter-grid">
              {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map((c) => (
                <button
                  key={c}
                  onClick={() => onLoadChapter(currentBook.bookid, c)}
                  className={cls("cp-chapter-btn", c === chapter && "is-active")}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <ActionRow>
          <button onClick={() => bookId && onLoadChapter(bookId, Math.max(1, chapter))} disabled={!bookId || loadingChapter}>
            {loadingChapter ? "Chargement..." : "Charger chapitre"}
          </button>
          <button onClick={() => onSelectAll(true)} disabled={!versesCount}>Tout selectionner</button>
          <button onClick={() => onSelectAll(false)} disabled={!versesCount}>Vider</button>
        </ActionRow>
      </div>
    </Panel>
  );
}
