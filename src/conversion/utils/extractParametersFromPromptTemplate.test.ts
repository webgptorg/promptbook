import { describe, expect, it } from '@jest/globals';
import { extractParametersFromPromptTemplate } from './extractParametersFromPromptTemplate';

describe('extractParametersFromPromptTemplate', () => {
    it('should parse parameters from prompt template', () => {
        const promptTemplate = {
            title: 'name of {foo}',
            description: 'description of {foo} and {bar}',
            executionType: 'PROMPT_TEMPLATE',
            content: 'hello {name}',
        } as const;

        expect(extractParametersFromPromptTemplate(promptTemplate)).toContain('foo');
        expect(extractParametersFromPromptTemplate(promptTemplate)).toContain('bar');
        expect(extractParametersFromPromptTemplate(promptTemplate)).toContain('name');
    });

    it('should parse parameters from javascript script', () => {
        expect(
            extractParametersFromPromptTemplate({
                title: 'Script',
                executionType: 'SCRIPT',
                content: 'const greeting = hello;',
            }),
        ).toContain('hello');
    });
});
