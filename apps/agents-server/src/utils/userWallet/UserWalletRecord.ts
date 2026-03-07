import type { UserWalletJsonSchema } from './UserWalletRow';

/**
 * Supported wallet record types.
 */
export type UserWalletRecordType = 'USERNAME_PASSWORD' | 'SESSION_COOKIE' | 'ACCESS_TOKEN';

/**
 * Normalized wallet record returned by API and runtime adapters.
 */
export type UserWalletRecord = {
    id: number;
    createdAt: string;
    updatedAt: string;
    userId: number;
    isUserScoped: boolean;
    agentPermanentId: string | null;
    recordType: UserWalletRecordType;
    service: string;
    key: string;
    jsonSchema: UserWalletJsonSchema;
    username: string | null;
    password: string | null;
    secret: string | null;
    cookies: string | null;
    isGlobal: boolean;
    deletedAt: string | null;
};

/**
 * List query options for wallet records.
 */
export type ListUserWalletRecordsOptions = {
    userId: number;
    agentPermanentId?: string;
    includeGlobal?: boolean;
    isUserScoped?: boolean;
    search?: string;
    recordType?: UserWalletRecordType;
    service?: string;
    key?: string;
    limit?: number;
};

/**
 * Create payload for wallet records.
 */
export type CreateUserWalletRecordOptions = {
    userId: number;
    agentPermanentId?: string | null;
    isUserScoped?: boolean;
    isGlobal: boolean;
    recordType: UserWalletRecordType;
    service: string;
    key?: string;
    jsonSchema?: unknown;
    username?: string;
    password?: string;
    secret?: string;
    cookies?: string;
};

/**
 * Update payload for wallet records.
 */
export type UpdateUserWalletRecordOptions = CreateUserWalletRecordOptions & {
    walletId: number;
};

/**
 * Delete payload for wallet records.
 */
export type DeleteUserWalletRecordOptions = {
    userId: number;
    walletId: number;
};

/**
 * Read payload for wallet records by id.
 */
export type FindUserWalletByIdOptions = {
    userId: number;
    walletId: number;
};

/**
 * Token resolution options for USE PROJECT.
 */
export type ResolveUseProjectGithubTokenOptions = {
    userId?: number;
    agentPermanentId?: string;
};

/**
 * SMTP credential resolution options for USE EMAIL.
 */
export type ResolveUseEmailSmtpCredentialOptions = {
    userId?: number;
    agentPermanentId?: string;
};
