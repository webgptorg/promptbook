'use server';

import { $generateBookBoilerplate } from '@promptbook-local/core';
import { string_agent_name } from '@promptbook-local/types';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { $provideAgentCollectionForServer } from '../tools/$provideAgentCollectionForServer';
import { isUserAdmin } from '../utils/isUserAdmin';

export async function $createAgentAction(): Promise<string_agent_name> {
    // TODO: [👹] Check permissions here
    if (!(await isUserAdmin())) {
        throw new Error('You are not authorized to create agents');
    }

    const collection = await $provideAgentCollectionForServer();
    const agentSource = $generateBookBoilerplate();

    const { agentName } = await collection.createAgent(agentSource);

    return agentName;
}

export async function loginAction(formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    console.info(`Login attempt for user: ${username}`);

    if (password === process.env.ADMIN_PASSWORD) {
        const cookieStore = await cookies();
        cookieStore.set('adminToken', password, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });
        revalidatePath('/', 'layout');
        return { success: true };
    } else {
        return { success: false, message: 'Invalid password' };
    }
}

export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete('adminToken');
    revalidatePath('/', 'layout');
}

/**
 * TODO: [🐱‍🚀] Reorganize actions.ts files
 * TODO: [🐱‍🚀] [🧠] Study how Next.js actions work
 */
