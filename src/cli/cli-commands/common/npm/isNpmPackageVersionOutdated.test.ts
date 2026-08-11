import { isNpmPackageVersionOutdated } from './isNpmPackageVersionOutdated';

describe('isNpmPackageVersionOutdated', () => {
    it('reports the same version as up to date', () => {
        expect(isNpmPackageVersionOutdated('2.1.199', '2.1.199')).toBe(false);
    });

    it('compares major, minor, and patch segments numerically', () => {
        expect(isNpmPackageVersionOutdated('0.144.4', '1.0.0')).toBe(true);
        expect(isNpmPackageVersionOutdated('1.1.36', '1.18.9')).toBe(true);
        expect(isNpmPackageVersionOutdated('2.1.199', '2.1.220')).toBe(true);
        expect(isNpmPackageVersionOutdated('1.10.0', '1.9.0')).toBe(false);
    });

    it('detects newer numbered Promptbook prerelease revisions', () => {
        expect(isNpmPackageVersionOutdated('0.114.0-8', '0.114.0-9')).toBe(true);
        expect(isNpmPackageVersionOutdated('0.114.0-10', '0.114.0-9')).toBe(false);
    });

    it('follows semantic-version prerelease precedence', () => {
        expect(isNpmPackageVersionOutdated('1.2.3-beta.2', '1.2.3-beta.10')).toBe(true);
        expect(isNpmPackageVersionOutdated('1.2.3-alpha', '1.2.3-beta')).toBe(true);
        expect(isNpmPackageVersionOutdated('1.2.3-beta', '1.2.3')).toBe(true);
        expect(isNpmPackageVersionOutdated('1.2.3', '1.2.3-beta')).toBe(false);
    });

    it('ignores build metadata', () => {
        expect(isNpmPackageVersionOutdated('1.2.3+build.4', '1.2.3+build.5')).toBe(false);
    });

    it('can preserve the existing harness behavior which ignores prerelease suffixes', () => {
        expect(isNpmPackageVersionOutdated('1.2.3-beta.4', '1.2.3', { isPrereleaseIgnored: true })).toBe(false);
        expect(isNpmPackageVersionOutdated('0.114.0-8', '0.114.0-9', { isPrereleaseIgnored: true })).toBe(false);
    });

    it('treats missing release segments as zero', () => {
        expect(isNpmPackageVersionOutdated('1.2', '1.2.0')).toBe(false);
        expect(isNpmPackageVersionOutdated('1.2', '1.2.1')).toBe(true);
    });
});
