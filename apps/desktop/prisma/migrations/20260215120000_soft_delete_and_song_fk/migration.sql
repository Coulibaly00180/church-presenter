-- Soft-delete columns
ALTER TABLE "Song" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "ServicePlan" ADD COLUMN "deletedAt" DATETIME;

-- Dedicated FK column for song references in plan items
ALTER TABLE "ServiceItem" ADD COLUMN "songId" TEXT REFERENCES "Song"("id") ON DELETE SET NULL;

-- Backfill songId from refId for SONG_BLOCK items
UPDATE "ServiceItem" SET "songId" = "refId" WHERE "kind" = 'SONG_BLOCK' AND "refId" IS NOT NULL;

-- Index for FK lookups
CREATE INDEX "ServiceItem_songId_idx" ON "ServiceItem"("songId");
