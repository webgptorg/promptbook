import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createAgentProjectInfo } from './resolveAgentProjectInfo';

describe('createAgentProjectInfo', () => {
    let temporaryDirectory: string | null = null;

    beforeEach(async () => {
        temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-project-info-'));
    });

    afterEach(async () => {
        if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true });
            temporaryDirectory = null;
        }
    });

    it('presents a static project by the title and the icon of its index.html', async () => {
        const projectPath = join(temporaryDirectory!, 'prague-murders-map');
        await mkdir(join(projectPath, 'assets'), { recursive: true });
        await writeFile(
            join(projectPath, 'index.html'),
            '<html><head><title>Prague Murders</title><link rel="icon" href="assets/icon.png"></head></html>',
            'utf-8',
        );
        await writeFile(join(projectPath, 'assets', 'icon.png'), 'icon', 'utf-8');

        await expect(createAgentProjectInfo(temporaryDirectory!, 'prague-murders-map')).resolves.toMatchObject({
            projectName: 'prague-murders-map',
            displayName: 'Prague Murders',
            faviconRelativePath: 'assets/icon.png',
        });
    });

    it('prefers the README heading and falls back to a conventional favicon', async () => {
        const projectPath = join(temporaryDirectory!, 'prague-leaflet-map');
        await mkdir(projectPath, { recursive: true });
        await writeFile(join(projectPath, 'README.md'), '# Leaflet Map\n\nMap of Prague.', 'utf-8');
        await writeFile(join(projectPath, 'index.html'), '<html><head><title>Leaflet</title></head></html>', 'utf-8');
        await writeFile(join(projectPath, 'favicon.ico'), 'icon', 'utf-8');

        await expect(createAgentProjectInfo(temporaryDirectory!, 'prague-leaflet-map')).resolves.toMatchObject({
            displayName: 'Leaflet Map',
            description: 'Map of Prague.',
            faviconRelativePath: 'favicon.ico',
        });
    });

    it('humanizes the folder name of a project which describes itself nowhere', async () => {
        const projectPath = join(temporaryDirectory!, 'snake-game');
        await mkdir(projectPath, { recursive: true });
        await writeFile(join(projectPath, 'game.js'), 'const snake = [];\n', 'utf-8');

        await expect(createAgentProjectInfo(temporaryDirectory!, 'snake-game')).resolves.toMatchObject({
            displayName: 'Snake Game',
            description: '',
            faviconRelativePath: null,
        });
    });
});
