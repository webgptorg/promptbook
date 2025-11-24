import { cookies } from 'next/headers';

/**
 * Checks if the current user is an admin
 * 
 * Note: If `process.env.ADMIN_PASSWORD` is not set, everyone is admin
 * 
 * @returns true if the user is admin
 */
export async function isUserAdmin(): Promise<boolean> {
    if (!process.env.ADMIN_PASSWORD) {
        return true;
    }

    const cookieStore = await cookies();
    const adminToken = cookieStore.get('adminToken');

    if (adminToken?.value === process.env.ADMIN_PASSWORD) {
        return true;
    }

    return false;
}

/**
 * TODO: [👹] Implement proper user system
 */
