import { describe, expect, it } from '@jest/globals';
import { join } from 'path';
import { getPromptbookTempGitignoreRule, getPromptbookTempPath, resolvePromptbookTempPath } from './getPromptbookTempPath';

describe('getPromptbookTempPath', () => {
    it('builds project-relative Promptbook temp paths', () => {
        expect(getPromptbookTempPath()).toBe('./.promptbook');
        expect(getPromptbookTempPath('scripts', 'codex-prompts')).toBe('./.promptbook/scripts/codex-prompts');
    });

    it('builds absolute Promptbook temp paths for a project root', () => {
        expect(resolvePromptbookTempPath('project-root', 'agents-server', 'browser')).toBe(
            join('project-root', '.promptbook', 'agents-server', 'browser'),
        );
    });

    it('builds rooted gitignore rules inside the Promptbook temp directory', () => {
        expect(getPromptbookTempGitignoreRule()).toBe('/.promptbook');
        expect(getPromptbookTempGitignoreRule('ptbk-coder')).toBe('/.promptbook/ptbk-coder');
    });
});

