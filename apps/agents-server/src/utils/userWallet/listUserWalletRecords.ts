import type { ListUserWalletRecordsOptions, UserWalletRecord } from './UserWalletRecord';
import type { UserWalletRow } from './UserWalletRow';
import { mapUserWalletRow } from './mapUserWalletRow';
import { provideUserWalletTable } from './provideUserWalletTable';
import { resolveWalletAgentPermanentId } from './resolveWalletAgentPermanentId';

/**
 * Supabase wallet table client used while composing list queries.
 */
type UserWalletTable = Awaited<ReturnType<typeof provideUserWalletTable>>;

/**
 * Shared query filters for one active-wallet row selection.
 */
type ListActiveWalletRowsBaseOptions = {
    userId?: number;
    isUserScoped?: boolean;
    isGlobal?: boolean;
    errorMessage: string;
};

/**
 * Query filters for one active-wallet row selection.
 */
type ListActiveWalletRowsOptions =
    | (ListActiveWalletRowsBaseOptions & {
          hasAgentPermanentIdFilter?: false;
      })
    | (ListActiveWalletRowsBaseOptions & {
          hasAgentPermanentIdFilter: true;
          agentPermanentId: string | null;
      });

/**
 * Normalized in-memory filters applied after rows are loaded.
 */
type UserWalletRowFilters = {
    isUserScoped?: boolean;
    hasUserScopeFilter: boolean;
    recordType?: ListUserWalletRecordsOptions['recordType'];
    normalizedService?: string;
    normalizedKey?: string;
    normalizedSearch?: string;
    limit?: number;
};

/**
 * Lists wallet records filtered by scope and optional query.
 */
export async function listUserWalletRecords(options: ListUserWalletRecordsOptions): Promise<UserWalletRecord[]> {
    const userWalletTable = await provideUserWalletTable();
    const resolvedAgentPermanentId = await resolveListUserWalletRecordsAgentPermanentId(options.agentPermanentId);

    if (options.agentPermanentId && !resolvedAgentPermanentId) {
        return [];
    }

    const rows = await listUserWalletRows(userWalletTable, options, resolvedAgentPermanentId);
    const filters = createUserWalletRowFilters(options);
    return formatListedUserWalletRows(rows, filters);
}

/**
 * Resolves an optional requested agent scope.
 */
async function resolveListUserWalletRecordsAgentPermanentId(agentPermanentId?: string): Promise<string | null> {
    if (!agentPermanentId) {
        return null;
    }

    return (await resolveWalletAgentPermanentId(agentPermanentId)) || null;
}

/**
 * Loads all rows that may be visible for the requested scope.
 */
async function listUserWalletRows(
    userWalletTable: UserWalletTable,
    options: ListUserWalletRecordsOptions,
    resolvedAgentPermanentId: string | null,
): Promise<UserWalletRow[]> {
    if (!resolvedAgentPermanentId) {
        return listActiveWalletRows(userWalletTable, {
            userId: options.userId,
            errorMessage: 'Failed to list wallet records',
        });
    }

    return listAgentVisibleWalletRows(
        userWalletTable,
        options.userId,
        resolvedAgentPermanentId,
        options.includeGlobal !== false,
    );
}

/**
 * Loads all rows visible when listing within one resolved agent scope.
 */
async function listAgentVisibleWalletRows(
    userWalletTable: UserWalletTable,
    userId: number,
    agentPermanentId: string,
    includeGlobal: boolean,
): Promise<UserWalletRow[]> {
    const scopedRows = [
        ...(await listActiveWalletRows(userWalletTable, {
            userId,
            isUserScoped: true,
            isGlobal: false,
            agentPermanentId,
            hasAgentPermanentIdFilter: true,
            errorMessage: 'Failed to list user-scoped wallet records',
        })),
        ...(await listActiveWalletRows(userWalletTable, {
            isUserScoped: false,
            isGlobal: false,
            agentPermanentId,
            hasAgentPermanentIdFilter: true,
            errorMessage: 'Failed to list agent-scoped wallet records',
        })),
    ];

    if (!includeGlobal) {
        return deduplicateUserWalletRowsById(scopedRows);
    }

    scopedRows.push(
        ...(await listActiveWalletRows(userWalletTable, {
            userId,
            isUserScoped: true,
            isGlobal: true,
            agentPermanentId: null,
            hasAgentPermanentIdFilter: true,
            errorMessage: 'Failed to list user-global wallet records',
        })),
    );
    scopedRows.push(
        ...(await listActiveWalletRows(userWalletTable, {
            isUserScoped: false,
            isGlobal: true,
            agentPermanentId: null,
            hasAgentPermanentIdFilter: true,
            errorMessage: 'Failed to list global wallet records',
        })),
    );

    return deduplicateUserWalletRowsById(scopedRows);
}

/**
 * Loads one batch of active wallet rows with shared error handling.
 */
async function listActiveWalletRows(
    userWalletTable: UserWalletTable,
    options: ListActiveWalletRowsOptions,
): Promise<UserWalletRow[]> {
    let query = userWalletTable.select('*').is('deletedAt', null);

    if (typeof options.userId === 'number') {
        query = query.eq('userId', options.userId);
    }
    if (typeof options.isUserScoped === 'boolean') {
        query = query.eq('isUserScoped', options.isUserScoped);
    }
    if (typeof options.isGlobal === 'boolean') {
        query = query.eq('isGlobal', options.isGlobal);
    }
    if (options.hasAgentPermanentIdFilter) {
        query =
            options.agentPermanentId === null
                ? query.is('agentPermanentId', null)
                : query.eq('agentPermanentId', options.agentPermanentId);
    }

    const { data, error } = await query;
    if (error) {
        throw new Error(`${options.errorMessage}: ${error.message}`);
    }

    return (data || []) as UserWalletRow[];
}

/**
 * Deduplicates fetched rows while keeping the same last-write-wins value semantics.
 */
function deduplicateUserWalletRowsById(rows: UserWalletRow[]): UserWalletRow[] {
    const rowsById = new Map<number, UserWalletRow>();

    for (const row of rows) {
        rowsById.set(row.id, row);
    }

    return [...rowsById.values()];
}

/**
 * Normalizes API options into row-level filters.
 */
function createUserWalletRowFilters(options: ListUserWalletRecordsOptions): UserWalletRowFilters {
    return {
        isUserScoped: options.isUserScoped,
        hasUserScopeFilter: typeof options.isUserScoped === 'boolean',
        recordType: options.recordType,
        normalizedService: options.service?.trim().toLowerCase(),
        normalizedKey: options.key?.trim(),
        normalizedSearch: options.search?.trim().toLowerCase(),
        limit: options.limit,
    };
}

/**
 * Applies in-memory filters, stable ordering, and final mapping.
 */
function formatListedUserWalletRows(rows: UserWalletRow[], filters: UserWalletRowFilters): UserWalletRecord[] {
    const filteredRows = rows.filter((row) => matchesUserWalletRowFilters(row, filters));
    const sortedRows = filteredRows.sort(sortUserWalletRowsByUpdatedAt);
    const limitedRows = limitUserWalletRows(sortedRows, filters.limit);

    return limitedRows.map(mapUserWalletRow);
}

/**
 * Checks whether one wallet row satisfies the requested filters.
 */
function matchesUserWalletRowFilters(row: UserWalletRow, filters: UserWalletRowFilters): boolean {
    if (filters.hasUserScopeFilter && row.isUserScoped !== filters.isUserScoped) {
        return false;
    }
    if (filters.recordType && row.recordType !== filters.recordType) {
        return false;
    }
    if (filters.normalizedService && row.service.toLowerCase() !== filters.normalizedService) {
        return false;
    }
    if (filters.normalizedKey && row.key !== filters.normalizedKey) {
        return false;
    }
    if (!filters.normalizedSearch) {
        return true;
    }

    return createSearchableWalletRowText(row).includes(filters.normalizedSearch);
}

/**
 * Builds the broad text index used by the existing wallet search behavior.
 */
function createSearchableWalletRowText(row: UserWalletRow): string {
    return [row.service, row.key, row.username || '', row.secret || '', row.cookies || '']
        .concat(row.jsonSchema ? JSON.stringify(row.jsonSchema) : '')
        .join(' ')
        .toLowerCase();
}

/**
 * Sorts newer wallet rows ahead of older ones.
 */
function sortUserWalletRowsByUpdatedAt(firstRow: UserWalletRow, secondRow: UserWalletRow): number {
    return new Date(secondRow.updatedAt).getTime() - new Date(firstRow.updatedAt).getTime();
}

/**
 * Applies the optional result limit.
 */
function limitUserWalletRows(rows: UserWalletRow[], limit?: number): UserWalletRow[] {
    if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
        return rows;
    }

    return rows.slice(0, limit);
}
