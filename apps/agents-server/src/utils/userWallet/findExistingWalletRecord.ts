import type { UserWalletInsert, UserWalletRow } from './UserWalletRow';
import { provideUserWalletTable } from './provideUserWalletTable';

/**
 * Finds existing active wallet record by the same scope identity.
 *
 * @private function of `userWallet`
 */
export async function findExistingWalletRecord(payload: UserWalletInsert): Promise<UserWalletRow | null> {
    const userWalletTable = await provideUserWalletTable();

    let scopedAgentPermanentId: string | null = null;
    if (!payload.isGlobal) {
        if (typeof payload.agentPermanentId !== 'string' || payload.agentPermanentId.trim() === '') {
            throw new Error('Agent-scoped wallet record requires `agentPermanentId`.');
        }
        scopedAgentPermanentId = payload.agentPermanentId;
    }

    let query = userWalletTable
        .select('*')
        .eq('userId', payload.userId)
        .eq('isUserScoped', payload.isUserScoped === true)
        .eq('recordType', payload.recordType || '')
        .eq('service', payload.service || '')
        .eq('key', payload.key || '')
        .eq('isGlobal', payload.isGlobal || false)
        .is('deletedAt', null);

    if (payload.isGlobal) {
        query = query.is('agentPermanentId', null);
    } else {
        if (!scopedAgentPermanentId) {
            throw new Error('Agent-scoped wallet record requires `agentPermanentId`.');
        }
        query = query.eq('agentPermanentId', scopedAgentPermanentId);
    }

    const { data, error } = await query.order('updatedAt', { ascending: false }).limit(1).maybeSingle();
    if (error) {
        throw new Error(`Failed to check duplicate wallet record: ${error.message}`);
    }

    return (data as UserWalletRow | null) || null;
}
