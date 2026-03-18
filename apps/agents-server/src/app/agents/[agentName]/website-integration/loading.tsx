import { AgentPageLoadingSkeleton } from '../../../../components/Skeleton/AgentPageLoadingSkeleton';
import { AgentPageLoadingSkeletonVariant } from '../../../../components/Skeleton/AgentPageLoadingSkeletonVariant';

/**
 * Renders the documentation-style skeleton while the website integration route streams.
 */
export default function Loading() {
    return <AgentPageLoadingSkeleton variant={AgentPageLoadingSkeletonVariant.DOCS} />;
}
