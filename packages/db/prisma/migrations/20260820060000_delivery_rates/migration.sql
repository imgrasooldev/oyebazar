-- Delivery ka rate dukan ke apne haath mein — do khaane.
--
-- Pehle reseller order lagate waqt khud likhti thi (default 200). Do kharabiyan: sheher
-- ka koi farq nahi tha (Karachi ke andar aur Karachi se Skardu, dono par wohi 200), aur
-- rate wo likhti thi jo courier ka bill bharti hi nahi.
--
-- Purani qadar (200) hi default rakhi hai taake chalte hue order ka hisab na badle.

ALTER TABLE "Supplier" ADD COLUMN "deliveryFeeCity" INTEGER NOT NULL DEFAULT 200;
ALTER TABLE "Supplier" ADD COLUMN "deliveryFeeOther" INTEGER NOT NULL DEFAULT 350;
