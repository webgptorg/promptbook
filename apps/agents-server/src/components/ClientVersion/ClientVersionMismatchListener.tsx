'use client';

import { ClientVersionMismatchDialog } from './ClientVersionMismatchDialog';
import { useClientVersionMismatchAutoRefresh } from './useClientVersionMismatchAutoRefresh';
import { useClientVersionMismatchFetchInterceptor } from './useClientVersionMismatchFetchInterceptor';
import { useClientVersionMismatchInfo } from './useClientVersionMismatchInfo';

/**
 * Client overlay that watches for version mismatches, displays a friendly notice, and refreshes the page.
 *
 * @private Agents Server presentation helper.
 */
export function ClientVersionMismatchListener() {
    const mismatchInfo = useClientVersionMismatchInfo();
    useClientVersionMismatchFetchInterceptor();
    const {
        autoRefreshStopped,
        countdownActive,
        handleManualRefresh,
        handleStopCountdown,
        remainingAutoRefreshMs,
    } = useClientVersionMismatchAutoRefresh(mismatchInfo);

    if (!mismatchInfo) {
        return null;
    }

    return (
        <ClientVersionMismatchDialog
            mismatchInfo={mismatchInfo}
            remainingAutoRefreshMs={remainingAutoRefreshMs}
            countdownActive={countdownActive}
            autoRefreshStopped={autoRefreshStopped}
            onRefreshNow={handleManualRefresh}
            onStopCountdown={handleStopCountdown}
        />
    );
}
