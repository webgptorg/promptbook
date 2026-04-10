import type { UpdateUserWalletRecordOptions, UserWalletRecord } from './UserWalletRecord';
import type { UserWalletRow } from './UserWalletRow';
import { mapUserWalletRow } from './mapUserWalletRow';
import { normalizeWalletPayload } from './normalizeWalletPayload';
import { provideUserWalletTable } from './provideUserWalletTable';
import { resolveWalletAgentPermanentId } from './resolveWalletAgentPermanentId';

/**
 * Updates one wallet record owned by a user.
 */
export async function updateUserWalletRecord(options: UpdateUserWalletRecordOptions): Promise<UserWalletRecord> {
    const agentPermanentId = options.isGlobal ? null : await resolveWalletAgentPermanentId(options.agentPermanentId);
    if (!options.isGlobal && !agentPermanentId) {
        throw new Error('Agent-scoped wallet record requires a valid `agentPermanentId`.');
    }

    const payload = normalizeWalletPayload({
        ...options,
        agentPermanentId,
    });
    const userWalletTable = await provideUserWalletTable();

    const { data, error } = await userWalletTable
        .update({
            ...payload,
            updatedAt: new Date().toISOString(),
        })
        .eq('id', options.walletId)
        .eq('userId', options.userId)
        .is('deletedAt', null)
        .select('*')
        .single();

    if (error || !data) {
        throw new Error(error?.message || 'Failed to update wallet record.');
    }

    return mapUserWalletRow(data as UserWalletRow);
}
