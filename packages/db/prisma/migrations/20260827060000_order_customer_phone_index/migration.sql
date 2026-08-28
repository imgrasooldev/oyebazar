-- Number ka record — poore platform par.
--
-- 🔴 Ye index LAZMI hai, sahulat ki cheez nahi. Reseller order lagate waqt number
-- likhti hai, aur usi lamhe ye ginti chalti hai. Bina index ke wo poore `Order` table
-- ko parhta — aur ye query theek us jagah lagti hai jahan reseller INTEZAR kar rahi
-- hoti hai, na ke kisi raat wale kaam mein.
--
-- Status shart mein hai, is liye wo bhi index mein — Postgres tabhi sirf index se
-- jawab de sakta hai.
CREATE INDEX "Order_customerPhone_status_idx" ON "Order"("customerPhone", "status");
