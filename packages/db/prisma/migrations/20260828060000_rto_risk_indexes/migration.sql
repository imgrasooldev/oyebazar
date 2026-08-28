-- Wapsi (RTO) ka andaza — do nayi ginti jo har order-safhe par chalti hain:
--   · isi customer ke number par pehle kya hua
--   · is ilaqe (area) ka chalan kya hai
--
-- Bina index ke dono poori Order table scan karti hain, aur ye wohi safha hai jo dukan
-- wala din mein sab se zyada kholta hai. CONCURRENTLY nahi: Prisma har migration ek
-- transaction mein chalata hai, aur is table ka size abhi is ke qabil hai.
CREATE INDEX "Order_customerPhone_status_idx" ON "Order"("customerPhone", "status");
CREATE INDEX "Order_area_status_idx" ON "Order"("area", "status");
