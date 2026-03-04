// Barrel re-export — keeps backward compatibility with tests and other consumers.
export {
  getErrorMessage,
  normalizeWhitespace,
  normalizeMultiline,
  normalizeYear,
  sanitizeFilename,
  createSongWithBlocksAtomic,
  type SongImportEntity,
  type RegisterSongsIpcOptions,
} from "./songs-meta";
export {
  parseSongText,
  normalizeSongFromJson,
  migrateSongsJsonPayload,
} from "./songs-import";
