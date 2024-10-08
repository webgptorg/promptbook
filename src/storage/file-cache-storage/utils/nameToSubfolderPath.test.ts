import { describe, expect, it } from '@jest/globals';
import { nameToSubfolderPath } from './nameToSubfolderPath';

describe('how name to subfolder path works', () => {
    it('should convert name to subfolder path', () => {
        expect(nameToSubfolderPath('hello')).toEqual(['h', 'e']);
        expect(nameToSubfolderPath('hEllo')).toEqual(['h', 'e']);
        expect(nameToSubfolderPath('foobar')).toEqual(['f', 'o']);
        expect(nameToSubfolderPath('123456')).toEqual(['1', '2']);
    });
});
