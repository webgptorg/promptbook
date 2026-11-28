import { NextRequest, NextResponse } from 'next/server';
import { $getTableName } from '../../../../database/$getTableName';
import { $provideSupabaseForServer } from '../../../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../../../database/schema';
import { getPasswordValidationMessage, hashPassword, verifyPassword } from '../../../../utils/auth';
import {
    AUTHENTICATION_ATTEMPT_PURPOSES,
    checkAuthenticationAttemptRateLimit,
    createAuthenticationAttemptRateLimitResponse,
    recordAuthenticationAttempt,
    recordRateLimitedAuthenticationAttempt,
    resolveAuthenticationAttemptRequestIp,
} from '../../../../utils/authenticationAttemptRateLimit';
import { getCurrentUser } from '../../../../utils/getCurrentUser';

/**
 * User row shape needed to verify and update a password change.
 */
type ChangePasswordUserRow = Pick<AgentsServerDatabase['public']['Tables']['User']['Row'], 'id' | 'passwordHash'>;

/**
 * Supabase projection for user fields needed by password changes.
 */
const CHANGE_PASSWORD_USER_SELECT_COLUMNS = 'id, passwordHash';

/**
 * Handles post.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (
            typeof currentPassword !== 'string' ||
            typeof newPassword !== 'string' ||
            !currentPassword ||
            !newPassword
        ) {
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

        const requestIp = resolveAuthenticationAttemptRequestIp(request);
        const rateLimitDecision = checkAuthenticationAttemptRateLimit({
            requestIp,
            username: user.username,
        });

        if (!rateLimitDecision.isAllowed) {
            recordRateLimitedAuthenticationAttempt({
                requestIp,
                username: user.username,
                purpose: AUTHENTICATION_ATTEMPT_PURPOSES.CHANGE_PASSWORD,
                rejection: rateLimitDecision,
            });

            return createAuthenticationAttemptRateLimitResponse(rateLimitDecision);
        }

        const supabase = $provideSupabaseForServer();
        const { data: userData, error: fetchError } = await supabase
            .from(await $getTableName('User'))
            .select(CHANGE_PASSWORD_USER_SELECT_COLUMNS)
            .eq('username', user.username)
            .single();

        if (fetchError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userRow = userData as ChangePasswordUserRow;

        // Verify current password
        const isValid = await verifyPassword(currentPassword, userRow.passwordHash);
        recordAuthenticationAttempt({
            requestIp,
            username: user.username,
            purpose: AUTHENTICATION_ATTEMPT_PURPOSES.CHANGE_PASSWORD,
            isSuccessful: isValid,
        });

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
        const passwordValidationMessage = getPasswordValidationMessage(error);

        if (passwordValidationMessage) {
            return NextResponse.json({ error: passwordValidationMessage }, { status: 400 });
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
