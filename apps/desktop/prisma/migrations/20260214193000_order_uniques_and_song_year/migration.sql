-- Add year field for song metadata symmetry (import/export Word).
ALTER TABLE "Song" ADD COLUMN "year" TEXT;

-- Auto-fix potential duplicate or sparse order values for song blocks.
WITH ranked_song_blocks AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "songId"
      ORDER BY "order" ASC, "createdAt" ASC, "id" ASC
    ) AS "newOrder"
  FROM "SongBlock"
)
UPDATE "SongBlock"
SET "order" = (
  SELECT "newOrder" FROM ranked_song_blocks WHERE ranked_song_blocks."id" = "SongBlock"."id"
)
WHERE "id" IN (SELECT "id" FROM ranked_song_blocks);

-- Auto-fix potential duplicate or sparse order values for plan items.
WITH ranked_service_items AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "planId"
      ORDER BY "order" ASC, "createdAt" ASC, "id" ASC
    ) AS "newOrder"
  FROM "ServiceItem"
)
UPDATE "ServiceItem"
SET "order" = (
  SELECT "newOrder" FROM ranked_service_items WHERE ranked_service_items."id" = "ServiceItem"."id"
)
WHERE "id" IN (SELECT "id" FROM ranked_service_items);

-- Enforce unique ordering constraints by parent entity.
CREATE UNIQUE INDEX "SongBlock_songId_order_key" ON "SongBlock"("songId", "order");
CREATE UNIQUE INDEX "ServiceItem_planId_order_key" ON "ServiceItem"("planId", "order");
