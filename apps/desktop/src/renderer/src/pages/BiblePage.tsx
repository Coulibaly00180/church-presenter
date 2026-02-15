import React from "react";
import { ActionRow, Alert, InlineField, PageHeader, ToolbarPanel } from "../ui/primitives";
import { PlanSelectField, ProjectionTargetField } from "../ui/headerControls";
import { useBibleState } from "./bible/useBibleState";
import { BibleNav } from "./bible/BibleNav";
import { BibleSearch } from "./bible/BibleSearch";
import { VersePanel } from "./bible/VersePanel";

function formatPlanLabel(plan: CpPlanListItem) {
  if (plan.title && plan.title.trim()) return plan.title;
  if (typeof plan.date === "string") return plan.date;
  if (plan.date instanceof Date && !Number.isNaN(plan.date.getTime())) return plan.date.toISOString().slice(0, 10);
  return plan.id;
}

export function BiblePage() {
  const b = useBibleState();

  return (
    <div className="cp-page">
      <PageHeader title="Bible" subtitle="Rechercher, projeter et envoyer vers le plan (bolls.life)." />

      {b.err ? <Alert tone="error">Erreur : {b.err}</Alert> : null}
      {b.offlineFallbackHint ? (
        <Alert>
          <div>{b.offlineFallbackHint}</div>
          <ActionRow className="cp-mt-6">
            <button onClick={b.switchToOfflineFRLSG}>Basculer en FRLSG offline</button>
          </ActionRow>
        </Alert>
      ) : null}
      {b.info ? <Alert tone="success">{b.info}</Alert> : null}

      <ToolbarPanel>
        <InlineField label="Langue">
          <select
            value={b.translationLanguage}
            onChange={(e) => {
              const lang = e.target.value;
              b.setTranslationLanguage(lang);
              const g = b.groups.find((x) => x.language === lang);
              if (g?.translations[0]) b.setTranslation(g.translations[0].code);
            }}
            className="cp-input-min-200"
          >
            {b.groups.map((g) => (
              <option key={g.language} value={g.language}>{g.language}</option>
            ))}
          </select>
        </InlineField>
        <InlineField label="Traduction">
          <select
            value={b.translation}
            onChange={(e) => b.setTranslation(e.target.value)}
            className="cp-input-min-260"
          >
            {(b.groups.find((g) => g.language === b.translationLanguage)?.translations || []).map((t) => (
              <option key={t.code} value={t.code}>{t.label}</option>
            ))}
          </select>
        </InlineField>
        <PlanSelectField
          value={b.planId}
          plans={b.plans}
          getPlanId={(p) => p.id}
          getPlanLabel={formatPlanLabel}
          onChange={b.setPlanId}
        />
        <ProjectionTargetField value={b.target} onChange={b.setTarget} />
      </ToolbarPanel>

      <div className="cp-grid-main">
        <div className="cp-stack">
          <BibleNav
            books={b.books}
            bookId={b.bookId}
            onSetBookId={b.setBookId}
            chapter={b.chapter}
            onSetChapter={b.setChapter}
            currentBook={b.currentBook}
            loadingBooks={b.loadingBooks}
            loadingChapter={b.loadingChapter}
            onLoadChapter={b.loadChapter}
            versesCount={b.verses.length}
            onSelectAll={b.selectAllVerses}
          />

          <BibleSearch
            searchText={b.searchText}
            onSetSearchText={b.setSearchText}
            searchResults={b.searchResults}
            searchLoading={b.searchLoading}
            onJumpToResult={b.jumpToResult}
          />
        </div>

        <VersePanel
          currentBook={b.currentBook}
          referenceLabel={b.referenceLabel}
          activeTranslation={b.activeTranslation}
          verses={b.verses}
          selectedVerses={b.selectedVerses}
          onToggleVerse={b.toggleVerse}
          addMode={b.addMode}
          onSetAddMode={b.setAddMode}
          onProjectNow={b.projectNow}
          onAddToPlan={b.addToPlan}
          planId={b.planId}
        />
      </div>
    </div>
  );
}
