-- CreateTable
CREATE TABLE "TravelerRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "titleBanned" BOOLEAN NOT NULL DEFAULT false,
    "descBanned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TravelerRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TitleAdjective" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TitleNoun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TravelerRecord_userId_key" ON "TravelerRecord"("userId");

-- CreateIndex
CREATE INDEX "TravelerRecord_isPublic_idx" ON "TravelerRecord"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "TitleAdjective_word_key" ON "TitleAdjective"("word");

-- CreateIndex
CREATE UNIQUE INDEX "TitleNoun_word_key" ON "TitleNoun"("word");
