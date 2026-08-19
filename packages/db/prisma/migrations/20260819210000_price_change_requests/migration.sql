-- 🔴 LIVE maal ka rate badalne ki darkhwast — faisla ops ka, dukan wale ka nahi.
--
-- Wajah: rate barhte hi bajiPrice barhta hai, aur jis reseller ne is maal par apna
-- retail rate save kar rakha hai wo ab apni lagat se NEECHE bech rahi hoti hai — us ka
-- status pack pehle se WhatsApp par laga hua hai aur usay khabar tak nahi hoti. Ye
-- nuqsan itla se nahi rukta; is ka faisla pehle hona chahiye.
--
-- DRAFT is se bahar hai: wahan dukan wala khud sab kuch badal leta hai, kyunke na ops
-- ne dekha hai na kisi reseller ne.
CREATE TYPE "PriceChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "PriceChangeRequest" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "currentSupplierPrice" INTEGER NOT NULL,
    "requestedSupplierPrice" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "PriceChangeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "decisionNote" TEXT,
    -- PENDING ke doran productId, faisle ke baad NULL — neeche wale unique index ke liye
    "pendingProductId" TEXT,

    CONSTRAINT "PriceChangeRequest_pkey" PRIMARY KEY ("id")
);

-- 🔴 Ek maal par ek hi KHULI darkhwast — magar guzri hui saari mehfooz.
--
-- Postgres ke unique index mein NULL kisi doosre NULL se nahi takrata, is liye ek maal
-- ki das APPROVED/REJECTED rows araam se rehti hain magar doosri PENDING nahi ban sakti.
-- (productId, status) par unique lagate to guzri hui darkhwast bhi ek hi reh sakti thi,
-- yani har nayi manzoori purani ka nishan mita deti.
CREATE UNIQUE INDEX "PriceChangeRequest_pendingProductId_key" ON "PriceChangeRequest"("pendingProductId");

CREATE INDEX "PriceChangeRequest_status_createdAt_idx" ON "PriceChangeRequest"("status", "createdAt");
CREATE INDEX "PriceChangeRequest_supplierId_status_idx" ON "PriceChangeRequest"("supplierId", "status");
CREATE INDEX "PriceChangeRequest_productId_createdAt_idx" ON "PriceChangeRequest"("productId", "createdAt");

ALTER TABLE "PriceChangeRequest"
  ADD CONSTRAINT "PriceChangeRequest_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
