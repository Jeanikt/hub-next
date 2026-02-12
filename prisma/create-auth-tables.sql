-- Tabelas necessárias para NextAuth (Prisma Adapter) no banco hubexpresso.
-- NOTA: Sem FK para users porque a "users" atual tem id BIGINT (Laravel).
-- Para o login funcionar, o NextAuth precisa que "users" tenha id TEXT (cuid).
-- Opções: (1) prisma db push --force-reset (recria tudo; perde dados) ou
--         (2) migrar users.id de BIGINT para TEXT e depois adicionar as FKs.

-- Remove tabelas antigas (Laravel/outro) para recriar com estrutura do Prisma
DROP TABLE IF EXISTS "verification_tokens" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "accounts" CASCADE;

-- 1. accounts (OAuth / provedores)
CREATE TABLE "accounts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- 2. sessions
CREATE TABLE "sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- 3. verification_tokens
CREATE TABLE "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "verification_tokens_identifier_token_key" UNIQUE ("identifier", "token")
);

CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");
