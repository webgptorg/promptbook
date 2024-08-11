import { describe, expect, it } from '@jest/globals';
import { listAllFiles } from './listAllFiles';

describe('how listAllFiles works', () => {
    it('lists all files', () =>
        expect(listAllFiles('src/utils/files/existing-directory', false)).resolves.toContain(
            'src/utils/files/existing-directory/existing-file.txt',
        ));

    it('lists nested files in recursive listing', () =>
        expect(listAllFiles('src/utils/files/existing-directory', true)).resolves.toContain(
            'src/utils/files/existing-directory/existing-subdirectory/existing-subfile.txt',
        ));

    it('not contain nested file in non-recursive listing', () =>
        expect(listAllFiles('src/utils/files/existing-directory', false)).resolves.not.toContain(
            'src/utils/files/existing-directory/existing-subdirectory/existing-subfile.txt',
        ));
});