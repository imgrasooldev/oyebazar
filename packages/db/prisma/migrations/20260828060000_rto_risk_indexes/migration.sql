-- Wapsi (RTO) ka andaza — do nayi ginti jo har order-safhe par chalti hain:
--   · isi customer ke number par pehle kya hua
--   · is ilaqe (area) ka chalan kya hai
--
-- Bina index ke dono poori Order table scan karti hain, aur ye wohi safha hai jo dukan
-- wala din mein sab se zyada kholta hai. CONCURRENTLY nahi: Prisma har migration ek
-- transaction mein chalata hai, aur is table ka size abhi is ke qabil hai.
--
-- 🔴 `IF NOT EXISTS` — production par `Order_customerPhone_status_idx` PEHLE se mojood
-- hai. Wo ek purani migration se aya jo is repo mein nahi hai (production ka record
-- yahan se hat chuka hai — dekhen `prisma migrate status`). Bina is shart ke ye
-- migration wahan "already exists" par mar jati, Prisma usay FAILED nishan laga deta,
-- aur us ke baad har agli migration bhi ruk jati — jab tak koi haath se resolve na kare.
--
-- `Order_area_status_idx` production par abhi nahi hai; ye shart us ke banne ko nahi
-- rokti, sirf dobara banne ko rokti hai.
CREATE INDEX IF NOT EXISTS "Order_customerPhone_status_idx" ON "Order"("customerPhone", "status");
CREATE INDEX IF NOT EXISTS "Order_area_status_idx" ON "Order"("area", "status");
