import { ConsolePageLoadingSkeleton } from '../../../../components/Skeleton/ConsolePageLoadingSkeleton';

/**
 * Renders the timeout-manager skeleton while timeout route data streams.
 */
export default function Loading() {
    return (
        <ConsolePageLoadingSkeleton
            ariaLabel="Loading agent timeouts"
            showSummaryCards={true}
            showFiltersCard={true}
            panelHeights={[360]}
        />
    );
}
