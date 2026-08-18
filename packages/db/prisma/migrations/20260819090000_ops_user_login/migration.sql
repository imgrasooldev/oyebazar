-- Ops ka apna login: ab shared API key ke bajaye asli user session.
-- Phone nullable hai — purane rows ke paas number nahi, aur email se login nahi hota.
ALTER TABLE "OpsUser" ADD COLUMN "phone" TEXT;
ALTER TABLE "OpsUser" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "OpsUser_phone_key" ON "OpsUser"("phone");
