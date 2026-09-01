-- Google par kya likha aaye — dukan aur maal, dono ka apna faisla.
--
-- Dono khaane MARZI ke hain: khali hon to safha khud apna unwan bana leta hai
-- (naam + sheher + ginti), aur wo aksar us se behtar hota hai jo jaldi mein bhara
-- jata hai. Lazmi karne ka anjaam ye hota ke maal list hi na ho.
--
-- `keywords` ka koi khaana jaan boojh kar nahi: Google usay 2009 se nazar-andaz
-- karta hai, aur us ka khaana banana sirf dukandar ka waqt zaya karna hai.

ALTER TABLE "Supplier"
  ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;
