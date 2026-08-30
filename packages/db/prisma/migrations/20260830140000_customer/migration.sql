-- Reseller ka apna customer.
--
-- Reseller ke saath bandha hua hai, platform ke saath nahi: ek sanjha customer rakhne
-- ka matlab hota ke reseller A, B ke customer ka naam aur pata sirf number likh kar
-- dekh le. Jo cheez sanjhi honi chahiye (kitne pohanche, kitne wapas aaye) wo pehle se
-- alag rasta rakhti hai aur wahan se sirf ginti bahar jati hai.
CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "resellerId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "lastOrderAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_resellerId_phone_key" ON "Customer"("resellerId", "phone");
CREATE INDEX "Customer_resellerId_lastOrderAt_idx" ON "Customer"("resellerId", "lastOrderAt");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_resellerId_fkey"
  FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN "customerId" TEXT;

ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- Purane order — un se hi fehrist banti hai.
--
-- Bina is ke feature us din se shuru hota jis din ye migration chali, aur jis reseller
-- ke paas pehle se sau order hain us ke liye us ki apni poori fehrist gayab hoti. Wohi
-- reseller is feature ki sab se zyada haqdaar hai.
--
-- DISTINCT ON: ek number ki AAKHRI khareedari ka naam/pata liya jata hai, pehli ka
-- nahi. Log ghar badalte hain, aur agli dafa bharne ke liye naya pata hi kaam ka hai.
INSERT INTO "Customer" ("id", "resellerId", "phone", "name", "address", "area", "lastOrderAt", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  latest."resellerId",
  latest."customerPhone",
  latest."customerName",
  latest."customerAddress",
  latest."area",
  latest."createdAt",
  latest."createdAt",
  NOW()
FROM (
  SELECT DISTINCT ON ("resellerId", "customerPhone")
    "resellerId", "customerPhone", "customerName", "customerAddress", "area", "createdAt"
  FROM "Order"
  ORDER BY "resellerId", "customerPhone", "createdAt" DESC
) AS latest;

UPDATE "Order" o
SET "customerId" = c."id"
FROM "Customer" c
WHERE c."resellerId" = o."resellerId" AND c."phone" = o."customerPhone";
