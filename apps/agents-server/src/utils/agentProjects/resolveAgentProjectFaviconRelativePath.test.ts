import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveAgentProjectFaviconRelativePath } from './resolveAgentProjectFaviconRelativePath';

describe('resolveAgentProjectFaviconRelativePath', () => {
    let temporaryDirectory: string | null = null;

    beforeEach(async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-favicon-'));
    });

    afterEach(async () => {
        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }
    });

    it('uses the icon linked by the project index.html', async () => {
        await mkdir(join(temporaryDirectory!, 'assets'), { recursive: true });
        await writeFile(join(temporaryDirectory!, 'assets', 'icon.png'), 'icon', 'utf-8');
        await writeFile(join(temporaryDirectory!, 'favicon.ico'), 'icon', 'utf-8');

        await expect(
            resolveAgentProjectFaviconRelativePath({
                projectPath: temporaryDirectory!,
                indexHtmlFaviconHref: '/assets/icon.png?v=2',
            }),
        ).resolves.toBe('assets/icon.png');
    });

    it('falls back to a conventional favicon location', async () => {
        await mkdir(join(temporaryDirectory!, 'public'), { recursive: true });
        await writeFile(join(temporaryDirectory!, 'public', 'favicon.svg'), '<svg/>', 'utf-8');

        await expect(
            resolveAgentProjectFaviconRelativePath({
                projectPath: temporaryDirectory!,
                indexHtmlFaviconHref: './missing-icon.png',
            }),
        ).resolves.toBe('public/favicon.svg');
    });

    it('refuses an icon hosted outside of the project folder', async () => {
        await writeFile(join(temporaryDirectory!, 'favicon.ico'), 'icon', 'utf-8');

        await expect(
            resolveAgentProjectFaviconRelativePath({
                projectPath: temporaryDirectory!,
                indexHtmlFaviconHref: 'https://example.com/favicon.png',
            }),
        ).resolves.toBe('favicon.ico');
    });

    it('refuses an icon path escaping the project folder', async () => {
        await expect(
            resolveAgentProjectFaviconRelativePath({
                projectPath: temporaryDirectory!,
                indexHtmlFaviconHref: '../../secrets/favicon.png',
            }),
        ).resolves.toBe(null);
    });

    it('refuses a linked file which is not an image', async () => {
        await writeFile(join(temporaryDirectory!, 'icon.txt'), 'not an icon', 'utf-8');

        await expect(
            resolveAgentProjectFaviconRelativePath({
                projectPath: temporaryDirectory!,
                indexHtmlFaviconHref: 'icon.txt',
            }),
        ).resolves.toBe(null);
    });

    it('reports a project without any icon', async () => {
        await expect(
            resolveAgentProjectFaviconRelativePath({
                projectPath: temporaryDirectory!,
                indexHtmlFaviconHref: null,
            }),
        ).resolves.toBe(null);
    });
});
