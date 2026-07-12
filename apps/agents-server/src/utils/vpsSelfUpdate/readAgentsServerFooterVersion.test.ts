import { describe, expect, it } from '@jest/globals';
import {
    formatAgentsServerFooterVersionLabel,
    normalizeAgentsServerVersionTag,
    normalizeGitRepositoryWebUrl,
    resolveAgentsServerFooterVersionUrl,
} from './readAgentsServerFooterVersion';

describe('Agents Server footer version helpers', () => {
    it('normalizes Promptbook release versions into Git tags', () => {
        expect(normalizeAgentsServerVersionTag('0.113.0-10')).toBe('v0.113.0-10');
        expect(normalizeAgentsServerVersionTag('v0.113.0-10')).toBe('v0.113.0-10');
        expect(normalizeAgentsServerVersionTag('main')).toBeNull();
    });

    it('formats the footer version label with the commit hash only when provided', () => {
        expect(
            formatAgentsServerFooterVersionLabel({
                versionTag: 'v0.113.0-10',
                currentCommitShortSha: null,
            }),
        ).toBe('v0.113.0-10');
        expect(
            formatAgentsServerFooterVersionLabel({
                versionTag: 'v0.113.0-10',
                currentCommitShortSha: '5334719',
            }),
        ).toBe('v0.113.0-10 (5334719)');
    });

    it('normalizes Git clone URLs into browser repository URLs', () => {
        expect(normalizeGitRepositoryWebUrl('git+https://github.com/webgptorg/promptbook.git')).toBe(
            'https://github.com/webgptorg/promptbook',
        );
        expect(normalizeGitRepositoryWebUrl('https://github.com/webgptorg/promptbook.git')).toBe(
            'https://github.com/webgptorg/promptbook',
        );
    });

    it('links exact releases to the tag and newer checkouts to the deployed commit', () => {
        expect(
            resolveAgentsServerFooterVersionUrl({
                repositoryUrl: 'https://github.com/webgptorg/promptbook',
                versionTag: 'v0.113.0-10',
                currentCommitSha: '5334719f4ca3ea5ee8e6d036daba5b0aaad0d36e',
                isCurrentCommitNewerThanVersionTag: false,
            }),
        ).toBe('https://github.com/webgptorg/promptbook/releases/tag/v0.113.0-10');
        expect(
            resolveAgentsServerFooterVersionUrl({
                repositoryUrl: 'https://github.com/webgptorg/promptbook',
                versionTag: 'v0.113.0-10',
                currentCommitSha: '5334719f4ca3ea5ee8e6d036daba5b0aaad0d36e',
                isCurrentCommitNewerThanVersionTag: true,
            }),
        ).toBe('https://github.com/webgptorg/promptbook/commit/5334719f4ca3ea5ee8e6d036daba5b0aaad0d36e');
    });
});
