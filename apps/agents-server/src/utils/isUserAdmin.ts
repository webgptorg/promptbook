import { cookies } from 'next/headers';
import { getSession } from './session';

/**
 * Checks if the current user is an admin
 * 
 * Note: If `process.env.ADMIN_PASSWORD` is not set, no one is admin
 * 
 * @returns true if the user is admin
 */
export async function isUserAdmin(): Promise<boolean> {
    if (!process.env.ADMIN_PASSWORD) {
        return false;
    }

    // Check legacy admin token
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('adminToken');

    if (adminToken?.value === process.env.ADMIN_PASSWORD) {
        return true;
    }

    // Check session
    const session = await getSession();
    if (session?.isAdmin) {
        return true;
    }

    return false;
}
