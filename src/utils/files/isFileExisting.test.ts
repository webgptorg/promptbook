import { describe, expect, it } from '@jest/globals';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { isFileExisting } from './isFileExisting';

describe('how isFileExisting works', () => {
    it('works with existing files', () =>
        expect(
            isFileExisting('src/utils/files/existing-directory/existing-file.txt', $provideFilesystemForNode()),
        ).resolves.toBe(true));

    it('works with non-existing files', () =>
        expect(
            isFileExisting('src/utils/files/non-existing-directory/non-existing-file.txt', $provideFilesystemForNode()),
        ).resolves.toBe(false));

    it('is not confused by directory (which is not a file)', () =>
        expect(isFileExisting('src/utils/files/existing-directory', $provideFilesystemForNode())).resolves.toBe(false));
});
