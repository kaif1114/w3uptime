-- CreateTable
CREATE TABLE "blockchain_sync_state" (
    "id" TEXT NOT NULL,
    "listenerName" TEXT NOT NULL,
    "lastBlock" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blockchain_sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_sync_state_listenerName_key" ON "blockchain_sync_state"("listenerName");
