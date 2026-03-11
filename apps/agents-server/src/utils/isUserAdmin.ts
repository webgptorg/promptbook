import { cache } from 'react';
import { getCurrentUser } from './getCurrentUser';

/**
 * Resolves the admin flag for the current request only once.
 *
 * @returns Whether the request belongs to an administrator.
 */
const getCachedIsUserAdmin = cache(async (): Promise<boolean> => {
    if (!process.env.ADMIN_PASSWORD) {
        return false;
    }

    const currentUser = await getCurrentUser();
    return currentUser?.isAdmin === true;
});

/**
 * Checks if the current user is an admin
 * 
 * Note: If `process.env.ADMIN_PASSWORD` is not set, no one is admin
 * 
 * @returns true if the user is admin
 */
export async function isUserAdmin(): Promise<boolean> {
    return getCachedIsUserAdmin();
}
