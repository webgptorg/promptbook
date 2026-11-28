import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/utils/getCurrentUser';
import { resolveCurrentUserIdentity } from '@/src/utils/currentUserIdentity';
import { getMockedChatsForUser, saveMockedChatsForUser } from '@/src/utils/mockedChatsStore';
import type { MockedChatPreset } from '@/src/utils/mockedChatsSchema';

/**
 * API payload returned from mocked-chat endpoints.
 */
type MockedChatsApiResponse = {
    mockedChats: Array<MockedChatPreset>;
};

/**
 * Resolves the authenticated database user id required by System utilities.
 */
async function resolveAuthenticatedUserId(): Promise<number | null> {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return null;
    }

    const identity = await resolveCurrentUserIdentity();
    if (!identity || !identity.sessionUser) {
        return null;
    }

    return identity.userId;
}

/**
 * Returns mocked chats for the current authenticated user.
 */
export async function GET(): Promise<NextResponse<MockedChatsApiResponse | { error: string }>> {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const mockedChats = await getMockedChatsForUser(userId);
        return NextResponse.json({ mockedChats });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to load mocked chats.',
            },
            { status: 500 },
        );
    }
}

/**
 * Persists mocked chats for the current authenticated user.
 */
export async function PUT(request: Request): Promise<NextResponse<MockedChatsApiResponse | { error: string }>> {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as {
            mockedChats?: unknown;
        };

        const mockedChats = await saveMockedChatsForUser(userId, body.mockedChats);
        return NextResponse.json({ mockedChats });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to save mocked chats.',
            },
            { status: 400 },
        );
    }
}
