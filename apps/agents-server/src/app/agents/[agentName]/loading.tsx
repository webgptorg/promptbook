import { AgentPageLoadingSkeleton } from '../../../components/Skeleton/AgentPageLoadingSkeleton';
import { AgentPageLoadingSkeletonVariant } from '../../../components/Skeleton/AgentPageLoadingSkeletonVariant';

/**
 * Renders the agent-profile skeleton while dynamic agent routes stream.
 */
export default function Loading() {
    return <AgentPageLoadingSkeleton variant={AgentPageLoadingSkeletonVariant.PROFILE} />;
}
