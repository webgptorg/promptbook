import { spaceTrim } from 'spacetrim';

/**
 * Shared fallback copy used whenever the server does not provide a custom mismatch message.
 */
const CLIENT_VERSION_MISMATCH_FALLBACK_MESSAGE =
    'Promptbook has been updated on the server. We will refresh the page automatically so you get the latest experience.';

/**
 * Normalizes mismatch copy while keeping the shared fallback message consistent.
 *
 * @param message - Raw mismatch message received from the server or another client surface.
 * @returns Trimmed mismatch copy or the standard fallback message.
 *
 * @private function of <ClientVersionMismatchListener/>
 */
export function getClientVersionMismatchMessage(message: string | null | undefined): string {
    return spaceTrim(message ?? '') || CLIENT_VERSION_MISMATCH_FALLBACK_MESSAGE;
}
