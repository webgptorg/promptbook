/**
 * Fallback error used when a running self-update process disappears without writing a terminal status.
 *
 * @private constant of `vpsSelfUpdate`
 */
export const VPS_SELF_UPDATE_STALE_ERROR_MESSAGE =
    'The previous background update process stopped unexpectedly before writing its final status.';

/**
 * Success step shown when the server proves a stale-looking job completed across a process restart.
 *
 * @private constant of `vpsSelfUpdate`
 */
export const VPS_SELF_UPDATE_RESTART_SUCCESS_STEP =
    'Standalone VPS self-update finished successfully after restarting the server.';
