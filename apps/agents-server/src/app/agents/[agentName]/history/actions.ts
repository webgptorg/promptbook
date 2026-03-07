'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { revalidatePath } from 'next/cache';

/**
 * Restores one saved agent-source version from history.
 *
 * @param agentName - Agent identifier from route.
 * @param historyId - History row identifier to restore.
 */
export async function restoreAgentVersion(agentName: string, historyId: number) {
    if (!(await isUserAdmin())) {
        throw new Error('You are not authorized to restore agent history');
    }

    const collection = await $provideAgentCollectionForServer();
    const agentId = await collection.getAgentPermanentId(agentName);
    await collection.restoreAgentFromHistory(historyId, agentId);

    revalidatePath(`/agents/${agentName}`);
    revalidatePath(`/agents/${agentName}/book`);
    revalidatePath(`/agents/${agentName}/book+chat`);
    revalidatePath(`/agents/${agentName}/history`);
}
