import { NextResponse } from 'next/server';
import {
    createUserMemory,
    listUserMemories,
    resolveCurrentUserMemoryIdentity,
    type CreateUserMemoryOptions,
} from '@/src/utils/userMemory';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';

/**
 * Lists user memories for current authenticated user.
 */
export async function GET(request: Request) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const url = new URL(request.url);
        const agentPermanentId = url.searchParams.get('agentPermanentId') || undefined;
        const includeGlobal = url.searchParams.get('includeGlobal') !== 'false';
        const search = url.searchParams.get('search') || undefined;
        const limitRaw = url.searchParams.get('limit');
        const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

        const memories = await listUserMemories({
            userId: identity.userId,
            agentPermanentId,
            includeGlobal,
            search,
            limit: Number.isFinite(limit) ? limit : undefined,
        });

        return NextResponse.json(memories);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 },
        );
    }
}

/**
 * Creates one memory record for current authenticated user.
 */
export async function POST(request: Request) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = (await request.json()) as Partial<CreateUserMemoryOptions>;
        const content = typeof body.content === 'string' ? body.content : '';
        const isGlobal = body.isGlobal === true;
        const agentPermanentId = typeof body.agentPermanentId === 'string' ? body.agentPermanentId : null;

        const memory = await createUserMemory({
            userId: identity.userId,
            content,
            isGlobal,
            agentPermanentId,
        });

        return NextResponse.json(memory, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create memory.' },
            { status: 400 },
        );
    }
}
