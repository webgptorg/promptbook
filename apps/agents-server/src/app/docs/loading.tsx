import { DocumentationRouteLoadingSkeleton } from '../../components/Skeleton/DocumentationRouteLoadingSkeleton';

/**
 * Renders the documentation skeleton while docs routes stream.
 */
export default function Loading() {
    return <DocumentationRouteLoadingSkeleton ariaLabel="Loading documentation" showCardGrid={true} />;
}
