import { spaceTrim } from 'spacetrim';
import { parsePromptFile } from './parsePromptFile';

describe('parsePromptFile', () => {
    it('parses manually verified prompt markers as finished', () => {
        const file = parsePromptFile(
            'prompts/manual-finished.md',
            spaceTrim(`
                [.] Done manually
                Human verified prompt
            `),
        );

        expect(file.sections[0]?.status).toBe('finished');
    });
});
