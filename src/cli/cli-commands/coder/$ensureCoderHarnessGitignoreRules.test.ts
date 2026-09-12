import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { $askForConfirmation } from '../common/$askForConfirmation';
import { $ensureCoderHarnessGitignoreRules } from './$ensureCoderHarnessGitignoreRules';

jest.mock('../common/$askForConfirmation', () => ({
    $askForConfirmation: jest.fn(),
}));

/**
 * Typed Jest mock for the shared terminal confirmation prompt.
 */
function getAskForConfirmationMock(): jest.MockedFunction<typeof $askForConfirmation> {
    return $askForConfirmation as jest.MockedFunction<typeof $askForConfirmation>;
}

describe('$ensureCoderHarnessGitignoreRules', () => {
    let temporaryDirectoryPath: string;
    let consoleInfoSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(async () => {
        temporaryDirectoryPath = await mkdtemp(join(tmpdir(), 'promptbook-coder-harness-gitignore-'));
        getAskForConfirmationMock().mockResolvedValue(true);
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(async () => {
        consoleInfoSpy.mockRestore();
        jest.clearAllMocks();
        await rm(temporaryDirectoryPath, { recursive: true, force: true });
    });

    it('asks before adding missing rules and adds only the selected harness rules', async () => {
        await $ensureCoderHarnessGitignoreRules(temporaryDirectoryPath, 'qwen-code', {
            isAskingQuestionsEnabled: true,
        });

        expect($askForConfirmation).toHaveBeenCalledWith(
            'Add the missing Qwen Code ignore entry `.qwen` to `.gitignore` now?',
            { isAskingQuestionsEnabled: true },
        );
        await expect(readFile(join(temporaryDirectoryPath, '.gitignore'), 'utf-8')).resolves.toBe(
            '# Promptbook Coder\n.qwen\n',
        );
    });

    it('leaves the project unchanged when the user declines the addition', async () => {
        getAskForConfirmationMock().mockResolvedValue(false);

        await $ensureCoderHarnessGitignoreRules(temporaryDirectoryPath, 'qwen-code', {
            isAskingQuestionsEnabled: true,
        });

        await expect(readFile(join(temporaryDirectoryPath, '.gitignore'), 'utf-8')).rejects.toThrow();
    });

    it('does not ask again when the selected harness rule already exists', async () => {
        await writeFile(join(temporaryDirectoryPath, '.gitignore'), '/.qwen\n', 'utf-8');

        await $ensureCoderHarnessGitignoreRules(temporaryDirectoryPath, 'qwen-code', {
            isAskingQuestionsEnabled: true,
        });

        expect($askForConfirmation).not.toHaveBeenCalled();
    });

    it('leaves the project unchanged when the questions are disabled', async () => {
        // Note: The real `$askForConfirmation` declines every question which it is not allowed to ask
        getAskForConfirmationMock().mockResolvedValue(false);

        await $ensureCoderHarnessGitignoreRules(temporaryDirectoryPath, 'qwen-code', {
            isAskingQuestionsEnabled: false,
        });

        expect($askForConfirmation).toHaveBeenCalledWith(expect.any(String), { isAskingQuestionsEnabled: false });
        await expect(readFile(join(temporaryDirectoryPath, '.gitignore'), 'utf-8')).rejects.toThrow();
    });
});
