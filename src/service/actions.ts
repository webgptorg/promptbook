import { PtbkError } from '../common/errors.js';
import { parseSettingValue, SETTING_SPEC_BY_KEY } from '../project/config.js';
import type { Agenda } from '../engine/agenda.js';

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
 * Chat operations shared by every channel (terminal, browser, API, CLI); writes go through the agenda's chat store.
 *
 * @private shared runtime controls
 */
export async function applyChatAction(agenda: Agenda, method: string, params: Readonly<Record<string, unknown>>, via: string): Promise<unknown> {
    const text = (key: string): string => (typeof params[key] === 'string' ? (params[key] as string) : '');
    switch (method) {
        case 'chat-list':
            return await agenda.chatList();
        case 'chat-agents':
            return agenda.chatAgents();
        case 'chat-get':
            return await agenda.chatGet(text('name'));
        case 'chat-read':
            await agenda.chatRead(text('name'));
            return { read: true };
        case 'chat-create': {
            if (!text('agent')) throw new PtbkError('Choose the agent of the new chat.', { kind: 'usage' });
            const written = await agenda.chatCreate(text('agent'), text('text'), { name: text('title') || undefined, requestKey: text('requestKey') || undefined });
            return { name: written.chat.name, path: written.relativePath, commit: written.commit, messages: written.chat.messages.length };
        }
        case 'chat-send': {
            const expected = typeof params.expected === 'number' ? params.expected : undefined;
            const written = await agenda.chatSend(text('name'), text('text'), { expected, via });
            return { name: written.chat.name, path: written.relativePath, commit: written.commit, messages: written.chat.messages.length, status: written.chat.status };
        }
        default:
            throw new PtbkError(`Unknown chat action "${method}".`, { kind: 'usage' });
    }
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
