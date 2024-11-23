import { describe, expect, it } from '@jest/globals';
import { extractParameterNamesFromTask } from './extractParameterNamesFromTask';

describe('extractParameterNamesFromTask', () => {
    it('should parse parameters from task', () => {
        const task = {
            title: 'name of {foo}',
            description: 'description of {foo} and {bar}',
            taskType: 'PROMPT_TEMPLATE_TASK',
            content: 'hello {name}',
        } as const;

        expect(extractParameterNamesFromTask(task)).toContain('foo');
        expect(extractParameterNamesFromTask(task)).toContain('bar');
        expect(extractParameterNamesFromTask(task)).toContain('name');
    });

    it('should parse parameters from javascript script', () => {
        expect(
            extractParameterNamesFromTask({
                title: 'Script',
                taskType: 'SCRIPT_TEMPLATE_TASK',
                content: 'const greeting = hello;',
            }),
        ).toContain('hello');
    });
});
