import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { generateRobotsTxt } from './generateMetaTxt';
import { $provideServer } from '@/src/tools/$provideServer';
import { getServerVisibility } from '@/src/utils/getServerVisibility';

jest.mock('@/src/tools/$provideServer', () => ({
    $provideServer: jest.fn(),
}));

jest.mock('@/src/utils/getServerVisibility', () => ({
    getServerVisibility: jest.fn(),
}));

/**
 * Mocked server provider used by robots generation tests.
 */
const provideServerMock = $provideServer as jest.MockedFunction<typeof $provideServer>;

/**
 * Mocked server visibility resolver used by robots generation tests.
 */
const getServerVisibilityMock = getServerVisibility as jest.MockedFunction<typeof getServerVisibility>;

describe('generateRobotsTxt', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('disallows all crawling and omits sitemap on private servers', async () => {
        provideServerMock.mockResolvedValue({
            id: 1,
            publicUrl: new URL('https://private.example/'),
            tablePrefix: 'prefix_',
        });
        getServerVisibilityMock.mockResolvedValue('PRIVATE');

        const robotsTxt = await generateRobotsTxt();

        expect(robotsTxt).toContain('User-agent: *');
        expect(robotsTxt).toContain('Disallow: /');
        expect(robotsTxt).not.toContain('Sitemap:');
        expect(robotsTxt).not.toContain('Allow: /');
    });

    it('allows crawling and includes sitemap on public servers', async () => {
        provideServerMock.mockResolvedValue({
            id: 2,
            publicUrl: new URL('https://public.example/'),
            tablePrefix: 'prefix_',
        });
        getServerVisibilityMock.mockResolvedValue('PUBLIC');

        const robotsTxt = await generateRobotsTxt();

        expect(robotsTxt).toContain('User-agent: *');
        expect(robotsTxt).toContain('Allow: /');
        expect(robotsTxt).toContain('Disallow: /admin/');
        expect(robotsTxt).toContain('Sitemap: https://public.example/sitemap.xml');
    });
});
