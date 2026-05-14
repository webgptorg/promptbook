import { describe, expect, it } from '@jest/globals';
import {
    extractUseProjectRepositoryUrlsFromCommitments,
    parseGitHubRepositoryReference,
    parseUseProjectCommitmentContent,
} from './projectReference';

describe('USE PROJECT project references', () => {
    it('parses GitHub repository references in supported formats', () => {
        expect(parseGitHubRepositoryReference('https://github.com/example/project')?.slug).toBe('example/project');
        expect(parseGitHubRepositoryReference('github.com/example/project')?.slug).toBe('example/project');
        expect(parseGitHubRepositoryReference('example/project')?.slug).toBe('example/project');
        expect(parseGitHubRepositoryReference('https://github.com/example/project/tree/main')?.defaultBranch).toBe(
            'main',
        );
    });

    it('returns null for invalid repository references', () => {
        expect(parseGitHubRepositoryReference('')).toBeNull();
        expect(parseGitHubRepositoryReference('https://example.com/project')).toBeNull();
        expect(parseGitHubRepositoryReference('not-a-repository')).toBeNull();
    });

    it('parses repository and instructions from commitment content', () => {
        const parsed = parseUseProjectCommitmentContent(`
            https://github.com/example/project Use feature branches
            Never push directly to main
        `);

        expect(parsed.repository?.slug).toBe('example/project');
        expect(parsed.instructions).toBe('Use feature branches\nNever push directly to main');
    });

    it('extracts unique canonical repository URLs from commitments', () => {
        const repositories = extractUseProjectRepositoryUrlsFromCommitments([
            {
                type: 'USE PROJECT',
                content: 'https://github.com/example/project',
            },
            {
                type: 'USE PROJECT',
                content: 'example/project',
            },
            {
                type: 'USE PROJECT',
                content: 'https://github.com/example/another-project',
            },
            {
                type: 'USE SEARCH ENGINE',
                content: 'Search the web',
            },
        ]);

        expect(repositories).toEqual([
            'https://github.com/example/project',
            'https://github.com/example/another-project',
        ]);
    });
});
