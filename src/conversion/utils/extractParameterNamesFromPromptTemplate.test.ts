import { describe, expect, it } from '@jest/globals';
import { extractParameterNamesFromPromptTemplate } from './extractParameterNamesFromPromptTemplate';

describe('extractParameterNamesFromPromptTemplate', () => {
    it('should parse parameters from prompt template', () => {
        const promptTemplate = {
            title: 'name of {foo}',
            description: 'description of {foo} and {bar}',
            blockType: 'PROMPT_TEMPLATE',
            content: 'hello {name}',
        } as const;

        expect(extractParameterNamesFromPromptTemplate(promptTemplate)).toContain('foo');
        expect(extractParameterNamesFromPromptTemplate(promptTemplate)).toContain('bar');
        expect(extractParameterNamesFromPromptTemplate(promptTemplate)).toContain('name');
    });

    it('should parse parameters from javascript script', () => {
        expect(
            extractParameterNamesFromPromptTemplate({
                title: 'Script',
                blockType: 'SCRIPT',
                content: 'const greeting = hello;',
            }),
        ).toContain('hello');
    });
});
