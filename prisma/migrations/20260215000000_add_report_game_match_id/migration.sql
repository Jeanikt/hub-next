-- AlterTable
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "gameMatchId" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reports_targetType_targetId_idx" ON "reports"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "reports_userId_gameMatchId_idx" ON "reports"("userId", "gameMatchId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_gameMatchId_fkey'
  ) THEN
    ALTER TABLE "reports" ADD CONSTRAINT "reports_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "game_matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
