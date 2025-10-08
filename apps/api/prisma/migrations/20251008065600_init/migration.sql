-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommuterProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CommuterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CommuterProfile" ("id", "userId") SELECT "id", "userId" FROM "CommuterProfile";
DROP TABLE "CommuterProfile";
ALTER TABLE "new_CommuterProfile" RENAME TO "CommuterProfile";
CREATE UNIQUE INDEX "CommuterProfile_userId_key" ON "CommuterProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
