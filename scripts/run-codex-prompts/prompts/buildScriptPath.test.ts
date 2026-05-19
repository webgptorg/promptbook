import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';
import { buildScriptPath } from './buildScriptPath';

/**
 * Builds a prompt file fixture with enough section metadata for script-path tests.
 */
function createPromptFile(sections: PromptSection[]): PromptFile {
    return {
        path: '/project/prompts/feature.md',
        name: 'feature.md',
        lines: ['[ ]', 'Implement feature'],
        eol: '\n',
        hasFinalEol: true,
        sections,
    };
}

/**
 * Builds one prompt section fixture.
 */
function createPromptSection(index: number): PromptSection {
    return {
        index,
        startLine: 0,
        endLine: 1,
        status: 'todo',
        priority: 0,
    };
}

describe('buildScriptPath', () => {
    it('places coder prompt scripts under the Promptbook temporary directory', () => {
        const section = createPromptSection(0);
        const file = createPromptFile([section]);

        expect(buildScriptPath(file, section, '/project')).toBe('/project/.promptbook/coder-prompts/feature.sh');
    });

    it('keeps section suffixes for multi-section prompt files', () => {
        const firstSection = createPromptSection(0);
        const secondSection = createPromptSection(1);
        const file = createPromptFile([firstSection, secondSection]);

        expect(buildScriptPath(file, secondSection, '/project')).toBe('/project/.promptbook/coder-prompts/feature-2.sh');
    });
});
