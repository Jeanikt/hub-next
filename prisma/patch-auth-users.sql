-- Patch mínimo para alinhar colunas usadas pelo Auth.js (NextAuth)
-- com o schema Prisma em "users": isAdmin (BOOLEAN) e emailVerified (TIMESTAMP).
-- Seguro para rodar várias vezes (usa IF NOT EXISTS).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'isAdmin'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'emailVerified'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "emailVerified" TIMESTAMP(3);
  END IF;
END $$;

