-- Aplique este SQL no PostgreSQL se as tabelas/colunas ainda não existirem.
-- Uso: psql $DATABASE_URL -f prisma/apply-missing-postgres.sql
-- Ou execute no seu cliente SQL (DBeaver, pgAdmin, etc.).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'profileBackgroundUrl') THEN
    ALTER TABLE "users" ADD COLUMN "profileBackgroundUrl" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'favoriteChampion') THEN
    ALTER TABLE "users" ADD COLUMN "favoriteChampion" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'bestWinrateChampion') THEN
    ALTER TABLE "users" ADD COLUMN "bestWinrateChampion" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'inviteCode') THEN
    ALTER TABLE "users" ADD COLUMN "inviteCode" TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS "users_inviteCode_key" ON "users"("inviteCode");
  END IF;
  -- Coluna image (usada pelo Auth.js / leaderboard)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'image') THEN
    ALTER TABLE "users" ADD COLUMN "image" TEXT;
  END IF;
  -- Colunas de banimento e status online
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'isBanned') THEN
    ALTER TABLE "users" ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'bannedUntil') THEN
    ALTER TABLE "users" ADD COLUMN "bannedUntil" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'banReason') THEN
    ALTER TABLE "users" ADD COLUMN "banReason" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'isOnline') THEN
    ALTER TABLE "users" ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2) Tabela missions
CREATE TABLE IF NOT EXISTS "missions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "xpReward" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "missions_type_isActive_idx" ON "missions"("type", "isActive");

-- Garante coluna xpReward mesmo se a tabela já existia sem ela
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'xpReward') THEN
    ALTER TABLE "missions" ADD COLUMN "xpReward" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 3) Tabela user_missions
CREATE TABLE IF NOT EXISTS "user_missions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "missionId" TEXT NOT NULL REFERENCES "missions"("id") ON DELETE CASCADE,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_missions_userId_missionId_key" ON "user_missions"("userId", "missionId");
CREATE INDEX IF NOT EXISTS "user_missions_userId_idx" ON "user_missions"("userId");
CREATE INDEX IF NOT EXISTS "user_missions_missionId_idx" ON "user_missions"("missionId");

-- 4) Tabela profile_likes
CREATE TABLE IF NOT EXISTS "profile_likes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "targetUserId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "profile_likes_userId_targetUserId_key" ON "profile_likes"("userId", "targetUserId");
CREATE INDEX IF NOT EXISTS "profile_likes_targetUserId_idx" ON "profile_likes"("targetUserId");

-- 5) Tabelas support_tickets e reports
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "support_tickets_userId_idx" ON "support_tickets"("userId");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");

CREATE TABLE IF NOT EXISTS "reports" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "reports_userId_idx" ON "reports"("userId");
CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports"("status");

-- 6) Tabela referrals
CREATE TABLE IF NOT EXISTS "referrals" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "inviterId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "invitedUserId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "inviteCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_invitedUserId_key" ON "referrals"("invitedUserId");
CREATE INDEX IF NOT EXISTS "referrals_inviterId_idx" ON "referrals"("inviterId");
CREATE INDEX IF NOT EXISTS "referrals_inviteCode_idx" ON "referrals"("inviteCode");

-- Atualizar updatedAt em missions se a coluna existir (Prisma exige updatedAt)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'missions' AND column_name = 'updatedAt') THEN
    UPDATE "missions" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
  END IF;
END $$;
