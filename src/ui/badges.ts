import { createHash } from 'node:crypto';
import { normalizeAgentName } from '../book/references.js';
import type { Style } from './ansi.js';

/**
 * Observed activity shown by a badge expression.
 *
 * @private agent visual identity
 */
export type BadgeActivity = 'working' | 'idle' | 'waiting-user' | 'waiting-provider' | 'paused' | 'blocked' | 'failed' | 'completed';

/**
 * Creature silhouettes: `{L}` left appendage, `{E}` eyes, `{R}` right appendage.
 *
 * Inspired by the Promptbook Coder `~<@@/>-` mascot; every species keeps a distinct outline.
 */
const SPECIES: readonly string[] = [
    '{L}<{E}/>{R}',
    '{L}[{E}]{R}',
    '{L}({E}){R}',
    '{L}{{E}}{R}',
    '{L}<{E}>{R}',
    '{L}|{E}|{R}',
    '{L}({E}/){R}',
    '{L}[{E}>{R}',
];

/**
 * Appendage pairs (left, right) in rest and gesture poses.
 */
const APPENDAGES: ReadonlyArray<{ rest: [string, string]; gesture: [string, string] }> = [
    { rest: ['~', '-'], gesture: ['~', '/'] },
    { rest: ['=', '='], gesture: ['=', '/'] },
    { rest: ['}', '{'], gesture: ['}', '/'] },
    { rest: ['-', '~'], gesture: ['\\', '~'] },
    { rest: ['o', 'o'], gesture: ['o', '/'] },
    { rest: ['*', '*'], gesture: ['\\', '*'] },
    { rest: ['^', '^'], gesture: ['^', '/'] },
    { rest: ['>', '<'], gesture: ['>', '/'] },
];

/**
 * Open-eye styles per identity (used while working/idle-awake).
 */
const EYES: readonly string[] = ['@@', 'oo', 'OO', '00', '**', '++', 'ee', 'qp'];

/**
 * Expression eyes per activity (identity eyes are used for working).
 */
const EXPRESSION_EYES: Readonly<Record<Exclude<BadgeActivity, 'working'>, string>> = {
    idle: '--',
    'waiting-user': '??',
    'waiting-provider': '..',
    paused: '==',
    blocked: '><',
    failed: 'xx',
    completed: '^^',
};

/**
 * Restrained identity colors (xterm-256) with a matching CSS hue for the browser.
 */
const COLORS: ReadonlyArray<{ terminal: number; hue: number }> = [
    { terminal: 75, hue: 205 },
    { terminal: 114, hue: 125 },
    { terminal: 215, hue: 30 },
    { terminal: 176, hue: 300 },
    { terminal: 80, hue: 180 },
    { terminal: 222, hue: 45 },
    { terminal: 141, hue: 265 },
    { terminal: 210, hue: 0 },
];

/**
 * Stable visual identity of an agent.
 *
 * @private agent visual identity
 */
export type BadgeIdentity = {
    /** Normalized identity the appearance derives from. */
    readonly key: string;
    /** Species index. */
    readonly species: number;
    /** Appendage index. */
    readonly appendages: number;
    /** Identity eyes. */
    readonly eyes: string;
    /** Terminal color code. */
    readonly terminalColor: number;
    /** Browser hue. */
    readonly hue: number;
};

/**
 * Well-known agents get hand-picked appearances; Expert keeps the reference mascot.
 */
const PINNED: Readonly<Record<string, Omit<BadgeIdentity, 'key'>>> = {
    expert: { species: 0, appendages: 0, eyes: '@@', terminalColor: 75, hue: 205 },
    manager: { species: 1, appendages: 1, eyes: 'oo', terminalColor: 222, hue: 45 },
    teacher: { species: 2, appendages: 6, eyes: 'OO', terminalColor: 141, hue: 265 },
    adam: { species: 5, appendages: 4, eyes: '00', terminalColor: 80, hue: 180 },
    user: { species: 2, appendages: 4, eyes: '^^', terminalColor: 250, hue: 0 },
};

/**
 * Derives the stable badge identity from an agent's canonical name (independent of file location or content).
 *
 * @private agent visual identity
 */
export function badgeIdentity(agentName: string): BadgeIdentity {
    const key = normalizeAgentName(agentName);
    const pinned = PINNED[key];
    if (pinned) return { key, ...pinned };
    const digest = createHash('sha256').update(`ptbk-badge:${key}`).digest();
    const color = COLORS[digest[3]! % COLORS.length]!;
    return {
        key,
        species: digest[0]! % SPECIES.length,
        appendages: digest[1]! % APPENDAGES.length,
        eyes: EYES[digest[2]! % EYES.length]!,
        terminalColor: color.terminal,
        hue: color.hue,
    };
}

/**
 * Renders the mascot face for an activity; `frame` alternates the working gesture (0 when motion is reduced).
 *
 * @private agent visual identity
 */
export function badgeFace(identity: BadgeIdentity, activity: BadgeActivity, frame = 0): string {
    const appendage = APPENDAGES[identity.appendages]!;
    const [left, right] = activity === 'working' && frame % 2 === 1 ? appendage.gesture : appendage.rest;
    const eyes = activity === 'working' ? identity.eyes : EXPRESSION_EYES[activity];
    return SPECIES[identity.species]!.replace('{L}', left).replace('{E}', eyes).replace('{R}', right);
}

/**
 * Human label of an activity.
 *
 * @private agent visual identity
 */
export function activityLabel(activity: BadgeActivity): string {
    switch (activity) {
        case 'working':
            return 'working';
        case 'idle':
            return 'idle';
        case 'waiting-user':
            return 'waiting for you';
        case 'waiting-provider':
            return 'waiting for provider';
        case 'paused':
            return 'paused';
        case 'blocked':
            return 'blocked';
        case 'failed':
            return 'failed';
        case 'completed':
            return 'completed';
    }
}

/**
 * The stable default Promptbook visual identity (the reference mascot), shown when no agent is working and by
 * host-wide views that represent several engines.
 *
 * @private agent visual identity
 */
export const DEFAULT_VISUAL_AGENT = 'Expert';

/**
 * The reusable single-line terminal visual of an agent: its face in the same identity/activity character language as
 * the framed badge, animated by `frame` (0 when motion is reduced). Without an agent it is the default Promptbook
 * mascot in its animated present pose. Terminal titles reuse exactly this renderer.
 *
 * @private agent visual identity
 */
export function singleLineVisual(agentName: string | undefined, activity: BadgeActivity, frame = 0): string {
    if (agentName === undefined) return badgeFace(badgeIdentity(DEFAULT_VISUAL_AGENT), 'working', frame);
    return badgeFace(badgeIdentity(agentName), activity, frame);
}

/**
 * The stable static single-line visual of an agent (its identity at rest, never an animation frame or an activity
 * expression), e.g. `~<@@/>-` for Expert. Commit subjects of actual agent work quote it.
 *
 * @private agent visual identity
 */
export function staticVisual(agentName: string): string {
    return badgeFace(badgeIdentity(agentName), 'working', 0);
}

/**
 * Inline badge: colored single-line visual followed by the readable name.
 *
 * @private agent visual identity
 */
export function inlineBadge(agentName: string, activity: BadgeActivity, style: Style, frame = 0): string {
    return `${style.color256(badgeIdentity(agentName).terminalColor, singleLineVisual(agentName, activity, frame))} ${style.bold(agentName)}`;
}

/**
 * Framed three-line badge for the current-work panel.
 *
 * @private agent visual identity
 */
export function framedBadge(agentName: string, activity: BadgeActivity, style: Style, unicode: boolean, frame = 0): string[] {
    const identity = badgeIdentity(agentName);
    const face = badgeFace(identity, activity, frame);
    const color = (text: string): string => style.color256(identity.terminalColor, text);
    const horizontal = (unicode ? '─' : '-').repeat(face.length + 2);
    const [tl, tr, bl, br, v] = unicode ? ['╭', '╮', '╰', '╯', '│'] : ['+', '+', '+', '+', '|'];
    return [color(`${tl}${horizontal}${tr}`), `${color(v)} ${style.bold(color(face))} ${color(v)}`, color(`${bl}${horizontal}${br}`)];
}

/**
 * Serializable agent view with its rendered faces (shared by terminal, browser and API).
 *
 * @private agent visual identity
 */
export function agentView(name: string, activity: BadgeActivity): { name: string; key: string; activity: BadgeActivity; face: string; gesture: string; hue: number } {
    const identity = badgeIdentity(name);
    return { name, key: identity.key, activity, face: badgeFace(identity, activity, 0), gesture: badgeFace(identity, activity, 1), hue: identity.hue };
}
