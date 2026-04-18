import { describe, expect, it } from '@jest/globals';
import type { PackageJson } from 'type-fest';
import {
    applyGeneratedPackageEntrypoints,
    getGeneratedPackageDeclarationEntrypoint,
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
});
