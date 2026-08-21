-- Raste mein khare order par dukan se ek dafa poochha jata hai; nishan yahan.
-- Bina is ke ya to roz nag jata (aur log paighaam parhna chhor dete hain),
-- ya bilkul nahi jata aur reseller ka paisa DISPATCHED par atka reh jata.
ALTER TABLE "Order" ADD COLUMN "transitReminderAt" TIMESTAMP(3);
