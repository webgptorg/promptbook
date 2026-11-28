import { DocumentationRouteLoadingSkeleton } from '../../components/Skeleton/DocumentationRouteLoadingSkeleton';

/**
 * Renders the API-reference skeleton while Swagger assets and server data stream.
 */
export default function Loading() {
    return (
        <DocumentationRouteLoadingSkeleton
            ariaLabel="Loading API reference"
            showCardGrid={false}
            showSidebar={true}
        />
    );
}
