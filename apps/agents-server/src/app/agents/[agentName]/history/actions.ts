'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { revalidatePath } from 'next/cache';

export async function restoreAgentVersion(agentName: string, historyId: number) {
    const collection = await $provideAgentCollectionForServer();
    await collection.restoreAgentFromHistory(historyId);

    revalidatePath(`/agents/${agentName}`);
    revalidatePath(`/agents/${agentName}/history`);
}
