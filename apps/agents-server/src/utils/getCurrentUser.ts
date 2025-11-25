import { cookies } from 'next/headers';
import { getSession } from './session';

export type UserInfo = {
    username: string;
    isAdmin: boolean;
};

export async function getCurrentUser(): Promise<UserInfo | null> {
    // Check session
    const session = await getSession();
    if (session) {
        return {
            username: session.username,
            isAdmin: session.isAdmin
        };
    }

    // Check legacy admin token
    if (process.env.ADMIN_PASSWORD) {
        const cookieStore = await cookies();
        const adminToken = cookieStore.get('adminToken');
        if (adminToken?.value === process.env.ADMIN_PASSWORD) {
            return {
                username: 'admin',
                isAdmin: true
            };
        }
    }

    return null;
}
