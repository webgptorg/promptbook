import { splitArrayIntoChunks } from './splitArrayIntoChunks';

describe('how splitting of array works', () => {
    it('will split array into chunks', () => {
        expect(splitArrayIntoChunks([1, 2, 3, 4], 2)).toEqual([
            [1, 2],
            [3, 4],
        ]);
        expect(splitArrayIntoChunks(['cats', 'dogs', 'horses', 'frogs', 'apples', 'bananas', 'rest'], 2)).toEqual([
            ['cats', 'dogs'],
            ['horses', 'frogs'],
            ['apples', 'bananas'],
            ['rest'],
        ]);
    });
});


/**
 * Note: [⚫] Code in this file should never be published in any package
 */