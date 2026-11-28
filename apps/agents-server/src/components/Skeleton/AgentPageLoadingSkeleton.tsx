import { AgentChatLoadingSkeleton } from './AgentChatLoadingSkeleton';
import { AgentCodeViewerLoadingSkeleton } from './AgentCodeViewerLoadingSkeleton';
import { AgentDocsLoadingSkeleton } from './AgentDocsLoadingSkeleton';
import { AgentEditorLoadingSkeleton } from './AgentEditorLoadingSkeleton';
import { AgentGalleryLoadingSkeleton } from './AgentGalleryLoadingSkeleton';
import { AgentPageLoadingSkeletonVariant } from './AgentPageLoadingSkeletonVariant';
import { AgentProfileLoadingSkeleton } from './AgentProfileLoadingSkeleton';
import { AgentSplitEditorChatLoadingSkeleton } from './AgentSplitEditorChatLoadingSkeleton';
import { AgentTextareaLoadingSkeleton } from './AgentTextareaLoadingSkeleton';
import { AgentTimelineLoadingSkeleton } from './AgentTimelineLoadingSkeleton';

/**
 * Props for the shared agent page loading entrypoint.
 */
type AgentPageLoadingSkeletonProps = {
    /**
     * Route or family-specific loading variant to render.
     */
    readonly variant: AgentPageLoadingSkeletonVariant;
};

/**
 * Central entrypoint for agent-route loading UI.
 *
 * Route audit / family map:
 * - `PROFILE`: `/agents/[agentName]` and `/<agentName>`
 * - `CHAT`: `/agents/[agentName]/chat`
 * - `TEXTAREA`: `/agents/[agentName]/textarea`
 * - `EDITOR`: `/agents/[agentName]/book`
 * - `SPLIT_EDITOR_CHAT`: `/agents/[agentName]/book+chat`
 * - `INTEGRATION`: `/agents/[agentName]/integration`
 * - `DOCS`: `/agents/[agentName]/website-integration`, `/agents/[agentName]/system-message`
 * - `CODE_VIEWER`: `/agents/[agentName]/export-as-transpiled-code`
 * - `TIMELINE`: `/agents/[agentName]/history`
 * - `GALLERY`: `/agents/[agentName]/images`
 *
 * Reuse the closest existing family for new routes and only add a new variant
 * when the layout geometry is materially different.
 */
export function AgentPageLoadingSkeleton({ variant }: AgentPageLoadingSkeletonProps) {
    switch (variant) {
        case AgentPageLoadingSkeletonVariant.PROFILE:
            return <AgentProfileLoadingSkeleton />;
        case AgentPageLoadingSkeletonVariant.CHAT:
            return <AgentChatLoadingSkeleton />;
        case AgentPageLoadingSkeletonVariant.TEXTAREA:
            return <AgentTextareaLoadingSkeleton />;
        case AgentPageLoadingSkeletonVariant.EDITOR:
            return <AgentEditorLoadingSkeleton />;
        case AgentPageLoadingSkeletonVariant.SPLIT_EDITOR_CHAT:
            return <AgentSplitEditorChatLoadingSkeleton />;
        case AgentPageLoadingSkeletonVariant.INTEGRATION:
            return <AgentDocsLoadingSkeleton sectionCount={4} showPreviewPanel />;
        case AgentPageLoadingSkeletonVariant.DOCS:
            return <AgentDocsLoadingSkeleton sectionCount={2} maxWidthClassName="max-w-4xl" />;
        case AgentPageLoadingSkeletonVariant.CODE_VIEWER:
            return <AgentCodeViewerLoadingSkeleton />;
        case AgentPageLoadingSkeletonVariant.TIMELINE:
            return <AgentTimelineLoadingSkeleton />;
        case AgentPageLoadingSkeletonVariant.GALLERY:
            return <AgentGalleryLoadingSkeleton />;
    }

    const unexpectedVariant: never = variant;
    throw new Error(`Unknown agent page loading skeleton variant: ${unexpectedVariant}`);
}
