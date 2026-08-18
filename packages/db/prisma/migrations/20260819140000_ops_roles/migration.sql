-- Chaar darjay: REVIEWER (sirf dekhna) → COORDINATOR → MANAGER → SUPER_ADMIN.
-- Postgres enum se value hatai nahi ja sakti, is liye naya type bana kar badla ja raha hai.
CREATE TYPE "OpsRole_new" AS ENUM ('REVIEWER', 'COORDINATOR', 'MANAGER', 'SUPER_ADMIN');

-- Purana FOUNDER ab SUPER_ADMIN hai — naam badla hai, ikhtiyar wohi
ALTER TABLE "OpsUser"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "OpsRole_new"
    USING (CASE WHEN "role"::text = 'FOUNDER' THEN 'SUPER_ADMIN' ELSE "role"::text END)::"OpsRole_new";

DROP TYPE "OpsRole";
ALTER TYPE "OpsRole_new" RENAME TO "OpsRole";

-- 🔴 Naya user ab sab se KAM ikhtiyar par banta hai. Pehle default COORDINATOR tha;
-- ghalti se bana hua user order aage barha sakta tha.
ALTER TABLE "OpsUser" ALTER COLUMN "role" SET DEFAULT 'REVIEWER';
