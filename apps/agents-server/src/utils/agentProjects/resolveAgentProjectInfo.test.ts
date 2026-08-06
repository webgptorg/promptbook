import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createAgentProjectInfo } from './resolveAgentProjectInfo';

/**
 * Temporary projects root used by project metadata integration tests.
 */
let temporaryProjectsRootPath: string | null = null;

beforeEach(async () => {
    temporaryProjectsRootPath = await mkdtemp(join(tmpdir(), 'promptbook-agent-project-info-'));
});

afterEach(async () => {
    if (temporaryProjectsRootPath) {
        await rm(temporaryProjectsRootPath, { recursive: true, force: true });
    }

    temporaryProjectsRootPath = null;
});

describe('createAgentProjectInfo', () => {
    it('uses an HTML title and linked favicon when the README has no heading', async () => {
        const projectDirectoryName = 'prague-murders-map';
        const projectPath = join(temporaryProjectsRootPath!, projectDirectoryName);
        await mkdir(join(projectPath, 'assets'), { recursive: true });
        await writeFile(join(projectPath, 'README.md'), 'Interactive map of historic cases.', 'utf-8');
        await writeFile(
            join(projectPath, 'index.html'),
            '<!doctype html><html><head><title>Prague Murders Map</title><link rel="icon" href="assets/map.svg"></head></html>',
            'utf-8',
        );
        await writeFile(join(projectPath, 'assets', 'map.svg'), '<svg></svg>', 'utf-8');

        await expect(createAgentProjectInfo(temporaryProjectsRootPath!, projectDirectoryName)).resolves.toMatchObject({
            projectName: projectDirectoryName,
            displayName: 'Prague Murders Map',
            description: 'Interactive map of historic cases.',
            readmeFileName: 'README.md',
            faviconRelativePath: 'assets/map.svg',
        });
    });
});
