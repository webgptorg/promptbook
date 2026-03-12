import { cookies } from 'next/headers';
import { cache } from 'react';
import { getSession } from './session';

/**
 * Resolves the super-admin flag for the current request only once.
 *
 * @returns Whether the request belongs to the environment-backed super-admin.
 */
const getCachedIsUserGlobalAdmin = cache(async (): Promise<boolean> => {
    if (!process.env.ADMIN_PASSWORD) {
        return false;
    }

    const session = await getSession();
    if (session?.isGlobalAdmin === true) {
        return true;
    }

    const cookieStore = await cookies();
    return cookieStore.get('adminToken')?.value === process.env.ADMIN_PASSWORD;
});

/**
 * Checks whether the current request belongs to the environment-backed super-admin.
 *
 * @returns `true` when the session can manage same-instance servers.
 */
export async function isUserGlobalAdmin(): Promise<boolean> {
    return getCachedIsUserGlobalAdmin();
}
