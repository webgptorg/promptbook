import moment from 'moment';
import { UNCERTAIN_USAGE } from '../../../src/execution/utils/usage-constants';
import { markPromptDone } from './markPromptDone';
import { markPromptFailed } from './markPromptFailed';
import { parsePromptFile } from './parsePromptFile';

describe('prompt attempt metadata', () => {
    it('keeps done prompts unchanged for a single attempt', () => {
        const file = parsePromptFile('prompts/mark-prompt-done.md', ['[ ]', 'Implement the feature'].join('\n'));
        const section = file.sections[0]!;

        markPromptDone(file, section, UNCERTAIN_USAGE, 'GitHub Copilot', 'gpt-5.4', moment(), 1);

        expect(file.lines[0]).toMatch(/^\[x\] /);
        expect(file.lines[0]).not.toContain('(1 attempt');
    });

    it('stores attempt counts for successful retries', () => {
        const file = parsePromptFile('prompts/mark-prompt-done.md', ['[ ]', 'Implement the feature'].join('\n'));
        const section = file.sections[0]!;

        markPromptDone(file, section, UNCERTAIN_USAGE, 'GitHub Copilot', 'gpt-5.4', moment(), 2);

        expect(file.lines[0]).toContain('[x] (2 attempts) ');
    });

    it('stores attempt counts for failed prompts after repeated verification retries', () => {
        const file = parsePromptFile('prompts/mark-prompt-failed.md', ['[ ]', 'Implement the feature'].join('\n'));
        const section = file.sections[0]!;

        markPromptFailed(file, section, 'GitHub Copilot', 'gpt-5.4', moment(), 3);

        expect(file.lines[0]).toContain('[!] (failed after 3 attempts) ');
        expect(file.lines[0]).toContain('by GitHub Copilot `gpt-5.4`');
    });
});
