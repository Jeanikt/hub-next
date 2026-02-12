-- CreateTable
CREATE TABLE "QueueEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "queueType" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QueueEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameMatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "map" TEXT,
    "maxPlayers" INTEGER NOT NULL DEFAULT 10,
    "settings" TEXT,
    "creatorId" INTEGER,
    "scheduledAt" DATETIME,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "winnerTeam" TEXT,
    "matchDuration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameMatch_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameMatchUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameMatchId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "team" TEXT,
    "role" TEXT,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameMatchUser_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "GameMatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameMatchUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Friend" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "friendId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Friend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Friend_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FriendMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FriendMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FriendMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LobbyMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameMatchId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LobbyMessage_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "GameMatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LobbyMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "QueueEntry_queueType_idx" ON "QueueEntry"("queueType");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_userId_key" ON "QueueEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameMatch_matchId_key" ON "GameMatch"("matchId");

-- CreateIndex
CREATE INDEX "GameMatch_status_idx" ON "GameMatch"("status");

-- CreateIndex
CREATE INDEX "GameMatch_type_idx" ON "GameMatch"("type");

-- CreateIndex
CREATE INDEX "GameMatchUser_userId_idx" ON "GameMatchUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameMatchUser_gameMatchId_userId_key" ON "GameMatchUser"("gameMatchId", "userId");

-- CreateIndex
CREATE INDEX "Friend_friendId_idx" ON "Friend"("friendId");

-- CreateIndex
CREATE UNIQUE INDEX "Friend_userId_friendId_key" ON "Friend"("userId", "friendId");

-- CreateIndex
CREATE INDEX "FriendMessage_senderId_receiverId_idx" ON "FriendMessage"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "FriendMessage_receiverId_idx" ON "FriendMessage"("receiverId");

-- CreateIndex
CREATE INDEX "LobbyMessage_gameMatchId_idx" ON "LobbyMessage"("gameMatchId");
