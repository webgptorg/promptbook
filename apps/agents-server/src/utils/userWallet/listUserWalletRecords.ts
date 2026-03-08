import type { ListUserWalletRecordsOptions, UserWalletRecord } from './UserWalletRecord';
import type { UserWalletRow } from './UserWalletRow';
import { mapUserWalletRow } from './mapUserWalletRow';
import { provideUserWalletTable } from './provideUserWalletTable';

/**
 * Lists wallet records filtered by scope and optional query.
 */
export async function listUserWalletRecords(options: ListUserWalletRecordsOptions): Promise<UserWalletRecord[]> {
    const {
        userId,
        agentPermanentId,
        includeGlobal = true,
        isUserScoped,
        search,
        recordType,
        service,
        key,
        limit,
    } = options;
    const userWalletTable = await provideUserWalletTable();

    let rows: UserWalletRow[] = [];

    if (!agentPermanentId) {
        const { data, error } = await userWalletTable.select('*').eq('userId', userId).is('deletedAt', null);
        if (error) {
            throw new Error(`Failed to list wallet records: ${error.message}`);
        }
        rows = (data || []) as UserWalletRow[];
    } else {
        const scopedRows: UserWalletRow[] = [];

        const { data: agentUserData, error: agentUserError } = await userWalletTable
            .select('*')
            .eq('isUserScoped', true)
            .eq('userId', userId)
            .eq('isGlobal', false)
            .eq('agentPermanentId', agentPermanentId)
            .is('deletedAt', null);

        if (agentUserError) {
            throw new Error(`Failed to list user-scoped wallet records: ${agentUserError.message}`);
        }
        scopedRows.push(...((agentUserData || []) as UserWalletRow[]));

        const { data: agentSharedData, error: agentSharedError } = await userWalletTable
            .select('*')
            .eq('isUserScoped', false)
            .eq('isGlobal', false)
            .eq('agentPermanentId', agentPermanentId)
            .is('deletedAt', null);

        if (agentSharedError) {
            throw new Error(`Failed to list agent-scoped wallet records: ${agentSharedError.message}`);
        }
        scopedRows.push(...((agentSharedData || []) as UserWalletRow[]));

        if (includeGlobal) {
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

        const rowsById = new Map<number, UserWalletRow>();
        for (const row of scopedRows) {
            rowsById.set(row.id, row);
        }
        rows = [...rowsById.values()];
    }

    const normalizedSearch = search?.trim().toLowerCase();
    const normalizedService = service?.trim().toLowerCase();
    const normalizedKey = key?.trim();
    const hasUserScopeFilter = typeof isUserScoped === 'boolean';

    const filteredRows = rows.filter((row) => {
        if (hasUserScopeFilter && row.isUserScoped !== isUserScoped) {
            return false;
        }
        if (recordType && row.recordType !== recordType) {
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

    const sortedRows = filteredRows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const limitedRows =
        typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? sortedRows.slice(0, limit) : sortedRows;

    return limitedRows.map(mapUserWalletRow);
}
