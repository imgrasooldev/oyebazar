-- Order ke gird ki baat, aur us mein "masla hua" bhi — ek hi nizam.
--
-- 🔴 Do alag table (baat aur shikayat) banane ka matlab hota ke ek hi guftagu do jagah
-- bant jaye, aur jab ops ko faisla karna ho to usay dono jagah parhni parti. `kind` se
-- farq ho jata hai aur guftagu ek hi jagah rehti hai.

CREATE TYPE "OrderMessageKind" AS ENUM ('NOTE', 'ISSUE');

CREATE TABLE "OrderMessage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "OrderMessageKind" NOT NULL DEFAULT 'NOTE',
    "authorType" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "photoUrl" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderMessage_pkey" PRIMARY KEY ("id")
);

-- Ek order ki poori guftagu, waqt ke hisaab se
CREATE INDEX "OrderMessage_orderId_createdAt_idx" ON "OrderMessage"("orderId", "createdAt");

-- Ops ki list: khule hue masle, naye pehle
CREATE INDEX "OrderMessage_kind_resolvedAt_createdAt_idx" ON "OrderMessage"("kind", "resolvedAt", "createdAt");

-- Order mit jaye to us ki baat bhi jaye — wo us ke baghair be-maani hai
ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
