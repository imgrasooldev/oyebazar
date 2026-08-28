-- Khep aur maddat — "ye maal kab tak theek hai".
--
-- 🔴 Ginti ka koi naya paimana yahan NAHI ban raha. Bechne ka faisla `ProductVariant`
-- ke `stockQty` par hi rehta hai (wohi atomic shart jo do resellers ko ek hi aakhri
-- piece bechne se rokti hai), aur jagah `VariantStock` par. Khep sirf nigrani hai.
--
-- Isi liye is migration mein koi purana khana nahi badla, koi shart nahi lagi, aur koi
-- backfill nahi hai: jo maal khep ke baghair para hai wo waise hi bikta rahega. Khep un
-- cheezon par likhi jayegi jahan dukan khud likhe — kirana aur cosmetics par, kapre par
-- nahi.

CREATE TABLE "StockBatch" (
  "id"          TEXT NOT NULL,
  "supplierId"  TEXT NOT NULL,
  "variantId"   TEXT NOT NULL,
  "warehouseId" TEXT,
  "batchNo"     TEXT,
  "expiryAt"    TIMESTAMP(3),
  "qtyIn"       INTEGER NOT NULL,
  "qtyLeft"     INTEGER NOT NULL,
  "unitCost"    INTEGER,
  "receivedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note"        TEXT,

  CONSTRAINT "StockBatch_pkey" PRIMARY KEY ("id")
);

-- FEFO: jo pehle kharab hogi wo pehle nikle
CREATE INDEX "StockBatch_variantId_expiryAt_idx" ON "StockBatch"("variantId", "expiryAt");
-- "Kya maddat khatam hone wali hai" — dukan ka safha isi par khara hai
CREATE INDEX "StockBatch_supplierId_expiryAt_idx" ON "StockBatch"("supplierId", "expiryAt");

ALTER TABLE "StockBatch"
  ADD CONSTRAINT "StockBatch_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockBatch"
  ADD CONSTRAINT "StockBatch_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockBatch"
  ADD CONSTRAINT "StockBatch_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Register mein bhi likha jaye ke kis khep se nikla.
--
-- Khali rehna AAM soorat hai: jo dukan khep likhti hi nahi, us ki har qatar par ye khali
-- hoga. Ye us par koi shart nahi lagata — isi liye NULL qubool hai aur koi default nahi.
ALTER TABLE "StockMove" ADD COLUMN "batchId" TEXT;
