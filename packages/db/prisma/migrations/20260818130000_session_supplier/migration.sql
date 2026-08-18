-- Wholesaler ka apna portal: session ab supplier ki bhi ho sakti hai.
-- Nullable rahegi — ek session ya reseller ki hai, ya ops ki, ya supplier ki.
ALTER TABLE "Session" ADD COLUMN "supplierId" TEXT;

CREATE INDEX "Session_supplierId_idx" ON "Session"("supplierId");

-- Dukan delete ho to us ki sessions bhi jayen — latki hui session se koi login na rahe
ALTER TABLE "Session" ADD CONSTRAINT "Session_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
