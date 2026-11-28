import { describe, expect, it } from '@jest/globals';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import { isDirectoryExisting } from './isDirectoryExisting';

describe('how isDirectoryExisting works', () => {
    it('works with existing directories', () =>
        expect(isDirectoryExisting('src/utils/files/existing-directory', $provideFilesystemForNode())).resolves.toBe(
            true,
        ));

    it('works with non-existing directories', () =>
        expect(isDirectoryExisting('src/utils/files/non-existing-director', $provideFilesystemForNode())).resolves.toBe(
            false,
        ));

    it('is not confused by file (which is not a directory)', () =>
        expect(
            isDirectoryExisting('src/utils/files/existing-directory/existing-file.txt', $provideFilesystemForNode()),
        ).resolves.toBe(false));
});
