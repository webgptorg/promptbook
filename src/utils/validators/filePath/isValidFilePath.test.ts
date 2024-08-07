import { describe, expect, it } from '@jest/globals';
import { isValidFilePath } from './isValidFilePath';

describe('how isValidFilePath works', () => {
    it('is valid relative file path', () => {
        expect(isValidFilePath(`./hello.txt`)).toBe(true);
        expect(isValidFilePath(`../hello.txt`)).toBe(true);
        expect(isValidFilePath(`../../hello.txt`)).toBe(true);
        expect(isValidFilePath(`../../../hello.txt`)).toBe(true);
        expect(isValidFilePath(`../../../../hello.txt`)).toBe(true);
        expect(isValidFilePath(`../../../../../a/b/hello.txt`)).toBe(true);
        // TODO: [🧠] What about just 'hello.txt'
    });

    it('is valid Unix absolute file path', () => {
        expect(isValidFilePath(`/hello.txt`)).toBe(true);
        expect(isValidFilePath(`/a/b/hello.txt`)).toBe(true);
        expect(isValidFilePath(`/a/b/c/hello.txt`)).toBe(true);
        expect(isValidFilePath(`/a/b/c/d/hello.txt`)).toBe(true);
        expect(isValidFilePath(`/a/b/c/d/e/hello.txt`)).toBe(true);
        expect(isValidFilePath(`/a/b/c/d/e/f/hello.txt`)).toBe(true);
    });

    it('is valid Windows absolute file path', () => {
        expect(isValidFilePath(`C:/hello.txt`)).toBe(true);
        expect(isValidFilePath(`D:/hello.txt`)).toBe(true);
        expect(isValidFilePath(`E:/hello.txt`)).toBe(true);
        expect(isValidFilePath(`F:/hello.txt`)).toBe(true);
        expect(isValidFilePath(`G:/hello.txt`)).toBe(true);
        expect(isValidFilePath(`H:/hello.txt`)).toBe(true);
    });

    it('is NOT valid file path', () => {
        expect(isValidFilePath(``)).toBe(false);
        expect(isValidFilePath(`Invalid URL`)).toBe(false);
        expect(isValidFilePath(`aegfawsgsdasdg`)).toBe(false);
        expect(isValidFilePath(`wtf://collboard.com/`)).toBe(false);
        expect(isValidFilePath(`blob:nothing`)).toBe(false);
        expect(isValidFilePath(`blob:httpx://localhost:9977/fooo/add`)).toBe(false);
    });
});
