-- Allow the new `BROWSER_PROFILE` wallet record type which links one agent to its persistent
-- browser-profile directory on the filesystem.
--
-- Backwards compatible: older server versions keep reading and writing the existing record types,
-- they only cannot create `BROWSER_PROFILE` records.

ALTER TABLE "prefix_Wallet"
    DROP CONSTRAINT IF EXISTS "prefix_Wallet_recordType_check";

-- The constraint kept its original name when the table was renamed from `prefix_UserWallet`
ALTER TABLE "prefix_Wallet"
    DROP CONSTRAINT IF EXISTS "prefix_UserWallet_recordType_check";

ALTER TABLE "prefix_Wallet"
    ADD CONSTRAINT "prefix_Wallet_recordType_check"
    CHECK ("recordType" IN ('USERNAME_PASSWORD', 'SESSION_COOKIE', 'ACCESS_TOKEN', 'BROWSER_PROFILE'));
