-- Har rang ki apni tasveer.
--
-- `ProductMedia.variantId` ka khaana pehle se mojood tha magar mara hua tha: na koi
-- likhta tha na parhta. Ab us ka rishta bhi hai aur index bhi.
--
-- SetNull jaan boojh kar: variant hatane par us ki tasveerein poore maal ki ban jati
-- hain, marti nahi — aksar wahi tasveerein dobara chahiye hoti hain.

CREATE INDEX "ProductMedia_variantId_idx" ON "ProductMedia"("variantId");

ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
