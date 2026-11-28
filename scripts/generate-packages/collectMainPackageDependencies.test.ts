import { describe, expect, it } from '@jest/globals';
import type { PackageJson } from 'type-fest';
import {
    collectMainPackageDependencies,
    collectMainPackageDevelopmentDependencies,
} from './collectMainPackageDependencies';

describe('collectMainPackageDependencies', () => {
    it('collects versions from dependencies', () => {
        const mainPackageJson = {
            dependencies: {
                colors: '1.4.0',
            },
            devDependencies: {
                typescript: '5.2.2',
            },
        } as PackageJson;

        expect(collectMainPackageDependencies(mainPackageJson)).toEqual({
            colors: '1.4.0',
        });
    });

    it('collects versions from devDependencies separately', () => {
        const mainPackageJson = {
            dependencies: {
                colors: '1.4.0',
            },
            devDependencies: {
                typescript: '5.2.2',
            },
        } as PackageJson;

        expect(collectMainPackageDevelopmentDependencies(mainPackageJson)).toEqual({
            typescript: '5.2.2',
        });
    });

    it('keeps dependency and devDependency version maps isolated', () => {
        const mainPackageJson = {
            dependencies: {
                typescript: '5.2.2',
            },
            devDependencies: {
                typescript: '5.3.0',
            },
        } as PackageJson;

        expect(collectMainPackageDependencies(mainPackageJson)).toEqual({
            typescript: '5.2.2',
        });
        expect(collectMainPackageDevelopmentDependencies(mainPackageJson)).toEqual({
            typescript: '5.3.0',
        });
    });
});
