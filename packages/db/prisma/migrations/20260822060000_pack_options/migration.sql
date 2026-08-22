-- Pack ke apne faislay: zaban, aur kya kya tasveer par chhape.
--
-- 🔴 `optionsKey` cache key mein shamil hota hai. Default par wo KHALI string hai
-- (packages/shared/pack-options.ts), is liye pehle se bane hue saare packs apni jagah
-- qaim rehte hain — na key badalti hai, na wo dobara render hote hain.
ALTER TABLE "StatusPack" ADD COLUMN "optionsKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StatusPack" ADD COLUMN "packLang" TEXT NOT NULL DEFAULT 'ur';
ALTER TABLE "StatusPack" ADD COLUMN "showName" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StatusPack" ADD COLUMN "showPhone" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StatusPack" ADD COLUMN "showPrice" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StatusPack" ADD COLUMN "overlayName" TEXT;
ALTER TABLE "StatusPack" ADD COLUMN "overlayPhone" TEXT;

-- Purani key mein optionsKey shamil nahi tha. Nayi key us ka superset hai aur purani
-- saari rows par optionsKey='' hai, is liye koi row aapas mein nahi takrati.
--
-- Naam Postgres ne khud 63 haroof par kaata tha ("...priceUs_key"). Naye index ko saaf
-- naam de kar schema.prisma mein `map:` se bandh diya hai — warna har `migrate dev` par
-- Prisma isay "drift" samajh kar dobara banane ki koshish karta.
DROP INDEX "StatusPack_resellerId_productId_mediaId_templateKey_priceUs_key";
CREATE UNIQUE INDEX "StatusPack_cache_key" ON "StatusPack"("resellerId", "productId", "mediaId", "templateKey", "priceUsed", "format", "optionsKey");

-- Reseller ke default faislay — Studio har naye pack par yahin se shuru karta hai.
--
-- `packPhone` `whatsappPhone` se alag hai aur rehna chahiye: ek login ka number hai,
-- doosra wo jo tasveer par duniya ko dikhta hai.
ALTER TABLE "Reseller" ADD COLUMN "packLang" TEXT NOT NULL DEFAULT 'ur';
ALTER TABLE "Reseller" ADD COLUMN "packShowName" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Reseller" ADD COLUMN "packShowPhone" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Reseller" ADD COLUMN "packShowPrice" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Reseller" ADD COLUMN "packName" TEXT;
ALTER TABLE "Reseller" ADD COLUMN "packPhone" TEXT;
