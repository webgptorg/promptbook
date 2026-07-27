import type { AdminChatTaskRecord } from '../chatTasksAdmin';

/**
 * Options used when recording one VPS-wide setup task.
 *
 * @private internal utility of Agents Server
 */
export type VpsServerSetupTaskOptions = {
    /**
     * Human-readable operation shown in the task manager.
     */
    readonly taskName: string;

    /**
     * Searchable object identifier, usually the affected domain or domain list.
     */
    readonly chatId: string;

    /**
     * Registered server name when the operation belongs to one server.
     */
    readonly serverName?: string | null;

    /**
     * Registered server domain when the operation belongs to one server.
     */
    readonly serverDomain?: string | null;
};

/**
 * Result of resolving whether a wrapped VPS operation completed successfully.
 *
 * @private internal utility of Agents Server
 */
export type VpsServerSetupTaskResult = {
    /**
     * Whether the operation should be shown as completed.
     */
    readonly isSuccessful: boolean;

    /**
     * Optional failure summary for the task row.
     */
    readonly errorSummary?: string | null;

    /**
     * Optional failure details for the task row.
     */
    readonly errorDetails?: string | null;
};

/**
 * Persisted VPS server setup task-history file.
 *
 * @private internal utility of Agents Server
 */
export type VpsServerSetupTaskHistoryFile = {
    /**
     * File-format version.
     */
    readonly version: 1;

    /**
     * Server setup and certificate-maintenance task rows.
     */
    readonly tasks: ReadonlyArray<AdminChatTaskRecord>;
};
