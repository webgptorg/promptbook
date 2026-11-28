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
 * Selection mode exposed for one backup section.
 */
export type ServerBackupSectionSelectionKind = 'exportable' | 'excluded';

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
     * Whether admins can actively include this section in the archive.
     */
    readonly selectionKind: ServerBackupSectionSelectionKind;
    /**
     * Directory name used inside the generated ZIP.
     */
    readonly directoryName: string;
    /**
     * Legacy tables preserved for sections that intentionally keep the existing structure.
     */
    readonly tables?: ReadonlyArray<keyof AgentsServerDatabase['public']['Tables']>;
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
        description: 'Server-wide settings and admin-defined limits exported as one JSON key-value file.',
        selectionKind: 'exportable',
        directoryName: 'metadata',
        includesBooks: false,
    },
    {
        key: 'agents',
        label: 'Agents and books',
        description: 'Agents, folders, version history, externals, and the existing `.book` backup tree.',
        selectionKind: 'exportable',
        directoryName: 'agents',
        tables: ['Agent', 'AgentFolder', 'AgentHistory', 'AgentExternals'],
        includesBooks: true,
    },
    {
        key: 'conversations',
        label: 'Conversations and feedback',
        description: 'One JSON chat export per conversation plus feedback threads and feedback details.',
        selectionKind: 'exportable',
        directoryName: 'conversations',
        includesBooks: false,
    },
    {
        key: 'users',
        label: 'Users and user data',
        description: 'One JSON file per user with profile, memories, structured data, and redacted wallet records.',
        selectionKind: 'exportable',
        directoryName: 'users',
        includesBooks: false,
    },
    {
        key: 'files',
        label: 'Files and media',
        description: 'Original uploaded files and generated media, each paired with restore metadata.',
        selectionKind: 'exportable',
        directoryName: 'files',
        includesBooks: false,
    },
    {
        key: 'messages',
        label: 'Zpravy',
        description: 'One JSON file per inbound or outbound message with delivery history.',
        selectionKind: 'exportable',
        directoryName: 'messages',
        includesBooks: false,
    },
    {
        key: 'security',
        label: 'Security and access',
        description: 'Sensitive secrets such as tokens and passwords are intentionally excluded from backups.',
        selectionKind: 'excluded',
        directoryName: 'security',
        includesBooks: false,
    },
    {
        key: 'caches',
        label: 'Caches and runtime state',
        description: 'Runtime caches and coordination state are intentionally excluded from backups.',
        selectionKind: 'excluded',
        directoryName: 'caches',
        includesBooks: false,
    },
] as const;

/**
 * All available backup section keys in canonical display/export order.
 */
export const ALL_SERVER_BACKUP_SECTION_KEYS = SERVER_BACKUP_SECTION_DEFINITIONS.map(({ key }) => key);

/**
 * Section keys enabled by default when the admin downloads a full backup.
 */
export const DEFAULT_SERVER_BACKUP_SECTION_KEYS = SERVER_BACKUP_SECTION_DEFINITIONS.filter(
    ({ selectionKind }) => selectionKind === 'exportable',
).map(({ key }) => key);

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
        return DEFAULT_SERVER_BACKUP_SECTION_KEYS;
    }

    return ALL_SERVER_BACKUP_SECTION_KEYS.filter((sectionKey) => requestedSectionKeySet.has(sectionKey));
}
