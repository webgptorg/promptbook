import { describe, expect, it, jest } from '@jest/globals';
import type { InlineKnowledgeSourceUploader } from '../../../../../src/utils/knowledge/inlineKnowledgeSource';
import {
    isLikelyWebsiteKnowledgeSourceUrl,
    resolveWebsiteKnowledgeSourcesForServer,
} from './resolveWebsiteKnowledgeSourcesForServer';

describe('resolveWebsiteKnowledgeSourcesForServer', () => {
    it('converts website URLs to uploaded inline knowledge sources', async () => {
        const uploadedPayloads: string[] = [];
        const scrapeWebsiteToMarkdown = jest.fn(async (sourceUrl: string) => `# Scraped\n\n${sourceUrl}`);
        const uploadInlineKnowledgeSource: InlineKnowledgeSourceUploader = jest.fn(
            async (source: Parameters<InlineKnowledgeSourceUploader>[0]) => {
                uploadedPayloads.push(source.buffer.toString('utf-8'));
                return `https://cdn.example/${source.filename}`;
            },
        );

        const resolvedKnowledgeSources = await resolveWebsiteKnowledgeSourcesForServer(['https://example.com/docs'], {
            scrapeWebsiteToMarkdown,
            uploadInlineKnowledgeSource,
            isPrivateNetworkUrl: () => false,
        });

        expect(scrapeWebsiteToMarkdown).toHaveBeenCalledTimes(1);
        expect(scrapeWebsiteToMarkdown).toHaveBeenCalledWith('https://example.com/docs');
        expect(uploadedPayloads[0]).toContain('Source URL: https://example.com/docs');
        expect(resolvedKnowledgeSources).toHaveLength(1);
        expect(resolvedKnowledgeSources[0]).toMatch(/^https:\/\/cdn\.example\//);
    });

    it('keeps non-website knowledge URLs untouched', async () => {
        const scrapeWebsiteToMarkdown = jest.fn(async () => '# Should not be used');
        const uploadInlineKnowledgeSource: InlineKnowledgeSourceUploader = jest.fn(async () => 'https://cdn.example/x');

        const resolvedKnowledgeSources = await resolveWebsiteKnowledgeSourcesForServer(
            ['https://example.com/file.pdf', 'https://example.com/readme.md'],
            {
                scrapeWebsiteToMarkdown,
                uploadInlineKnowledgeSource,
                isPrivateNetworkUrl: () => false,
            },
        );

        expect(scrapeWebsiteToMarkdown).not.toHaveBeenCalled();
        expect(uploadInlineKnowledgeSource).not.toHaveBeenCalled();
        expect(resolvedKnowledgeSources).toEqual(['https://example.com/file.pdf', 'https://example.com/readme.md']);
    });

    it('skips private-network website URLs', async () => {
        const scrapeWebsiteToMarkdown = jest.fn(async () => '# Scraped');
        const uploadInlineKnowledgeSource: InlineKnowledgeSourceUploader = jest.fn(async () => 'https://cdn.example/x');

        const resolvedKnowledgeSources = await resolveWebsiteKnowledgeSourcesForServer(['http://localhost/docs'], {
            scrapeWebsiteToMarkdown,
            uploadInlineKnowledgeSource,
            isPrivateNetworkUrl: () => true,
        });

        expect(scrapeWebsiteToMarkdown).not.toHaveBeenCalled();
        expect(uploadInlineKnowledgeSource).not.toHaveBeenCalled();
        expect(resolvedKnowledgeSources).toEqual(['http://localhost/docs']);
    });

    it('falls back to original source when website scraping fails', async () => {
        const uploadInlineKnowledgeSource: InlineKnowledgeSourceUploader = jest.fn(async () => 'https://cdn.example/x');

        const resolvedKnowledgeSources = await resolveWebsiteKnowledgeSourcesForServer(['https://example.com/docs'], {
            scrapeWebsiteToMarkdown: async () => {
                throw new Error('Scrape failed');
            },
            uploadInlineKnowledgeSource,
            isPrivateNetworkUrl: () => false,
        });

        expect(uploadInlineKnowledgeSource).not.toHaveBeenCalled();
        expect(resolvedKnowledgeSources).toEqual(['https://example.com/docs']);
    });
});

describe('isLikelyWebsiteKnowledgeSourceUrl', () => {
    it('returns true for website-like URLs', () => {
        expect(isLikelyWebsiteKnowledgeSourceUrl('https://example.com/docs')).toBe(true);
        expect(isLikelyWebsiteKnowledgeSourceUrl('https://example.com/some/path')).toBe(true);
    });

    it('returns false for known document URLs and non-http sources', () => {
        expect(isLikelyWebsiteKnowledgeSourceUrl('https://example.com/file.pdf')).toBe(false);
        expect(isLikelyWebsiteKnowledgeSourceUrl('https://example.com/file.txt')).toBe(false);
        expect(isLikelyWebsiteKnowledgeSourceUrl('data:text/plain;base64,SGVsbG8=')).toBe(false);
    });
});
