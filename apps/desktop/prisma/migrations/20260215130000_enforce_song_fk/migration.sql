-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT,
    "refSubId" TEXT,
    "songId" TEXT,
    "title" TEXT,
    "content" TEXT,
    "mediaPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceItem_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ServiceItem" ("content", "createdAt", "id", "kind", "mediaPath", "order", "planId", "refId", "refSubId", "songId", "title", "updatedAt") SELECT "content", "createdAt", "id", "kind", "mediaPath", "order", "planId", "refId", "refSubId", "songId", "title", "updatedAt" FROM "ServiceItem";
DROP TABLE "ServiceItem";
ALTER TABLE "new_ServiceItem" RENAME TO "ServiceItem";
CREATE INDEX "ServiceItem_planId_order_idx" ON "ServiceItem"("planId", "order");
CREATE INDEX "ServiceItem_songId_idx" ON "ServiceItem"("songId");
CREATE UNIQUE INDEX "ServiceItem_planId_order_key" ON "ServiceItem"("planId", "order");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
