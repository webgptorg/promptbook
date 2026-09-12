import { formatFreeDiskSpaceBytes } from './formatFreeDiskSpaceBytes';

describe('formatFreeDiskSpaceBytes', () => {
    it('writes bytes without a decimal place', () => {
        expect(formatFreeDiskSpaceBytes(512)).toBe('512 B');
    });

    it('writes a small value with one decimal place', () => {
        expect(formatFreeDiskSpaceBytes(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
    });

    it('writes a round value without an empty decimal place', () => {
        expect(formatFreeDiskSpaceBytes(2 * 1024 * 1024 * 1024)).toBe('2 GB');
    });

    it('writes a big value without a decimal place', () => {
        expect(formatFreeDiskSpaceBytes(476 * 1024 * 1024 * 1024)).toBe('476 GB');
    });

    it('picks the unit which keeps the value readable', () => {
        expect(formatFreeDiskSpaceBytes(812 * 1024 * 1024)).toBe('812 MB');
    });

    it('writes a full disk as zero', () => {
        expect(formatFreeDiskSpaceBytes(0)).toBe('0 B');
    });

    it('writes a value which could not be measured as zero', () => {
        expect(formatFreeDiskSpaceBytes(Number.NaN)).toBe('0 B');
    });
});
