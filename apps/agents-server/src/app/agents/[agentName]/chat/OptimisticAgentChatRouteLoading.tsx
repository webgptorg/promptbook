'use client';

import { AgentChatLoadingSkeleton } from '../../../../components/Skeleton/AgentChatLoadingSkeleton';
import { peekPendingProfileMessage } from '../profileMessageCache';

/**
 * Props accepted by the optimistic chat-route loading surface.
 */
type OptimisticAgentChatRouteLoadingProps = {
    agentName: string;
    isHeadlessMode?: boolean;
};

/**
 * Renders a lightweight chat shell while the standalone chat route is loading,
 * reusing the pending profile-message handoff when available.
 */
export function OptimisticAgentChatRouteLoading({
    agentName,
    isHeadlessMode = false,
}: OptimisticAgentChatRouteLoadingProps) {
    const pendingProfileMessage = peekPendingProfileMessage(agentName);
    const optimisticMessageContent = resolveOptimisticLoadingMessageContent(pendingProfileMessage);
    const inputPlaceholder = pendingProfileMessage?.inputPlaceholder || 'Send a message';
    const brandColorHex = pendingProfileMessage?.brandColorHex || '#2563eb';

    return (
        <main className="agents-server-chat-route relative agent-chat-route-surface">
            <AgentChatLoadingSkeleton
                showSidebar={!isHeadlessMode}
                isSidebarCollapsed={true}
                threadOverlay={
                    <OptimisticAgentChatThreadOverlay
                        optimisticMessageContent={optimisticMessageContent}
                        inputPlaceholder={inputPlaceholder}
                        brandColorHex={brandColorHex}
                    />
                }
            />
        </main>
    );
}

/**
 * Overlay shown on top of the shared chat skeleton while the first route response is pending.
 */
function OptimisticAgentChatThreadOverlay({
    optimisticMessageContent,
    inputPlaceholder,
    brandColorHex,
}: {
    optimisticMessageContent: string | undefined;
    inputPlaceholder: string;
    brandColorHex: string;
}) {
    return (
        <div className="flex h-full flex-col justify-end">
            {optimisticMessageContent && (
                <div className="flex flex-col gap-3 px-4 pb-24 pt-6 md:px-6">
                    <div className="flex justify-end">
                        <div
                            className="max-w-[min(85%,42rem)] rounded-[24px] px-4 py-3 text-sm font-medium text-white shadow-lg"
                            style={{ backgroundColor: brandColorHex }}
                        >
                            <div className="whitespace-pre-wrap break-words">{optimisticMessageContent}</div>
                            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                                Sending...
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="border-t border-slate-200/70 bg-white/70 p-4">
                <div className="rounded-full border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-400 shadow-sm">
                    {inputPlaceholder}
                </div>
            </div>
        </div>
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
