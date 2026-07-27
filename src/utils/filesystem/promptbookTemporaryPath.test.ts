import { describe, expect, it } from '@jest/globals';
import {
    getPromptbookTemporaryGitignoreRule,
    getPromptbookTemporaryPath,
    PROMPTBOOK_TEMPORARY_DIRECTORY,
    resolvePromptbookTemporaryPath,
} from './promptbookTemporaryPath';

describe('promptbookTemporaryPath', () => {
    it('builds normalized relative paths inside the shared Promptbook temporary root', () => {
        expect(getPromptbookTemporaryPath()).toBe(PROMPTBOOK_TEMPORARY_DIRECTORY);
        expect(getPromptbookTemporaryPath('agents-server', 'browser\\user-data', '/run-browser/')).toBe(
            '.promptbook/agents-server/browser/user-data/run-browser',
        );
    });

    it('builds repository-root gitignore rules for Promptbook temporary paths', () => {
        expect(getPromptbookTemporaryGitignoreRule()).toBe('/.promptbook');
        expect(getPromptbookTemporaryGitignoreRule('ptbk-coder')).toBe('/.promptbook/ptbk-coder');
    });

    it('resolves absolute paths inside the shared Promptbook temporary root', () => {
        expect(resolvePromptbookTemporaryPath('/workspace/project/', 'agent-messages', 'prompt.sh')).toBe(
            '/workspace/project/.promptbook/agent-messages/prompt.sh',
        );
        expect(
            resolvePromptbookTemporaryPath('C:\\workspace\\project\\', 'agents-server', 'run-browser-artifacts'),
        ).toBe('C:\\workspace\\project/.promptbook/agents-server/run-browser-artifacts');
    });
});
