'use server';

import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { revalidatePath } from 'next/cache';
import { isUserAdmin } from '../../utils/isUserAdmin';

export async function restoreDeletedAgent(agentName: string) {
    if (!(await isUserAdmin())) {
        throw new Error('You are not authorized to restore agents');
    }

    const collection = await $provideAgentCollectionForServer();

    await collection.restoreAgent(agentName);

    revalidatePath('/recycle-bin');
    revalidatePath(`/agents/${agentName}`);
    revalidatePath('/');
}

export async function deleteAgent(agentName: string) {
    if (!(await isUserAdmin())) {
        throw new Error('You are not authorized to delete agents');
    }

    const collection = await $provideAgentCollectionForServer();

    await collection.deleteAgent(agentName);

    revalidatePath('/recycle-bin');
    revalidatePath(`/agents/${agentName}`);
    revalidatePath('/');
}
