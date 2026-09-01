-- Payout ka khata — dono taraf.
--
-- 🔴 `Reseller.payoutMethod`/`payoutAccount` pehle se the aur MAHINON se khali the:
-- parhe jate the, likhe kabhi nahi ja sakte the. Ab un ke saath wo khaane aate hain
-- jin ke baghair wo number bekar tha (naam, aur bank ka naam), aur likhne ka rasta
-- banta hai.
--
-- 🔴 `Supplier.bankAccount` GIRAYA ja raha hai: poore repo mein us ka ek bhi write
-- nahi tha (sirf price-leak ki mana-shuda fehrist mein naam tha), aur production ke
-- har supplier par wo NULL hai. Zinda dikhta hua mara hua khaana — CLAUDE.md §5.

ALTER TYPE "PayoutMethod" ADD VALUE IF NOT EXISTS 'RAAST';
ALTER TYPE "PayoutMethod" ADD VALUE IF NOT EXISTS 'BANK';

ALTER TABLE "Reseller"
  ADD COLUMN IF NOT EXISTS "payoutTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "payoutBankName" TEXT,
  ADD COLUMN IF NOT EXISTS "payoutUpdatedAt" TIMESTAMP(3);

ALTER TABLE "Supplier"
  ADD COLUMN IF NOT EXISTS "payoutMethod" "PayoutMethod",
  ADD COLUMN IF NOT EXISTS "payoutAccount" TEXT,
  ADD COLUMN IF NOT EXISTS "payoutTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "payoutBankName" TEXT,
  ADD COLUMN IF NOT EXISTS "payoutUpdatedAt" TIMESTAMP(3);

ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "bankAccount";
