import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { normalizeCronExpression, resolveNextCronRun } from '../cronExpression';

/**
 * Default automatic self-update cron expression: every day at midnight.
 *
 * @private constant of `vpsSelfUpdate`
 */
export const DEFAULT_VPS_SELF_UPDATE_CRON_EXPRESSION = '0 0 * * *';

/**
 * Normalizes and validates a cron expression accepted by the automatic self-update scheduler.
 *
 * @param value - Raw `.env` cron expression.
 * @returns Normalized cron expression.
 *
 * @private function of `vpsSelfUpdate`
 */
export function normalizeVpsSelfUpdateCronExpression(value: string | null | undefined): string {
    return resolveWithVpsSelfUpdateCronError(() =>
        normalizeCronExpression((value || '').trim() || DEFAULT_VPS_SELF_UPDATE_CRON_EXPRESSION),
    );
}

/**
 * Resolves the next run time for one automatic self-update cron expression.
 *
 * @param cronExpression - Valid five-field cron expression.
 * @param afterDate - Date after which the next run must happen.
 * @returns Next matching local server time.
 *
 * @private function of `vpsSelfUpdate`
 */
export function resolveNextVpsSelfUpdateCronRun(cronExpression: string, afterDate = new Date()): Date {
    return resolveWithVpsSelfUpdateCronError(() => resolveNextCronRun(cronExpression, afterDate));
}

/**
 * Reports one shared cron failure as a self-update configuration failure.
 *
 * The automatic self-update cron comes from the VPS configuration rather than from a request, so an
 * invalid expression is a configuration problem and keeps its own branded error.
 *
 * @param resolveCronValue - Operation performed by the shared cron engine.
 * @returns Value returned by the operation.
 *
 * @private function of `vpsSelfUpdateCron`
 */
function resolveWithVpsSelfUpdateCronError<TCronValue>(resolveCronValue: () => TCronValue): TCronValue {
    try {
        return resolveCronValue();
    } catch (error) {
        throw new NotAllowed(
            spaceTrim(
                (block) => `
                    Automatic self-update cron expression is invalid.

                    ${block(error instanceof Error ? error.message : String(error))}
                `,
            ),
        );
    }
}
