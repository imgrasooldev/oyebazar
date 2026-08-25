-- Courier aur CN number.
--
-- Dono NULL ho sakte hain, aur ye jaan boojh kar hai: jo order pehle se raste mein
-- hain (ya pohanch chuke hain) un ka CN kisi ke paas likha hua hai hi nahi. Un par
-- koi jhooti qadar daalne se behtar hai ke khaali rahen — "maloom nahi" ek sahi
-- jawab hai, "0000" nahi.
ALTER TABLE "Order" ADD COLUMN "courier" TEXT;
ALTER TABLE "Order" ADD COLUMN "trackingNo" TEXT;

-- Reseller apni customer se CN sun kar order dhoondhti hai — "wo 1234 wala parcel".
CREATE INDEX "Order_trackingNo_idx" ON "Order"("trackingNo");
