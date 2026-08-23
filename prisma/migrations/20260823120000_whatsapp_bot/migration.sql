-- WhatsApp bot state + reminder tracking
ALTER TABLE "Conversation" ADD COLUMN "botState" JSONB;
ALTER TABLE "Booking" ADD COLUMN "reminded1At" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "reminded2At" TIMESTAMP(3);
