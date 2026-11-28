import { ForbiddenPage } from '@/src/components/ForbiddenPage/ForbiddenPage';
import { loadAgentOrganizationState } from '@/src/utils/agentOrganization/loadAgentOrganizationState';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { UserMemoryClient, type UserMemoryAgentOption } from './UserMemoryClient';

/**
 * User memory management page.
 */
export default async function UserMemoryPage() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return <ForbiddenPage />;
    }

    const { agents } = await loadAgentOrganizationState({ status: 'ACTIVE' });
    const memoryAgents: UserMemoryAgentOption[] = agents
        .filter((agent) => typeof agent.permanentId === 'string' && agent.permanentId.length > 0)
        .map((agent) => ({
            permanentId: agent.permanentId as string,
            agentName: agent.agentName,
            label: agent.meta.fullname || agent.agentName,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

    return <UserMemoryClient agents={memoryAgents} />;
}

