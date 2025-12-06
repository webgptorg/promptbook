import { NextResponse } from 'next/server';
import { $getTableName } from '../../../../database/$getTableName';
import { $provideSupabaseForServer } from '../../../../database/$provideSupabaseForServer';
import { AgentsServerDatabase } from '../../../../database/schema';
import { hashPassword, verifyPassword } from '../../../../utils/auth';
import { getCurrentUser } from '../../../../utils/getCurrentUser';

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Missing password fields' }, { status: 400 });
        }

        // Special check for environment admin
        if (user.username === 'admin' && process.env.ADMIN_PASSWORD) {
            // Environment admin cannot change password through this API
            // They must change the env variable
            return NextResponse.json(
                {
                    error: 'You cannot change the admin password. Please update the `ADMIN_PASSWORD` environment variable.',
                },
                { status: 403 },
            );
        }

        const supabase = $provideSupabaseForServer();
        const { data: userData, error: fetchError } = await supabase
            .from(await $getTableName('User'))
            .select('*')
            .eq('username', user.username)
            .single();

        if (fetchError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userRow = userData as AgentsServerDatabase['public']['Tables']['User']['Row'];

        // Verify current password
        const isValid = await verifyPassword(currentPassword, userRow.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid current password' }, { status: 401 });
        }

        // Hash new password
        const newPasswordHash = await hashPassword(newPassword);

        // Update password
        const { error: updateError } = await supabase
            .from(await $getTableName('User'))
            .update({
                passwordHash: newPasswordHash,
                updatedAt: new Date().toISOString(),
            })
            .eq('id', userRow.id);

        if (updateError) {
            console.error('Error updating password:', updateError);
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
