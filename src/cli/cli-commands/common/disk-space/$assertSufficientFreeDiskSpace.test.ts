import { LimitReachedError } from '../../../../errors/LimitReachedError';
import { $assertSufficientFreeDiskSpace } from './$assertSufficientFreeDiskSpace';
import { $readFreeDiskSpaceStatus } from './$readFreeDiskSpaceStatus';
import type { FreeDiskSpaceLevel, FreeDiskSpaceStatus } from './FreeDiskSpaceStatus';

jest.mock('./$readFreeDiskSpaceStatus', () => ({
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
        availableBytes: 812 * 1024 * 1024,
        totalBytes: 476 * 1024 * 1024 * 1024,
        level,
    };
}

describe('$assertSufficientFreeDiskSpace', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('lets a run start on a disk with enough free space', async () => {
        getReadFreeDiskSpaceStatusMock().mockResolvedValue(createFreeDiskSpaceStatus('sufficient'));

        await expect($assertSufficientFreeDiskSpace('/project')).resolves.toBeUndefined();
    });

    it('refuses to start a run on a disk which is running low', async () => {
        getReadFreeDiskSpaceStatusMock().mockResolvedValue(createFreeDiskSpaceStatus('low'));

        await expect($assertSufficientFreeDiskSpace('/project')).rejects.toBeInstanceOf(LimitReachedError);
    });

    it('refuses to start a run on a disk which is critically full', async () => {
        getReadFreeDiskSpaceStatusMock().mockResolvedValue(createFreeDiskSpaceStatus('critical'));

        await expect($assertSufficientFreeDiskSpace('/project')).rejects.toBeInstanceOf(LimitReachedError);
    });

    it('says how much space is left and how much is needed', async () => {
        getReadFreeDiskSpaceStatusMock().mockResolvedValue(createFreeDiskSpaceStatus('low'));

        await expect($assertSufficientFreeDiskSpace('/project')).rejects.toThrow(
            /812 MB.*476 GB.*`\/project`[\s\S]*at least 2 GB/,
        );
    });

    it('lets a run start when the free disk space can not be measured at all', async () => {
        getReadFreeDiskSpaceStatusMock().mockResolvedValue(null);

        await expect($assertSufficientFreeDiskSpace('/project')).resolves.toBeUndefined();
    });
});
