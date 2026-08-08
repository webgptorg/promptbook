import { isNpmPackageVersionOutdated } from './isNpmPackageVersionOutdated';

describe('isNpmPackageVersionOutdated', () => {
    it('reports the same version as up to date', () => {
        expect(isNpmPackageVersionOutdated('2.1.199', '2.1.199')).toBe(false);
    });

    it('reports an older patch version as outdated', () => {
        expect(isNpmPackageVersionOutdated('2.1.199', '2.1.220')).toBe(true);
    });

    it('reports an older minor version as outdated', () => {
        expect(isNpmPackageVersionOutdated('1.1.36', '1.18.9')).toBe(true);
    });

    it('reports an older major version as outdated', () => {
        expect(isNpmPackageVersionOutdated('0.144.4', '1.0.0')).toBe(true);
    });

    it('does not report a newer local version as outdated', () => {
        expect(isNpmPackageVersionOutdated('2.2.0', '2.1.220')).toBe(false);
    });

    it('compares numerically instead of alphabetically', () => {
        expect(isNpmPackageVersionOutdated('1.9.0', '1.10.0')).toBe(true);
        expect(isNpmPackageVersionOutdated('1.10.0', '1.9.0')).toBe(false);
    });

    it('ignores pre-release and build suffixes', () => {
        expect(isNpmPackageVersionOutdated('1.2.3-beta.4', '1.2.3')).toBe(false);
        expect(isNpmPackageVersionOutdated('1.2.3+build.5', '1.2.4')).toBe(true);
    });

    it('treats missing segments as zero', () => {
        expect(isNpmPackageVersionOutdated('1.2', '1.2.0')).toBe(false);
        expect(isNpmPackageVersionOutdated('1.2', '1.2.1')).toBe(true);
    });
});
