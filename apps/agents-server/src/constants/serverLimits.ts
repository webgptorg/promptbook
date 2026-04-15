import {
    DEFAULT_FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS,
    FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS_METADATA_KEY,
} from './federatedAgentImport';
import { DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS, TOOL_USAGE_LIMITS_METADATA_KEY } from './toolUsageLimits';

/**
 * Legacy metadata key storing the maximum accepted file upload size in megabytes.
 *
 * @private shared Agents Server constant
 */
export const MAX_FILE_UPLOAD_SIZE_MB_METADATA_KEY = 'MAX_FILE_UPLOAD_SIZE_MB' as const;

/**
 * Default maximum accepted spawn depth in one tool-runtime context.
 *
 * @private shared Agents Server constant
 */
export const DEFAULT_SPAWN_AGENT_MAX_DEPTH = 2;

/**
 * Default maximum number of spawned agents allowed per actor in one time window.
 *
 * @private shared Agents Server constant
 */
export const DEFAULT_SPAWN_AGENT_RATE_LIMIT_MAX = 5;

/**
 * Default spawn rate-limit window size in milliseconds.
 *
 * @private shared Agents Server constant
 */
export const DEFAULT_SPAWN_AGENT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Stable keys used by the dedicated server-limits table.
 *
 * @private shared Agents Server constant
 */
export const SERVER_LIMIT_KEYS = {
    TIMEOUT_MAX_ACTIVE_PER_CHAT: 'TIMEOUT_MAX_ACTIVE_PER_CHAT',
    TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT: 'TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT',
    MAX_FILE_UPLOAD_SIZE_MB: MAX_FILE_UPLOAD_SIZE_MB_METADATA_KEY,
    FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS: FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS_METADATA_KEY,
    SPAWN_AGENT_MAX_DEPTH: 'SPAWN_AGENT_MAX_DEPTH',
    SPAWN_AGENT_RATE_LIMIT_MAX: 'SPAWN_AGENT_RATE_LIMIT_MAX',
    SPAWN_AGENT_RATE_LIMIT_WINDOW_MS: 'SPAWN_AGENT_RATE_LIMIT_WINDOW_MS',
} as const;

/**
 * One supported dedicated server-limit key.
 *
 * @private shared Agents Server type
 */
export type ServerLimitKey = (typeof SERVER_LIMIT_KEYS)[keyof typeof SERVER_LIMIT_KEYS];

/**
 * Supported units rendered in the admin limits page.
 *
 * @private shared Agents Server type
 */
export type ServerLimitUnit = 'count' | 'MB' | 'ms';

/**
 * Shared definition describing one supported configurable limit.
 *
 * @private shared Agents Server type
 */
export type ServerLimitDefinition = {
    readonly key: ServerLimitKey;
    readonly category: 'Timeout tools' | 'Files' | 'Federation' | 'Agent spawning';
    readonly title: string;
    readonly description: string;
    readonly unit: ServerLimitUnit;
    readonly defaultValue: number;
    readonly minimumValue: number;
    readonly step: number;
    readonly legacyMetadataKeys: ReadonlyArray<string>;
};

/**
 * Shared metadata for all server limits exposed in the admin UI and runtime loaders.
 *
 * @private shared Agents Server constant
 */
export const SERVER_LIMIT_DEFINITIONS = [
    {
        key: SERVER_LIMIT_KEYS.TIMEOUT_MAX_ACTIVE_PER_CHAT,
        category: 'Timeout tools',
        title: 'Max active timers per chat',
        description: 'Prevents one chat thread from scheduling too many timers at once.',
        unit: 'count',
        defaultValue: DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS.maxActivePerChat,
        minimumValue: 1,
        step: 1,
        legacyMetadataKeys: [TOOL_USAGE_LIMITS_METADATA_KEY],
    },
    {
        key: SERVER_LIMIT_KEYS.TIMEOUT_MAX_FIRED_PER_DAY_PER_CHAT,
        category: 'Timeout tools',
        title: 'Max timers fired per day per chat',
        description: 'Limits how many scheduled wake-ups can execute inside one chat within one UTC day.',
        unit: 'count',
        defaultValue: DEFAULT_TIMEOUT_TOOL_USAGE_LIMITS.maxFiredPerDayPerChat,
        minimumValue: 1,
        step: 1,
        legacyMetadataKeys: [TOOL_USAGE_LIMITS_METADATA_KEY],
    },
    {
        key: SERVER_LIMIT_KEYS.MAX_FILE_UPLOAD_SIZE_MB,
        category: 'Files',
        title: 'Max file upload size',
        description: 'Caps the size of uploaded files accepted by chat uploads and Android share-target imports.',
        unit: 'MB',
        defaultValue: 50,
        minimumValue: 1,
        step: 1,
        legacyMetadataKeys: [MAX_FILE_UPLOAD_SIZE_MB_METADATA_KEY],
    },
    {
        key: SERVER_LIMIT_KEYS.FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS,
        category: 'Federation',
        title: 'Federated import retry delay',
        description: 'Wait time between retries when importing agent books from federated servers.',
        unit: 'ms',
        defaultValue: DEFAULT_FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS,
        minimumValue: 0,
        step: 100,
        legacyMetadataKeys: [FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS_METADATA_KEY],
    },
    {
        key: SERVER_LIMIT_KEYS.SPAWN_AGENT_MAX_DEPTH,
        category: 'Agent spawning',
        title: 'Max spawn depth',
        description: 'Restricts how many nested `spawn_agent` hops can happen inside one tool runtime context.',
        unit: 'count',
        defaultValue: DEFAULT_SPAWN_AGENT_MAX_DEPTH,
        minimumValue: 1,
        step: 1,
        legacyMetadataKeys: [],
    },
    {
        key: SERVER_LIMIT_KEYS.SPAWN_AGENT_RATE_LIMIT_MAX,
        category: 'Agent spawning',
        title: 'Max spawned agents per window',
        description: 'Limits how many persistent agents one actor can create through `spawn_agent` inside one rate-limit window.',
        unit: 'count',
        defaultValue: DEFAULT_SPAWN_AGENT_RATE_LIMIT_MAX,
        minimumValue: 1,
        step: 1,
        legacyMetadataKeys: [],
    },
    {
        key: SERVER_LIMIT_KEYS.SPAWN_AGENT_RATE_LIMIT_WINDOW_MS,
        category: 'Agent spawning',
        title: 'Spawn rate-limit window',
        description: 'Time window used together with the spawn quota for `spawn_agent` abuse protection.',
        unit: 'ms',
        defaultValue: DEFAULT_SPAWN_AGENT_RATE_LIMIT_WINDOW_MS,
        minimumValue: 1_000,
        step: 1_000,
        legacyMetadataKeys: [],
    },
] satisfies ReadonlyArray<ServerLimitDefinition>;

/**
 * Fast lookup map used by server-limit validators and UI helpers.
 *
 * @private shared Agents Server constant
 */
export const SERVER_LIMIT_DEFINITION_BY_KEY = new Map<ServerLimitKey, ServerLimitDefinition>(
    SERVER_LIMIT_DEFINITIONS.map((definition) => [definition.key, definition]),
);

/**
 * Fully normalized default values keyed by dedicated server-limit ids.
 *
 * @private shared Agents Server constant
 */
const defaultServerLimitValues: Record<ServerLimitKey, number> = {} as Record<ServerLimitKey, number>;
for (const definition of SERVER_LIMIT_DEFINITIONS) {
    defaultServerLimitValues[definition.key] = definition.defaultValue;
}

/**
 * Default values used whenever a server-limit row has not been persisted yet.
 *
 * @private shared Agents Server constant
 */
export const DEFAULT_SERVER_LIMIT_VALUES = Object.freeze(defaultServerLimitValues) as Readonly<
    Record<ServerLimitKey, number>
>;

/**
 * Deprecated metadata keys that now mirror dedicated server-limit rows for backward compatibility.
 *
 * @private shared Agents Server constant
 */
export const DEPRECATED_LIMIT_METADATA_KEYS = Array.from(
    new Set(SERVER_LIMIT_DEFINITIONS.flatMap((definition) => definition.legacyMetadataKeys)),
);

/**
 * Description of one deprecated metadata key that now points to the dedicated limits page.
 *
 * @private shared Agents Server type
 */
export type DeprecatedLimitMetadataDefinition = {
    readonly key: string;
    readonly href: '/admin/limits';
    readonly limitKeys: ReadonlyArray<ServerLimitKey>;
    readonly limitTitles: ReadonlyArray<string>;
    readonly message: string;
};

/**
 * Returns the deprecated-metadata descriptor when one metadata key now belongs to the limits page.
 *
 * @param metadataKey - Metadata key being rendered in the admin metadata UI.
 * @returns Deprecated metadata descriptor or `null`.
 *
 * @private shared Agents Server helper
 */
export function getDeprecatedLimitMetadataDefinition(metadataKey: string): DeprecatedLimitMetadataDefinition | null {
    const relatedDefinitions = SERVER_LIMIT_DEFINITIONS.filter((definition) =>
        definition.legacyMetadataKeys.some((candidateKey) => candidateKey === metadataKey),
    );

    if (relatedDefinitions.length === 0) {
        return null;
    }

    const limitTitles = relatedDefinitions.map((definition) => definition.title);
    return {
        key: metadataKey,
        href: '/admin/limits',
        limitKeys: relatedDefinitions.map((definition) => definition.key),
        limitTitles,
        message: `Deprecated. Manage ${limitTitles.join(', ')} in /admin/limits instead.`,
    };
}

/**
 * Resolves one shared server-limit definition by key.
 *
 * @param key - Dedicated server-limit key.
 * @returns Matching definition or `null`.
 *
 * @private shared Agents Server helper
 */
export function getServerLimitDefinition(key: string): ServerLimitDefinition | null {
    return SERVER_LIMIT_DEFINITION_BY_KEY.get(key as ServerLimitKey) ?? null;
}
