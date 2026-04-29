'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { getSignedInUserForAgentAccess } from '@/src/utils/agentAccess';
import { revalidatePath } from 'next/cache';

/**
 * Restores agent version.
 */
export async function restoreAgentVersion(agentName: string, historyId: number) {
    if (!(await getSignedInUserForAgentAccess())) {
        throw new Error('You are not authorized to restore agent versions');
    }

    const collection = await $provideAgentCollectionForServer();
    const agentId = await collection.getAgentPermanentId(agentName);
    await collection.restoreAgentFromHistory(historyId, agentId);

    revalidatePath(`/agents/${agentName}`);
    revalidatePath(`/agents/${agentName}/history`);
}
