-- Purane pohanche hue orders ke liye payout ki rows.
--
-- Payout ka nizam aaj bana, magar us se pehle bhi order deliver ho chuke hain. Un par
-- row na hone ka matlab ye tha ke reseller ke safhe par "2 order pohanche" likha aata
-- aur kamai sirf ek ki dikhti — jo us ki nazar mein hamari ghalti nahi, chori lagti hai.
--
-- Raqam wahi formula jo service mein hai: (retail - baji) * qty, order ke apne snapshot
-- se. Baad mein rate badla ho to bhi purana hisab wohi rehta hai.
--
-- 🔴 createdAt = deliveredAt, aaj ki tareekh nahi. Warna "kitne din se baqi hai" wali
-- ginti sifar se shuru hoti aur teen mahine purana baqaya bhi taaza dikhta.

INSERT INTO "ResellerPayout" (
  "id", "orderId", "resellerId", "supplierId", "amount", "status", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  o."id",
  o."resellerId",
  o."supplierId",
  SUM((i."retailPriceSnapshot" - i."bajiPriceSnapshot") * i."qty")::int,
  'PENDING'::"PayoutStatus",
  COALESCE(o."deliveredAt", o."updatedAt"),
  NOW()
FROM "Order" o
JOIN "OrderItem" i ON i."orderId" = o."id"
WHERE o."status" = 'DELIVERED'
  AND NOT EXISTS (SELECT 1 FROM "ResellerPayout" p WHERE p."orderId" = o."id")
GROUP BY o."id", o."resellerId", o."supplierId", o."deliveredAt", o."updatedAt"
-- Jis order par reseller ne apni lagat par becha, us par dene ko kuch hai hi nahi
HAVING SUM((i."retailPriceSnapshot" - i."bajiPriceSnapshot") * i."qty") > 0;
