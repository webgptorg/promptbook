'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { revalidatePath } from 'next/cache';

export async function restoreDeletedAgent(agentName: string) {
    const collection = await $provideAgentCollectionForServer();
    
    // Find the latest history item for this agent
    const history = await collection.listAgentHistory(agentName);
    
    if (history.length === 0) {
        throw new Error(`No history found for agent ${agentName}`);
    }
    
    const latestVersion = history[0];
    
    if (!latestVersion) {
         throw new Error(`No history found for agent ${agentName}`);
    }

    await collection.restoreAgent(latestVersion.id);
    
    revalidatePath('/recycle-bin');
    revalidatePath(`/agents/${agentName}`);
    revalidatePath('/');
}
