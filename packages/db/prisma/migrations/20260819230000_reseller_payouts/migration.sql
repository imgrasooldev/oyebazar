-- Reseller ke paise: wholesaler ke haath mein aaye COD ka wo hissa jo reseller ka hai.
-- Do taraf ki tasdeeq (sentAt + confirmedAt) — tafseel schema.prisma mein.

CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SENT', 'SETTLED', 'DISPUTED');

CREATE TABLE "ResellerPayout" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "sentReference" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),
    "disputeNote" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolveNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResellerPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResellerPayout_orderId_key" ON "ResellerPayout"("orderId");
CREATE INDEX "ResellerPayout_supplierId_status_idx" ON "ResellerPayout"("supplierId", "status");
CREATE INDEX "ResellerPayout_resellerId_status_idx" ON "ResellerPayout"("resellerId", "status");
CREATE INDEX "ResellerPayout_status_createdAt_idx" ON "ResellerPayout"("status", "createdAt");

ALTER TABLE "ResellerPayout" ADD CONSTRAINT "ResellerPayout_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResellerPayout" ADD CONSTRAINT "ResellerPayout_resellerId_fkey"
    FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResellerPayout" ADD CONSTRAINT "ResellerPayout_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
