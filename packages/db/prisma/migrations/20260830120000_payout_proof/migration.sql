-- Bhejne ki tasveer — marzi ka sabooot, TID ke saath.
--
-- Nullable is liye ke purane hisab is ke baghair band ho chuke hain, aur naye par bhi
-- ye lazmi nahi: TID likhna ek line ka kaam hai, screenshot teen qadam ka. Lazmi karne
-- ka anjaam ye hota ke dukan wala "bhej diye" likhna hi chhor deta.
ALTER TABLE "ResellerPayout" ADD COLUMN "sentProofUrl" TEXT;
