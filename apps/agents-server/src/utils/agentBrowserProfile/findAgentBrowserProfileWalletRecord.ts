import type { UserWalletRow } from '../userWallet/UserWalletRow';
import { provideUserWalletTable } from '../userWallet/provideUserWalletTable';
import {
    AGENT_BROWSER_PROFILE_WALLET_KEY,
    AGENT_BROWSER_PROFILE_WALLET_SERVICE,
} from './agentBrowserProfileWalletConstants';

/**
 * Finds the wallet record linking one agent to its persistent browser-profile directory.
 *
 * The browser profile belongs to the agent (not to one user), so the lookup intentionally ignores
 * `userId` and `isUserScoped` and returns the newest agent-scoped `BROWSER_PROFILE` record.
 *
 * @param agentPermanentId - Canonical `Agent.permanentId`.
 * @returns Wallet row or `null` when the agent has no browser-profile record yet.
 */
export async function findAgentBrowserProfileWalletRecord(agentPermanentId: string): Promise<UserWalletRow | null> {
    const userWalletTable = await provideUserWalletTable();

    const { data, error } = await userWalletTable
        .select('*')
        .eq('isGlobal', false)
        .eq('agentPermanentId', agentPermanentId)
        .eq('recordType', 'BROWSER_PROFILE')
        .eq('service', AGENT_BROWSER_PROFILE_WALLET_SERVICE)
        .eq('key', AGENT_BROWSER_PROFILE_WALLET_KEY)
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve agent browser profile from wallet: ${error.message}`);
    }

    return (data as UserWalletRow | null) || null;
}
