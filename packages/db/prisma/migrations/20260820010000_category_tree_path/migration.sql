-- Category ka darakht ab kitna bhi gehra ja sakta hai.
--
-- `path` = jarh se yahan tak ka rasta IDs mein ("/abc/def/"), `depth` = darja.
-- Purani rows do darjay ki hain, is liye backfill do qadam mein: pehle jarhen, phir
-- un ke bachche. Aage ka intizam service karti hai.

ALTER TABLE "Category" ADD COLUMN "path" TEXT NOT NULL DEFAULT '/';
ALTER TABLE "Category" ADD COLUMN "depth" INTEGER NOT NULL DEFAULT 0;

UPDATE "Category" SET "path" = '/' || "id" || '/', "depth" = 0 WHERE "parentId" IS NULL;

UPDATE "Category" c
SET "path" = p."path" || c."id" || '/', "depth" = p."depth" + 1
FROM "Category" p
WHERE c."parentId" = p."id";

CREATE INDEX "Category_path_idx" ON "Category"("path");
