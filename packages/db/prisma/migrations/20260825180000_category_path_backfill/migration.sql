-- Category ka `path` kabhi bhara hi nahi gaya tha.
--
-- 🔴 Seed `parentId` lagata tha magar `path` chhor deta tha, aur us column ka default
-- "/" hai. Natija: HAR category ka path "/" tha.
--
-- Us se chhanni ulti chalti hai: filter `path startsWith <us category ka path>` par
-- lagta hai, aur "/" har path ka shuru hai — yani har chhanni SAB kuch dikha deti thi.
-- Reseller "Cosmetics" dabati aur usay poora catalogue milta; koi error nahi, koi
-- khali safha nahi — bas chhanni ka koi asar hi nahi hota tha. Ye us kism ki kharabi
-- hai jo mahino nazar nahi aati.
--
-- Recursive CTE — darakht jitna bhi gehra ho, ek hi hukm mein.
WITH RECURSIVE tree AS (
    SELECT "id", '/' || "id" || '/' AS "path", 0 AS "depth"
    FROM "Category"
    WHERE "parentId" IS NULL

    UNION ALL

    SELECT c."id", t."path" || c."id" || '/', t."depth" + 1
    FROM "Category" c
    JOIN tree t ON c."parentId" = t."id"
)
UPDATE "Category" AS c
SET "path" = tree."path",
    "depth" = tree."depth"
FROM tree
WHERE c."id" = tree."id";
