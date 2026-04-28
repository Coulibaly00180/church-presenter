-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CHANTRE', 'LECTEUR');

-- CreateEnum
CREATE TYPE "LearningStatus" AS ENUM ('TO_LEARN', 'IN_PROGRESS', 'MASTERED');

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "album" TEXT,
    "year" TEXT,
    "language" TEXT,
    "tags" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongBlock" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePlan" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "backgroundConfig" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT,
    "refSubId" TEXT,
    "songId" TEXT,
    "title" TEXT,
    "content" TEXT,
    "notes" TEXT,
    "mediaPath" TEXT,
    "secondaryContent" TEXT,
    "backgroundConfig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CHANTRE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","songId")
);

-- CreateTable
CREATE TABLE "SongNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songBlockId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongLearning" (
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "status" "LearningStatus" NOT NULL DEFAULT 'TO_LEARN',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongLearning_pkey" PRIMARY KEY ("userId","songId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Song_title_key" ON "Song"("title");

-- CreateIndex
CREATE INDEX "SongBlock_songId_order_idx" ON "SongBlock"("songId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "SongBlock_songId_order_key" ON "SongBlock"("songId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePlan_date_key" ON "ServicePlan"("date");

-- CreateIndex
CREATE INDEX "ServiceItem_planId_order_idx" ON "ServiceItem"("planId", "order");

-- CreateIndex
CREATE INDEX "ServiceItem_songId_idx" ON "ServiceItem"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItem_planId_order_key" ON "ServiceItem"("planId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "SongBlock" ADD CONSTRAINT "SongBlock_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongNote" ADD CONSTRAINT "SongNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongNote" ADD CONSTRAINT "SongNote_songBlockId_fkey" FOREIGN KEY ("songBlockId") REFERENCES "SongBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongLearning" ADD CONSTRAINT "SongLearning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongLearning" ADD CONSTRAINT "SongLearning_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
