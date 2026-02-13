-- Execute no banco de produção se aparecer: "The column users.cpfHash does not exist"
-- Uso: psql $DATABASE_URL -f prisma/add-cpf-columns.sql
-- Ou execute no cliente SQL (DBeaver, pgAdmin, Vercel Postgres, etc.).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'cpfHash') THEN
    ALTER TABLE "users" ADD COLUMN "cpfHash" TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS "users_cpfHash_key" ON "users"("cpfHash");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'cpfEncrypted') THEN
    ALTER TABLE "users" ADD COLUMN "cpfEncrypted" TEXT;
  END IF;
END $$;
