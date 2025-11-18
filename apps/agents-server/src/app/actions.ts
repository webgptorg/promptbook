'use server';

import { $generateBookBoilerplate } from '@promptbook-local/core';
import { $provideAgentsServerTools } from '../tools/$provideAgentCollectionForServer';

export async function $createAgentAction() {
    const { collection } = await $provideAgentsServerTools();
    await collection.createAgent($generateBookBoilerplate());
}

/**
 * TODO: !!!! Reorganize actions.ts files
 * TODO: !!! [🧠] Study how Next.js actions work
 */
