import { describe, expect, it } from '@jest/globals';
import type { PackageJson } from 'type-fest';
import {
    applyGeneratedPackageEntrypoints,
    bundleReferencesDependency,
    getGeneratedPackageDeclarationEntrypoint,
    getGeneratedPackageExecutableFiles,
} from './addDependenciesForGeneratedPackages';

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
            "require.resolve('promptbook/package.json')",
        );
        expect(generatedPackageExecutableFiles['bin/promptbook-cli-proxy.js']).toContain(
            "require.resolve('@promptbook/cli/bin/promptbook-cli.js'",
        );
        expect(generatedPackageExecutableFiles['bin/promptbook-cli-proxy.js']).not.toContain(
            'Please install `ptbk` package first',
        );
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
