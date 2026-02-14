-- CreateTable
CREATE TABLE "match_cancel_votes" (
    "id" SERIAL NOT NULL,
    "gameMatchId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_cancel_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_cancel_votes_gameMatchId_userId_key" ON "match_cancel_votes"("gameMatchId", "userId");

-- CreateIndex
CREATE INDEX "match_cancel_votes_gameMatchId_idx" ON "match_cancel_votes"("gameMatchId");

-- AddForeignKey
ALTER TABLE "match_cancel_votes" ADD CONSTRAINT "match_cancel_votes_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "game_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_cancel_votes" ADD CONSTRAINT "match_cancel_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
