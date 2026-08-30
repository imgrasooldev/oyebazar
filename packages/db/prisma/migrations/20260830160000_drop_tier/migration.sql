-- `Tier` hataya ja raha hai — aur is mein koi maloomat zaya nahi ho rahi.
--
-- Ye khaana banne ke din se aaj tak sirf 'NEW' raha hai: seed us ko 'NEW' likhta hai
-- aur us ke baad koi rasta usay chhoota hi nahi. Admin ke safhe par wo ek aisa khaana
-- tha jis ki har qatar par wohi ek lafz chhapta tha.
--
-- Aur wohi us ka asal nuqsan tha: wo khaana MALOOMAT jaisa dikhta tha. Jo darja kuch
-- deta na ho aur kabhi badalta na ho, us ka dikhna un numberon ka wazan bhi kam kar
-- deta hai jo us ke saath khare hain aur jo sach bolte hain.
ALTER TABLE "Reseller" DROP COLUMN "tier";
DROP TYPE "Tier";
