-- CreateTable
CREATE TABLE "TravelerBanHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "banType" TEXT NOT NULL,
    "originalContent" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TravelerBanHistory_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TravelerRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TravelerRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "travelerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "titleBanned" BOOLEAN NOT NULL DEFAULT false,
    "descBanned" BOOLEAN NOT NULL DEFAULT false,
    "titleBanCount" INTEGER NOT NULL DEFAULT 0,
    "descBanCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TravelerRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TravelerRecord" ("createdAt", "descBanned", "description", "id", "isPublic", "title", "titleBanned", "updatedAt", "userId") SELECT "createdAt", "descBanned", "description", "id", "isPublic", "title", "titleBanned", "updatedAt", "userId" FROM "TravelerRecord";
DROP TABLE "TravelerRecord";
ALTER TABLE "new_TravelerRecord" RENAME TO "TravelerRecord";
CREATE UNIQUE INDEX "TravelerRecord_userId_key" ON "TravelerRecord"("userId");
CREATE UNIQUE INDEX "TravelerRecord_travelerId_key" ON "TravelerRecord"("travelerId");
CREATE INDEX "TravelerRecord_isPublic_idx" ON "TravelerRecord"("isPublic");
CREATE INDEX "TravelerRecord_travelerId_idx" ON "TravelerRecord"("travelerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TravelerBanHistory_recordId_createdAt_idx" ON "TravelerBanHistory"("recordId", "createdAt");
