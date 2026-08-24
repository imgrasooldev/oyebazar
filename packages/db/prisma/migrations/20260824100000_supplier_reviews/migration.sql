-- Reseller ki raye us dukan ke bare mein jis se us ne kharida.
--
-- 🔴 Ek reseller, ek dukan, ek MAHINA — aur ye hadd DATABASE par hai, sirf code par
-- nahi. Bina is ke do soorat tootti hain: naraz reseller ek din mein das buri raye daal
-- kar dukan ka record khatam kar de, ya dukan wala apni jaan pehchan se sau achhi raye
-- bharwa le. Sirf code par shart rakhne ka matlab hai ke do request ek saath aa kar
-- dono nikal jayen.

CREATE TABLE "SupplierReview" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "quality" INTEGER NOT NULL,
    "communication" INTEGER NOT NULL,
    "payoutOnTime" INTEGER NOT NULL,
    "comment" TEXT,
    -- `YYYY-MM` — mahine ki hadd isi par lagti hai. `createdAt` se nikala nahi ja sakta:
    -- Postgres ke unique index mein hisaab nahi lag sakta.
    "periodMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierReview_resellerId_supplierId_periodMonth_key"
    ON "SupplierReview"("resellerId", "supplierId", "periodMonth");

-- Dukan ka record banane ke liye — us ki saari raye, nayi pehle
CREATE INDEX "SupplierReview_supplierId_createdAt_idx" ON "SupplierReview"("supplierId", "createdAt");

ALTER TABLE "SupplierReview" ADD CONSTRAINT "SupplierReview_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierReview" ADD CONSTRAINT "SupplierReview_resellerId_fkey"
    FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierReview" ADD CONSTRAINT "SupplierReview_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
