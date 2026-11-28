import { ConsolePageLoadingSkeleton } from '../../components/Skeleton/ConsolePageLoadingSkeleton';

/**
 * Renders the shared admin control-panel skeleton while admin routes stream.
 */
export default function Loading() {
    return (
        <ConsolePageLoadingSkeleton
            ariaLabel="Loading administration"
            showSummaryCards={true}
            showFiltersCard={true}
        />
    );
}
