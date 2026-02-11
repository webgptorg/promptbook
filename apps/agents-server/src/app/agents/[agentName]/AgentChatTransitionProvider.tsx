'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import spaceTrim from 'spacetrim';
import { string_color } from '../../../../../../src/types/typeAliases';

type AgentChatTransitionMode = 'message' | 'quick';

type AgentChatTransitionPayload = {
    mode: AgentChatTransitionMode;
    message?: string;
    fullname: string;
    brandColorHex: string_color;
};

type AgentChatTransitionState = AgentChatTransitionPayload & {
    key: number;
};

type AgentChatTransitionContextValue = {
    startTransition: (payload: AgentChatTransitionPayload) => void;
    clearTransition: () => void;
    isTransitioning: boolean;
    transitionState: AgentChatTransitionState | null;
};

const AgentChatTransitionContext = createContext<AgentChatTransitionContextValue | null>(null);

/**
 * Provides a shared overlay that keeps the profile-to-chat transition feeling immersive.
 *
 * @private UI helper scoped to the Agents Server.
 */
export function AgentChatTransitionProvider({ agentName, children }: { agentName: string; children: ReactNode }) {
    const [transitionState, setTransitionState] = useState<AgentChatTransitionState | null>(null);
    const pathname = usePathname();
    const chatRoute = useMemo(() => `/agents/${encodeURIComponent(agentName)}/chat`, [agentName]);

    const startTransition = useCallback((payload: AgentChatTransitionPayload) => {
        setTransitionState({ ...payload, key: Date.now() });
    }, []);

    const clearTransition = useCallback(() => {
        setTransitionState(null);
    }, []);

    useEffect(() => {
        if (!transitionState) {
            return;
        }

        const duration = pathname === chatRoute ? 400 : 10_000;
        const timer = window.setTimeout(clearTransition, duration);

        return () => window.clearTimeout(timer);
    }, [chatRoute, clearTransition, pathname, transitionState]);

    const contextValue = useMemo<AgentChatTransitionContextValue>(() => ({
        startTransition,
        clearTransition,
        isTransitioning: Boolean(transitionState),
        transitionState,
    }), [clearTransition, startTransition, transitionState]);

    return (
        <AgentChatTransitionContext.Provider value={contextValue}>
            {children}
            {transitionState && <AgentChatTransitionOverlay transitionState={transitionState} />}
        </AgentChatTransitionContext.Provider>
    );
}

/**
 * Hook that exposes the transition lifecyle helpers.
 *
 * @private Agents Server helper.
 */
export function useAgentChatTransition() {
    const context = useContext(AgentChatTransitionContext);
    if (!context) {
        throw new Error('useAgentChatTransition must be used inside AgentChatTransitionProvider');
    }

    return context;
}

type AgentChatTransitionOverlayProps = {
    transitionState: AgentChatTransitionState;
};

/**
 * Renders the floating overlay that keeps the user oriented to the chat transition.
 *
 * @private Agents Server UX kit.
 */
function AgentChatTransitionOverlay({ transitionState }: AgentChatTransitionOverlayProps) {
    const previewMessage = transitionState.message ? spaceTrim(transitionState.message) : undefined;
    const transitionLabel = transitionState.mode === 'message' ? 'Sending your message' : 'Opening full chat';
    const description =
        transitionState.mode === 'message'
            ? 'We are queuing your reply for the full chat.'
            : 'The immersive chat workspace is loading.';

    return (
        <aside
            aria-live="polite"
            role="status"
            className="pointer-events-auto fixed inset-0 z-[70] flex items-center justify-center px-4 py-6"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/90 to-black/95 backdrop-blur-sm" />
            <div className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/20 bg-gradient-to-br from-white/10 via-black/40 to-black/70 p-6 shadow-[0_25px_80px_-30px_rgba(0,0,0,0.9)] text-white">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full animate-pulse" style={{ backgroundColor: transitionState.brandColorHex }} />
                        <div>
                            <p className="text-lg font-semibold leading-tight">{transitionLabel}</p>
                            <p className="text-[11px] uppercase tracking-[0.3em] text-white/70">{description}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end text-[10px] uppercase tracking-[0.4em] text-white/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
                        <span>Profile → Chat</span>
                    </div>
                </div>
                <p className="mt-4 text-sm text-white/70">
                    {`We are transferring ${transitionState.fullname || 'your agent'} into the full chat experience.`}
                </p>
                {previewMessage && (
                    <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[inset_0_2px_8px_rgba(255,255,255,0.15)]">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">Preview</p>
                        <div className="space-y-2">
                            <div className="rounded-2xl bg-white/10 p-3 text-sm leading-relaxed text-white">{previewMessage}</div>
                            <div className="flex items-center gap-2 text-[11px] text-white/50">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: transitionState.brandColorHex }} />
                                <span>Queued for {transitionState.fullname || 'the agent'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <span className="sr-only">
                {previewMessage ? `${transitionLabel} with message: ${previewMessage}` : transitionLabel}
            </span>
        </aside>
    );
}
