import { NextResponse } from 'next/server';
import { deleteUserMemory, resolveCurrentUserMemoryIdentity, updateUserMemory } from '@/src/utils/userMemory';

/**
 * Parses numeric memory id from route params.
 */
function parseMemoryId(rawValue: string): number | null {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}

/**
 * Updates one memory record for the current authenticated user.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ memoryId: string }> }) {
    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memoryId: rawMemoryId } = await params;
    const memoryId = parseMemoryId(rawMemoryId);
    if (!memoryId) {
        return NextResponse.json({ error: 'Invalid memory id.' }, { status: 400 });
    }

    try {
        const body = (await request.json()) as {
            content?: unknown;
            isGlobal?: unknown;
            agentPermanentId?: unknown;
        };

        const content = typeof body.content === 'string' ? body.content : '';
        const isGlobal = body.isGlobal === true;
        const agentPermanentId = typeof body.agentPermanentId === 'string' ? body.agentPermanentId : null;

        const memory = await updateUserMemory({
            userId: identity.userId,
            memoryId,
            content,
            isGlobal,
            agentPermanentId,
        });

        return NextResponse.json(memory);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update memory.' },
            { status: 400 },
        );
    }
}

/**
 * Deletes one memory record for the current authenticated user.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ memoryId: string }> }) {
    void request;

    const identity = await resolveCurrentUserMemoryIdentity();
    if (!identity) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memoryId: rawMemoryId } = await params;
    const memoryId = parseMemoryId(rawMemoryId);
    if (!memoryId) {
        return NextResponse.json({ error: 'Invalid memory id.' }, { status: 400 });
    }

    try {
        const deleted = await deleteUserMemory({
            userId: identity.userId,
            memoryId,
        });

        if (!deleted) {
            return NextResponse.json({ error: 'Memory not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete memory.' },
            { status: 500 },
        );
    }
}

