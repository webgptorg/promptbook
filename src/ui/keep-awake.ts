import type { KeepAwakeProtectionView, KeepAwakeView } from '../power/view.js';
import type { TerminalProfile } from './terminal.js';

/**
 * Human label of the saved keep-awake choice.
 *
 * @private keep-awake presentation
 */
export function keepAwakeModeLabel(view: Pick<KeepAwakeView, 'mode' | 'expiresAt'>, time: (iso: string) => string = (iso) => new Date(iso).toLocaleTimeString()): string {
    if (view.mode === 'limited') return `For two hours${view.expiresAt ? ` (until ${time(view.expiresAt)})` : ''}`;
    return view.mode === 'always' ? 'Always on external power' : 'Off';
}

/**
 * Human label of the host's power source.
 *
 * @private keep-awake presentation
 */
export function powerSourceLabel(view: KeepAwakeView): string {
    const source = view.power.source === 'external' ? 'External power' : view.power.source === 'battery' ? 'Battery' : 'Unknown';
    return `${source}${view.power.detail ? ` (${view.power.detail})` : ''}`;
}

/**
 * Short label of an observed protection state.
 *
 * @private keep-awake presentation
 */
export function protectionLabel(protection: KeepAwakeProtectionView): string {
    switch (protection.state) {
        case 'active':
            return 'active';
        case 'degraded':
            return 'degraded';
        case 'unavailable':
            return 'unavailable';
        case 'os-policy':
            return 'OS policy';
        default:
            return protection.reason.code === 'approval' ? 'needs local approval' : 'inactive';
    }
}

/**
 * When the project last worked, for passive idle reporting.
 *
 * @private keep-awake presentation
 */
export function lastWorkLabel(view: KeepAwakeView, time: (iso: string) => string, working = false): string {
    if (working) return 'working now';
    return view.lastWorkAt ? time(view.lastWorkAt) : 'no task or chat activity known on this host';
}

/**
 * The Power section shared by the System page and `ptbk keep-awake`: the saved choice separately from the observed
 * protection, the power source, idle sleep and the lid separately, the reasons, and the last work time.
 *
 * @private keep-awake presentation
 */
export function keepAwakeLines(view: KeepAwakeView, style: TerminalProfile['style'], time: (iso: string) => string, options: { readonly working?: boolean; readonly stopped?: boolean } = {}): string[] {
    const tone = (protection: KeepAwakeProtectionView): string => {
        const text = protectionLabel(protection);
        return protection.state === 'active' ? style.success(text) : protection.state === 'degraded' || protection.reason.code === 'approval' || protection.reason.code === 'failed' ? style.warning(text) : style.muted(text);
    };
    const lines = [
        `${style.muted('Saved      ')} ${view.mode === 'off' ? style.muted('Off') : style.bold(keepAwakeModeLabel(view, time))}${view.closedLid ? style.muted(' · closed-lid operation chosen') : ''}`,
        `${style.muted('Power      ')} ${view.power.source === 'external' ? powerSourceLabel(view) : style.warning(powerSourceLabel(view))}${view.power.observedAt ? style.muted(` · read ${time(view.power.observedAt)}`) : ''}`,
        `${style.muted('Idle sleep ')} ${tone(view.idle)} ${style.muted(`— ${view.idle.reason.text}`)}`,
        `${style.muted('Lid        ')} ${tone(view.lid)} ${style.muted(`— ${view.lid.reason.text}`)}`,
        ...(view.lid.validation && view.lid.capability !== 'unavailable' ? [style.muted(`             ${view.lid.validation.text}`)] : []),
        `${style.muted('Last work  ')} ${lastWorkLabel(view, time, options.working)}`,
        ...(view.handoff ? [`${style.muted('Handoff    ')} carrying ${view.handoff.kinds.join(' and ')} protection from the previous engine until ${time(view.handoff.until)}`] : []),
    ];
    if (options.stopped) lines.push(style.muted('The engine is stopped, so it holds no request; the saved choice applies when it runs.'));
    else if (view.mode !== 'off' && !view.holding && view.idle.reason.code !== 'paused') lines.push(style.muted('Protection starts only while the engine runs on external power; the OS power policy applies otherwise.'));
    return lines;
}

/**
 * The view of a stopped engine's project: the saved choice only (no request exists, nothing is observed live).
 *
 * @private keep-awake presentation
 */
export function stoppedKeepAwakeView(saved: Pick<KeepAwakeView, 'mode' | 'expiresAt' | 'closedLid' | 'lastWorkAt'>, platform: string): KeepAwakeView {
    const stopped = { code: 'stopped' as const, text: 'The engine is stopped; it holds no request.' };
    return {
        mode: saved.mode,
        ...(saved.expiresAt ? { expiresAt: saved.expiresAt } : {}),
        closedLid: saved.closedLid,
        power: { source: 'unknown', detail: 'not observed while the engine is stopped' },
        idle: { state: 'inactive', reason: stopped },
        lid: { state: 'os-policy', reason: { code: 'os-policy', text: 'Closing the lid follows the OS policy.' }, capability: 'unavailable' },
        holding: false,
        ...(saved.lastWorkAt ? { lastWorkAt: saved.lastWorkAt } : {}),
        host: { platform },
    };
}
