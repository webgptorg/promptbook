'use server';

import { $generateBookBoilerplate } from '@promptbook-local/core';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { isUserAdmin } from '../utils/isUserAdmin';
import { $provideAgentCollectionForServer } from '../tools/$provideAgentCollectionForServer';

export async function $createAgentAction() {
    // TODO: [👹] Check permissions here
    if (!(await isUserAdmin())) {
        throw new Error('You are not authorized to create agents');
    }

    const collection = await $provideAgentCollectionForServer();
    await collection.createAgent($generateBookBoilerplate());
}

export async function loginAction(formData: FormData) {
    const password = formData.get('password') as string;

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
 * TODO: !!!! Reorganize actions.ts files
 * TODO: !!! [🧠] Study how Next.js actions work
 */
