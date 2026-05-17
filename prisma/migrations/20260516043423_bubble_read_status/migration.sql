-- CreateTable
CREATE TABLE "BubbleReadStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "messageSetId" TEXT NOT NULL,
    "hasRead" BOOLEAN NOT NULL DEFAULT false,
    "hasCommented" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BubbleReadStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BubbleReadStatus_messageSetId_fkey" FOREIGN KEY ("messageSetId") REFERENCES "MessageSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BubbleReadStatus_userId_hasRead_idx" ON "BubbleReadStatus"("userId", "hasRead");

-- CreateIndex
CREATE UNIQUE INDEX "BubbleReadStatus_userId_messageSetId_key" ON "BubbleReadStatus"("userId", "messageSetId");
