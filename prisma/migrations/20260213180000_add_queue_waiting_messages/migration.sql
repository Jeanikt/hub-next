-- CreateTable
CREATE TABLE "queue_waiting_messages" (
    "id" SERIAL NOT NULL,
    "queueType" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_waiting_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "queue_waiting_messages_queueType_idx" ON "queue_waiting_messages"("queueType");

-- CreateIndex
CREATE INDEX "queue_waiting_messages_queueType_createdAt_idx" ON "queue_waiting_messages"("queueType", "createdAt");

-- AddForeignKey
ALTER TABLE "queue_waiting_messages" ADD CONSTRAINT "queue_waiting_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
