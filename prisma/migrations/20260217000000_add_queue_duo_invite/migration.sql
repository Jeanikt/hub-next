-- CreateTable
CREATE TABLE "queue_duo_invites" (
    "id" SERIAL NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "queueType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_duo_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "queue_duo_invites_fromUserId_toUserId_queueType_key" ON "queue_duo_invites"("fromUserId", "toUserId", "queueType");

-- CreateIndex
CREATE INDEX "queue_duo_invites_toUserId_status_idx" ON "queue_duo_invites"("toUserId", "status");

-- AddForeignKey
ALTER TABLE "queue_duo_invites" ADD CONSTRAINT "queue_duo_invites_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_duo_invites" ADD CONSTRAINT "queue_duo_invites_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
