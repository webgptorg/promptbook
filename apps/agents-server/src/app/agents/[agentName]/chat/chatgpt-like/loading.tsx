import { AgentPageLoadingSkeleton } from '../../../../../components/Skeleton/AgentPageLoadingSkeleton';
import { AgentPageLoadingSkeletonVariant } from '../../../../../components/Skeleton/AgentPageLoadingSkeletonVariant';

/**
 * Renders the ChatGPT-like chat skeleton while the route streams.
 */
export default function Loading() {
    return <AgentPageLoadingSkeleton variant={AgentPageLoadingSkeletonVariant.CHAT} />;
}
