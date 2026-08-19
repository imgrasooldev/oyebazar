-- Purane events par "kaun ne kiya" theek karna.
--
-- Dukan wale ke kaam ab tak `actorType = 'ops'` ke saath likhe ja rahe the aur asli
-- farq `actorId = 'supplier:<id>'` ke prefix mein chhupa hua tha (kyunke type ke union
-- mein 'supplier' tha hi nahi). Ab 'supplier' maujood hai, is liye purana data bhi
-- usi shakl mein le aate hain — warna aadha record ek tareeqe se aur aadha doosre se
-- likha rehta, aur koi bhi ginti ghalat aati.

UPDATE "Event"
SET "actorType" = 'supplier',
    "actorId" = substring("actorId" from 10)
WHERE "actorId" LIKE 'supplier:%';

UPDATE "OrderEvent"
SET "actorType" = 'supplier',
    "actorId" = substring("actorId" from 10)
WHERE "actorId" LIKE 'supplier:%';
