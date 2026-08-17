-- Wholesaler ka jawab: ACCEPTED / REJECTED + magic-link token

ALTER TYPE "OrderStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "OrderStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "supplierToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_supplierToken_key" ON "Order"("supplierToken");
