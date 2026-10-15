import { PtbkError } from '../common/errors.js';
import { parseSettingValue, SETTING_SPEC_BY_KEY } from '../project/config.js';
import type { Agenda } from '../engine/agenda.js';
import type { UserRequest } from '../engine/requests.js';

/**
 * Runtime actions shared by every channel (terminal, browser, API, CLI).
 *
 * @private shared runtime controls
 */
export type ControlAction = 'pause' | 'resume' | 'skip-wait' | 'stop' | 'stop-now' | 'cancel-stop';

/**
 * Applies one runtime control action and reports its actual outcome.
 *
 * @private shared runtime controls
 */
export function applyControlAction(agenda: Agenda, action: string): { action: string; outcome: string; applied: boolean } {
    switch (action) {
        case 'pause':
            return { action, outcome: agenda.pause().state === 'pausing' ? 'Pause pending: the current task finishes first.' : 'Paused.', applied: true };
        case 'resume':
            agenda.resume();
            return { action, outcome: 'Resumed.', applied: true };
        case 'skip-wait': {
            const result = agenda.skipWait();
            return { action, outcome: result.applied ? 'Wait skipped.' : (result.reason ?? 'Nothing to skip.'), applied: result.applied };
        }
        case 'stop':
            agenda.requestStop({ cancelCurrent: false });
            return { action, outcome: 'Stopping after the current task.', applied: true };
        case 'stop-now':
            agenda.requestStop({ cancelCurrent: true });
            return { action, outcome: 'Stopping now; owned work is cancelled and recoverable.', applied: true };
        case 'cancel-stop':
            agenda.cancelStop();
            return { action, outcome: 'Stop cancelled (if it had not taken effect).', applied: true };
        default:
            throw new PtbkError(`Unknown control action "${action}".`, { kind: 'usage' });
    }
}

/**
 * Validates and applies an answer from any channel.
 *
 * @private shared runtime controls
 */
export async function applyAnswer(agenda: Agenda, params: Readonly<Record<string, unknown>>, via: UserRequest['resolvedVia']): Promise<UserRequest> {
    const id = String(params.id ?? '');
    const status = (params.status as 'answered' | 'cancelled' | 'rejected' | 'unable' | undefined) ?? 'answered';
    if (!['answered', 'cancelled', 'rejected', 'unable'].includes(status)) throw new PtbkError(`Invalid answer status ${status}.`, { kind: 'usage' });
    const answer = typeof params.answer === 'string' ? params.answer : '';
    return await agenda.answer(id, answer, via, status);
}

/**
 * Validates raw setting changes from a channel and applies them (temporary unless saved).
 *
 * @private shared runtime controls
 */
export async function applySettings(agenda: Agenda, params: Readonly<Record<string, unknown>>): Promise<unknown> {
    const raw = (params.changes ?? {}) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new PtbkError('Settings changes must be an object.', { kind: 'usage' });
    const parsed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
        const spec = SETTING_SPEC_BY_KEY.get(key);
        if (!spec) throw new PtbkError(`Unknown setting ${key}.`, { kind: 'usage' });
        const result = parseSettingValue(spec, value);
        if (!result.ok) throw new PtbkError(`Invalid value for ${key}: ${result.message}.`, { kind: 'usage' });
        parsed[key] = result.value;
    }
    return await agenda.updateSettings(parsed, params.save === true);
}
