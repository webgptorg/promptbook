import { CHAT_STREAM_KEEP_ALIVE_INTERVAL_MS } from '@/src/constants/streaming';
import { isPrivateModeEnabledFromRequest } from '@/src/utils/privateMode';
import {
    createUserChatDetailPayload,
    getUserChat,
    isFrozenUserChatSource,
    kickUserChatJobInteractiveWorkerTick,
    triggerUserChatJobWorker,
} from '@/src/utils/userChat';
import type { ChatMessage } from '@promptbook-local/types';
import { NextResponse } from 'next/server';
import { resolveUserChatScope } from '../../resolveUserChatScope';

/**
 * Faster refresh cadence used while the active chat still has background work in flight.
 */
const ACTIVE_USER_CHAT_STREAM_POLL_INTERVAL_MS = 1_000;

/**
 * Lower refresh cadence used when the active chat is idle.
 */
const IDLE_USER_CHAT_STREAM_POLL_INTERVAL_MS = 15_000;

/**
 * Minimum delay between worker wake attempts while the active chat still has queued jobs.
 */
const ACTIVE_USER_CHAT_WORKER_WAKE_THROTTLE_MS = 5_000;

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
export async function GET(request: Request, { params }: { params: Promise<{ agentName: string; chatId: string }> }) {
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
        viewerIsAdmin: scopeResult.scope.viewerIsAdmin,
        agentPermanentId: scopeResult.scope.agentPermanentId,
        chatId,
    });

    if (!chat) {
        return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    }

    const requestOrigin = new URL(request.url).origin;
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
        async start(controller) {
            let isStreamClosed = false;
            let lastSnapshotSignature: string | null = null;
            let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
            let isWorkerWakeInFlight = false;
            let lastWorkerWakeAttemptAt = 0;

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
             * Triggers one durable worker wake-up when this active stream still observes queued jobs.
             *
             * @private route helper
             */
            const wakeWorkerForQueuedJobs = (
                activeJobs: Awaited<ReturnType<typeof createUserChatDetailPayload>>['activeJobs'],
            ): void => {
                if (isWorkerWakeInFlight) {
                    return;
                }

                const queuedJob = activeJobs.find(
                    (activeJob) => activeJob.status === 'QUEUED' && activeJob.cancelRequestedAt === null,
                );
                if (!queuedJob) {
                    return;
                }

                const now = Date.now();
                if (now - lastWorkerWakeAttemptAt < ACTIVE_USER_CHAT_WORKER_WAKE_THROTTLE_MS) {
                    return;
                }

                lastWorkerWakeAttemptAt = now;
                isWorkerWakeInFlight = true;

                // In-process kick as a fast-path (bypasses HTTP, works in local dev and as fallback)
                kickUserChatJobInteractiveWorkerTick(queuedJob.id);

                void triggerUserChatJobWorker({
                    origin: requestOrigin,
                    preferredJobId: queuedJob.id,
                })
                    .catch((error) => {
                        console.error('[user-chat] Failed to trigger durable worker from active stream', {
                            chatId,
                            jobId: queuedJob.id,
                            error,
                        });
                    })
                    .finally(() => {
                        isWorkerWakeInFlight = false;
                    });
            };

            /**
             * Loads the latest canonical chat detail and emits it only when the user-visible state changed.
             *
             * @private route helper
             */
            const emitLatestSnapshot = async (): Promise<boolean> => {
                const currentChat = await getUserChat({
                    userId: scopeResult.scope.userId,
                    viewerIsAdmin: scopeResult.scope.viewerIsAdmin,
                    agentPermanentId: scopeResult.scope.agentPermanentId,
                    chatId,
                });

                if (!currentChat) {
                    closeStream();
                    return false;
                }

                const payload = await createUserChatDetailPayload(currentChat);
                if (!isFrozenUserChatSource(payload.chat.source)) {
                    wakeWorkerForQueuedJobs(payload.activeJobs);
                }
                const nextSignature = createUserChatDetailSignature(payload);

                if (nextSignature !== lastSnapshotSignature) {
                    lastSnapshotSignature = nextSignature;
                    if (!enqueueFrame({ type: 'snapshot', payload })) {
                        return false;
                    }
                }

                return !isFrozenUserChatSource(payload.chat.source) && payload.activeJobs.length > 0;
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
function createUserChatDetailSignature(payload: Awaited<ReturnType<typeof createUserChatDetailPayload>>): string {
    return JSON.stringify({
        chatId: payload.chat.id,
        updatedAt: payload.chat.updatedAt,
        draftMessage: payload.draftMessage || '',
        messages: payload.messages.map(createUserChatMessageSignature),
        activeJobs: payload.activeJobs.map((job) => ({
            id: job.id,
            status: job.status,
            cancelRequestedAt: job.cancelRequestedAt,
        })),
        activeTimeouts: payload.activeTimeouts.map((timeout) => ({
            id: timeout.id,
            status: timeout.status,
            dueAt: timeout.dueAt,
            cancelRequestedAt: timeout.cancelRequestedAt,
        })),
    });
}

/**
 * Builds one compact stable signature for a user-visible chat message.
 */
function createUserChatMessageSignature(
    message: Awaited<ReturnType<typeof createUserChatDetailPayload>>['messages'][number],
): Record<string, unknown> {
    return {
        id: message.id ?? null,
        sender: message.sender,
        isComplete: message.isComplete,
        lifecycleState: message.lifecycleState ?? null,
        lifecycleError: message.lifecycleError ?? null,
        contentLength: message.content.length,
        contentHash: createStableTextDigest(message.content),
        progressCard: message.progressCard ? JSON.stringify(message.progressCard) : null,
        ongoingToolCalls: createToolCallsSignature(message.ongoingToolCalls),
        completedToolCalls: createToolCallsSignature(message.completedToolCalls),
        toolCalls: createToolCallsSignature(message.toolCalls),
    };
}

/**
 * Creates one compact stable digest for message text without pulling in heavier hashing helpers.
 */
function createStableTextDigest(value: string): string {
    let hash = 2_166_136_261;

    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16_777_619);
    }

    return (hash >>> 0).toString(16);
}

/**
 * Serializes optional tool-call arrays for snapshot signature comparisons.
 */
function createToolCallsSignature(toolCalls: ChatMessage['toolCalls']): string | null {
    return toolCalls && toolCalls.length > 0 ? JSON.stringify(toolCalls) : null;
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
