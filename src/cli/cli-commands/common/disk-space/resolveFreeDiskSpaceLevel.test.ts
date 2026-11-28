import { CRITICALLY_LOW_FREE_DISK_SPACE_BYTES, LOW_FREE_DISK_SPACE_BYTES } from './freeDiskSpaceConstants';
import { resolveFreeDiskSpaceLevel } from './resolveFreeDiskSpaceLevel';

describe('resolveFreeDiskSpaceLevel', () => {
    it('reports a disk with plenty of space as sufficient', () => {
        expect(resolveFreeDiskSpaceLevel(500 * 1024 * 1024 * 1024)).toBe('sufficient');
    });

    it('reports exactly the limit which is needed to start as sufficient', () => {
        expect(resolveFreeDiskSpaceLevel(LOW_FREE_DISK_SPACE_BYTES)).toBe('sufficient');
    });

    it('reports a disk which can not host a new run as low', () => {
        expect(resolveFreeDiskSpaceLevel(LOW_FREE_DISK_SPACE_BYTES - 1)).toBe('low');
    });

    it('reports exactly the limit which is needed to keep running as low', () => {
        expect(resolveFreeDiskSpaceLevel(CRITICALLY_LOW_FREE_DISK_SPACE_BYTES)).toBe('low');
    });

    it('reports a disk which can not host a running round as critical', () => {
        expect(resolveFreeDiskSpaceLevel(CRITICALLY_LOW_FREE_DISK_SPACE_BYTES - 1)).toBe('critical');
    });

    it('reports a completely full disk as critical', () => {
        expect(resolveFreeDiskSpaceLevel(0)).toBe('critical');
    });
});
