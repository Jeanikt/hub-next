-- Migração aditiva: apenas cria novas tabelas. Não altera nem remove dados existentes (seguro para >200 usuários).
-- CreateTable roadmap_items (roadmap público: sugestões, prioridade, desenvolvimento, concluído)
CREATE TABLE "roadmap_items" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'suggestion',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable roadmap_likes (uma curtida por usuário por sugestão)
CREATE TABLE "roadmap_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "roadmap_items_status_idx" ON "roadmap_items"("status");
CREATE INDEX "roadmap_items_authorId_idx" ON "roadmap_items"("authorId");
CREATE UNIQUE INDEX "roadmap_likes_userId_roadmapItemId_key" ON "roadmap_likes"("userId", "roadmapItemId");
CREATE INDEX "roadmap_likes_roadmapItemId_idx" ON "roadmap_likes"("roadmapItemId");

-- AddForeignKey
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roadmap_likes" ADD CONSTRAINT "roadmap_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roadmap_likes" ADD CONSTRAINT "roadmap_likes_roadmapItemId_fkey" FOREIGN KEY ("roadmapItemId") REFERENCES "roadmap_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
