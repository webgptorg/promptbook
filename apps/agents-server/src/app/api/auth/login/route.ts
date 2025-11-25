import { $provideSupabaseForServer } from '../../../../database/$provideSupabaseForServer';
import { AgentsServerDatabase } from '../../../../database/schema';
import { verifyPassword } from '../../../../utils/auth';
import { setSession } from '../../../../utils/session';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        // 1. Check if it's the environment admin
        if (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD && username === 'admin') {
             // Or maybe allow any username if password matches admin password? 
             // The task says "process.env.ADMIN_PASSWORD is like one of the admin users"
             // Assuming username 'admin' for environment password login.
             await setSession({ username: 'admin', isAdmin: true });
             return NextResponse.json({ success: true });
        }
        
        // 2. Check DB users
        const supabase = $provideSupabaseForServer();
        const { data: user, error } = await supabase
            .from('User')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !user) {
            // Check if password matches ADMIN_PASSWORD even if user doesn't exist?
            // "The table User should work together with the process.env.ADMIN_PASSWORD"
            // If the user enters a password that matches process.env.ADMIN_PASSWORD, should they get admin access regardless of username?
            // "process.env.ADMIN_PASSWORD is like one of the admin users" implies it's a specific credential.
            // Let's stick to: if username is 'admin' and password is ADMIN_PASSWORD, it works.
            // Or if the password matches ADMIN_PASSWORD, maybe we grant admin access? 
            // "Non-admin users can only log in... cannot see list of users"
            
            // Re-reading: "process.env.ADMIN_PASSWORD is like one of the admin users in the User table"
            // This suggests it's treated as a user.
            
            // If I login with a valid user from DB, I check password hash.
            // If I login with 'admin' and ADMIN_PASSWORD, I get admin.

            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await verifyPassword(password, (user as AgentsServerDatabase['public']['Tables']['User']['Row']).passwordHash);

        if (!isValid) {
             return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        await setSession({ username: (user as AgentsServerDatabase['public']['Tables']['User']['Row']).username, isAdmin: (user as AgentsServerDatabase['public']['Tables']['User']['Row']).isAdmin });
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
