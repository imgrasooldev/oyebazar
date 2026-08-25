-- Customer apna pata khud likhti hai.
CREATE TABLE "AddressRequest" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "retailPrice" INTEGER NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "area" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "filledAt" TIMESTAMP(3),
    "orderId" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AddressRequest_pkey" PRIMARY KEY ("id")
);

-- Token hi chabi hai — dhoondhna is se hota hai, aur do link ek jaise nahi ho sakte
CREATE UNIQUE INDEX "AddressRequest_token_key" ON "AddressRequest"("token");

-- Ek link se ek hi order. DB par hadd is liye ke do request ek saath aa jayen to
-- code ki jaanch dono ko guzar deti hai; ye nahi.
CREATE UNIQUE INDEX "AddressRequest_orderId_key" ON "AddressRequest"("orderId");

-- Reseller ka safha: kis kis ne pata bhej diya aur abhi order nahi bana
CREATE INDEX "AddressRequest_resellerId_filledAt_usedAt_idx"
    ON "AddressRequest"("resellerId", "filledAt", "usedAt");

ALTER TABLE "AddressRequest" ADD CONSTRAINT "AddressRequest_resellerId_fkey"
    FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AddressRequest" ADD CONSTRAINT "AddressRequest_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
