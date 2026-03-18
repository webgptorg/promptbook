import { AgentPageLoadingSkeleton } from '../../../../components/Skeleton/AgentPageLoadingSkeleton';
import { AgentPageLoadingSkeletonVariant } from '../../../../components/Skeleton/AgentPageLoadingSkeletonVariant';

/**
 * Renders the standalone chat skeleton while chat route segments stream.
 */
export default function Loading() {
    return <AgentPageLoadingSkeleton variant={AgentPageLoadingSkeletonVariant.CHAT} />;
}
