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

    it('reads Promptbook numbered prerelease versions from npm JSON output', async () => {
        getExecCommandMock().mockResolvedValue('"0.114.0-9"');

        await expect($resolveLatestNpmPackageVersion('ptbk')).resolves.toBe('0.114.0-9');

        expect($execCommand).toHaveBeenCalledWith(
            expect.objectContaining({
                command: expect.stringContaining('npm view ptbk version --json'),
            }),
        );
    });

    it('keeps the JSON result when npm writes version-looking warnings around it', async () => {
        getExecCommandMock().mockResolvedValue(
            'npm warn cli npm v10.9.1 does not support Node.js v18.4.0.\n"0.114.0-9"\nnpm warn using npm 10.9.1',
        );

        await expect($resolveLatestNpmPackageVersion('ptbk')).resolves.toBe('0.114.0-9');
    });

    it('returns null when the registry lookup fails', async () => {
        getExecCommandMock().mockRejectedValue(new Error('offline'));

        await expect($resolveLatestNpmPackageVersion('ptbk')).resolves.toBeNull();
    });
});
