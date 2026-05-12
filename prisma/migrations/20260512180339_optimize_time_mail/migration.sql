-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TimeMail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" DATETIME,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeMail_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TimeMail" ("content", "createdAt", "id", "isSent", "scheduledAt", "senderEmail", "senderId", "senderName", "sentAt", "subject", "toEmail") SELECT "content", "createdAt", "id", "isSent", "scheduledAt", "senderEmail", "senderId", "senderName", "sentAt", "subject", "toEmail" FROM "TimeMail";
DROP TABLE "TimeMail";
ALTER TABLE "new_TimeMail" RENAME TO "TimeMail";
CREATE INDEX "TimeMail_isSent_scheduledAt_idx" ON "TimeMail"("isSent", "scheduledAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
