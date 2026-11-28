import { chmod, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { delimiter, join } from 'path';
import { afterEach, describe, expect, it } from '@jest/globals';
import { locateAppOnWindows } from './locateAppOnWindows';

describe('locating an app on Windows', () => {
    let temporaryDirectoryPath: string | null = null;
    const ORIGINAL_PATH = process.env.PATH;

    afterEach(async () => {
        if (ORIGINAL_PATH === undefined) {
            delete process.env.PATH;
        } else {
            process.env.PATH = ORIGINAL_PATH;
        }

        if (temporaryDirectoryPath !== null) {
            await rm(temporaryDirectoryPath, { force: true, recursive: true });
            temporaryDirectoryPath = null;
        }
    });

    it('should locate an app exposed through PATH', async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-locate-app-'));
        const EXECUTABLE_PATH = join(temporaryDirectoryPath, 'pandoc.exe');

        await writeFile(EXECUTABLE_PATH, '');
        await chmod(EXECUTABLE_PATH, 0o755);
        process.env.PATH = [temporaryDirectoryPath, ORIGINAL_PATH].filter(Boolean).join(delimiter);

        await expect(
            locateAppOnWindows({
                appName: 'Pandoc',
                windowsSuffix: '\\Pandoc\\pandoc.exe',
            }),
        ).resolves.toBe(EXECUTABLE_PATH);
        expect.assertions(1);
    });
});
