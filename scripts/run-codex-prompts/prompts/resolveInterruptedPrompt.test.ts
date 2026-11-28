import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { parsePromptFile } from './parsePromptFile';
import { resolveInterruptedPrompt } from './resolveInterruptedPrompt';
import type { PromptFile } from './types/PromptFile';

/**
 * Parses one prompt file out of its raw markdown content.
 */
function createPromptFile(name: string, content: string): PromptFile {
    return parsePromptFile(`prompts/${name}`, spaceTrim(content));
}

describe('resolveInterruptedPrompt', () => {
    it('resolves the single prompt left in the middle of its implementation', () => {
        const files = [
            createPromptFile(
                'first.md',
                `
                    [x] by OpenAI Codex \`gpt-5.6-luna\` - Implementation 5 minutes
                    Already implemented
                `,
            ),
            createPromptFile(
                'second.md',
                `
                    [^] by Claude Code \`claude-opus-5\` thinking \`high\` - Implementation in progress
                    Interrupted work

                    ---

                    [ ] !!
                    Waiting to be picked up
                `,
            ),
        ];

        const interruptedPrompt = resolveInterruptedPrompt(files);

        expect(interruptedPrompt.file.name).toBe('second.md');
        expect(interruptedPrompt.section.index).toBe(0);
        expect(interruptedPrompt.section.status).toBe('in-progress');
    });

    it('fails when no prompt was left in the middle of its implementation', () => {
        const files = [
            createPromptFile(
                'first.md',
                `
                    [ ]
                    Waiting to be picked up
                `,
            ),
        ];

        expect(() => resolveInterruptedPrompt(files)).toThrow(NotFoundError);
        expect(() => resolveInterruptedPrompt(files)).toThrow(/no interrupted prompt/u);
    });

    it('fails when more than one prompt was left in the middle of its implementation', () => {
        const files = [
            createPromptFile(
                'first.md',
                `
                    [^] by Claude Code \`claude-opus-5\` - Implementation in progress
                    Interrupted work
                `,
            ),
            createPromptFile(
                'second.md',
                `
                    [^] by OpenAI Codex \`gpt-5.6-luna\` - Testing in progress
                    Another interrupted work
                `,
            ),
        ];

        expect(() => resolveInterruptedPrompt(files)).toThrow(NotAllowed);
        expect(() => resolveInterruptedPrompt(files)).toThrow(/2 interrupted prompts/u);
    });
});
