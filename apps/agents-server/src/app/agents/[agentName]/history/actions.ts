'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { string_agent_permanent_id } from '@promptbook-local/types';
import { revalidatePath } from 'next/cache';

/**
 * Restores one saved version of an agent book from history.
 *
 * @param agentName - Agent identifier used for route revalidation.
 * @param agentPermanentId - Permanent identifier that must match the restored history row.
 * @param historyId - History row identifier to restore.
 */
export async function restoreAgentVersion(
    agentName: string,
    agentPermanentId: string_agent_permanent_id,
    historyId: number,
) {
    if (!(await isUserAdmin())) {
        throw new Error('You are not authorized to restore agent versions');
    }

    const collection = await $provideAgentCollectionForServer();
    await collection.restoreAgentFromHistory(historyId, { expectedPermanentId: agentPermanentId });

    const encodedAgentName = encodeURIComponent(agentName);

    revalidatePath(`/agents/${encodedAgentName}`);
    revalidatePath(`/agents/${encodedAgentName}/book`);
    revalidatePath(`/agents/${encodedAgentName}/book+chat`);
    revalidatePath(`/agents/${encodedAgentName}/history`);
}
