import { getPasswordValidationMessage } from '../../auth';
import type { CreateServerResult } from '../createManagedServer';
import { resolveManagedServerErrorStatus } from '../resolveManagedServerErrorStatus';

/**
 * Creates a stable failure payload for the create-server API.
 *
 * @param error - Original failure.
 * @param sqlDump - Optional SQL dump captured before the failure.
 * @param identifier - Optional server identifier used for the dump filename.
 * @returns Failure payload safe for the client.
 *
 * @private function of createManagedServer
 */
export function createFailedServerResult(
    error: unknown,
    sqlDump: string | null,
    identifier: string | null,
): CreateServerResult {
    const passwordValidationMessage = getPasswordValidationMessage(error);
    const status = resolveManagedServerErrorStatus(error);
    const message =
        passwordValidationMessage ||
        (error instanceof Error ? error.message : 'An unexpected error occurred while creating the server.');

    return {
        ok: false,
        status,
        message,
        sqlDump,
        sqlFilename: sqlDump && identifier ? `create-server-${identifier}.sql` : null,
    };
}
