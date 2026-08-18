-- Pack ab kit hai: ek product ke kai naap (story/square/portrait/wide).
-- Purani saari rows WhatsApp status (9:16) hain, is liye default 'story'.
ALTER TABLE "StatusPack" ADD COLUMN "format" TEXT NOT NULL DEFAULT 'story';

-- Cache key mein naap shamil karna zaroori hai, warna chokor pack lambe ko overwrite kar de
DROP INDEX IF EXISTS "StatusPack_resellerId_productId_templateKey_priceUsed_key";

CREATE UNIQUE INDEX "StatusPack_resellerId_productId_templateKey_priceUsed_forma_key"
  ON "StatusPack"("resellerId", "productId", "templateKey", "priceUsed", "format");
