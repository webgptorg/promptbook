import { describe, expect, it } from '@jest/globals';
import { $isDirectoryExisting } from './isDirectoryExisting';

describe('how isDirectoryExisting works', () => {
    it('works with existing directories', () =>
        expect($isDirectoryExisting('src/utils/files/existing-directory')).resolves.toBe(true));

    it('works with non-existing directories', () =>
        expect($isDirectoryExisting('src/utils/files/non-existing-director')).resolves.toBe(false));

    it('is not confused by file (which is not a directory)', () =>
        expect($isDirectoryExisting('src/utils/files/existing-directory/existing-file.txt')).resolves.toBe(false));
});
