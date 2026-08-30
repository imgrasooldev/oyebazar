-- Reseller ka bonus — platform ki taraf se, dukan ki taraf se NAHI.
--
-- `ResellerPayout` se alag table, jaan boojh kar: payout dukan ka paisa hai jo us ne
-- wasool kiya aur reseller ko dena hai; bonus HAMARA kharcha hai. Ek hi table mein
-- rakhne ka matlab ye hota ke koi din "reseller ko kitna dena hai" ka jawab do alag jeb
-- milaa kar deta — aur jis din wo hisab bigarta, us din pata hi na chalta ke paisa kis
-- ka tha.
CREATE TYPE "BonusKind" AS ENUM ('SIGNUP', 'REFERRAL');
CREATE TYPE "BonusStatus" AS ENUM ('PENDING', 'PAID');

CREATE TABLE "ResellerBonus" (
  "id" TEXT NOT NULL,
  "resellerId" TEXT NOT NULL,
  "kind" "BonusKind" NOT NULL,
  "amount" INTEGER NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromResellerId" TEXT,
  "status" "BonusStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "paidReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResellerBonus_pkey" PRIMARY KEY ("id")
);

-- Ek bulai hui behen par bonus SIRF EK DAFA. Postgres mein kai NULL ek saath chal jate
-- hain, is liye SIGNUP wali qatarein (jahan ye khali hai) aapas mein nahi takratin.
CREATE UNIQUE INDEX "ResellerBonus_fromResellerId_key" ON "ResellerBonus"("fromResellerId");

-- Ek order par ek hi qism ka bonus — dobara chalne par nayi qatar nahi banti
CREATE UNIQUE INDEX "ResellerBonus_kind_resellerId_orderId_key"
  ON "ResellerBonus"("kind", "resellerId", "orderId");

CREATE INDEX "ResellerBonus_status_createdAt_idx" ON "ResellerBonus"("status", "createdAt");
CREATE INDEX "ResellerBonus_resellerId_createdAt_idx" ON "ResellerBonus"("resellerId", "createdAt");

ALTER TABLE "ResellerBonus" ADD CONSTRAINT "ResellerBonus_resellerId_fkey"
  FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResellerBonus" ADD CONSTRAINT "ResellerBonus_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
