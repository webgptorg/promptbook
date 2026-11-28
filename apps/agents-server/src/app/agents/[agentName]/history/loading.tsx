import { AgentPageLoadingSkeleton } from '../../../../components/Skeleton/AgentPageLoadingSkeleton';
import { AgentPageLoadingSkeletonVariant } from '../../../../components/Skeleton/AgentPageLoadingSkeletonVariant';

/**
 * Renders the timeline skeleton while the history route streams.
 */
export default function Loading() {
    return <AgentPageLoadingSkeleton variant={AgentPageLoadingSkeletonVariant.TIMELINE} />;
}
