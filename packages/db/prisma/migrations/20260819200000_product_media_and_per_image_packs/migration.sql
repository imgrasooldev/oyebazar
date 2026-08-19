-- Har tasveer ka apna status pack.
--
-- Ab tak ek product = ek pack (jo bhi tasveer isStatusSource thi). Wholesaler ab kai
-- tasveerein aur video daal sakta hai, aur reseller khud chunti hai ke kaunsi tasveer
-- us ke status par jaye. Cache us farq ko jaanta na ho to doosri tasveer ka pack pehli
-- wali ko chup chaap overwrite kar deta.
--
-- 🔴 Column NOT NULL hai aur default khali string — nullable NAHI. Postgres ke unique
-- index mein NULL kisi doosre NULL se nahi takrata; nullable rakhte to cover wale
-- packs ka cache constraint kaam karna chhor deta aur ek hi pack ki do rows ban jatin.
-- Khali string ka matlab "product ki cover tasveer" hai — yani purani saari rows
-- waise ki waise chalti rehti hain.
ALTER TABLE "StatusPack" ADD COLUMN IF NOT EXISTS "mediaId" TEXT NOT NULL DEFAULT '';

-- 🔴 Purana index NAAM se drop nahi kiya ja sakta.
--
-- Postgres har identifier ko 63 haroof par kaat deta hai, aur Prisma ka apna naam
-- (StatusPack_resellerId_productId_templateKey_priceUsed_format_key) 64 ka tha — DB
-- mein wo `..._forma_key` bana para hai. `DROP INDEX IF EXISTS <poora naam>` chup chaap
-- kuch nahi karta aur purani shart zinda reh jati hai: doosri tasveer ka pack banate hi
-- unique constraint girti hai. Is liye naam ke bajaye SHAKL se dhoondte hain.
DO $$
DECLARE stale text;
BEGIN
  FOR stale IN
    SELECT i.relname
    FROM pg_index x
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_class t ON t.oid = x.indrelid
    WHERE t.relname = 'StatusPack'
      AND x.indisunique
      AND NOT x.indisprimary
      AND i.relname <> 'StatusPack_resellerId_productId_mediaId_templateKey_priceUs_key'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', stale);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "StatusPack_resellerId_productId_mediaId_templateKey_priceUs_key"
  ON "StatusPack"("resellerId", "productId", "mediaId", "templateKey", "priceUsed", "format");
