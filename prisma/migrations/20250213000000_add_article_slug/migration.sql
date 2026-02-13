-- AlterTable
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "articles_slug_idx" ON "articles"("slug");
