import { describe, expect, it } from '@jest/globals';
import { extractParameterNamesFromTemplate } from './extractParameterNamesFromTemplate';

describe('extractParameterNamesFromTemplate', () => {
    it('should parse parameters from prompt template', () => {
        const template = {
            title: 'name of {foo}',
            description: 'description of {foo} and {bar}',
            blockType: 'PROMPT_TEMPLATE',
            content: 'hello {name}',
        } as const;

        expect(extractParameterNamesFromTemplate(template)).toContain('foo');
        expect(extractParameterNamesFromTemplate(template)).toContain('bar');
        expect(extractParameterNamesFromTemplate(template)).toContain('name');
    });

    it('should parse parameters from javascript script', () => {
        expect(
            extractParameterNamesFromTemplate({
                title: 'Script',
                blockType: 'SCRIPT',
                content: 'const greeting = hello;',
            }),
        ).toContain('hello');
    });
});
