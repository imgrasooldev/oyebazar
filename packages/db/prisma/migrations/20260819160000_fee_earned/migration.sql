-- Fee ab deliver hone par EARNED hoti hai — pehle DELIVERED par kuch nahi hota tha
-- aur raste ka order bhi invoice mein chala jata tha.
ALTER TYPE "FeeStatus" ADD VALUE IF NOT EXISTS 'EARNED' AFTER 'PENDING';

-- Kab kamai bani — mahine ka hisab isi tareekh se, order banne ki tareekh se nahi
-- (order 28 tareekh ko lag sakta hai aur maal agle mahine pohanche).
ALTER TABLE "FeeLedger" ADD COLUMN IF NOT EXISTS "earnedAt" TIMESTAMP(3);
