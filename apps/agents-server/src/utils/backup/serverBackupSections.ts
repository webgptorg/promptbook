import type { AgentsServerDatabase } from '../../database/schema';

/**
 * Logical section keys available to the server backup UI and API.
 */
export type ServerBackupSectionKey =
    | 'metadata'
    | 'agents'
    | 'conversations'
    | 'users'
    | 'files'
    | 'messages'
    | 'security'
    | 'caches';

/**
 * One backup-section definition shared between the UI and the server export route.
 */
export type ServerBackupSectionDefinition = {
    /**
     * Stable query/API key for the section.
     */
    readonly key: ServerBackupSectionKey;
    /**
     * Human-readable label shown in the admin UI.
     */
    readonly label: string;
    /**
     * Short UI description of the data covered by the section.
     */
    readonly description: string;
    /**
     * Directory name used inside the generated ZIP.
     */
    readonly directoryName: string;
    /**
     * Tables exported as JSON files for this section.
     */
    readonly tables: ReadonlyArray<keyof AgentsServerDatabase['public']['Tables']>;
    /**
     * Whether this section also includes the books tree export.
     */
    readonly includesBooks: boolean;
};

/**
 * Backup sections offered on the Agents Server admin backup page.
 */
export const SERVER_BACKUP_SECTION_DEFINITIONS: ReadonlyArray<ServerBackupSectionDefinition> = [
    {
        key: 'metadata',
        label: 'Metadata and limits',
        description: 'Server-wide metadata rows and explicit limit overrides.',
        directoryName: 'metadata',
        tables: ['Metadata', 'ServerLimit'],
        includesBooks: false,
    },
    {
        key: 'agents',
        label: 'Agents and books',
        description: 'Agents, folders, version history, externals, and the exported `.book` files.',
        directoryName: 'agents',
        tables: ['Agent', 'AgentFolder', 'AgentHistory', 'AgentExternals'],
        includesBooks: true,
    },
    {
        key: 'conversations',
        label: 'Conversations and feedback',
        description: 'User chat threads, chat jobs, raw chat history, and feedback records.',
        directoryName: 'conversations',
        tables: ['UserChat', 'UserChatJob', 'ChatHistory', 'ChatFeedback'],
        includesBooks: false,
    },
    {
        key: 'users',
        label: 'Users and user data',
        description: 'Users plus related memories, structured user data, and wallet records.',
        directoryName: 'users',
        tables: ['User', 'UserMemory', 'UserData', 'Wallet'],
        includesBooks: false,
    },
    {
        key: 'files',
        label: 'Files and media',
        description: 'Uploaded files, generated images, and vector-store source hash records.',
        directoryName: 'files',
        tables: ['File', 'Image', 'VectorStoreKnowledgeSourceHashes'],
        includesBooks: false,
    },
    {
        key: 'messages',
        label: 'Messages',
        description: 'System messages and their send-attempt delivery records.',
        directoryName: 'messages',
        tables: ['Message', 'MessageSendAttempt'],
        includesBooks: false,
    },
    {
        key: 'security',
        label: 'Security and access',
        description: 'API tokens and other access-control records used by the server.',
        directoryName: 'security',
        tables: ['ApiTokens'],
        includesBooks: false,
    },
    {
        key: 'caches',
        label: 'Caches and runtime state',
        description: 'LLM caches and runtime coordination tables that may help restore server state.',
        directoryName: 'caches',
        tables: ['LlmCache', 'OpenAiAssistantCache', 'GenerationLock'],
        includesBooks: false,
    },
] as const;

/**
 * All available backup section keys in canonical display/export order.
 */
export const ALL_SERVER_BACKUP_SECTION_KEYS = SERVER_BACKUP_SECTION_DEFINITIONS.map(({ key }) => key);

/**
 * Fast lookup table for section definitions.
 */
export const SERVER_BACKUP_SECTION_DEFINITION_BY_KEY = new Map(
    SERVER_BACKUP_SECTION_DEFINITIONS.map((definition) => [definition.key, definition] as const),
);

/**
 * Narrows untrusted input to a supported backup section key.
 *
 * @param value - Raw query/UI value.
 * @returns `true` when the value is a valid server backup section key.
 */
export function isServerBackupSectionKey(value: string): value is ServerBackupSectionKey {
    return SERVER_BACKUP_SECTION_DEFINITION_BY_KEY.has(value as ServerBackupSectionKey);
}

/**
 * Normalizes requested section keys into canonical order without duplicates.
 *
 * Falls back to a full backup when no valid keys are provided.
 *
 * @param requestedSectionKeys - Raw requested keys from the UI or route.
 * @returns Stable ordered unique list of supported section keys.
 */
export function normalizeServerBackupSectionKeys(
    requestedSectionKeys: ReadonlyArray<string>,
): ReadonlyArray<ServerBackupSectionKey> {
    const requestedSectionKeySet = new Set(requestedSectionKeys.filter(isServerBackupSectionKey));

    if (requestedSectionKeySet.size === 0) {
        return ALL_SERVER_BACKUP_SECTION_KEYS;
    }

    return ALL_SERVER_BACKUP_SECTION_KEYS.filter((sectionKey) => requestedSectionKeySet.has(sectionKey));
}
