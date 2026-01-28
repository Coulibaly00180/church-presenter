-- CreateTable
CREATE TABLE "ServicePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT,
    "refSubId" TEXT,
    "title" TEXT,
    "content" TEXT,
    "mediaPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ServicePlan_date_key" ON "ServicePlan"("date");

-- CreateIndex
CREATE INDEX "ServiceItem_planId_order_idx" ON "ServiceItem"("planId", "order");
