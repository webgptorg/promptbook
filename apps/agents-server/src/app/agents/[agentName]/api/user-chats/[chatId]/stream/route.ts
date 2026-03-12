import { CHAT_STREAM_KEEP_ALIVE_INTERVAL_MS } from '@/src/constants/streaming';
import { createUserChatDetailPayload, getUserChat } from '@/src/utils/userChat';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import { NextResponse } from 'next/server';
import { resolveUserChatScope } from '../../resolveUserChatScope';

/**
 * Faster refresh cadence used while the active chat still has background work in flight.
 */
const ACTIVE_USER_CHAT_STREAM_POLL_INTERVAL_MS = 700;

/**
 * Lower refresh cadence used when the active chat is idle.
 */
const IDLE_USER_CHAT_STREAM_POLL_INTERVAL_MS = 2_500;

/**
 * Allows one chat-stream response to stay open for the platform maximum.
 */
export const maxDuration = 300;

/**
 * One newline-delimited frame emitted by the canonical user-chat stream.
 */
type UserChatStreamFrame =
    | {
          type: 'snapshot';
          payload: Awaited<ReturnType<typeof createUserChatDetailPayload>>;
      }
    | {
          type: 'keepalive';
      };

/**
 * Streams canonical chat snapshots for one scoped user chat so multiple viewers can observe the same background turn.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ agentName: string; chatId: string }> },
) {
    if (isPrivateModeEnabledFromRequest(request)) {
        return NextResponse.json({ error: 'Private mode is enabled.' }, { status: 403 });
    }

    const { agentName: rawAgentName, chatId: rawChatId } = await params;
    const agentName = decodeURIComponent(rawAgentName);
    const chatId = decodeURIComponent(rawChatId);
    const scopeResult = await resolveUserChatScope(agentName);

    if (!scopeResult.ok) {
        if (scopeResult.error === 'UNAUTHORIZED') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    const chat = await getUserChat({
        userId: scopeResult.scope.userId,
        agentPermanentId: scopeResult.scope.agentPermanentId,
        chatId,
    });

    if (!chat) {
        return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    }

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
        async start(controller) {
            let isStreamClosed = false;
            let lastSnapshotSignature: string | null = null;
            let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

            /**
             * Closes the stream once and stops scheduled keep-alive work.
             *
             * @private route helper
             */
            const closeStream = (): void => {
                if (isStreamClosed) {
                    return;
                }

                isStreamClosed = true;

                if (keepAliveInterval) {
                    clearInterval(keepAliveInterval);
                    keepAliveInterval = null;
                }

                try {
                    controller.close();
                } catch {
                    // The runtime may already close the stream after disconnect.
                }
            };

            /**
             * Writes one newline-delimited frame to the response stream.
             *
             * @private route helper
             */
            const enqueueFrame = (frame: UserChatStreamFrame): boolean => {
                if (isStreamClosed || request.signal.aborted) {
                    return false;
                }

                try {
                    controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`));
                    return true;
                } catch {
                    closeStream();
                    return false;
                }
            };

            /**
             * Loads the latest canonical chat detail and emits it only when the user-visible state changed.
             *
             * @private route helper
             */
            const emitLatestSnapshot = async (): Promise<boolean> => {
                const currentChat = await getUserChat({
                    userId: scopeResult.scope.userId,
                    agentPermanentId: scopeResult.scope.agentPermanentId,
                    chatId,
                });

                if (!currentChat) {
                    closeStream();
                    return false;
                }

                const payload = await createUserChatDetailPayload(currentChat);
                const nextSignature = createUserChatDetailSignature(payload);

                if (nextSignature !== lastSnapshotSignature) {
                    lastSnapshotSignature = nextSignature;
                    if (!enqueueFrame({ type: 'snapshot', payload })) {
                        return false;
                    }
                }

                return payload.activeJobs.length > 0;
            };

            /**
             * Tracks client disconnects so the polling loop can exit promptly.
             *
             * @private route helper
             */
            const handleAbort = (): void => {
                closeStream();
            };

            request.signal.addEventListener('abort', handleAbort, { once: true });
            keepAliveInterval = setInterval(() => {
                enqueueFrame({ type: 'keepalive' });
            }, CHAT_STREAM_KEEP_ALIVE_INTERVAL_MS);
            keepAliveInterval.unref?.();

            try {
                let hasActiveJobs = await emitLatestSnapshot();

                while (!isStreamClosed && !request.signal.aborted) {
                    await waitForNextUserChatStreamPoll(
                        hasActiveJobs
                            ? ACTIVE_USER_CHAT_STREAM_POLL_INTERVAL_MS
                            : IDLE_USER_CHAT_STREAM_POLL_INTERVAL_MS,
                        request.signal,
                    );

                    if (isStreamClosed || request.signal.aborted) {
                        break;
                    }

                    hasActiveJobs = await emitLatestSnapshot();
                }
            } catch (error) {
                if (!isStreamClosed && !request.signal.aborted) {
                    console.error('[user-chat] Failed to stream canonical chat state', {
                        chatId,
                        error,
                    });

                    try {
                        controller.error(error);
                    } catch {
                        closeStream();
                    }
                }
            } finally {
                request.signal.removeEventListener('abort', handleAbort);
                closeStream();
            }
        },
    });

    return new Response(readableStream, {
        status: 200,
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Cache-Control': 'no-cache, no-transform',
        },
    });
}

/**
 * Builds a stable signature for the user-visible parts of a canonical chat snapshot.
 */
function createUserChatDetailSignature(
    payload: Awaited<ReturnType<typeof createUserChatDetailPayload>>,
): string {
    return JSON.stringify({
        chatId: payload.chat.id,
        updatedAt: payload.chat.updatedAt,
        draftMessage: payload.draftMessage || '',
        activeJobs: payload.activeJobs.map((job) => ({
            id: job.id,
            status: job.status,
            cancelRequestedAt: job.cancelRequestedAt,
        })),
    });
}

/**
 * Waits until the next polling cycle or until the request is aborted.
 */
function waitForNextUserChatStreamPoll(durationMs: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted || durationMs <= 0) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', handleAbort);
            resolve();
        }, durationMs);

        /**
         * Resolves the pending wait immediately after client disconnect.
         *
         * @private route helper
         */
        function handleAbort(): void {
            clearTimeout(timer);
            resolve();
        }

        signal.addEventListener('abort', handleAbort, { once: true });
    });
}
