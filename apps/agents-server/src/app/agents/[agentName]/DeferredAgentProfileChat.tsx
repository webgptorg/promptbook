'use client';

import dynamic from 'next/dynamic';
import { ChatThreadLoadingSkeleton } from '../../../components/Skeleton/ChatThreadLoadingSkeleton';
import type { AgentProfileChatProps } from './AgentProfileChat';

/**
 * Keeps the profile page visually stable while the interactive preview chat chunk loads.
 */
function AgentProfileChatLoadingFallback() {
    return (
        <div className="relative w-full h-[calc(100dvh-300px)] min-h-[350px] md:min-h-[420px] md:h-[500px] agent-chat-route-surface">
            <div className="absolute inset-0 rounded-[32px] border border-white/30 bg-gradient-to-br from-white/80 via-white/70 to-slate-100/70 shadow-[0_25px_80px_rgba(15,23,42,0.25)]" />
            <div className="relative z-10 h-full w-full rounded-[32px] border border-white/40 bg-white/80 p-4 shadow-2xl backdrop-blur-3xl">
                <ChatThreadLoadingSkeleton
                    withComposer
                    className="h-full w-full rounded-[28px] border border-white/40 bg-white/75"
                />
            </div>
        </div>
    );
}

/**
 * Deferred profile-chat chunk so the profile shell can render before the chat client hydrates.
 */
const LazyAgentProfileChat = dynamic(() => import('./AgentProfileChat').then((mod) => mod.AgentProfileChat), {
    ssr: false,
    loading: () => <AgentProfileChatLoadingFallback />,
});

/**
 * Lazily renders the profile-page chat preview to reduce initial profile-route bundle cost.
 *
 * @param props - Profile chat properties forwarded to the interactive preview.
 * @returns Deferred profile chat preview.
 */
export function DeferredAgentProfileChat(props: AgentProfileChatProps) {
    return <LazyAgentProfileChat {...props} />;
}
