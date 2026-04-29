import { NextResponse } from 'next/server';
import { consumeShareTargetPayload } from '@/src/utils/shareTargetPayloads';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { resolveAgentVisibilityAccess } from '@/src/utils/agentAccess';

/**
 * Marks one pending share-target payload as consumed once the chat UI has accepted it for auto-send.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ agentName: string; shareTargetId: string }> },
) {
    const { agentName: rawAgentName, shareTargetId: rawShareTargetId } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const shareTargetId = decodeURIComponent(rawShareTargetId);
    const collection = await $provideAgentCollectionForServer();
    const canonicalAgentId = await collection.getAgentPermanentId(agentName).catch(() => null);

    if (!canonicalAgentId) {
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    const access = await resolveAgentVisibilityAccess({ agentIdentifier: canonicalAgentId, request });
    if (!access.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await consumeShareTargetPayload({
        shareTargetId,
        agentPermanentId: canonicalAgentId,
    }).catch((error) => {
        console.error('[share-target] Failed to consume payload', error);
    });

    return new NextResponse(null, { status: 204 });
}
