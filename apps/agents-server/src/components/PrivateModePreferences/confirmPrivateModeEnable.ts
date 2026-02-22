'use client';

import { showConfirm } from '../AsyncDialogs/asyncDialogs';

/**
 * Default confirmation title used when enabling private mode.
 *
 * @private shared helper for Agents Server private mode UX
 */
const ENABLE_PRIVATE_MODE_CONFIRMATION_TITLE = 'Enable private mode';

/**
 * Default confirmation message used when enabling private mode.
 *
 * @private shared helper for Agents Server private mode UX
 */
const ENABLE_PRIVATE_MODE_CONFIRMATION_MESSAGE =
    'Private mode keeps this chat local to your browser. Chat history, user memory, and self-learning will not be saved while it is enabled. Continue?';

/**
 * Shows confirmation dialog before enabling private mode.
 *
 * @returns True when user confirms enabling private mode.
 * @private shared helper for Agents Server private mode UX
 */
export async function confirmPrivateModeEnable(): Promise<boolean> {
    return showConfirm({
        title: ENABLE_PRIVATE_MODE_CONFIRMATION_TITLE,
        message: ENABLE_PRIVATE_MODE_CONFIRMATION_MESSAGE,
        confirmLabel: 'Enable private mode',
        cancelLabel: 'Keep standard mode',
    }).catch(() => false);
}
