'use server';

import { $generateBookBoilerplate } from '@promptbook-local/core';
import { string_agent_name } from '@promptbook-local/types';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getMetadata } from '../database/getMetadata';
import { $provideAgentCollectionForServer } from '../tools/$provideAgentCollectionForServer';
import { authenticateUser } from '../utils/authenticateUser';
import { isUserAdmin } from '../utils/isUserAdmin';
import { clearSession, setSession } from '../utils/session';

export async function $createAgentAction(): Promise<string_agent_name> {
    // TODO: [👹] Check permissions here
    if (!(await isUserAdmin())) {
        throw new Error('You are not authorized to create agents');
    }

    const collection = await $provideAgentCollectionForServer();
    const namePool = (await getMetadata('NAME_POOL')) || 'ENGLISH';
    const agentSource = $generateBookBoilerplate({ namePool });

    const { agentName } = await collection.createAgent(agentSource);

    return agentName;
}

export async function loginAction(formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    console.info(`Login attempt for user: ${username}`);

    const user = await authenticateUser(username, password);

    if (user) {
        await setSession(user);
        revalidatePath('/', 'layout');
        return { success: true };
    } else {
        return { success: false, message: 'Invalid credentials' };
    }
}

export async function logoutAction() {
    await clearSession();
    revalidatePath('/', 'layout');
}

/**
 * TODO: [🐱‍🚀] Reorganize actions.ts files
 * TODO: [🐱‍🚀] [🧠] Study how Next.js actions work
 */
