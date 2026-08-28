-- Ginti ka register — har harkat ki apni qatar, hamesha ke liye.
--
-- Pehle sirf aakhri number mehfooz tha (`ProductVariant.stockQty`). "20 the, ab 4 hain —
-- beech mein kya hua?" ka jawab kisi ke paas nahi tha, aur ginti badalna is nizam ka
-- sab se khamosh amal hai: na koi paighaam jata hai, na koi safha alag lagta hai.
--
-- Saath do naye khaane: dukan apni had khud rakhti hai (`reorderLevel`), aur maal ki
-- lagat wahan se banti hai jahan dukan ne khud batayi ho (`avgCost`).

CREATE TYPE "StockMoveReason" AS ENUM (
  'OPENING',
  'STOCK_IN',
  'ORDER_RESERVED',
  'ORDER_RELEASED',
  'RETURN_TO_SHELF',
  'MANUAL_FIX',
  'DAMAGE',
  -- Ek godown se doosre — do qataren banti hain, dono ek hi transaction mein
  'TRANSFER_OUT',
  'TRANSFER_IN'
);

ALTER TABLE "ProductVariant" ADD COLUMN "reorderLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductVariant" ADD COLUMN "avgCost" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "StockMove" (
  "id"           TEXT NOT NULL,
  "supplierId"   TEXT NOT NULL,
  "productId"    TEXT NOT NULL,
  "variantId"    TEXT NOT NULL,
  "delta"        INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "reason"       "StockMoveReason" NOT NULL,
  "orderNo"      TEXT,
  "unitCost"     INTEGER,
  "note"         TEXT,
  "actorType"    TEXT NOT NULL,
  "actorId"      TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StockMove_pkey" PRIMARY KEY ("id")
);

-- Dukan ka register: naya sab se upar
CREATE INDEX "StockMove_supplierId_createdAt_idx" ON "StockMove"("supplierId", "createdAt");
-- Ek cheez ki apni tareekh
CREATE INDEX "StockMove_variantId_createdAt_idx" ON "StockMove"("variantId", "createdAt");
CREATE INDEX "StockMove_productId_createdAt_idx" ON "StockMove"("productId", "createdAt");
-- Jhagre mein: is order par ginti ka kya hua
CREATE INDEX "StockMove_orderNo_idx" ON "StockMove"("orderNo");

-- "Khatam hone wala maal" ki list isi par chalti hai
CREATE INDEX "ProductVariant_stockQty_idx" ON "ProductVariant"("stockQty");

ALTER TABLE "StockMove"
  ADD CONSTRAINT "StockMove_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Variant mit jaye to us ki tareekh bhi jati hai — wo maal ab kisi ka mauzu nahi rehta
ALTER TABLE "StockMove"
  ADD CONSTRAINT "StockMove_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
