-- Add draftMessage column to UserChat table to preserve input field text
ALTER TABLE "prefix_UserChat"
ADD COLUMN "draftMessage" TEXT NULL DEFAULT NULL;
