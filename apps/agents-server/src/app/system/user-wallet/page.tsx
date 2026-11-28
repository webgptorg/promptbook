import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { loadAgentOrganizationState } from '@/src/utils/agentOrganization/loadAgentOrganizationState';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { UserWalletClient } from './UserWalletClient';
import type { UserWalletAgentOption } from './UserWalletAgentOption';

/**
 * Agent wallet management page.
 *
 * Note: The route stays `/system/user-wallet` for backwards compatibility, but the wallet records
 * belong to agents - every agent has its own wallet.
 */
export default async function UserWalletPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return <ForbiddenPage />;
    }

    const { agents } = await loadAgentOrganizationState({ status: 'ACTIVE' });
    const walletAgents: UserWalletAgentOption[] = agents
        .filter((agent) => typeof agent.permanentId === 'string' && agent.permanentId.length > 0)
        .map((agent) => ({
            permanentId: agent.permanentId as string,
            agentName: agent.agentName,
            label: agent.meta.fullname || agent.agentName,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

    return <UserWalletClient agents={walletAgents} />;
}
