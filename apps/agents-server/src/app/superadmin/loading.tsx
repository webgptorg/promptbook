import { ConsolePageLoadingSkeleton } from '../../components/Skeleton/ConsolePageLoadingSkeleton';

/**
 * Renders the shared admin control-panel skeleton while super-admin routes stream.
 */
export default function Loading() {
    return (
        <ConsolePageLoadingSkeleton
            ariaLabel="Loading super administration"
            showSummaryCards={true}
            showFiltersCard={true}
        />
    );
}
