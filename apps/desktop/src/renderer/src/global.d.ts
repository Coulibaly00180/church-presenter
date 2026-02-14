import type * as Shared from "../../shared/ipc";

export {};

declare global {
  type ScreenKey = Shared.ScreenKey;
  type ScreenMirrorMode = Shared.ScreenMirrorMode;

  type CpProjectionMode = Shared.CpProjectionMode;
  type CpMediaType = Shared.CpMediaType;
  type CpSongMeta = Shared.CpSongMeta;
  type CpWindowState = Shared.CpWindowState;

  type CpProjectionCurrent = Shared.CpProjectionCurrent;
  type CpProjectionState = Shared.CpProjectionState;
  type CpScreenMeta = Shared.CpScreenMeta;
  type CpLiveState = Shared.CpLiveState;

  type CpProjectionMutationResult = Shared.CpProjectionMutationResult;
  type CpScreenMutationResult = Shared.CpScreenMutationResult;
  type CpScreenMirrorResult = Shared.CpScreenMirrorResult;

  type CpSongBlockType = Shared.CpSongBlockType;
  type CpSongBlock = Shared.CpSongBlock;
  type CpSongListItem = Shared.CpSongListItem;
  type CpSongDetail = Shared.CpSongDetail;
  type CpSongDeleteResult = Shared.CpSongDeleteResult;
  type CpSongExportWordResult = Shared.CpSongExportWordResult;
  type CpSongImportWordResult = Shared.CpSongImportWordResult;
  type CpSongImportJsonError = Shared.CpSongImportJsonError;
  type CpSongImportJsonResult = Shared.CpSongImportJsonResult;
  type CpSongImportDocError = Shared.CpSongImportDocError;
  type CpSongImportWordBatchResult = Shared.CpSongImportWordBatchResult;
  type CpSongImportAutoResult = Shared.CpSongImportAutoResult;

  type CpPlanItemKind = Shared.CpPlanItemKind;
  type CpPlanItem = Shared.CpPlanItem;
  type CpPlanListItem = Shared.CpPlanListItem;
  type CpPlan = Shared.CpPlan;
  type CpPlanAddItemPayload = Shared.CpPlanAddItemPayload;
  type CpPlanDuplicatePayload = Shared.CpPlanDuplicatePayload;
  type CpPlanCreatePayload = Shared.CpPlanCreatePayload;
  type CpPlanRemoveItemPayload = Shared.CpPlanRemoveItemPayload;
  type CpPlanReorderPayload = Shared.CpPlanReorderPayload;
  type CpPlanExportPayload = Shared.CpPlanExportPayload;
  type CpPlanDeleteResult = Shared.CpPlanDeleteResult;
  type CpPlanRemoveItemResult = Shared.CpPlanRemoveItemResult;
  type CpPlanReorderResult = Shared.CpPlanReorderResult;
  type CpPlanExportResult = Shared.CpPlanExportResult;

  type CpDataImportMode = Shared.CpDataImportMode;
  type CpDataImportAtomicity = Shared.CpDataImportAtomicity;
  type CpDataExportResult = Shared.CpDataExportResult;
  type CpDataImportCounts = Shared.CpDataImportCounts;
  type CpDataImportError = Shared.CpDataImportError;
  type CpDataImportResult = Shared.CpDataImportResult;

  type CpBibleTranslation = Shared.CpBibleTranslation;
  type CpBibleLanguageGroup = Shared.CpBibleLanguageGroup;
  type CpBibleListTranslationsResult = Shared.CpBibleListTranslationsResult;

  type CpDevtoolsTarget = Shared.CpDevtoolsTarget;
  type CpDevtoolsOpenResult = Shared.CpDevtoolsOpenResult;

  type CpLiveSetPayload = Shared.CpLiveSetPayload;

  type CpMediaFile = Shared.CpMediaFile;
  type CpFilesPickMediaResult = Shared.CpFilesPickMediaResult;
  type CpFilesListMediaResult = Shared.CpFilesListMediaResult;
  type CpFilesDeleteMediaResult = Shared.CpFilesDeleteMediaResult;

  interface Window {
    cp: Shared.CpApi;
  }
}
