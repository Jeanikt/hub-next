-- CreateIndex (GameMatch: creatorId, status+updatedAt para cron)
CREATE INDEX IF NOT EXISTS "game_matches_creatorId_idx" ON "game_matches"("creatorId");
CREATE INDEX IF NOT EXISTS "game_matches_status_updatedAt_idx" ON "game_matches"("status", "updatedAt");

-- CreateIndex (LobbyMessage: gameMatchId + createdAt para listar mensagens)
CREATE INDEX IF NOT EXISTS "lobby_messages_gameMatchId_createdAt_idx" ON "lobby_messages"("gameMatchId", "createdAt");

-- CreateIndex (GameMatchUser: gameMatchId para joins)
CREATE INDEX IF NOT EXISTS "game_match_user_gameMatchId_idx" ON "game_match_user"("gameMatchId");
