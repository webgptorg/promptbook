'use server';

import { restoreAgentAndFolders } from '@/src/utils/agentOrganization/restoreAgentAndFolders';
import { revalidatePath } from 'next/cache';
import { isUserAdmin } from '../../utils/isUserAdmin';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { invalidateCachedActiveOrganizationSnapshots } from '@/src/utils/agentOrganization/loadAgentOrganizationState';

/**
 * Restores a deleted agent from the recycle bin.
 *
 * @param agentName - Agent identifier to restore.
 */
export async function restoreDeletedAgent(agentName: string) {
    if (!(await isUserAdmin())) {
        throw new Error('You are not authorized to restore agents');
    }

    await restoreAgentAndFolders(agentName);
    invalidateCachedActiveOrganizationSnapshots();

    revalidatePath('/recycle-bin');
    revalidatePath(`/agents/${agentName}`);
    revalidatePath('/');
}

/**
 * Deletes an agent by moving it to the recycle bin.
 *
 * @param agentName - Agent identifier to delete.
 */
export async function deleteAgent(agentName: string) {
    if (!(await isUserAdmin())) {
        throw new Error('You are not authorized to delete agents');
    }

    const collection = await $provideAgentCollectionForServer();

    await collection.deleteAgent(agentName);
    invalidateCachedActiveOrganizationSnapshots();

    revalidatePath('/recycle-bin');
    revalidatePath(`/agents/${agentName}`);
    revalidatePath('/');
}
