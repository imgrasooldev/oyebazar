-- Reseller ka apna banaya hua template.
--
-- 🔴 `spec` mein CSS NAHI hai — ek tay-shuda shakal (rang, jagah, naap) hai jise
-- packages/shared/template-spec.ts CSS mein badalta hai. Ajnabi ka CSS hamare render
-- HTML mein nahi jana chahiye.
CREATE TABLE "ResellerTemplate" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spec" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResellerTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResellerTemplate_resellerId_updatedAt_idx" ON "ResellerTemplate"("resellerId", "updatedAt");

ALTER TABLE "ResellerTemplate" ADD CONSTRAINT "ResellerTemplate_resellerId_fkey"
    FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Kaun sa template is reseller ka default hai. Khali = system ka default ('simple'),
-- yani pehle se mojood har reseller ka bartao waisa ka waisa rehta hai.
ALTER TABLE "Reseller" ADD COLUMN "packTemplateKey" TEXT;
