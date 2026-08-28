-- Talash ka apna khana.
--
-- Pehle talash `titleUr LIKE %…%` aur `titleEn LIKE %…%` par chalti thi. Us ka matlab
-- ye tha ke "bachon ke kapre" likhne wali reseller ko "Kids Wear" kabhi nahi milta —
-- aur wo ye nahi samajhti ke "shayad angrezi mein likhna chahiye", wo ye samajhti hai
-- ke "yahan ye maal hai hi nahi".
--
-- Ab sawal aur maal DONO ek hi tarah saaf hote hain (packages/shared/search-terms.ts),
-- aur mel isi khane par hota hai.
ALTER TABLE "Product" ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';

-- Pehla bhraav — sirf lower-case aur category ka naam.
--
-- 🔴 Ye MUKAMMAL saaf nahi hai (zer-zabar aur Arabi huroof yahan nahi hat te —
-- wo JavaScript wala kaam hai). Maqsad sirf itna hai ke migration ke baad aur backfill
-- se pehle wale arse mein talash bilkul band na ho jaye. Poora bhraav:
--   node --env-file=<env> node_modules/tsx/dist/cli.mjs prisma/backfill-search.ts
UPDATE "Product" p
SET "searchText" = lower(
  p."titleUr" || ' ' || p."titleEn" || ' ' ||
  coalesce(p."descriptionUr", '') || ' ' ||
  coalesce(c."nameUr", '') || ' ' || coalesce(c."nameEn", '')
)
FROM "Category" c
WHERE c.id = p."categoryId";

-- Trigram index — `LIKE %…%` btree se kabhi faida nahi uthata.
--
-- Bina is ke har talash poori Product table parhti hai. Abhi teen sau maal par wo
-- mehsoos nahi hota; teen hazar par safha ruk jata hai — aur talash wohi jagah hai
-- jahan reseller sab se kam sabr karti hai.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Product_searchText_trgm_idx" ON "Product" USING gin ("searchText" gin_trgm_ops);
