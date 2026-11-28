import { describe, expect, it } from '@jest/globals';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { copyAgentsServerRuntimePathToCliPackage } from './copyAgentsServerRuntimePathToCliPackage';

describe('copyAgentsServerRuntimePathToCliPackage', () => {
    it('copies application sources while excluding local databases, journals, credentials, and build output', async () => {
        const temporaryDirectory = await mkdtemp(join(tmpdir(), 'promptbook-package-copy-'));
        const source = join(temporaryDirectory, 'agents-server');
        const destination = join(temporaryDirectory, 'cli/apps/agents-server');

        try {
            await mkdir(join(source, 'servers'), { recursive: true });
            await mkdir(join(source, '.next'), { recursive: true });
            await mkdir(destination, { recursive: true });
            await writeFile(join(destination, 'stale.sqlite'), 'old package state');

            for (const filename of [
                'agents-server.sqlite',
                'agents-server.sqlite-shm',
                'agents-server.sqlite-wal',
                'agents-server.sqlite-journal',
                'database.sqlite3',
                'database.db',
                '.env',
                '.env.local',
                'package.json',
            ]) {
                await writeFile(join(source, filename), 'fixture');
            }
            await writeFile(join(source, 'servers/default.sqlite'), 'local server state');
            await writeFile(join(source, 'servers/default.sqlite-wal'), 'local server journal');
            await writeFile(join(source, 'servers/config.json'), '{}');
            await writeFile(join(source, '.next/build.js'), 'generated');

            await copyAgentsServerRuntimePathToCliPackage(source, destination);

            expect((await readdir(destination)).sort()).toEqual(['package.json', 'servers']);
            expect(await readdir(join(destination, 'servers'))).toEqual(['config.json']);
        } finally {
            await rm(temporaryDirectory, { recursive: true, force: true });
        }
    });
});
