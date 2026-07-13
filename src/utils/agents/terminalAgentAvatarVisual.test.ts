import { spaceTrim } from 'spacetrim';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import {
    TERMINAL_AGENT_AVATAR_VISUAL_COLUMNS,
    TERMINAL_AGENT_AVATAR_VISUAL_ROWS,
    resolveTerminalAgentAvatarVisualId,
} from './terminalAgentAvatarVisual';

describe('terminalAgentAvatarVisual', () => {
    it('uses the explicit agent avatar visual before the terminal fallback', () => {
        const agentSource = spaceTrim(`
            Developer

            META VISUAL AsciiOctopus
        `) as string_book;

        expect(resolveTerminalAgentAvatarVisualId(agentSource, 'octopus3d4')).toBe('ascii-octopus');
    });

    it('uses the terminal fallback when the agent source does not declare an avatar visual', () => {
        const agentSource = spaceTrim(`
            Developer
        `) as string_book;

        expect(resolveTerminalAgentAvatarVisualId(agentSource, 'ascii-octopus')).toBe('ascii-octopus');
    });

    it('keeps the terminal avatar frame dimensions aligned with the coder UI', () => {
        expect(TERMINAL_AGENT_AVATAR_VISUAL_COLUMNS).toBe(48);
        expect(TERMINAL_AGENT_AVATAR_VISUAL_ROWS).toBe(12);
    });
});
