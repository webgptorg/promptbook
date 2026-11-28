ALTER TABLE IF EXISTS "prefix_UserWallet"
    RENAME TO "prefix_Wallet";

ALTER SEQUENCE IF EXISTS "prefix_UserWallet_id_seq"
    RENAME TO "prefix_Wallet_id_seq";

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prefix_UserWallet_userId_fkey') THEN
        ALTER TABLE "prefix_Wallet"
            RENAME CONSTRAINT "prefix_UserWallet_userId_fkey" TO "prefix_Wallet_userId_fkey";
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prefix_UserWallet_agentPermanentId_fkey') THEN
        ALTER TABLE "prefix_Wallet"
            RENAME CONSTRAINT "prefix_UserWallet_agentPermanentId_fkey" TO "prefix_Wallet_agentPermanentId_fkey";
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prefix_UserWallet_scope_check') THEN
        ALTER TABLE "prefix_Wallet"
            RENAME CONSTRAINT "prefix_UserWallet_scope_check" TO "prefix_Wallet_scope_check";
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prefix_UserWallet_recordType_check') THEN
        ALTER TABLE "prefix_Wallet"
            RENAME CONSTRAINT "prefix_UserWallet_recordType_check" TO "prefix_Wallet_recordType_check";
    END IF;
END $$;

ALTER INDEX IF EXISTS "prefix_UserWallet_userId_idx"
    RENAME TO "prefix_Wallet_userId_idx";

ALTER INDEX IF EXISTS "prefix_UserWallet_userId_agentPermanentId_idx"
    RENAME TO "prefix_Wallet_userId_agentPermanentId_idx";

ALTER INDEX IF EXISTS "prefix_UserWallet_userId_isGlobal_idx"
    RENAME TO "prefix_Wallet_userId_isGlobal_idx";

ALTER INDEX IF EXISTS "prefix_UserWallet_lookup_idx"
    RENAME TO "prefix_Wallet_lookup_idx";

ALTER INDEX IF EXISTS "prefix_UserWallet_deletedAt_idx"
    RENAME TO "prefix_Wallet_deletedAt_idx";

ALTER INDEX IF EXISTS "prefix_UserWallet_isUserScoped_idx"
    RENAME TO "prefix_Wallet_isUserScoped_idx";

ALTER INDEX IF EXISTS "prefix_UserWallet_scope_lookup_idx"
    RENAME TO "prefix_Wallet_scope_lookup_idx";
