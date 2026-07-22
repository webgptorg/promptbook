import type { LocalSqliteUpsertOptions } from './localSqliteTypes';
import { uniqueStrings } from './localSqliteSql';

/**
 * Read index definition for hot SQLite queries.
 *
 * @private type of `$provideLocalSqliteSupabase`
 */
export type LocalSqliteReadIndex = {
    readonly name: string;
    readonly columns: ReadonlyArray<string>;
};

/**
 * Columns whose values are persisted as JSON text in local SQLite.
 *
 * @private constant of `$provideLocalSqliteSupabase`
 */
const JSON_COLUMNS_BY_TABLE = new Map<string, ReadonlySet<string>>([
    ['Agent', new Set(['agentProfile', 'usage', 'preparedModelRequirements', 'preparedExternals'])],
    ['AgentHistory', new Set([])],
    ['ChatHistory', new Set(['message', 'usage'])],
    ['LlmCache', new Set(['value'])],
    ['VectorStoreKnowledgeSourceHashes', new Set([])],
    ['Image', new Set([])],
    ['File', new Set(['securityResult'])],
    ['Message', new Set(['sender', 'recipients', 'metadata'])],
    ['MessageSendAttempt', new Set(['raw'])],
    ['UserChat', new Set(['messages'])],
    ['UserChatJob', new Set(['parameters'])],
    ['UserChatTimeout', new Set(['parameters'])],
    ['UserData', new Set(['value'])],
    ['Wallet', new Set(['jsonSchema'])],
    ['ShareTargetPayload', new Set(['attachments'])],
    ['CalendarConnection', new Set(['scopes'])],
    ['CalendarActivity', new Set(['details'])],
    ['ShibbolethUserIdentity', new Set(['rawAttributes'])],
    ['ShibbolethAuthenticationAttempt', new Set(['rawAttributes'])],
]);

/**
 * Columns that must always be surfaced as strings even when an older SQLite
 * table was created with numeric affinity.
 *
 * @private constant of `$provideLocalSqliteSupabase`
 */
const TEXT_COLUMNS_BY_TABLE = new Map<string, ReadonlySet<string>>([['Metadata', new Set(['key', 'value', 'note'])]]);

/**
 * Table-specific integer columns whose names would otherwise be ambiguous.
 *
 * @private constant of `$provideLocalSqliteSupabase`
 */
const INTEGER_COLUMNS_BY_TABLE = new Map<string, ReadonlySet<string>>([['ServerLimit', new Set(['value'])]]);

/**
 * Boolean columns stored as integers by SQLite and restored as booleans.
 *
 * @private constant of `$provideLocalSqliteSupabase`
 */
const BOOLEAN_COLUMNS = new Set(['isAdmin', 'isRevoked', 'isGlobal', 'isUserScoped', 'isSuccessful', 'isChatFocused']);

/**
 * Tables whose primary key is provided as text rather than generated numerically.
 *
 * @private constant of `$provideLocalSqliteSupabase`
 */
const TEXT_PRIMARY_KEY_TABLES = new Set([
    'UserChat',
    'UserChatJob',
    'UserChatTimeout',
    'UserPushSubscription',
    'ShareTargetPayload',
]);

/**
 * Unique constraints required by common Supabase upsert and duplicate-detection flows.
 *
 * @private constant of `$provideLocalSqliteSupabase`
 */
const UNIQUE_INDEX_COLUMNS_BY_TABLE = new Map<string, ReadonlyArray<ReadonlyArray<string>>>([
    ['_Server', [['name'], ['domain'], ['tablePrefix']]],
    ['Metadata', [['key']]],
    ['ServerLimit', [['key']]],
    ['Agent', [['permanentId']]],
    ['AgentExternals', [['type', 'hash']]],
    ['VectorStoreKnowledgeSourceHashes', [['source']]],
    ['User', [['username']]],
    ['ShibbolethUserIdentity', [['userId'], ['email'], ['nameId']]],
    ['UserChatJob', [['chatId', 'clientMessageId']]],
    ['LlmCache', [['hash']]],
    ['OpenAiAssistantCache', [['agentHash']]],
    ['ApiTokens', [['token']]],
    ['GenerationLock', [['lockKey']]],
    ['CustomStylesheet', [['scope']]],
    ['CustomJavascript', [['scope']]],
    ['Wallet', [['userId', 'agentPermanentId', 'service', 'key']]],
    ['UserData', [['userId', 'key']]],
    ['UserPushSubscription', [['endpoint']]],
]);

/**
 * Non-unique indexes for frequent standalone VPS reads.
 *
 * @private constant of `$provideLocalSqliteSupabase`
 */
const READ_INDEXES_BY_TABLE = new Map<string, ReadonlyArray<LocalSqliteReadIndex>>([
    [
        'Agent',
        [
            { name: 'agentName_lookup', columns: ['agentName'] },
            { name: 'active_directory', columns: ['deletedAt', 'sortOrder', 'agentName'] },
            { name: 'public_active_directory', columns: ['visibility', 'deletedAt', 'sortOrder', 'agentName'] },
        ],
    ],
    [
        'AgentFolder',
        [{ name: 'active_directory', columns: ['deletedAt', 'parentId', 'sortOrder', 'name'] }],
    ],
    [
        'UserChat',
        [
            { name: 'user_agent_source_createdAt', columns: ['userId', 'agentPermanentId', 'source', 'createdAt'] },
            { name: 'agent_source_user_createdAt', columns: ['agentPermanentId', 'source', 'userId', 'createdAt'] },
        ],
    ],
    [
        'UserChatJob',
        [
            { name: 'ready_queue', columns: ['status', 'cancelRequestedAt', 'queuedAt', 'createdAt'] },
            { name: 'active_chat_scope', columns: ['chatId', 'userId', 'agentPermanentId', 'status', 'createdAt'] },
            { name: 'agent_chat_status', columns: ['agentPermanentId', 'chatId', 'status'] },
            { name: 'running_lease', columns: ['status', 'leaseExpiresAt'] },
        ],
    ],
    [
        'UserChatTimeout',
        [
            { name: 'ready_due', columns: ['status', 'cancelRequestedAt', 'pausedAt', 'dueAt', 'createdAt'] },
            {
                name: 'active_chat_scope',
                columns: ['chatId', 'userId', 'agentPermanentId', 'status', 'pausedAt', 'dueAt', 'createdAt'],
            },
            { name: 'running_lease', columns: ['status', 'leaseExpiresAt'] },
        ],
    ],
]);

/**
 * Known unique conflict columns used when `.upsert` omits `onConflict`.
 *
 * @private constant of `$provideLocalSqliteSupabase`
 */
const DEFAULT_UPSERT_CONFLICT_COLUMNS_BY_TABLE = new Map<string, ReadonlyArray<string>>([
    ['AgentExternals', ['type', 'hash']],
    ['LlmCache', ['hash']],
    ['VectorStoreKnowledgeSourceHashes', ['source']],
    ['Metadata', ['key']],
    ['ServerLimit', ['key']],
]);

/**
 * Resolves a table base name from the actual prefixed table name.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function resolveTableBaseName(tableName: string): string {
    const knownTableNames = uniqueStrings([
        '_Server',
        ...Array.from(JSON_COLUMNS_BY_TABLE.keys()),
        ...Array.from(UNIQUE_INDEX_COLUMNS_BY_TABLE.keys()),
        ...Array.from(TEXT_PRIMARY_KEY_TABLES),
        'AgentFolder',
        'CustomStylesheet',
        'CustomJavascript',
        'CalendarActivity',
    ]).sort((left, right) => right.length - left.length);

    return knownTableNames.find((knownTableName) => tableName.endsWith(knownTableName)) || tableName;
}

/**
 * Resolves columns participating in known unique indexes.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function resolveUniqueIndexColumns(tableBaseName: string): Array<string> {
    return resolveUniqueIndexes(tableBaseName).flatMap((columns) => [...columns]);
}

/**
 * Resolves columns participating in known read indexes.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function resolveReadIndexColumns(tableBaseName: string): Array<string> {
    return resolveReadIndexes(tableBaseName).flatMap((readIndex) => [...readIndex.columns]);
}

/**
 * Resolves upsert conflict columns.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function resolveUpsertConflictColumns(
    tableBaseName: string,
    options: LocalSqliteUpsertOptions,
): ReadonlyArray<string> {
    if (options.onConflict) {
        return options.onConflict
            .split(',')
            .map((column) => column.trim())
            .filter(Boolean);
    }

    return DEFAULT_UPSERT_CONFLICT_COLUMNS_BY_TABLE.get(tableBaseName) || [];
}

/**
 * Resolves the unique index definitions declared for a table base name.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function resolveUniqueIndexes(tableBaseName: string): ReadonlyArray<ReadonlyArray<string>> {
    return UNIQUE_INDEX_COLUMNS_BY_TABLE.get(tableBaseName) || [];
}

/**
 * Resolves the read index definitions declared for a table base name.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function resolveReadIndexes(tableBaseName: string): ReadonlyArray<LocalSqliteReadIndex> {
    return READ_INDEXES_BY_TABLE.get(tableBaseName) || [];
}

/**
 * Resolves whether a column is JSON for a specific table.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function isJsonColumn(tableName: string, column: string): boolean {
    return isJsonColumnForTableBaseName(resolveTableBaseName(tableName), column);
}

/**
 * Resolves whether a column should be forced to a string for a specific table.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function isTextColumn(tableName: string, column: string): boolean {
    return isTextColumnForTableBaseName(resolveTableBaseName(tableName), column);
}

/**
 * Resolves whether a column is a boolean stored as an integer.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function isBooleanColumn(column: string): boolean {
    return BOOLEAN_COLUMNS.has(column);
}

/**
 * Resolves whether a table base name uses a text primary key.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function isTextPrimaryKeyTable(tableBaseName: string): boolean {
    return TEXT_PRIMARY_KEY_TABLES.has(tableBaseName);
}

/**
 * Resolves SQLite column affinity for dynamically added columns.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
export function resolveSqliteColumnType(tableBaseName: string, column: string): string {
    if (isTextColumnForTableBaseName(tableBaseName, column) || isJsonColumnForTableBaseName(tableBaseName, column)) {
        return 'TEXT';
    }
    if (BOOLEAN_COLUMNS.has(column)) {
        return 'INTEGER';
    }
    if (isIntegerColumnForTableBaseName(tableBaseName, column)) {
        return 'INTEGER';
    }
    if (
        column === 'id' ||
        column.endsWith('Id') ||
        column.endsWith('Count') ||
        column.endsWith('Ms') ||
        column.endsWith('Bytes') ||
        column === 'sortOrder' ||
        column === 'attemptCount' ||
        column === 'runCount'
    ) {
        return 'INTEGER';
    }

    return 'TEXT';
}

/**
 * Resolves whether a column is JSON for a specific table base name.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
function isJsonColumnForTableBaseName(tableBaseName: string, column: string): boolean {
    return JSON_COLUMNS_BY_TABLE.get(tableBaseName)?.has(column) || false;
}

/**
 * Resolves whether a column should be forced to a string for a specific table base name.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
function isTextColumnForTableBaseName(tableBaseName: string, column: string): boolean {
    return TEXT_COLUMNS_BY_TABLE.get(tableBaseName)?.has(column) || false;
}

/**
 * Resolves whether a column is known to be numeric for a specific table base name.
 *
 * @private function of `$provideLocalSqliteSupabase`
 */
function isIntegerColumnForTableBaseName(tableBaseName: string, column: string): boolean {
    return INTEGER_COLUMNS_BY_TABLE.get(tableBaseName)?.has(column) || false;
}
