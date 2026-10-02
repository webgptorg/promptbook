import type { AgentBasicInformation } from '../../book-2.0/agent-source/AgentBasicInformation';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { string_agent_name, string_agent_permanent_id } from '../../types/string_agent_name';
import type { CreateAgentInput } from './CreateAgentInput';

/**
 * Controls for a source save. Workspace storage requires the revision observed by the caller.
 * @private internal collection save/history types
 */
export type UpdateAgentSourceOptions = {
    readonly versionName?: string | null;
    readonly expectedSource?: string;
    readonly expectedSourceHash?: string;
};

/**
 * History metadata shared by database and file-backed collections.
 * @private internal collection save/history types
 */
export type AgentHistoryMetadata = {
    readonly id: number;
    readonly createdAt: string;
    readonly agentName: string;
    readonly agentHash: string;
    readonly previousAgentHash: string | null;
    readonly promptbookEngineVersion: string;
    readonly versionName: string | null;
};

/**
 * An immutable source snapshot, independent of authoritative source storage.
 * @private internal collection save/history types
 */
export type AgentHistorySnapshot = AgentHistoryMetadata & { readonly agentSource: string };

/**
 * Collection that groups together multiple AI Agents
 *
 * Storage contract for agent definitions and stable identities. Chats and permissions are separate application data.
 * @public exported from `@promptbook/core`
 */
export type AgentCollection = {
    /** Namespace used by application preparation caches. */
    readonly options?: { readonly tablePrefix?: string; readonly isVerbose?: boolean };
    /** Lists valid active definitions. */
    listAgents(): Promise<ReadonlyArray<AgentBasicInformation>>;
    /** Resolves one valid active definition. */
    findAgentBasicInformation(
        identifier: string_agent_name | string_agent_permanent_id,
    ): Promise<AgentBasicInformation | null>;
    /** Resolves a permanent identity, including deleted agents for restoration. */
    getAgentPermanentId(identifier: string_agent_name | string_agent_permanent_id): Promise<string_agent_permanent_id>;
    /** Reads authoritative source. */
    getAgentSource(identifier: string_agent_name | string_agent_permanent_id): Promise<string_book>;
    /** Creates source and identity. */
    createAgent(
        source: string_book,
        options?: Omit<CreateAgentInput, 'source'>,
    ): Promise<AgentBasicInformation & Required<Pick<AgentBasicInformation, 'permanentId'>>>;
    /** Saves source-backed information, including title and visibility. */
    updateAgentSource(
        identifier: string_agent_permanent_id,
        source: string_book,
        options?: UpdateAgentSourceOptions,
    ): Promise<void>;
    /** Lists deleted identities. */
    listDeletedAgents(): Promise<ReadonlyArray<AgentBasicInformation>>;
    /** Lists source history. */
    listAgentHistory(identifier: string_agent_permanent_id): Promise<ReadonlyArray<AgentHistoryMetadata>>;
    /** Lists complete history snapshots. */
    listAgentHistorySnapshots(identifier: string_agent_permanent_id): Promise<ReadonlyArray<AgentHistorySnapshot>>;
    /** Restores a deleted definition. */
    restoreAgent(identifier: string_agent_permanent_id): Promise<void>;
    /** Restores a historical source. */
    restoreAgentFromHistory(historyId: number, expectedPermanentId?: string_agent_permanent_id): Promise<void>;
    /** Deletes active source while retaining operational history. */
    deleteAgent(identifier: string_agent_permanent_id): Promise<void>;
    /** Groups an authorized organization operation for stores with an external source/organization representation. */
    mutateOrganization?<Result>(operation: () => Promise<Result>): Promise<Result>;
};
