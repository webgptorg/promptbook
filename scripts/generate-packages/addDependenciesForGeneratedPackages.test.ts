import { describe, expect, it } from '@jest/globals';
import { execFile } from 'child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import type { PackageJson } from 'type-fest';
import {
    applyGeneratedPackageEntrypoints,
    bundleReferencesDependency,
    getGeneratedPackageDeclarationEntrypoint,
    getGeneratedPackageExecutableFiles,
} from './addDependenciesForGeneratedPackages';

/**
 * Promise based `execFile` for package-proxy integration tests.
 */
const EXEC_FILE_ASYNC = promisify(execFile);

describe('addDependenciesForGeneratedPackages', () => {
    it('points generated package typings to emitted declaration entrypoints', () => {
        expect(getGeneratedPackageDeclarationEntrypoint('utils')).toBe('./esm/src/_packages/utils.index.d.ts');
    });

    it('writes matching types and typings fields for generated buildable packages', () => {
        const packageJson = {} as PackageJson;

        applyGeneratedPackageEntrypoints(packageJson, {
            isBuilded: true,
            packageBasename: 'utils',
            packageFullname: '@promptbook/utils',
        } as never);

        expect(packageJson.main).toBe('./umd/index.umd.js');
        expect(packageJson.module).toBe('./esm/index.es.js');
        expect(packageJson.types).toBe('./esm/src/_packages/utils.index.d.ts');
        expect(packageJson.typings).toBe('./esm/src/_packages/utils.index.d.ts');
    });

    it('keeps types-only packages without runtime entrypoints while still exposing declarations', () => {
        const packageJson = {} as PackageJson;

        applyGeneratedPackageEntrypoints(packageJson, {
            isBuilded: true,
            packageBasename: 'types',
            packageFullname: '@promptbook/types',
        } as never);

        expect(packageJson.main).toBeUndefined();
        expect(packageJson.module).toBeUndefined();
        expect(packageJson.types).toBe('./esm/src/_packages/types.index.d.ts');
        expect(packageJson.typings).toBe('./esm/src/_packages/types.index.d.ts');
    });

    it('generates a ptbk proxy launcher that forwards to the published @promptbook/cli binary', () => {
        const generatedPackageExecutableFiles = getGeneratedPackageExecutableFiles('ptbk');

        expect(generatedPackageExecutableFiles['bin/promptbook-cli-proxy.js']).toContain(
            "const PROMPTBOOK_CLI_BIN_PATH = '@promptbook/cli/bin/promptbook-cli.js';",
        );
        expect(generatedPackageExecutableFiles['bin/promptbook-cli-proxy.js']).toContain(
            'function resolveLocalPtbkEntrypoint()',
        );
        expect(generatedPackageExecutableFiles['bin/promptbook-cli-proxy.js']).not.toContain(
            'Please install `ptbk` package first',
        );
    });

    it('runs through direct @promptbook/cli dependency without the promptbook package', async () => {
        const temporaryDirectory = await createTemporaryDirectory();

        try {
            const ptbkPackagePath = join(temporaryDirectory, 'ptbk');

            await writeFakePtbkPackage(ptbkPackagePath, 'direct cli');

            const { stdout } = await EXEC_FILE_ASYNC(
                process.execPath,
                [join(ptbkPackagePath, 'bin/promptbook-cli-proxy.js')],
                {
                    cwd: temporaryDirectory,
                },
            );

            expect(stdout.trim()).toBe('direct cli');
        } finally {
            await rm(temporaryDirectory, { recursive: true, force: true });
        }
    });

    it('delegates a globally resolved ptbk proxy to the cwd-local ptbk install', async () => {
        const temporaryDirectory = await createTemporaryDirectory();

        try {
            const globalPtbkPackagePath = join(temporaryDirectory, 'global-ptbk');
            const localPtbkPackagePath = join(temporaryDirectory, 'consumer', 'node_modules', 'ptbk');

            await writeFakePtbkPackage(globalPtbkPackagePath, 'global cli');
            await writeFakePtbkPackage(localPtbkPackagePath, 'local cli');

            const { stdout } = await EXEC_FILE_ASYNC(
                process.execPath,
                [join(globalPtbkPackagePath, 'bin/promptbook-cli-proxy.js')],
                {
                    cwd: join(temporaryDirectory, 'consumer'),
                },
            );

            expect(stdout.trim()).toBe('local cli');
        } finally {
            await rm(temporaryDirectory, { recursive: true, force: true });
        }
    });

    it('detects side-effect-only esm imports when inferring generated package dependencies', () => {
        expect(bundleReferencesDependency(`import '@supabase/supabase-js';`, '@supabase/supabase-js')).toBe(true);
    });

    it('detects dependency subpath imports when inferring generated package dependencies', () => {
        expect(
            bundleReferencesDependency(`import { renderToStaticMarkup } from 'react-dom/server';`, 'react-dom'),
        ).toBe(true);
    });
});

/**
 * Creates one temporary directory for package-generation tests.
 *
 * @returns Absolute temporary directory path
 */
async function createTemporaryDirectory(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'promptbook-package-generation-'));
}

/**
 * Writes a fake `ptbk` package layout with the generated proxy and one fake CLI dependency.
 *
 * @param packagePath - Absolute package root
 * @param cliOutput - Output printed by the fake CLI binary
 */
async function writeFakePtbkPackage(packagePath: string, cliOutput: string): Promise<void> {
    const generatedPackageExecutableFiles = getGeneratedPackageExecutableFiles('ptbk');
    const proxyFileContent = generatedPackageExecutableFiles['bin/promptbook-cli-proxy.js'];
    const cliPackagePath = join(packagePath, 'node_modules', '@promptbook', 'cli');

    await mkdir(join(packagePath, 'bin'), { recursive: true });
    await mkdir(join(cliPackagePath, 'bin'), { recursive: true });
    await writeFile(join(packagePath, 'package.json'), JSON.stringify({ name: 'ptbk', version: '0.0.0' }));
    await writeFile(join(packagePath, 'bin', 'promptbook-cli-proxy.js'), `${proxyFileContent}\n`);
    await writeFile(join(cliPackagePath, 'package.json'), JSON.stringify({ name: '@promptbook/cli', version: '0.0.0' }));
    await writeFile(join(cliPackagePath, 'bin', 'promptbook-cli.js'), `console.log(${JSON.stringify(cliOutput)});\n`);
}
