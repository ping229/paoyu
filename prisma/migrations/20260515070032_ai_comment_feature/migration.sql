-- CreateTable
CREATE TABLE "AIConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "maxTokens" INTEGER NOT NULL DEFAULT 500,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "systemPrompt" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AILog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aiConfigId" TEXT NOT NULL,
    "messageSetId" TEXT NOT NULL,
    "messageContent" TEXT NOT NULL,
    "aiResponse" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AILog_aiConfigId_fkey" FOREIGN KEY ("aiConfigId") REFERENCES "AIConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageSetId" TEXT NOT NULL,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "replyToId" TEXT,
    "isAIComment" BOOLEAN NOT NULL DEFAULT false,
    "aiConfigId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_messageSetId_fkey" FOREIGN KEY ("messageSetId") REFERENCES "MessageSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Comment_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Comment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("content", "createdAt", "id", "messageSetId", "replyToId", "userId") SELECT "content", "createdAt", "id", "messageSetId", "replyToId", "userId" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AILog_aiConfigId_createdAt_idx" ON "AILog"("aiConfigId", "createdAt");
