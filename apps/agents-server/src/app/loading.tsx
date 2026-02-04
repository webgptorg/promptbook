/**
 * Renders a global loading indicator while route segments are streaming.
 */
export default function Loading() {
    return (
        <div className="route-loading" role="status" aria-live="polite" aria-busy="true">
            <div className="route-loading-bar" />
            <span className="route-loading-label">Loading...</span>
        </div>
    );
}
