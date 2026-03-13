import { NextResponse } from 'next/server';
import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import {
    getChatEnterBehaviorSettingsForUser,
    isAgentsServerChatEnterBehavior,
    setChatEnterBehaviorSettingsForUser,
    type ChatEnterBehaviorSettingsSnapshot,
} from '@/src/utils/chatEnterBehaviorSettings';

/**
 * Loads the current browser user's chat Enter-key preference.
 */
export async function GET(): Promise<NextResponse<ChatEnterBehaviorSettingsSnapshot | { error: string }>> {
    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const storedSettings = await getChatEnterBehaviorSettingsForUser(currentUserIdentity.userId);

        return NextResponse.json({
            enterBehavior: storedSettings?.enterBehavior || null,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to load chat keybindings.',
            },
            { status: 500 },
        );
    }
}

/**
 * Persists the current browser user's chat Enter-key preference.
 */
export async function PUT(request: Request): Promise<NextResponse<ChatEnterBehaviorSettingsSnapshot | { error: string }>> {
    const currentUserIdentity = await resolveCurrentUserIdentity();
    if (!currentUserIdentity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as {
            enterBehavior?: unknown;
        };

        if (!isAgentsServerChatEnterBehavior(body.enterBehavior)) {
            return NextResponse.json({ error: 'Invalid enter behavior.' }, { status: 400 });
        }

        const storedSettings = await setChatEnterBehaviorSettingsForUser(
            currentUserIdentity.userId,
            body.enterBehavior,
        );

        return NextResponse.json({
            enterBehavior: storedSettings.enterBehavior,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to save chat keybindings.',
            },
            { status: 500 },
        );
    }
}
