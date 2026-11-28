import { AgentPageLoadingSkeleton } from '../../components/Skeleton/AgentPageLoadingSkeleton';
import { AgentPageLoadingSkeletonVariant } from '../../components/Skeleton/AgentPageLoadingSkeletonVariant';

/**
 * Renders the profile skeleton for legacy root-level agent profile aliases.
 */
export default function Loading() {
    return <AgentPageLoadingSkeleton variant={AgentPageLoadingSkeletonVariant.PROFILE} />;
}
