import { describe, expect, it } from '@jest/globals';
import { extractParameterNamesFromTask } from './extractParameterNamesFromTask';

describe('extractParameterNamesFromTask', () => {
    it('should parse parameters from template', () => {
        const template = {
            title: 'name of {foo}',
            description: 'description of {foo} and {bar}',
            taskType: 'PROMPT_TEMPLATE',
            content: 'hello {name}',
        } as const;

        expect(extractParameterNamesFromTask(template)).toContain('foo');
        expect(extractParameterNamesFromTask(template)).toContain('bar');
        expect(extractParameterNamesFromTask(template)).toContain('name');
    });

    it('should parse parameters from javascript script', () => {
        expect(
            extractParameterNamesFromTask({
                title: 'Script',
                taskType: 'SCRIPT_TEMPLATE',
                content: 'const greeting = hello;',
            }),
        ).toContain('hello');
    });
});
