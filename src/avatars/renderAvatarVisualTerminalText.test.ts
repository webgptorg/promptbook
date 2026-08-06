import { describe, expect, it } from '@jest/globals';
import {
    renderAvatarVisualTerminalTextGrid,
    renderAvatarVisualTerminalTextLines,
} from './renderAvatarVisualTerminalText';
import type { AvatarDefinition } from './types/AvatarDefinition';

/**
 * Avatar identity used by every case of this test.
 */
const TEST_AVATAR_DEFINITION: AvatarDefinition = {
    agentName: 'Promptbook Developer',
    agentHash: 'promptbook-developer-hash',
    colors: ['#00a9e0'],
};

/**
 * Terminal frame size used by the `ptbk coder run` dashboard.
 */
const TEST_COLUMNS = 48;

/**
 * Terminal frame height used by the `ptbk coder run` dashboard.
 */
const TEST_ROWS = 12;

/**
 * Removes ANSI escape sequences so only the painted characters remain.
 */
function stripAnsi(line: string): string {
    // eslint-disable-next-line no-control-regex
    return line.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
}

describe('renderAvatarVisualTerminalText', () => {
    it('paints the character-based `AsciiOctopus` visual as real ASCII glyphs', () => {
        const lines = renderAvatarVisualTerminalTextLines({
            avatarDefinition: TEST_AVATAR_DEFINITION,
            visualId: 'ascii-octopus',
            surface: 'transparent',
            columns: TEST_COLUMNS,
            rows: TEST_ROWS,
            timeMs: 840,
        });

        expect(lines).not.toBe(null);
        expect(lines).toHaveLength(TEST_ROWS);

        const plainLines = lines!.map(stripAnsi);

        for (const plainLine of plainLines) {
            expect(plainLine).toHaveLength(TEST_COLUMNS);
        }

        const plainFrame = plainLines.join('\n');

        // Note: Half blocks are the signature of the rasterized fallback, ASCII glyphs of the real visual
        expect(plainFrame).not.toContain('▀');
        expect(plainFrame).not.toContain('▄');
        expect(plainFrame).toMatch(/[@#%*+=o0]/);
    });

    it('renders the same visual deterministically for the same avatar and time', () => {
        const renderOptions = {
            avatarDefinition: TEST_AVATAR_DEFINITION,
            visualId: 'ascii-octopus',
            surface: 'transparent',
            columns: TEST_COLUMNS,
            rows: TEST_ROWS,
            timeMs: 840,
        } as const;

        expect(renderAvatarVisualTerminalTextLines(renderOptions)).toEqual(
            renderAvatarVisualTerminalTextLines(renderOptions),
        );
    });

    it('centers the square avatar inside the wider terminal frame', () => {
        const terminalTextGrid = renderAvatarVisualTerminalTextGrid({
            avatarDefinition: TEST_AVATAR_DEFINITION,
            visualId: 'ascii-octopus',
            surface: 'transparent',
            columns: TEST_COLUMNS,
            rows: TEST_ROWS,
            timeMs: 840,
        });

        expect(terminalTextGrid).not.toBe(null);
        expect(terminalTextGrid).toHaveLength(TEST_ROWS);

        for (const terminalTextRow of terminalTextGrid!) {
            expect(terminalTextRow).toHaveLength(TEST_COLUMNS);
            // Note: A square avatar occupies `rows * 2` columns, so the outer columns always stay empty
            expect(terminalTextRow.slice(0, (TEST_COLUMNS - TEST_ROWS * 2) / 2)).toEqual(
                new Array((TEST_COLUMNS - TEST_ROWS * 2) / 2).fill(null),
            );
            expect(terminalTextRow.slice(TEST_COLUMNS - (TEST_COLUMNS - TEST_ROWS * 2) / 2)).toEqual(
                new Array((TEST_COLUMNS - TEST_ROWS * 2) / 2).fill(null),
            );
        }
    });

    it('leaves pixel-based visuals to the rasterized ASCII-art pipeline', () => {
        expect(
            renderAvatarVisualTerminalTextLines({
                avatarDefinition: TEST_AVATAR_DEFINITION,
                visualId: 'octopus3d4',
                surface: 'transparent',
                columns: TEST_COLUMNS,
                rows: TEST_ROWS,
                timeMs: 840,
            }),
        ).toBe(null);
    });
});
