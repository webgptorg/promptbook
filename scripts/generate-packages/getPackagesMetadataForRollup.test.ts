import { describe, expect, it } from '@jest/globals';
import { getPackagesMetadataForRollup } from '../../rollup.config';

describe('getPackagesMetadataForRollup', () => {
    it('marks the CLI package with explicit TypeScript runtime dependencies', () => {
        const cliPackageMetadata = getPackagesMetadataForRollup().find(
            ({ packageBasename }) => packageBasename === 'cli',
        );

        expect(cliPackageMetadata?.additionalDependencies).toContain('typescript');
        expect(cliPackageMetadata?.additionalDependencies).toContain('ts-node');
    });
});
