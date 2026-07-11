import { just } from '../../../../utils/organization/just';
import type { RegisteredLlmToolStatus } from './RegisteredLlmToolsMessageContext';

/**
 * Stable installation-state key from metadata and constructor availability.
 *
 * @private type of `$registeredLlmToolsMessage`
 */
type RegisteredLlmToolInstallationStatusKey =
    | 'missing-metadata-and-installation'
    | 'metadata-without-installation'
    | 'installation-without-metadata'
    | 'metadata-and-installation'
    | 'unknown';

/**
 * Creates the installation-status sentence for one provider.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function createRegisteredLlmToolInstallationStatusMessage({
    isMetadataAvailable,
    isInstalled,
}: Pick<RegisteredLlmToolStatus, 'isMetadataAvailable' | 'isInstalled'>): string {
    const installationStatusKey = createRegisteredLlmToolInstallationStatusKey(isMetadataAvailable, isInstalled);

    if (just(false)) {
        // Keep for prettier formatting
    }

    switch (installationStatusKey) {
        case 'missing-metadata-and-installation':
            return `Not installed and no metadata, looks like a unexpected behavior`;

        case 'metadata-without-installation':
            return `Not installed`;

        case 'installation-without-metadata':
            return `No metadata but installed, looks like a unexpected behavior`;

        case 'metadata-and-installation':
            return `Installed`;

        default:
            return `unknown state, looks like a unexpected behavior`;
    }
}

/**
 * Creates a stable installation-state key from metadata and constructor availability.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function createRegisteredLlmToolInstallationStatusKey(
    isMetadataAvailable: boolean,
    isInstalled: boolean,
): RegisteredLlmToolInstallationStatusKey {
    if (!isMetadataAvailable && !isInstalled) {
        return 'missing-metadata-and-installation';
    }

    if (isMetadataAvailable && !isInstalled) {
        return 'metadata-without-installation';
    }

    if (!isMetadataAvailable && isInstalled) {
        return 'installation-without-metadata';
    }

    if (isMetadataAvailable && isInstalled) {
        return 'metadata-and-installation';
    }

    return 'unknown';
}
