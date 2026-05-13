import { EnvironmentMismatchError } from '../../../../src/errors/EnvironmentMismatchError';
import { $runGoScript } from '../../common/runGoScript/$runGoScript';
import { GitHubCopilotRunner } from './GitHubCopilotRunner';

jest.mock('../../common/runGoScript/$runGoScript', () => ({
    $runGoScript: jest.fn(),
}));

describe('GitHubCopilotRunner', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ($runGoScript as jest.MockedFunction<typeof $runGoScript>).mockResolvedValue(undefined);
    });

    it('rewrites Windows/MSYS argument-length failures into a clearer Copilot-specific error', async () => {
        ($runGoScript as jest.MockedFunction<typeof $runGoScript>).mockRejectedValue(
            new Error(
                [
                    '/c/Users/me/.nvm/versions/node/v22.11.0/bin/copilot: line 13: C:\\Users\\me\\.nvm\\versions\\node\\v22.11.0\\bin/node: Argument list too long',
                    '/c/Users/me/.nvm/versions/node/v22.11.0/bin/copilot: line 13: C:\\Users\\me\\.nvm\\versions\\node\\v22.11.0\\bin/node: No error',
                ].join('\n'),
            ),
        );

        const runner = new GitHubCopilotRunner({ model: 'gpt-5.4' });

        await expect(
            runner.runPrompt({
                prompt: 'Prompt body',
                projectPath: 'C:\\repo',
                scriptPath: 'C:\\repo\\temp\\runner.sh',
                preserveArtifactsOnSuccess: false,
            }),
        ).rejects.toThrow(EnvironmentMismatchError);

        await expect(
            runner.runPrompt({
                prompt: 'Prompt body',
                projectPath: 'C:\\repo',
                scriptPath: 'C:\\repo\\temp\\runner.sh',
                preserveArtifactsOnSuccess: false,
            }),
        ).rejects.toThrow(/smaller local-manual prompt shape/);
    });
});
