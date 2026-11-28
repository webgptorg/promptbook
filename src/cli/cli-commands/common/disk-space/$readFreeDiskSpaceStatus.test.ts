import { statfs } from 'fs/promises';
import { $readFreeDiskSpaceStatus } from './$readFreeDiskSpaceStatus';

jest.mock('fs/promises', () => ({
    statfs: jest.fn(),
}));

/**
 * Typed Jest mock of the filesystem statistics call.
 */
function getStatfsMock(): jest.MockedFunction<typeof statfs> {
    return statfs as jest.MockedFunction<typeof statfs>;
}

/**
 * Answers the filesystem statistics call with one filesystem of the given block counts.
 *
 * Only the block counts which the measurement itself reads are answered.
 */
function mockFileSystemStats(options: { blockCount: number; availableBlockCount: number }): void {
    const { blockCount, availableBlockCount } = options;

    getStatfsMock().mockResolvedValue({
        bsize: 4096,
        blocks: blockCount,
        bavail: availableBlockCount,
    } as unknown as Awaited<ReturnType<typeof statfs>>);
}

describe('$readFreeDiskSpaceStatus', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('turns the filesystem block counts into bytes', async () => {
        mockFileSystemStats({ blockCount: 1024 * 1024, availableBlockCount: 512 * 1024 });

        await expect($readFreeDiskSpaceStatus('/project')).resolves.toMatchObject({
            inspectedPath: '/project',
            totalBytes: 4 * 1024 * 1024 * 1024,
            availableBytes: 2 * 1024 * 1024 * 1024,
            level: 'sufficient',
        });
    });

    it('classifies a disk which can not host a new run as low', async () => {
        mockFileSystemStats({ blockCount: 1024 * 1024, availableBlockCount: 384 * 1024 });

        await expect($readFreeDiskSpaceStatus('/project')).resolves.toMatchObject({
            availableBytes: 1.5 * 1024 * 1024 * 1024,
            level: 'low',
        });
    });

    it('classifies a nearly full disk as critical', async () => {
        mockFileSystemStats({ blockCount: 1024 * 1024, availableBlockCount: 128 * 1024 });

        await expect($readFreeDiskSpaceStatus('/project')).resolves.toMatchObject({
            availableBytes: 512 * 1024 * 1024,
            level: 'critical',
        });
    });

    it('reports nothing when the filesystem can not be measured', async () => {
        getStatfsMock().mockRejectedValue(new Error('ENOENT: no such file or directory'));

        await expect($readFreeDiskSpaceStatus('/project')).resolves.toBeNull();
    });
});
