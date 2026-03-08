import type { TODO_any } from '../../_packages/types.index';

/**
 * Supported wallet record types.
 *
 * @private type of WalletCommitmentDefinition
 */
export type WalletRecordType = 'USERNAME_PASSWORD' | 'SESSION_COOKIE' | 'ACCESS_TOKEN';

/**
 * Normalized wallet record payload used by runtime adapters.
 *
 * @private type of WalletCommitmentDefinition
 */
export type WalletToolRecord = {
    id?: string;
    recordType: WalletRecordType;
    service: string;
    key: string;
    username?: string | null;
    password?: string | null;
    secret?: string | null;
    cookies?: string | null;
    isUserScoped: boolean;
    isGlobal: boolean;
    createdAt?: string;
    updatedAt?: string;
};

/**
 * Runtime context for wallet operations.
 *
 * @private type of WalletCommitmentDefinition
 */
export type WalletToolRuntimeContext = {
    readonly enabled: boolean;
    readonly userId?: number;
    readonly username?: string;
    readonly agentId?: string;
    readonly agentName?: string;
    readonly isTeamConversation: boolean;
    readonly isPrivateMode: boolean;
};

/**
 * Runtime adapter interface used by wallet tools.
 *
 * @private type of WalletCommitmentDefinition
 */
export type WalletToolRuntimeAdapter = {
    retrieveWalletRecords(
        args: {
            query?: string;
            recordType?: WalletRecordType;
            service?: string;
            key?: string;
            limit?: number;
        },
        runtimeContext: WalletToolRuntimeContext,
    ): Promise<WalletToolRecord[]>;
    storeWalletRecord(
        args: WalletToolRecord & {
            username?: string | null;
            password?: string | null;
            secret?: string | null;
            cookies?: string | null;
        },
        runtimeContext: WalletToolRuntimeContext,
    ): Promise<WalletToolRecord>;
    updateWalletRecord(
        args: WalletToolRecord & {
            walletId: string;
            username?: string | null;
            password?: string | null;
            secret?: string | null;
            cookies?: string | null;
        },
        runtimeContext: WalletToolRuntimeContext,
    ): Promise<WalletToolRecord>;
    deleteWalletRecord(args: { walletId: string }, runtimeContext: WalletToolRuntimeContext): Promise<{ id?: string }>;
};

/**
 * Arguments accepted by `retrieve_wallet_records`.
 *
 * @private type of WalletCommitmentDefinition
 */
export type RetrieveWalletRecordsToolArgs = {
    query?: string;
    recordType?: WalletRecordType;
    service?: string;
    key?: string;
    limit?: number;
    [key: string]: TODO_any;
};

/**
 * Arguments accepted by `store_wallet_record`.
 *
 * @private type of WalletCommitmentDefinition
 */
export type StoreWalletRecordToolArgs = {
    recordType?: WalletRecordType;
    service?: string;
    key?: string;
    username?: string;
    password?: string;
    secret?: string;
    cookies?: string;
    isUserScoped?: boolean;
    isGlobal?: boolean;
    [key: string]: TODO_any;
};

/**
 * Arguments accepted by `update_wallet_record`.
 *
 * @private type of WalletCommitmentDefinition
 */
export type UpdateWalletRecordToolArgs = StoreWalletRecordToolArgs & {
    walletId?: string;
};

/**
 * Arguments accepted by `delete_wallet_record`.
 *
 * @private type of WalletCommitmentDefinition
 */
export type DeleteWalletRecordToolArgs = {
    walletId?: string;
    [key: string]: TODO_any;
};

/**
 * Arguments accepted by `request_wallet_record`.
 *
 * @private type of WalletCommitmentDefinition
 */
export type RequestWalletRecordToolArgs = {
    recordType?: WalletRecordType;
    service?: string;
    key?: string;
    message?: string;
    isUserScoped?: boolean;
    isGlobal?: boolean;
    [key: string]: TODO_any;
};

/**
 * Parsed request payload for `request_wallet_record`.
 *
 * @private type of WalletCommitmentDefinition
 */
export type WalletRequestRecord = {
    recordType: WalletRecordType;
    service: string;
    key: string;
    message?: string;
    isUserScoped: boolean;
    isGlobal: boolean;
};

/**
 * Runtime wallet-tool action name.
 *
 * @private type of WalletCommitmentDefinition
 */
export type WalletRuntimeToolAction = 'retrieve' | 'store' | 'update' | 'delete';

/**
 * Result payload returned when a runtime wallet action is disabled.
 *
 * @private type of WalletCommitmentDefinition
 */
export type WalletDisabledToolResult = {
    action: WalletRuntimeToolAction;
    status: 'disabled';
    records?: Array<never>;
    message: string;
};
