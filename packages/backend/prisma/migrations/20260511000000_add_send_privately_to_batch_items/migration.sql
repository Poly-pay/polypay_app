-- Add stealth (send privately) flag to batch_items.
ALTER TABLE "batch_items"
ADD COLUMN "send_privately" BOOLEAN NOT NULL DEFAULT false;
