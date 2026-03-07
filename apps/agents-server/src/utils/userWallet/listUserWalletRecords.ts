import type { ListUserWalletRecordsOptions, UserWalletRecord } from './UserWalletRecord';
import type { UserWalletRow } from './UserWalletRow';
import { mapUserWalletRow } from './mapUserWalletRow';
import { provideUserWalletTable } from './provideUserWalletTable';

/**
 * Lists wallet records filtered by scope and optional query.
 */
export async function listUserWalletRecords(options: ListUserWalletRecordsOptions): Promise<UserWalletRecord[]> {
    const { agentPermanentId } = options;

    const rows = agentPermanentId
        ? await listScopedUserWalletRows(options)
        : await listAllUserWalletRows(options.userId);
    const filteredRows = filterUserWalletRows(rows, options);
    const sortedRows = filteredRows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const limitedRows = applyWalletRowsLimit(sortedRows, options.limit);

    return limitedRows.map(mapUserWalletRow);
}

/**
 * Lists all active wallet rows for one user.
 *
 * @private function of `listUserWalletRecords`
 */
async function listAllUserWalletRows(userId: number): Promise<UserWalletRow[]> {
    const userWalletTable = await provideUserWalletTable();
    const { data, error } = await userWalletTable.select('*').eq('userId', userId).is('deletedAt', null);
    if (error) {
        throw new Error(`Failed to list wallet records: ${error.message}`);
    }
    return (data || []) as UserWalletRow[];
}

/**
 * Lists rows using user+agent scope rules and optional global records.
 *
 * @private function of `listUserWalletRecords`
 */
async function listScopedUserWalletRows(options: ListUserWalletRecordsOptions): Promise<UserWalletRow[]> {
    const { userId, agentPermanentId, includeGlobal = true } = options;
    const userWalletTable = await provideUserWalletTable();
    const scopedRows: UserWalletRow[] = [];

    const { data: agentUserData, error: agentUserError } = await userWalletTable
        .select('*')
        .eq('isUserScoped', true)
        .eq('userId', userId)
        .eq('isGlobal', false)
        .eq('agentPermanentId', agentPermanentId || '')
        .is('deletedAt', null);

    if (agentUserError) {
        throw new Error(`Failed to list user-scoped wallet records: ${agentUserError.message}`);
    }
    scopedRows.push(...((agentUserData || []) as UserWalletRow[]));

    const { data: agentSharedData, error: agentSharedError } = await userWalletTable
        .select('*')
        .eq('isUserScoped', false)
        .eq('isGlobal', false)
        .eq('agentPermanentId', agentPermanentId || '')
        .is('deletedAt', null);

    if (agentSharedError) {
        throw new Error(`Failed to list agent-scoped wallet records: ${agentSharedError.message}`);
    }
    scopedRows.push(...((agentSharedData || []) as UserWalletRow[]));

    if (includeGlobal) {
        await appendGlobalUserWalletRows({ userWalletTable, userId, scopedRows });
    }

    const rowsById = new Map<number, UserWalletRow>();
    for (const row of scopedRows) {
        rowsById.set(row.id, row);
    }
    return [...rowsById.values()];
}

/**
 * Appends global rows (user-global and server-global) to an existing row collection.
 *
 * @private function of `listUserWalletRecords`
 */
async function appendGlobalUserWalletRows(options: {
    userWalletTable: Awaited<ReturnType<typeof provideUserWalletTable>>;
    userId: number;
    scopedRows: UserWalletRow[];
}): Promise<void> {
    const { userWalletTable, userId, scopedRows } = options;

    const { data: userGlobalData, error: userGlobalError } = await userWalletTable
        .select('*')
        .eq('isUserScoped', true)
        .eq('userId', userId)
        .eq('isGlobal', true)
        .is('agentPermanentId', null)
        .is('deletedAt', null);

    if (userGlobalError) {
        throw new Error(`Failed to list user-global wallet records: ${userGlobalError.message}`);
    }
    scopedRows.push(...((userGlobalData || []) as UserWalletRow[]));

    const { data: globalData, error: globalError } = await userWalletTable
        .select('*')
        .eq('isUserScoped', false)
        .eq('isGlobal', true)
        .is('agentPermanentId', null)
        .is('deletedAt', null);

    if (globalError) {
        throw new Error(`Failed to list global wallet records: ${globalError.message}`);
    }

    scopedRows.push(...((globalData || []) as UserWalletRow[]));
}

/**
 * Applies in-memory filters used by the wallet API.
 *
 * @private function of `listUserWalletRecords`
 */
function filterUserWalletRows(rows: UserWalletRow[], options: ListUserWalletRecordsOptions): UserWalletRow[] {
    const normalizedSearch = options.search?.trim().toLowerCase();
    const normalizedService = options.service?.trim().toLowerCase();
    const normalizedKey = options.key?.trim();
    const hasUserScopeFilter = typeof options.isUserScoped === 'boolean';

    return rows.filter((row) => {
        if (hasUserScopeFilter && row.isUserScoped !== options.isUserScoped) {
            return false;
        }
        if (options.recordType && row.recordType !== options.recordType) {
            return false;
        }
        if (normalizedService && row.service.toLowerCase() !== normalizedService) {
            return false;
        }
        if (normalizedKey && row.key !== normalizedKey) {
            return false;
        }
        if (!normalizedSearch) {
            return true;
        }

        const searchable = [row.service, row.key, row.username || '', row.secret || '', row.cookies || '']
            .concat(row.jsonSchema ? JSON.stringify(row.jsonSchema) : '')
            .join(' ')
            .toLowerCase();
        return searchable.includes(normalizedSearch);
    });
}

/**
 * Limits rows when positive finite limit is provided.
 *
 * @private function of `listUserWalletRecords`
 */
function applyWalletRowsLimit(rows: UserWalletRow[], limit: number | undefined): UserWalletRow[] {
    return typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? rows.slice(0, limit) : rows;
}
