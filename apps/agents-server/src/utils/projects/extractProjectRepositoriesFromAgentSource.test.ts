import { describe, expect, it } from '@jest/globals';
import { validateBook } from '../../../../../src/book-2.0/agent-source/string_book';
import { extractProjectRepositoriesFromAgentSource } from './extractProjectRepositoriesFromAgentSource';

describe('extractProjectRepositoriesFromAgentSource', () => {
    it('extracts canonical USE PROJECT repository URLs', () => {
        const repositories = extractProjectRepositoriesFromAgentSource(
            validateBook(`
                Project Agent
                USE PROJECT https://github.com/example/first-project
                USE PROJECT github.com/example/second-project
                USE PROJECT example/second-project
                USE PROJECT invalid-reference
            `),
        );

        expect(repositories).toEqual([
            'https://github.com/example/first-project',
            'https://github.com/example/second-project',
        ]);
    });
});
