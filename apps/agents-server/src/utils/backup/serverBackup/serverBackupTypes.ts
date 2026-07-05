import type { AgentsServerDatabase } from '../../../database/schema';

/**
 * Typed row alias for `Agent`.
 *
 * @private type of `createServerBackupZipStream`
 */
export type AgentRow = AgentsServerDatabase['public']['Tables']['Agent']['Row'];

/**
 * Typed row alias for `User`.
 *
 * @private type of `createServerBackupZipStream`
 */
export type UserRow = AgentsServerDatabase['public']['Tables']['User']['Row'];

/**
 * Typed row alias for `UserChat`.
 *
 * @private type of `createServerBackupZipStream`
 */
export type UserChatRow = AgentsServerDatabase['public']['Tables']['UserChat']['Row'];

/**
 * Typed row alias for `ChatFeedback`.
 *
 * @private type of `createServerBackupZipStream`
 */
export type ChatFeedbackRow = AgentsServerDatabase['public']['Tables']['ChatFeedback']['Row'];

/**
 * Typed row alias for `Wallet`.
 *
 * @private type of `createServerBackupZipStream`
 */
export type WalletRow = AgentsServerDatabase['public']['Tables']['Wallet']['Row'];

/**
 * Shared preview persisted for referenced users inside backup metadata files.
 *
 * @private type of `createServerBackupZipStream`
 */
export type BackupUserPreview = {
    readonly id: number;
    readonly username: string;
    readonly isAdmin: boolean;
    readonly profileImageUrl: string | null;
};

/**
 * Shared preview persisted for referenced agents inside backup metadata files.
 *
 * @private type of `createServerBackupZipStream`
 */
export type BackupAgentPreview = {
    readonly id: number;
    readonly agentName: string;
    readonly permanentId: string | null;
};
