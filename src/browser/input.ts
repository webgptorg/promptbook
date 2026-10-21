import { PtbkError } from '../common/errors.js';

/**
 * Modifier bits of Chrome DevTools Protocol input events.
 */
const MODIFIER_BITS = { Alt: 1, Control: 2, Meta: 4, Shift: 8 } as const;

/**
 * Modifier name of an input event.
 *
 * @private browser input
 */
export type ModifierName = keyof typeof MODIFIER_BITS;

/**
 * Accepted spellings of modifier names (lowercase).
 */
const MODIFIER_ALIASES: Readonly<Record<string, ModifierName>> = {
    alt: 'Alt',
    option: 'Alt',
    control: 'Control',
    ctrl: 'Control',
    meta: 'Meta',
    cmd: 'Meta',
    command: 'Meta',
    super: 'Meta',
    win: 'Meta',
    shift: 'Shift',
};

/**
 * Named (non-character) keys with their DOM `code` and Windows virtual key code.
 */
const NAMED_KEYS: Readonly<Record<string, { readonly key: string; readonly code: string; readonly keyCode: number; readonly text?: string }>> = {
    enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
    return: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
    tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
    escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
    esc: { key: 'Escape', code: 'Escape', keyCode: 27 },
    backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
    delete: { key: 'Delete', code: 'Delete', keyCode: 46 },
    del: { key: 'Delete', code: 'Delete', keyCode: 46 },
    insert: { key: 'Insert', code: 'Insert', keyCode: 45 },
    space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
    arrowup: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
    up: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
    arrowdown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
    down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
    arrowleft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
    left: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
    arrowright: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
    right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
    home: { key: 'Home', code: 'Home', keyCode: 36 },
    end: { key: 'End', code: 'End', keyCode: 35 },
    pageup: { key: 'PageUp', code: 'PageUp', keyCode: 33 },
    pagedown: { key: 'PageDown', code: 'PageDown', keyCode: 34 },
    ...Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`f${index + 1}`, { key: `F${index + 1}`, code: `F${index + 1}`, keyCode: 112 + index }])),
};

/**
 * Editing commands macOS Chrome needs alongside synthetic shortcuts (it does not interpret them natively).
 */
const MAC_EDITING_COMMANDS: Readonly<Record<string, string>> = { a: 'selectAll', c: 'copy', x: 'cut', v: 'paste', z: 'undo', y: 'redo' };

/**
 * One key press as Chrome DevTools Protocol `Input.dispatchKeyEvent` parameters.
 *
 * @private browser input
 */
export type KeyPress = {
    readonly key: string;
    readonly code: string;
    readonly keyCode: number;
    /** Inserted text (absent for named keys and for shortcuts with Control/Meta/Alt). */
    readonly text?: string;
    /** Modifier bit mask. */
    readonly modifiers: number;
    /** Editing commands of the shortcut on macOS. */
    readonly commands?: readonly string[];
};

/**
 * Parses a key or shortcut such as `Enter`, `Shift+Tab`, `Control+A` or `a` into a key press. `Control`+letter
 * editing shortcuts (select all, copy, cut, paste, undo, redo) work on every platform.
 *
 * @private browser input
 */
export function parseKeyPress(combo: string, platform: NodeJS.Platform = process.platform): KeyPress {
    const trimmed = combo.trim();
    if (!trimmed) throw new PtbkError('Name a key such as Enter, Tab, Escape, ArrowDown or Control+A.', { kind: 'usage' });
    const parts = trimmed === '+' ? ['+'] : trimmed.endsWith('++') ? [...trimmed.slice(0, -2).split('+'), '+'] : trimmed.split('+');
    const keyName = parts.pop()!;
    let modifiers = 0;
    for (const part of parts) {
        const modifier = MODIFIER_ALIASES[part.trim().toLowerCase()];
        if (!modifier) throw new PtbkError(`Unknown modifier "${part}" in "${combo}"; use Alt, Control, Meta or Shift.`, { kind: 'usage' });
        modifiers |= MODIFIER_BITS[modifier];
    }
    const shortcut = (modifiers & (MODIFIER_BITS.Control | MODIFIER_BITS.Meta | MODIFIER_BITS.Alt)) !== 0;
    const named = NAMED_KEYS[keyName.toLowerCase()];
    if (named) return { key: named.key, code: named.code, keyCode: named.keyCode, text: shortcut ? undefined : named.text, modifiers };
    const modifierKey = MODIFIER_ALIASES[keyName.toLowerCase()];
    if (modifierKey) return { key: modifierKey, code: `${modifierKey}Left`, keyCode: { Alt: 18, Control: 17, Meta: 91, Shift: 16 }[modifierKey], modifiers };
    if ([...keyName].length !== 1) throw new PtbkError(`Unknown key "${keyName}"; use a single character or a key name such as Enter, Tab, Escape, Backspace, ArrowDown, PageDown or F5.`, { kind: 'usage' });
    const shifted = (modifiers & MODIFIER_BITS.Shift) !== 0;
    const lower = keyName.toLowerCase();
    const key = /^[a-z]$/.test(lower) ? (shifted ? lower.toUpperCase() : keyName) : keyName;
    const code = /^[a-z]$/.test(lower) ? `Key${lower.toUpperCase()}` : /^[0-9]$/.test(keyName) ? `Digit${keyName}` : '';
    const keyCode = /^[a-z0-9]$/.test(lower) ? lower.toUpperCase().charCodeAt(0) : 0;
    const command = (modifiers & (MODIFIER_BITS.Control | MODIFIER_BITS.Meta)) !== 0 && platform === 'darwin' ? MAC_EDITING_COMMANDS[lower] : undefined;
    return { key, code, keyCode, text: shortcut ? undefined : key, modifiers, commands: command ? [command] : undefined };
}

/**
 * Parses modifier names (for clicks with Shift, Control, …) into the protocol bit mask.
 *
 * @private browser input
 */
export function parseModifiers(names: readonly unknown[] | undefined): number {
    let modifiers = 0;
    for (const name of names ?? []) {
        const modifier = MODIFIER_ALIASES[String(name).trim().toLowerCase()];
        if (!modifier) throw new PtbkError(`Unknown modifier "${String(name)}"; use Alt, Control, Meta or Shift.`, { kind: 'usage' });
        modifiers |= MODIFIER_BITS[modifier];
    }
    return modifiers;
}
