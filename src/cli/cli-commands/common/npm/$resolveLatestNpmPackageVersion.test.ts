import { spaceTrim } from 'spacetrim';
import { $execCommand } from '../../../../utils/execCommand/$execCommand';
import { $resolveLatestNpmPackageVersion } from './$resolveLatestNpmPackageVersion';

jest.mock('../../../../utils/execCommand/$execCommand', () => ({
    $execCommand: jest.fn(),
}));

/**
 * Typed Jest mock for the npm command runner.
 *
 * @private internal utility of `$resolveLatestNpmPackageVersion.test`
 */
function getExecCommandMock(): jest.MockedFunction<typeof $execCommand> {
    return $execCommand as jest.MockedFunction<typeof $execCommand>;
}

describe('$resolveLatestNpmPackageVersion', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('reads the last version when npm writes a warning before its JSON result', async () => {
        getExecCommandMock().mockResolvedValue(spaceTrim(`
            npm warn cli npm v10.9.1 does not support Node.js v18.4.0.
            "0.114.0"
        `));

        await expect($resolveLatestNpmPackageVersion('ptbk')).resolves.toBe('0.114.0');

        expect($execCommand).toHaveBeenCalledWith(
            expect.objectContaining({
                command: expect.stringContaining('npm view ptbk version --json'),
            }),
        );
    });

    it('keeps the JSON result when npm writes a warning afterwards', async () => {
        getExecCommandMock().mockResolvedValue(spaceTrim(`
            "0.114.0"
            npm warn cli npm v10.9.1 does not support Node.js v18.4.0.
        `));

        await expect($resolveLatestNpmPackageVersion('ptbk')).resolves.toBe('0.114.0');
    });

    it('returns null when the registry lookup fails', async () => {
        getExecCommandMock().mockRejectedValue(new Error('offline'));

        await expect($resolveLatestNpmPackageVersion('ptbk')).resolves.toBeNull();
    });
});
