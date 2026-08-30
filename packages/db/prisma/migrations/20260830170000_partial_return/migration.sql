-- Adhoori wapsi — kitne WAPAS aaye.
--
-- `qty` ko ghataya nahi jata. Wo us waqt ka snapshot hai: itna maal bheja gaya tha, aur
-- us par courier ka kharcha aur dukan ki mehnat lag chuki hai. Ghatane ka matlab hota ke
-- teen mahine baad koi dekhe aur samajhe ke sirf do hi bheje gaye the — aur wapsi ka
-- poora nuqsan tareekh se gayab ho jata.
--
-- Purane orderon par 0: un par adhoori wapsi ka koi record hai hi nahi, aur 0 wohi kehta
-- hai jo un ke bare mein maloom hai.
ALTER TABLE "OrderItem" ADD COLUMN "returnedQty" INTEGER NOT NULL DEFAULT 0;
