import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { resolveAgentProjectFaviconRelativePath } from './resolveAgentProjectFaviconRelativePath';

/**
 * Temporary project directory used by favicon-resolution tests.
 */
let temporaryProjectDirectory: string | null = null;

beforeEach(async () => {
    temporaryProjectDirectory = await mkdtemp(join(tmpdir(), 'promptbook-agent-project-favicon-'));
});

afterEach(async () => {
    if (temporaryProjectDirectory) {
        await rm(temporaryProjectDirectory, { recursive: true, force: true });
    }

    temporaryProjectDirectory = null;
});

describe('resolveAgentProjectFaviconRelativePath', () => {
    it('prefers an existing favicon declared by the HTML entrypoint', async () => {
        await mkdir(join(temporaryProjectDirectory!, 'assets'));
        await writeFile(join(temporaryProjectDirectory!, 'assets', 'map.svg'), '<svg></svg>');
        await writeFile(join(temporaryProjectDirectory!, 'favicon.ico'), 'icon');

        await expect(
            resolveAgentProjectFaviconRelativePath({
                projectPath: temporaryProjectDirectory!,
                faviconRelativePaths: ['assets/map.svg'],
            }),
        ).resolves.toBe('assets/map.svg');
    });

    it('uses a conventional favicon when HTML does not declare one', async () => {
        await writeFile(join(temporaryProjectDirectory!, 'favicon.png'), 'icon');

        await expect(
            resolveAgentProjectFaviconRelativePath({
                projectPath: temporaryProjectDirectory!,
                faviconRelativePaths: [],
            }),
        ).resolves.toBe('favicon.png');
    });

    it('skips existing non-image candidates', async () => {
        await writeFile(join(temporaryProjectDirectory!, 'project.txt'), 'not an icon');
        await writeFile(join(temporaryProjectDirectory!, 'favicon.ico'), 'icon');

        await expect(
            resolveAgentProjectFaviconRelativePath({
                projectPath: temporaryProjectDirectory!,
                faviconRelativePaths: ['project.txt'],
            }),
        ).resolves.toBe('favicon.ico');
    });
});
