-- Dukan ka apna waada, aur har hisab par us ka snapshot.
--
-- Pehle "der" hamare farz kiye hue 3 din se napi jati thi — sab ke liye ek jaisi, aur
-- dukan wala keh sakta tha ke us ne aisa kabhi kaha hi nahi. Ab har dukan apni shart
-- khud likhti hai aur der usi se napi jati hai.
--
-- Har payout apni shart saath rakhta hai: warna 10 din ka baqaya khare hone par shart
-- 15 din kar ke record saaf kiya ja sakta tha.

ALTER TABLE "Supplier" ADD COLUMN "payoutTermDays" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "ResellerPayout" ADD COLUMN "termDays" INTEGER NOT NULL DEFAULT 3;
