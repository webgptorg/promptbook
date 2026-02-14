import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '../../../database/$provideSupabaseForServer';
import { getPasswordValidationMessage, hashPassword } from '../../../utils/auth';
import { isUserAdmin } from '../../../utils/isUserAdmin';
import { NextResponse } from 'next/server';

export async function GET() {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = $provideSupabaseForServer();
        const { data: users, error } = await supabase
            .from(await $getTableName('User'))
            .select('id, username, createdAt, updatedAt, isAdmin')
            .order('username');

        if (error) {
            throw error;
        }

        return NextResponse.json(users);
    } catch (error) {
        console.error('List users error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { username, password, isAdmin } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        const passwordHash = await hashPassword(password);
        const supabase = $provideSupabaseForServer();

        const { data: newUser, error } = await supabase
            .from(await $getTableName('User'))
            .insert({
                username,
                passwordHash,
                isAdmin: !!isAdmin,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
            .select('id, username, createdAt, updatedAt, isAdmin')
            .single();

        if (error) {
            if (error.code === '23505') { // unique_violation
                 return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json(newUser);

    } catch (error) {
        console.error('Create user error:', error);
        const passwordValidationMessage = getPasswordValidationMessage(error);

        if (passwordValidationMessage) {
            return NextResponse.json({ error: passwordValidationMessage }, { status: 400 });
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
