import { NextResponse } from 'next/server';
import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import { isThemeMode } from '@/src/constants/themeMode';
import {
    getUserThemeModeSettingsSnapshotForUser,
    setUserThemeModeSettingsForUser,
    type UserThemeModeSettingsSnapshot,
} from '@/src/utils/userThemeModeSettings';

/**
 * Loads the current browser user's theme preference snapshot.
 */
export async function GET(): Promise<NextResponse<UserThemeModeSettingsSnapshot | { error: string }>> {
    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        return NextResponse.json(await getUserThemeModeSettingsSnapshotForUser(currentUserIdentity.userId));
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to load theme settings.',
            },
            { status: 500 },
        );
    }
}

/**
 * Persists the current browser user's theme preference.
 */
export async function PUT(
    request: Request,
): Promise<NextResponse<UserThemeModeSettingsSnapshot | { error: string }>> {
    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as {
            themeMode?: unknown;
        };

        if (!isThemeMode(body.themeMode)) {
            return NextResponse.json({ error: 'Invalid theme mode.' }, { status: 400 });
        }

        await setUserThemeModeSettingsForUser(currentUserIdentity.userId, body.themeMode);
        return NextResponse.json(await getUserThemeModeSettingsSnapshotForUser(currentUserIdentity.userId));
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to save theme settings.',
            },
            { status: 500 },
        );
    }
}
