-- Godown — maal kis jagah para hai.
--
-- 🔴 `ProductVariant.stockQty` MITAYA NAHI gaya, aur ye is poore qadam ka sab se ahem
-- faisla hai. Wo khaana ab `VariantStock` qataron ka jama hai (dono ek hi transaction
-- mein badalte hain), magar wo bechne ke raste par barqarar rehta hai:
--
--   · `reserve` ki shart (`stockQty >= qty`) EK row par EK atomic update hai — wohi
--     cheez do resellers ko ek hi aakhri piece bechne se rokti hai. SUM par wo shart
--     lagayi hi nahi ja sakti, aur us ke baghair ginti manfi mein chali jati hai.
--   · reseller ke catalogue ki chhanni, listing ka LIVE/OUT_OF_STOCK, aur "kitna bacha
--     hai" — sab usi ek khaane par khare hain.
--
-- Har mojooda dukan ko us ka pehla godown yahin mil jata hai ("دکان"), aur jo maal abhi
-- para hai wo usi mein daal diya jata hai — warna pehle din har cheez ki ginti do jagah
-- se do alag jawab deti.

CREATE TABLE "Warehouse" (
  "id"         TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "isDefault"  BOOLEAN NOT NULL DEFAULT false,
  "isActive"   BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Warehouse_supplierId_name_key" ON "Warehouse"("supplierId", "name");
CREATE INDEX "Warehouse_supplierId_sortOrder_idx" ON "Warehouse"("supplierId", "sortOrder");

ALTER TABLE "Warehouse"
  ADD CONSTRAINT "Warehouse_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "VariantStock" (
  "id"          TEXT NOT NULL,
  "variantId"   TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "qty"         INTEGER NOT NULL DEFAULT 0,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VariantStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VariantStock_variantId_warehouseId_key" ON "VariantStock"("variantId", "warehouseId");
CREATE INDEX "VariantStock_warehouseId_idx" ON "VariantStock"("warehouseId");

ALTER TABLE "VariantStock"
  ADD CONSTRAINT "VariantStock_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VariantStock"
  ADD CONSTRAINT "VariantStock_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Register mein bhi likha jaye ke maal kis jagah se nikla / kahan aya.
--
-- Purani qataron par ye khali rehta hai, aur wo khali jagah jaan boojh kar khali hai:
-- unhen default godown ka naam de dena aisa dawa hota jo hum jante hi nahi.
ALTER TABLE "StockMove" ADD COLUMN "warehouseId" TEXT;
ALTER TABLE "StockMove"
  ADD CONSTRAINT "StockMove_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Har dukan ka pehla godown. Naam Urdu mein kyunke dukan wala usay isi tarah bolta hai,
-- aur wo isay apne safhe se kabhi bhi badal sakta hai.
INSERT INTO "Warehouse" ("id", "supplierId", "name", "isDefault", "isActive", "sortOrder")
SELECT gen_random_uuid()::text, s."id", 'دکان', true, true, 0
FROM "Supplier" s;

-- Jo maal abhi para hai wo usi pehle godown mein.
INSERT INTO "VariantStock" ("id", "variantId", "warehouseId", "qty", "updatedAt")
SELECT gen_random_uuid()::text, v."id", w."id", v."stockQty", NOW()
FROM "ProductVariant" v
JOIN "Product" p   ON p."id" = v."productId"
JOIN "Warehouse" w ON w."supplierId" = p."supplierId" AND w."isDefault" = true;
