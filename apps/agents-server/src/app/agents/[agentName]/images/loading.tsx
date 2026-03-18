import { AgentPageLoadingSkeleton } from '../../../../components/Skeleton/AgentPageLoadingSkeleton';
import { AgentPageLoadingSkeletonVariant } from '../../../../components/Skeleton/AgentPageLoadingSkeletonVariant';

/**
 * Renders the gallery skeleton while the images route streams.
 */
export default function Loading() {
    return <AgentPageLoadingSkeleton variant={AgentPageLoadingSkeletonVariant.GALLERY} />;
}
