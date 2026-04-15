import { describe, expect, it } from '@jest/globals';
import { getPackagesMetadataForRollup } from '../../rollup.config';

describe('getPackagesMetadataForRollup', () => {
    it('marks the CLI package with an explicit TypeScript runtime dependency', () => {
        const cliPackageMetadata = getPackagesMetadataForRollup().find(
            ({ packageBasename }) => packageBasename === 'cli',
        );

        expect(cliPackageMetadata?.additionalDependencies).toContain('typescript');
    });
});
