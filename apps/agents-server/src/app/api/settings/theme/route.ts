import { NextResponse } from 'next/server';
import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import {
    getThemeSettingsSnapshotForUser,
    updateThemeSettingsForUser,
    type ThemeSettingsSnapshot,
} from '@/src/utils/themeSettings';
import { isAgentsServerThemePreference } from '@/src/constants/themePreferences';

/**
 * Loads the current browser user's theme preference.
 */
export async function GET(): Promise<NextResponse<ThemeSettingsSnapshot | { error: string }>> {
    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        return NextResponse.json(await getThemeSettingsSnapshotForUser(currentUserIdentity.userId));
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
export async function PUT(request: Request): Promise<NextResponse<ThemeSettingsSnapshot | { error: string }>> {
    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as {
            preference?: unknown;
        };

        if (typeof body.preference !== 'string') {
            return NextResponse.json({ error: 'Invalid theme preference.' }, { status: 400 });
        }

        if (!isAgentsServerThemePreference(body.preference)) {
            return NextResponse.json({ error: 'Invalid theme preference.' }, { status: 400 });
        }

        return NextResponse.json(
            await updateThemeSettingsForUser(currentUserIdentity.userId, body.preference),
        );
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to save theme settings.',
            },
            { status: 500 },
        );
    }
}
