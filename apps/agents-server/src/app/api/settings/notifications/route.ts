import { NextResponse } from 'next/server';
import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import {
    getUserPushNotificationSettingsSnapshotForUser,
    setUserPushNotificationSettingsForUser,
    type UserPushNotificationSettingsSnapshot,
} from '@/src/utils/userPushNotificationSettings';

/**
 * Loads the current browser user's push-notification preference snapshot.
 */
export async function GET(): Promise<NextResponse<UserPushNotificationSettingsSnapshot | { error: string }>> {
    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        return NextResponse.json(await getUserPushNotificationSettingsSnapshotForUser(currentUserIdentity.userId));
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to load notification settings.',
            },
            { status: 500 },
        );
    }
}

/**
 * Persists the current browser user's push-notification preference.
 */
export async function PUT(
    request: Request,
): Promise<NextResponse<UserPushNotificationSettingsSnapshot | { error: string }>> {
    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as {
            enabled?: unknown;
        };

        if (typeof body.enabled !== 'boolean') {
            return NextResponse.json({ error: 'Invalid notification setting.' }, { status: 400 });
        }

        await setUserPushNotificationSettingsForUser(currentUserIdentity.userId, body.enabled);
        return NextResponse.json(await getUserPushNotificationSettingsSnapshotForUser(currentUserIdentity.userId));
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to save notification settings.',
            },
            { status: 500 },
        );
    }
}
