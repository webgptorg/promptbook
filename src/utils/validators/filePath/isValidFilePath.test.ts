import { describe, expect, it } from '@jest/globals';
import { isValidFilePath } from './isValidFilePath';

describe('how isValidFilePath works', () => {
    it('is valid relative file path', () => {
        expect(isValidFilePath(`./hello.book`)).toBe(true);
        expect(isValidFilePath(`../hello.book`)).toBe(true);
        expect(isValidFilePath(`../../hello.book`)).toBe(true);
        expect(isValidFilePath(`../../../hello.book`)).toBe(true);
        expect(isValidFilePath(`../../../../hello.book`)).toBe(true);
        expect(isValidFilePath(`../../../../../a/b/hello.book`)).toBe(true);
        expect(isValidFilePath(`hello.book`)).toBe(true);
        expect(isValidFilePath(`foo/hello.book`)).toBe(true);
        expect(isValidFilePath(`foo/hello`)).toBe(true);
        // TODO: [🧠] What about just 'hello.book'
    });

    it('is valid Unix absolute file path', () => {
        expect(isValidFilePath(`/hello.book`)).toBe(true);
        expect(isValidFilePath(`/a/b/hello.book`)).toBe(true);
        expect(isValidFilePath(`/a/b/c/hello.book`)).toBe(true);
        expect(isValidFilePath(`/a/b/c/d/hello.book`)).toBe(true);
        expect(isValidFilePath(`/a/b/c/d/e/hello.book`)).toBe(true);
        expect(isValidFilePath(`/a/b/c/d/e/f/hello.book`)).toBe(true);
    });

    it('is valid Windows absolute file path', () => {
        expect(isValidFilePath(`C:/hello.book`)).toBe(true);
        expect(isValidFilePath(`D:/hello.book`)).toBe(true);
        expect(isValidFilePath(`E:/hello.book`)).toBe(true);
        expect(isValidFilePath(`F:/hello.book`)).toBe(true);
        expect(isValidFilePath(`G:/hello.book`)).toBe(true);
        expect(isValidFilePath(`H:/hello.book`)).toBe(true);
    });

    it('is NOT valid file path', () => {
        expect(isValidFilePath(``)).toBe(false);
        expect(isValidFilePath(`Invalid URL`)).toBe(false);
        expect(isValidFilePath(`aegfawsgsdasdg`)).toBe(false);
        expect(isValidFilePath(`wtf://collboard.com/`)).toBe(false);
        expect(isValidFilePath(`blob:nothing`)).toBe(false);
        expect(isValidFilePath(`blob:httpx://localhost:9977/fooo/add`)).toBe(false);
        expect(isValidFilePath(`https://promptbook.studio/foo/bar.book`)).toBe(false);
    });
});
