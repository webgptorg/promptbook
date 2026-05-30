import type { InteractiveTerminalSessionSubscriber } from './interactiveTerminalSession';

/**
 * Minimal browser-safe terminal session shape needed by the shared SSE helper.
 */
type InteractiveTerminalEventStreamSession = {
    readonly isRunning: boolean;
};

/**
 * Generic subscriber shape used by one streamed browser terminal route.
 */
type InteractiveTerminalEventStreamSubscriber<TSession extends InteractiveTerminalEventStreamSession> = {
    readonly onOutput: InteractiveTerminalSessionSubscriber['onOutput'];
    readonly onExit: (event: { readonly type: 'exit'; readonly snapshot: TSession }) => void;
};

/**
 * Creates one SSE response that replays buffered terminal output and then streams live events.
 *
 * @param request - Browser stream request.
 * @param sessionId - Terminal session id.
 * @param session - Existing session snapshot.
 * @param subscribe - Subscription function for live terminal events.
 * @returns Event stream response.
 */
export function createInteractiveTerminalEventStream<TSession extends InteractiveTerminalEventStreamSession>(
    request: Request,
    sessionId: string,
    session: TSession,
    subscribe: (
        sessionId: string,
        subscriber: InteractiveTerminalEventStreamSubscriber<TSession>,
    ) => (() => void) | null,
): Response {
    const encoder = new TextEncoder();

    return new Response(
        new ReadableStream({
            start(controller) {
                const emitEvent = (event: string, payload: unknown) => {
                    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
                };

                emitEvent('snapshot', session);

                if (!session.isRunning) {
                    controller.close();
                    return;
                }

                const unsubscribe = subscribe(sessionId, {
                    onOutput: ({ chunk }) => emitEvent('output', { chunk }),
                    onExit: ({ snapshot: nextSession }) => {
                        emitEvent('exit', nextSession);
                        unsubscribe?.();
                        controller.close();
                    },
                });

                if (!unsubscribe) {
                    controller.error(new Error('Terminal session was not found.'));
                    return;
                }

                request.signal.addEventListener(
                    'abort',
                    () => {
                        unsubscribe();
                        controller.close();
                    },
                    { once: true },
                );
            },
        }),
        {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
            },
        },
    );
}
