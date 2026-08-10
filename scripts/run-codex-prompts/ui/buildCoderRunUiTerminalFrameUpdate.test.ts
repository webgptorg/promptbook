import { buildCoderRunUiTerminalFrameUpdate } from './buildCoderRunUiTerminalFrameUpdate';

/**
 * ANSI sequence that clears the current terminal row.
 */
const CLEAR_CURRENT_LINE = '\x1b[2K';

/**
 * ANSI control character that moves the cursor to the start of its current row.
 */
const MOVE_CURSOR_TO_LINE_START = '\r';

describe('buildCoderRunUiTerminalFrameUpdate', () => {
    it('builds the initial frame as one terminal payload', () => {
        const terminalFrameUpdate = buildCoderRunUiTerminalFrameUpdate({
            previousFrameLines: [],
            nextFrameLines: ['Header', 'Controls'],
        });

        expect(terminalFrameUpdate).toBe(
            `${CLEAR_CURRENT_LINE}${MOVE_CURSOR_TO_LINE_START}Header\n` +
                `${CLEAR_CURRENT_LINE}${MOVE_CURSOR_TO_LINE_START}Controls${MOVE_CURSOR_TO_LINE_START}`,
        );
    });

    it('rewrites contiguous animated visual rows with one cursor traversal', () => {
        const terminalFrameUpdate = buildCoderRunUiTerminalFrameUpdate({
            previousFrameLines: ['Header', 'avatar frame 1A', 'avatar frame 1B', 'Session', 'Controls'],
            nextFrameLines: ['Header', 'avatar frame 2A', 'avatar frame 2B', 'Session', 'Controls'],
        });

        expect(terminalFrameUpdate).toBe(
            '\x1b[3A' +
                `${CLEAR_CURRENT_LINE}${MOVE_CURSOR_TO_LINE_START}avatar frame 2A\n` +
                `${CLEAR_CURRENT_LINE}${MOVE_CURSOR_TO_LINE_START}avatar frame 2B` +
                '\x1b[2B' +
                MOVE_CURSOR_TO_LINE_START,
        );
    });

    it('returns to the frame bottom between separate changed ranges', () => {
        const terminalFrameUpdate = buildCoderRunUiTerminalFrameUpdate({
            previousFrameLines: ['Header', 'Old session', 'Output', 'Old controls', 'Footer'],
            nextFrameLines: ['Header', 'New session', 'Output', 'New controls', 'Footer'],
        });

        expect(terminalFrameUpdate).toBe(
            '\x1b[3A' +
                `${CLEAR_CURRENT_LINE}${MOVE_CURSOR_TO_LINE_START}New session` +
                '\x1b[3B' +
                MOVE_CURSOR_TO_LINE_START +
                '\x1b[1A' +
                `${CLEAR_CURRENT_LINE}${MOVE_CURSOR_TO_LINE_START}New controls` +
                '\x1b[1B' +
                MOVE_CURSOR_TO_LINE_START,
        );
    });

    it('fully rewrites and clears the previous frame when its height changes', () => {
        const terminalFrameUpdate = buildCoderRunUiTerminalFrameUpdate({
            previousFrameLines: ['Old header', 'Old session', 'Old controls'],
            nextFrameLines: ['New header', 'New controls'],
        });

        expect(terminalFrameUpdate).toBe(
            '\x1b[2A' +
                `${CLEAR_CURRENT_LINE}${MOVE_CURSOR_TO_LINE_START}New header\n` +
                `${CLEAR_CURRENT_LINE}${MOVE_CURSOR_TO_LINE_START}New controls\n` +
                `${CLEAR_CURRENT_LINE}${MOVE_CURSOR_TO_LINE_START}` +
                '\x1b[1A' +
                MOVE_CURSOR_TO_LINE_START,
        );
    });

    it('does not emit a payload when the frame has not changed', () => {
        expect(
            buildCoderRunUiTerminalFrameUpdate({
                previousFrameLines: ['Header', 'Controls'],
                nextFrameLines: ['Header', 'Controls'],
            }),
        ).toBeUndefined();
    });
});
