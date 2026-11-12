import { PtbkError, errorMessage } from '../common/errors.js';
import type { BridgeTool, ToolResult } from '../engine/bridge.js';
import type { TaskTrace } from '../engine/task-trace.js';
import type { ComputerCommand } from './native.js';
import type { ComputerControl } from './session.js';

/** Arguments used to attribute one invocation's native desktop work. @private computer control */
export type ComputerToolContext = { readonly agent: string; readonly trace?: TaskTrace };

/** Require a finite coordinate, delta or timing argument without coercing malformed JSON. */
function number(input: Readonly<Record<string, unknown>>, key: string, optional = false): number | undefined {
    const value = input[key];
    if (optional && value === undefined) return undefined;
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new PtbkError(`${key} must be a finite number.`, { kind: 'usage' });
    return value;
}

/** Read one physical mouse button. */
function button(input: Readonly<Record<string, unknown>>): 'left' | 'right' | 'middle' {
    const value = input.button ?? 'left';
    if (value !== 'left' && value !== 'right' && value !== 'middle') throw new PtbkError('button must be left, right or middle.', { kind: 'usage' });
    return value;
}

/** Parse untrusted MCP or owner-viewer input through the same native command boundary. @private computer control */
export function computerCommand(input: Readonly<Record<string, unknown>>): ComputerCommand {
    const x = (): number => number(input, 'x')!;
    const y = (): number => number(input, 'y')!;
    const duration = (): { durationMs?: number } => {
        const durationMs = number(input, 'durationMs', true);
        if (durationMs !== undefined && (durationMs < 100 || durationMs > 5000)) throw new PtbkError('durationMs must be between 100 and 5000.', { kind: 'usage' });
        return durationMs === undefined ? {} : { durationMs };
    };
    switch (input.op) {
        case 'screenshot': return { op: 'screenshot' };
        case 'accessibility': return { op: 'accessibility' };
        case 'move': return { op: 'move', x: x(), y: y(), ...duration() };
        case 'drag': return { op: 'drag', x: x(), y: y(), ...duration() };
        case 'click': {
            const count = number(input, 'count', true) ?? 1;
            if (count !== 1 && count !== 2) throw new PtbkError('count must be 1 or 2.', { kind: 'usage' });
            const hasCoordinates = input.x !== undefined || input.y !== undefined;
            return { op: 'click', ...(hasCoordinates ? { x: x(), y: y() } : {}), button: button(input), count };
        }
        case 'button':
            if (typeof input.isDown !== 'boolean') throw new PtbkError('isDown must be a boolean.', { kind: 'usage' });
            return { op: 'button', button: button(input), isDown: input.isDown };
        case 'scroll': return { op: 'scroll', deltaX: number(input, 'deltaX', true) ?? 0, deltaY: number(input, 'deltaY', true) ?? 0 };
        case 'key':
            if (!Array.isArray(input.keys) || !input.keys.length || input.keys.length > 8 || !input.keys.every((key) => typeof key === 'string' && key.length > 0 && key.length <= 32)) throw new PtbkError('keys must contain 1–8 key names.', { kind: 'usage' });
            return { op: 'key', keys: input.keys as string[] };
        case 'type':
        case 'clipboardWrite':
            if (typeof input.text !== 'string' || input.text.length > 100_000) throw new PtbkError('text must be a string of at most 100000 characters.', { kind: 'usage' });
            return { op: input.op, text: input.text };
        case 'clipboardRead': return { op: 'clipboardRead' };
        default: throw new PtbkError('Unknown Computer Control operation.', { kind: 'usage' });
    }
}

/** Return image data as live MCP image content, with only nonpixel metadata in its text. */
function result(value: Readonly<Record<string, unknown>>): ToolResult {
    if (typeof value.data === 'string' && value.mimeType === 'image/png') {
        const { data, mimeType, ...metadata } = value;
        return { text: JSON.stringify(metadata), images: [{ data, mimeType }] };
    }
    return { text: JSON.stringify(value) };
}

/**
 * Harness-independent native desktop tools. Browser tools remain the first choice for websites; this fallback uses
 * the real engine host's shared cursor/focus. Captures and sensitive values are returned live, never added to audit.
 * @private computer control
 */
export function computerTools(control: ComputerControl, context: ComputerToolContext): BridgeTool[] {
    const frame = { type: 'string', description: 'Frame returned by your latest computer_screenshot/computer_accessibility. Observe again after interruption or changed windows.' };
    const coordinate = { type: 'number', description: 'Coordinate in the primary-screen space shown by the latest screenshot.' };
    const durationMs = { type: 'number', minimum: 100, maximum: 5000, description: 'Real interruptible movement duration; default native smooth motion.' };
    const run = async (operation: () => Promise<Readonly<Record<string, unknown>>>): Promise<ToolResult> => {
        try { return result(await operation()); } catch (error) { return { text: errorMessage(error), isError: true }; }
    };
    const tool = (name: string, description: string, op: ComputerCommand['op'], properties: Record<string, unknown> = {}, required: readonly string[] = [], observation = false): BridgeTool => ({
        name,
        description,
        inputSchema: { type: 'object', additionalProperties: false, properties: { ...properties, ...(!observation ? { frame } : {}) }, required: [...required, ...(!observation ? ['frame'] : [])] },
        handler: (input) => run(async () => {
            if (!observation && (typeof input.frame !== 'string' || !input.frame)) throw new PtbkError('Observe the desktop first and pass its frame.', { kind: 'usage' });
            return await control.execute(computerCommand({ ...input, op }), { ...context, ...(typeof input.frame === 'string' ? { frame: input.frame } : {}) });
        }),
    });
    return [
        { name: 'computer_status', description: 'Check the engine host native desktop availability, permissions and human takeover state. Prefer browser_* for websites. Computer Control is the last fallback and uses the real shared cursor and keyboard focus; explicit owner pause/stop must be respected.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, handler: () => run(() => control.status()) },
        tool('computer_screenshot', 'Observe the complete primary desktop live and return a fresh frame plus PNG. Never save or quote private screen contents. Unavailable while the owner explicitly pauses, stops or disables this tool, or a protected Wallet/tab operation is active.', 'screenshot', {}, [], true),
        tool('computer_accessibility', 'Read supported native accessibility elements and a fresh frame to locate controls; availability varies by application. Never save or quote private fields.', 'accessibility', {}, [], true),
        tool('computer_move', 'Move the real system cursor smoothly. Physical human activity interrupts movement immediately; inspect again before retrying.', 'move', { x: coordinate, y: coordinate, durationMs }, ['x', 'y']),
        tool('computer_click', 'Click using the real mouse after observing the target; optionally move smoothly to x/y first. Record meaningful external effects with the ordinary external-action tools.', 'click', { x: coordinate, y: coordinate, button: { type: 'string', enum: ['left', 'right', 'middle'] }, count: { type: 'number', enum: [1, 2] } }),
        tool('computer_button', 'Press or release a physical mouse button. Pair down/up in a short desktop work segment; interruption releases held inputs.', 'button', { button: { type: 'string', enum: ['left', 'right', 'middle'] }, isDown: { type: 'boolean' } }, ['button', 'isDown']),
        tool('computer_drag', 'Drag with the left mouse button from the current cursor to x/y using real smooth interruptible motion. Move to the source first, observe again if needed, then call drag; it holds and releases the button atomically.', 'drag', { x: coordinate, y: coordinate, durationMs }, ['x', 'y']),
        tool('computer_scroll', 'Scroll the real mouse wheel at the current cursor, in platform-native wheel increments (macOS pixels; Windows 120 per detent).', 'scroll', { deltaX: { type: 'number' }, deltaY: { type: 'number' } }),
        tool('computer_key', 'Press a keyboard chord on the focused native control, for example ["Control","c"] or ["Meta","v"]. Does not change authorization or bypass protected input.', 'key', { keys: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 } }, ['keys']),
        tool('computer_type', 'Type ordinary text into the focused native application. Inputs are live and omitted from technical audit; never read or type Wallet credentials yourself.', 'type', { text: { type: 'string', maxLength: 100000 } }, ['text']),
        tool('computer_clipboard_read', 'Read the system clipboard on demand for this authorized task. Do not save clipboard contents to traces, files, reports or chats. Never use it to extract protected credentials.', 'clipboardRead'),
        tool('computer_clipboard_write', 'Write the system clipboard on demand for an authorized copy/paste operation. The value is omitted from technical audit.', 'clipboardWrite', { text: { type: 'string', maxLength: 100000 } }, ['text']),
        { name: 'computer_release', description: 'Release this agent’s desktop work segment, held inputs and stale frame so another project/agent can use it. Call when the related native work is finished; never hold the desktop for a whole long task.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, handler: () => run(async () => { await control.release(context.agent); return { released: true }; }) },
    ];
}
