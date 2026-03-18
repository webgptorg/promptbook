import { AgentPageLoadingSkeleton } from '../../../../components/Skeleton/AgentPageLoadingSkeleton';
import { AgentPageLoadingSkeletonVariant } from '../../../../components/Skeleton/AgentPageLoadingSkeletonVariant';

/**
 * Renders the code-viewer skeleton while the export route streams.
 */
export default function Loading() {
    return <AgentPageLoadingSkeleton variant={AgentPageLoadingSkeletonVariant.CODE_VIEWER} />;
}
