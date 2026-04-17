'use client';

import { ChatThreadLoadingSkeleton } from '../../../../components/Skeleton/ChatThreadLoadingSkeleton';
import { peekPendingProfileMessage } from '../profileMessageCache';

/**
 * Props accepted by the optimistic chat-route loading surface.
 */
type OptimisticAgentChatRouteLoadingProps = {
    agentName: string;
};

/**
 * Renders a lightweight chat shell while the standalone chat route is loading,
 * reusing the pending profile-message handoff when available.
 */
export function OptimisticAgentChatRouteLoading({ agentName }: OptimisticAgentChatRouteLoadingProps) {
    const pendingProfileMessage = peekPendingProfileMessage(agentName);
    const optimisticMessageContent = resolveOptimisticLoadingMessageContent(pendingProfileMessage);
    const agentDisplayName = pendingProfileMessage?.agentDisplayName || agentName;
    const inputPlaceholder = pendingProfileMessage?.inputPlaceholder || 'Send a message';
    const brandColorHex = pendingProfileMessage?.brandColorHex || '#2563eb';

    return (
        <main className="agents-server-chat-route relative agent-chat-route-surface">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden px-4 py-4 md:px-6 md:py-6">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/30 bg-white/70 shadow-[0_25px_80px_rgba(15,23,42,0.18)] backdrop-blur-sm">
                    <div className="border-b border-slate-200/80 bg-white/85 px-5 py-4">
                        <div className="text-sm font-semibold text-slate-500">Chat</div>
                        <div className="text-lg font-semibold text-slate-900">{agentDisplayName}</div>
                    </div>
                    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                        <ChatThreadLoadingSkeleton
                            withComposer
                            className="absolute inset-0 h-full w-full rounded-none border-0 bg-transparent"
                        />
                        {optimisticMessageContent && (
                            <div className="relative z-10 mt-auto flex flex-col gap-3 px-4 pb-24 pt-6 md:px-6">
                                <div className="flex justify-end">
                                    <div
                                        className="max-w-[min(85%,42rem)] rounded-[24px] px-4 py-3 text-sm font-medium text-white shadow-lg"
                                        style={{ backgroundColor: brandColorHex }}
                                    >
                                        <div className="whitespace-pre-wrap break-words">
                                            {optimisticMessageContent}
                                        </div>
                                        <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                                            Sending...
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 border-t border-white/60 bg-white/90 px-4 py-4 backdrop-blur md:px-6">
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-sm text-slate-400">
                                {inputPlaceholder}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

/**
 * Resolves the optimistic loading-bubble content from the persisted handoff payload.
 *
 * @param pendingProfileMessage - Pending profile-to-chat handoff payload.
 * @returns Renderable bubble content or `undefined` when no optimistic turn exists.
 */
function resolveOptimisticLoadingMessageContent(
    pendingProfileMessage: ReturnType<typeof peekPendingProfileMessage>,
): string | undefined {
    if (pendingProfileMessage?.message) {
        return pendingProfileMessage.message;
    }

    const attachmentsCount = pendingProfileMessage?.attachments?.length || 0;
    if (attachmentsCount === 0) {
        return undefined;
    }

    return attachmentsCount === 1 ? '1 attachment' : `${attachmentsCount} attachments`;
}
