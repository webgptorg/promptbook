import type { CoderCommitScope } from '../git/coderCommitScope';
import { captureCoderCommitScope, resolveCoderCommitScopePaths } from '../git/coderCommitScope';
import { CoderGitOperationError } from '../git/CoderGitOperationError';
import { commitChanges } from '../git/commitChanges';
import { ensureWorkingTreeClean } from '../git/ensureWorkingTreeClean';
import { parsePromptFile } from '../prompts/parsePromptFile';
import { writePromptErrorLog } from '../prompts/writePromptErrorLog';
import { CoderCheckFailedError } from './CoderCheckFailedError';
import { createCheckBeforeRepairPrompt } from './createCheckBeforeRepairPrompt';
import { assertProjectCheckIsConfigured, CoderCheckSetupError } from './projectCheck';
import { runCheckBefore } from './runCheckBefore';
import { runCoderCheckRepair, type CoderCheckRepairOptions } from './runCoderCheckRepair';

jest.mock('../git/coderCommitScope', () => ({
    captureCoderCommitScope: jest.fn(),
    resolveCoderCommitScopePaths: jest.fn(),
}));
jest.mock('../git/commitChanges', () => ({ commitChanges: jest.fn() }));
jest.mock('../git/ensureWorkingTreeClean', () => ({ ensureWorkingTreeClean: jest.fn() }));
jest.mock('../prompts/writePromptErrorLog', () => ({ writePromptErrorLog: jest.fn() }));
jest.mock('./createCheckBeforeRepairPrompt', () => ({ createCheckBeforeRepairPrompt: jest.fn() }));
jest.mock('./projectCheck', () => ({
    ...jest.requireActual('./projectCheck'),
    assertProjectCheckIsConfigured: jest.fn(),
}));
jest.mock('./runCheckBefore', () => ({ runCheckBefore: jest.fn() }));
jest.mock('../prompts/findNextTodoPrompt', () => ({
    findNextTodoPrompt: () => {
        throw new Error('The check-repair service must never select ordinary queued work');
    },
}));

/** Explicit project and repair selection, independent of process cwd or a queue snapshot. */
const PROJECT_PATH = '/fixture/project';
/** Snapshot includes the repair authoring write set when passed directly to single-round execution. */
const COMMIT_SCOPE: CoderCommitScope = {
    projectPath: PROJECT_PATH,
    repositoryRoot: '/fixture',
    snapshotBeforeOperation: { changedFileHashes: new Map() },
};
/** Exact builder result which must reach execution regardless of unrelated backlog priorities. */
const REPAIR_FILE = parsePromptFile(`${PROJECT_PATH}/prompts/repair.md`, '[ ]\n\nRepair selected checks only.\n');
/** Runnable section of the authored repair. */
const REPAIR_SELECTION = { file: REPAIR_FILE, section: REPAIR_FILE.sections[0]! };

describe('shared check-repair service', () => {
    let options: CoderCheckRepairOptions;
    let executeRepair: jest.Mock;
    let prepareRepair: jest.Mock;

    beforeEach(() => {
        jest.resetAllMocks();
        executeRepair = jest.fn(async () => undefined);
        prepareRepair = jest.fn(async () => executeRepair);
        options = {
            projectPath: PROJECT_PATH,
            checkCommand: 'node selected-check.cjs',
            mode: 'yes-and-fix',
            intent: 'fix',
            isCommitEnabled: true,
            isAutoPushEnabled: false,
            isWorkingTreeCleanRequired: true,
            prepareRepair,
        };
        jest.mocked(captureCoderCommitScope).mockResolvedValue(COMMIT_SCOPE);
        jest.mocked(resolveCoderCommitScopePaths).mockResolvedValue([]);
        jest.mocked(createCheckBeforeRepairPrompt).mockResolvedValue(REPAIR_SELECTION);
        jest.mocked(runCheckBefore).mockResolvedValue({ isPassed: true, checkOutput: 'healthy' });
    });

    it('leaves run check-before no entirely disabled', async () => {
        expect(await runCoderCheckRepair({ ...options, mode: 'no', intent: 'run' })).toEqual({
            kind: 'skipped',
            isCheckPassed: false,
        });
        expect(assertProjectCheckIsConfigured).not.toHaveBeenCalled();
        expect(runCheckBefore).not.toHaveBeenCalled();
        expect(prepareRepair).not.toHaveBeenCalled();
    });

    it.each(['run', 'fix'] as const)(
        'checks a healthy %s job without repair setup or empty commits',
        async (intent) => {
            expect(await runCoderCheckRepair({ ...options, intent })).toEqual({
                kind: 'passed-without-repair',
                isCheckPassed: true,
            });
            expect(runCheckBefore).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectPath: PROJECT_PATH,
                    checkCommand: options.checkCommand,
                }),
            );
            expect(createCheckBeforeRepairPrompt).not.toHaveBeenCalled();
            expect(prepareRepair).not.toHaveBeenCalled();
            expect(commitChanges).not.toHaveBeenCalled();
        },
    );

    it('commits only changes attributed to the initial check before returning a healthy result', async () => {
        jest.mocked(resolveCoderCommitScopePaths).mockResolvedValue(['project/formatted.ts']);
        const result = await runCoderCheckRepair(options);

        expect(result.kind).toBe('passed-without-repair');
        expect(commitChanges).toHaveBeenCalledWith(expect.any(String), {
            projectPath: '/fixture',
            relevantPaths: ['project/formatted.ts'],
            autoPush: false,
        });
        expect(prepareRepair).not.toHaveBeenCalled();
    });

    it('stops run check-and-fail before authoring or executing any repair', async () => {
        jest.mocked(runCheckBefore).mockResolvedValue({ isPassed: false, checkOutput: 'lint defect' });
        expect(await runCoderCheckRepair({ ...options, mode: 'yes-and-fail', intent: 'run' })).toMatchObject({
            kind: 'checks-failed',
            isCheckPassed: false,
            error: expect.any(CoderCheckFailedError),
        });
        expect(createCheckBeforeRepairPrompt).not.toHaveBeenCalled();
        expect(prepareRepair).not.toHaveBeenCalled();
    });

    it.each(['run', 'fix'] as const)(
        'passes the exact builder selection and pre-authoring scope for %s',
        async (intent) => {
            jest.mocked(runCheckBefore).mockResolvedValue({
                isPassed: false,
                checkOutput: 'Build defect TOKEN=private',
            });
            const result = await runCoderCheckRepair({ ...options, intent });

            expect(result).toMatchObject({
                kind: 'repaired-and-verified',
                isCheckPassed: true,
                repairPrompt: REPAIR_SELECTION,
            });
            expect(createCheckBeforeRepairPrompt).toHaveBeenCalledTimes(1);
            expect(createCheckBeforeRepairPrompt).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectPath: PROJECT_PATH,
                    checkCommand: options.checkCommand,
                    checkOutput: 'Build defect TOKEN=[REDACTED]',
                    ...(intent === 'fix' ? { intent } : {}),
                }),
            );
            expect(executeRepair).toHaveBeenCalledWith(REPAIR_SELECTION, COMMIT_SCOPE);
            expect(jest.mocked(captureCoderCommitScope).mock.invocationCallOrder[1]).toBeLessThan(
                jest.mocked(createCheckBeforeRepairPrompt).mock.invocationCallOrder[0]!,
            );
        },
    );

    it.each(['', '   '])('rejects an empty selected command %j before execution', async (checkCommand) => {
        expect(await runCoderCheckRepair({ ...options, checkCommand })).toMatchObject({ kind: 'setup-error' });
        expect(runCheckBefore).not.toHaveBeenCalled();
        expect(prepareRepair).not.toHaveBeenCalled();
    });

    it('stops on invalid check setup before any mutating command', async () => {
        jest.mocked(assertProjectCheckIsConfigured).mockRejectedValue(new CoderCheckSetupError('missing script'));
        expect(await runCoderCheckRepair(options)).toMatchObject({ kind: 'setup-error', isCheckPassed: false });
        expect(runCheckBefore).not.toHaveBeenCalled();
        expect(captureCoderCommitScope).not.toHaveBeenCalled();
        expect(prepareRepair).not.toHaveBeenCalled();
    });

    it('applies the dirty-tree policy before checks and leaves the project alone on rejection', async () => {
        jest.mocked(ensureWorkingTreeClean).mockRejectedValue(new Error('Commit or preserve existing work explicitly'));
        expect(await runCoderCheckRepair(options)).toMatchObject({ kind: 'setup-error', isCheckPassed: false });
        expect(runCheckBefore).not.toHaveBeenCalled();
        expect(createCheckBeforeRepairPrompt).not.toHaveBeenCalled();
    });

    it('keeps a verified initial check distinct from its requested commit failure', async () => {
        jest.mocked(resolveCoderCommitScopePaths).mockResolvedValue(['project/formatted.ts']);
        jest.mocked(commitChanges).mockRejectedValue(new CoderGitOperationError('commit', 'Fixture commit failure'));
        expect(await runCoderCheckRepair(options)).toMatchObject({ kind: 'persistence-error', isCheckPassed: true });
        expect(prepareRepair).not.toHaveBeenCalled();
        expect(createCheckBeforeRepairPrompt).not.toHaveBeenCalled();
    });

    it('does not report validation success when repair preparation fails', async () => {
        jest.mocked(runCheckBefore).mockResolvedValue({ isPassed: false, checkOutput: 'type defect' });
        prepareRepair.mockRejectedValue(new CoderGitOperationError('record', 'Cannot prepare repair'));
        const result = await runCoderCheckRepair(options);
        expect(result).toMatchObject({
            kind: 'persistence-error',
            isCheckPassed: false,
            repairPrompt: REPAIR_SELECTION,
        });
        expect(executeRepair).not.toHaveBeenCalled();
        expect(writePromptErrorLog).toHaveBeenCalledWith(expect.objectContaining({ file: REPAIR_FILE }));
    });

    it('returns exhausted check feedback failures without authoring or executing another task', async () => {
        jest.mocked(runCheckBefore).mockResolvedValue({ isPassed: false, checkOutput: 'test defect' });
        executeRepair.mockRejectedValue(new CoderCheckFailedError('Selected check still fails after three attempts'));
        expect(await runCoderCheckRepair(options)).toMatchObject({ kind: 'checks-failed', isCheckPassed: false });
        expect(createCheckBeforeRepairPrompt).toHaveBeenCalledTimes(1);
        expect(executeRepair).toHaveBeenCalledTimes(1);
    });

    it('preserves the exact repair when cancellation occurs during lazy preparation', async () => {
        const controller = new AbortController();
        jest.mocked(runCheckBefore).mockResolvedValue({ isPassed: false, checkOutput: 'build defect' });
        prepareRepair.mockImplementation(async () => {
            controller.abort(new Error('Fixture interruption'));
            return executeRepair;
        });
        expect(await runCoderCheckRepair({ ...options, signal: controller.signal })).toMatchObject({
            kind: 'interrupted',
            isCheckPassed: false,
            repairPrompt: REPAIR_SELECTION,
        });
        expect(executeRepair).not.toHaveBeenCalled();
        expect(createCheckBeforeRepairPrompt).toHaveBeenCalledTimes(1);
        expect(writePromptErrorLog).toHaveBeenCalled();
    });

    it('retains verified checks if cancellation arrives as the repair returns', async () => {
        const controller = new AbortController();
        jest.mocked(runCheckBefore).mockResolvedValue({ isPassed: false, checkOutput: 'build defect' });
        executeRepair.mockImplementation(async () => {
            controller.abort(new Error('Fixture interruption after verification'));
        });
        expect(await runCoderCheckRepair({ ...options, signal: controller.signal })).toMatchObject({
            kind: 'interrupted',
            isCheckPassed: true,
            repairPrompt: REPAIR_SELECTION,
        });
        expect(createCheckBeforeRepairPrompt).toHaveBeenCalledTimes(1);
        expect(executeRepair).toHaveBeenCalledTimes(1);
    });
});
