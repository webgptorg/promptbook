import { NextResponse } from 'next/server';
import { $provideSupabaseForServer } from '../../../../database/$provideSupabaseForServer';
import { hashPassword } from '../../../../utils/auth';
import { isUserAdmin } from '../../../../utils/isUserAdmin';
import { $getTableName } from '@/src/database/$getTableName';

export async function PATCH(request: Request, { params }: { params: { username: string } }) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const usernameParam = params.username;
        const body = await request.json();
        const { password, isAdmin } = body;

        const updates: { updatedAt: string; passwordHash?: string; isAdmin?: boolean } = {
            updatedAt: new Date().toISOString(),
        };

        if (password) {
            updates.passwordHash = await hashPassword(password);
        }

        if (typeof isAdmin === 'boolean') {
            updates.isAdmin = isAdmin;
        }

        const supabase = $provideSupabaseForServer();
        const { data: updatedUser, error } = await supabase
            .from(await $getTableName('User'))
            .update(updates)
            .eq('username', usernameParam)
            .select('id, username, createdAt, updatedAt, isAdmin')
            .single();

        if (error) {
            throw error;
        }

        if (!updatedUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { username: string } }) {
    if (!(await isUserAdmin())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const usernameParam = params.username;
        const supabase = $provideSupabaseForServer();

        const { error } = await supabase
            .from(await $getTableName('User'))
            .delete()
            .eq('username', usernameParam);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
