import { after, NextResponse } from 'next/server';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import {
    createUserChatDetailPayload,
    getUserChat,
    getUserChatJob,
    persistUserChatJobTerminalState,
    requestUserChatJobCancellation,
    triggerUserChatJobWorker,
} from '@/src/utils/userChat';
import { resolveUserChatScope } from '../../../../resolveUserChatScope';

/**
 * Requests cancellation for one queued or running durable chat job.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ agentName: string; chatId: string; jobId: string }> },
) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const { agentName: rawAgentName, chatId: rawChatId, jobId: rawJobId } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const chatId = decodeURIComponent(rawChatId);
    const jobId = decodeURIComponent(rawJobId);
    const scopeResult = await resolveUserChatScope(agentName);

    if (!scopeResult.ok) {
        if (scopeResult.error === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    try {
        const job = await getUserChatJob({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            chatId,
            jobId,
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
        }

        if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
            const chat = await getUserChat({
                userId: scopeResult.scope.userId,
                agentPermanentId: scopeResult.scope.agentPermanentId,
                chatId,
            });

            if (!chat) {
                return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
            }

            return NextResponse.json(await createUserChatDetailPayload(chat));
        }

        const cancellationRequestedJob = await requestUserChatJobCancellation(jobId);
        if (!cancellationRequestedJob) {
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
        }

        if (job.status === 'QUEUED') {
            await persistUserChatJobTerminalState({
                job: cancellationRequestedJob,
                status: 'CANCELLED',
                failureReason: 'Chat generation was cancelled before it started.',
            });
        } else {
            after(() =>
                triggerUserChatJobWorker({
                    origin: new URL(request.url).origin,
                    preferredJobId: jobId,
                }).catch((error) => console.error('[user-chat] Failed to wake worker after cancellation request', error)),
            );
        }

        const chat = await getUserChat({
            userId: scopeResult.scope.userId,
            agentPermanentId: scopeResult.scope.agentPermanentId,
            chatId,
        });

        if (!chat) {
            return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
        }

        return NextResponse.json(await createUserChatDetailPayload(chat));
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to cancel chat job.' },
            { status: 500 },
        );
    }
}
