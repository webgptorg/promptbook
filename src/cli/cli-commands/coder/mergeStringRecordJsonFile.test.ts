import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { mergeStringRecordJsonFile } from './mergeStringRecordJsonFile';

/**
 * Creates and tracks one temporary directory for filesystem-based coder JSON tests.
 */
async function createTemporaryDirectory(trackedDirectories: Array<string>): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'promptbook-coder-json-'));
    trackedDirectories.push(directory);
    return directory;
}

describe('mergeStringRecordJsonFile', () => {
    let temporaryDirectories: Array<string>;

    beforeEach(() => {
        temporaryDirectories = [];
    });

    afterEach(async () => {
        await Promise.all(temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
    });

    it('parses tsconfig-style JSONC files through the TypeScript parser', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        const tsconfigFilePath = join(projectPath, 'tsconfig.json');

        await writeFile(
            tsconfigFilePath,
            '{\n  // Keep this existing option\n  "compilerOptions": {\n    "module": "esnext",\n  },\n}\n',
            'utf-8',
        );

        const { status, addedEntryKeys } = await mergeStringRecordJsonFile({
            projectPath,
            relativeFilePath: 'tsconfig.json',
            fieldPath: 'compilerOptions',
            nextEntries: {
                baseUrl: '.',
            },
        });

        expect(status).toBe('updated');
        expect(addedEntryKeys).toEqual(['baseUrl']);
        expect(JSON.parse(await readFile(tsconfigFilePath, 'utf-8'))).toEqual({
            compilerOptions: {
                module: 'esnext',
                baseUrl: '.',
            },
        });
    });

    it('never overrides entries which the file already defines', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        const packageJsonFilePath = join(projectPath, 'package.json');

        await writeFile(packageJsonFilePath, '{\n  "scripts": {\n    "coder:run": "echo mine"\n  }\n}\n', 'utf-8');

        const { status, addedEntryKeys } = await mergeStringRecordJsonFile({
            projectPath,
            relativeFilePath: 'package.json',
            fieldPath: 'scripts',
            nextEntries: {
                'coder:run': 'npx ptbk coder run',
                'coder:verify': 'npx ptbk coder verify',
            },
        });

        expect(status).toBe('updated');
        expect(addedEntryKeys).toEqual(['coder:verify']);
        expect(JSON.parse(await readFile(packageJsonFilePath, 'utf-8'))).toEqual({
            scripts: {
                'coder:run': 'echo mine',
                'coder:verify': 'npx ptbk coder verify',
            },
        });
    });

    it('leaves the file untouched when every entry is already defined', async () => {
        const projectPath = await createTemporaryDirectory(temporaryDirectories);
        const packageJsonFilePath = join(projectPath, 'package.json');
        const originalFileContent = '{\n  "scripts": {\n    "coder:run": "echo mine"\n  }\n}\n';

        await writeFile(packageJsonFilePath, originalFileContent, 'utf-8');

        const { status, addedEntryKeys } = await mergeStringRecordJsonFile({
            projectPath,
            relativeFilePath: 'package.json',
            fieldPath: 'scripts',
            nextEntries: {
                'coder:run': 'npx ptbk coder run',
            },
        });

        expect(status).toBe('unchanged');
        expect(addedEntryKeys).toEqual([]);
        expect(await readFile(packageJsonFilePath, 'utf-8')).toBe(originalFileContent);
    });
});
