import { $readFreeDiskSpaceStatus } from '../../../src/cli/cli-commands/common/disk-space/$readFreeDiskSpaceStatus';
import type {
    FreeDiskSpaceLevel,
    FreeDiskSpaceStatus,
} from '../../../src/cli/cli-commands/common/disk-space/FreeDiskSpaceStatus';
import { createFreeDiskSpaceGuard } from './createFreeDiskSpaceGuard';
import { getPauseState, getPauseTargetLabel, resetCoderRunControls } from './waitForPause';

jest.mock('../../../src/cli/cli-commands/common/disk-space/$readFreeDiskSpaceStatus', () => ({
    $readFreeDiskSpaceStatus: jest.fn(),
}));

/**
 * Typed Jest mock of the free disk space measurement.
 */
function getReadFreeDiskSpaceStatusMock(): jest.MockedFunction<typeof $readFreeDiskSpaceStatus> {
    return $readFreeDiskSpaceStatus as jest.MockedFunction<typeof $readFreeDiskSpaceStatus>;
}

/**
 * Creates one measured free disk space status of the given severity.
 */
function createFreeDiskSpaceStatus(level: FreeDiskSpaceLevel): FreeDiskSpaceStatus {
    return {
        inspectedPath: '/project',
        availableBytes: 512 * 1024 * 1024,
        totalBytes: 476 * 1024 * 1024 * 1024,
        level,
    };
}

describe('createFreeDiskSpaceGuard', () => {
    let consoleWarnSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        resetCoderRunControls();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
        resetCoderRunControls();
        jest.clearAllMocks();
    });

    it('keeps the run going while there is enough free disk space', async () => {
        getReadFreeDiskSpaceStatusMock().mockResolvedValue(createFreeDiskSpaceStatus('sufficient'));

        await createFreeDiskSpaceGuard({ inspectedPath: '/project', isAskingQuestionsEnabled: true })();

        expect(getPauseState()).toBe('RUNNING');
        expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('keeps the run going while the free disk space is only low', async () => {
        getReadFreeDiskSpaceStatusMock().mockResolvedValue(createFreeDiskSpaceStatus('low'));

        await createFreeDiskSpaceGuard({ inspectedPath: '/project', isAskingQuestionsEnabled: true })();

        expect(getPauseState()).toBe('RUNNING');
    });

    it('pauses the run when the free disk space becomes critical', async () => {
        getReadFreeDiskSpaceStatusMock().mockResolvedValue(createFreeDiskSpaceStatus('critical'));

        await createFreeDiskSpaceGuard({ inspectedPath: '/project', isAskingQuestionsEnabled: true })();

        expect(getPauseState()).toBe('PAUSING');
        expect(getPauseTargetLabel()).toContain('512 MB');
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('only warns and never pauses when the questions are disabled', async () => {
        getReadFreeDiskSpaceStatusMock().mockResolvedValue(createFreeDiskSpaceStatus('critical'));

        await createFreeDiskSpaceGuard({ inspectedPath: '/project', isAskingQuestionsEnabled: false })();

        expect(getPauseState()).toBe('RUNNING');
        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('keeps the run going when the free disk space can not be measured at all', async () => {
        getReadFreeDiskSpaceStatusMock().mockResolvedValue(null);

        await createFreeDiskSpaceGuard({ inspectedPath: '/project', isAskingQuestionsEnabled: true })();

        expect(getPauseState()).toBe('RUNNING');
        expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('measures the filesystem only once per recheck interval', async () => {
        getReadFreeDiskSpaceStatusMock().mockResolvedValue(createFreeDiskSpaceStatus('sufficient'));
        const guardFreeDiskSpace = createFreeDiskSpaceGuard({
            inspectedPath: '/project',
            isAskingQuestionsEnabled: true,
        });

        await guardFreeDiskSpace();
        await guardFreeDiskSpace();
        await guardFreeDiskSpace();

        expect(getReadFreeDiskSpaceStatusMock()).toHaveBeenCalledTimes(1);
    });
});
