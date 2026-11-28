import { useEffect, useState } from 'react';
import { ClientVersionMismatchInfo, onClientVersionMismatch } from '../../utils/clientVersionClient';

/**
 * Subscribes to global client-version mismatch events and exposes the latest mismatch.
 *
 * @returns Latest mismatch info, or `null` while the client version is still current.
 *
 * @private function of <ClientVersionMismatchListener/>
 */
export function useClientVersionMismatchInfo(): ClientVersionMismatchInfo | null {
    const [mismatchInfo, setMismatchInfo] = useState<ClientVersionMismatchInfo | null>(null);

    useEffect(() => {
        return onClientVersionMismatch((nextMismatchInfo) => {
            setMismatchInfo(nextMismatchInfo);
        });
    }, []);

    return mismatchInfo;
}
