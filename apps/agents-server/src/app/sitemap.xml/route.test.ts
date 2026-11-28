import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { $provideServer } from '@/src/tools/$provideServer';
import { getServerVisibility } from '@/src/utils/getServerVisibility';
import {
    countPublicAgentProfileSeoRecords,
    getPublicAgentProfileSeoRecordsPage,
} from '@/src/utils/seo/getPublicAgentProfileSeoRecords';

jest.mock('@/src/tools/$provideServer', () => ({
    $provideServer: jest.fn(),
}));

jest.mock('@/src/utils/getServerVisibility', () => ({
    getServerVisibility: jest.fn(),
}));

jest.mock('@/src/utils/seo/getPublicAgentProfileSeoRecords', () => ({
    countPublicAgentProfileSeoRecords: jest.fn(),
    DEFAULT_SITEMAP_PAGE_SIZE: 500,
    getPublicAgentProfileSeoRecordsPage: jest.fn(),
}));

/**
 * Mocked server provider used by sitemap route tests.
 */
const provideServerMock = $provideServer as jest.MockedFunction<typeof $provideServer>;

/**
 * Mocked server-visibility resolver used by sitemap route tests.
 */
const getServerVisibilityMock = getServerVisibility as jest.MockedFunction<typeof getServerVisibility>;

/**
 * Mocked public-agent counter used by sitemap route tests.
 */
const countPublicAgentProfileSeoRecordsMock = countPublicAgentProfileSeoRecords as jest.MockedFunction<
    typeof countPublicAgentProfileSeoRecords
>;

/**
 * Mocked page loader used by sitemap route tests.
 */
const getPublicAgentProfileSeoRecordsPageMock = getPublicAgentProfileSeoRecordsPage as jest.MockedFunction<
    typeof getPublicAgentProfileSeoRecordsPage
>;

describe('GET /sitemap.xml', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns 404 when server visibility is private', async () => {
        provideServerMock.mockResolvedValue({
            id: 1,
            publicUrl: new URL('https://agents.example/'),
            tablePrefix: 'prefix_',
        });
        getServerVisibilityMock.mockResolvedValue('PRIVATE');

        const response = await GET(new NextRequest('https://agents.example/sitemap.xml'));

        expect(response.status).toBe(404);
        expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
        expect(await response.text()).toContain('Not Found');
    });

    it('returns one urlset page for public servers with a single sitemap page', async () => {
        provideServerMock.mockResolvedValue({
            id: 2,
            publicUrl: new URL('https://agents.example/'),
            tablePrefix: 'prefix_',
        });
        getServerVisibilityMock.mockResolvedValue('PUBLIC');
        countPublicAgentProfileSeoRecordsMock.mockResolvedValue(1);
        getPublicAgentProfileSeoRecordsPageMock.mockResolvedValue([
            {
                agentName: 'Assistant',
                canonicalAgentId: 'assistant-1',
                lastModifiedAt: '2026-03-20T10:00:00.000Z',
            },
        ]);

        const response = await GET(new NextRequest('https://agents.example/sitemap.xml'));
        const body = await response.text();

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('application/xml');
        expect(response.headers.get('x-robots-tag')).toBe('index, follow');
        expect(body).toContain('<urlset');
        expect(body).toContain('<loc>https://agents.example/agents/assistant-1</loc>');
        expect(body).toContain('<lastmod>2026-03-20T10:00:00.000Z</lastmod>');
    });

    it('returns a sitemap index when more than one page is needed', async () => {
        provideServerMock.mockResolvedValue({
            id: 3,
            publicUrl: new URL('https://agents.example/'),
            tablePrefix: 'prefix_',
        });
        getServerVisibilityMock.mockResolvedValue('PUBLIC');
        countPublicAgentProfileSeoRecordsMock.mockResolvedValue(501);

        const response = await GET(new NextRequest('https://agents.example/sitemap.xml'));
        const body = await response.text();

        expect(response.status).toBe(200);
        expect(body).toContain('<sitemapindex');
        expect(body).toContain('<loc>https://agents.example/sitemap.xml?page=1</loc>');
        expect(body).toContain('<loc>https://agents.example/sitemap.xml?page=2</loc>');
        expect(getPublicAgentProfileSeoRecordsPageMock).not.toHaveBeenCalled();
    });

    it('returns a specific sitemap page when `page` query parameter is provided', async () => {
        provideServerMock.mockResolvedValue({
            id: 4,
            publicUrl: new URL('https://agents.example/'),
            tablePrefix: 'prefix_',
        });
        getServerVisibilityMock.mockResolvedValue('PUBLIC');
        countPublicAgentProfileSeoRecordsMock.mockResolvedValue(501);
        getPublicAgentProfileSeoRecordsPageMock.mockResolvedValue([
            {
                agentName: 'Second page agent',
                canonicalAgentId: 'agent-page-2',
                lastModifiedAt: '2026-03-21T11:30:00.000Z',
            },
        ]);

        const response = await GET(new NextRequest('https://agents.example/sitemap.xml?page=2'));
        const body = await response.text();

        expect(response.status).toBe(200);
        expect(body).toContain('<urlset');
        expect(body).toContain('<loc>https://agents.example/agents/agent-page-2</loc>');
        expect(getPublicAgentProfileSeoRecordsPageMock).toHaveBeenCalledWith({ page: 2, pageSize: 500 });
    });
});
