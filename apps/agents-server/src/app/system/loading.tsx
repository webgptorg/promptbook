import { ConsolePageLoadingSkeleton } from '../../components/Skeleton/ConsolePageLoadingSkeleton';

/**
 * Renders the shared system-page skeleton while account and utility routes stream.
 */
export default function Loading() {
    return (
        <ConsolePageLoadingSkeleton
            ariaLabel="Loading system page"
            maxWidthClassName="max-w-5xl"
            showSummaryCards={false}
            showFiltersCard={false}
            panelHeights={[280, 220]}
        />
    );
}
