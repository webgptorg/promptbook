import { ConsolePageLoadingSkeleton } from '../../components/Skeleton/ConsolePageLoadingSkeleton';

/**
 * Renders the recycle-bin skeleton while deleted-item data streams.
 */
export default function Loading() {
    return (
        <ConsolePageLoadingSkeleton
            ariaLabel="Loading recycle bin"
            showSummaryCards={false}
            showFiltersCard={false}
            panelHeights={[360]}
        />
    );
}
