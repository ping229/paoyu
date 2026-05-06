-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MessageSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publicAt" DATETIME,
    "scheduledAt" DATETIME,
    "isCommentReply" BOOLEAN NOT NULL DEFAULT false,
    "commentMessageSetId" TEXT,
    CONSTRAINT "MessageSet_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageSet_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MessageSet" ("createdAt", "id", "isDeleted", "isPublic", "isRead", "publicAt", "receiverId", "scheduledAt", "senderId") SELECT "createdAt", "id", "isDeleted", "isPublic", "isRead", "publicAt", "receiverId", "scheduledAt", "senderId" FROM "MessageSet";
DROP TABLE "MessageSet";
ALTER TABLE "new_MessageSet" RENAME TO "MessageSet";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
