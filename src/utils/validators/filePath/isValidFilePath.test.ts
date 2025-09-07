import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
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
        expect(isValidFilePath(`X:/hello.book`)).toBe(true);
        expect(isValidFilePath(`H:/folder with spaces/hello.book`)).toBe(true);
        expect(isValidFilePath(`C:/Users/me/Documents/p13/NT 299_2018 - PŘ pro archiv STAV.docx`)).toBe(true);
    });

    it('is NOT valid file path', () => {
        expect(isValidFilePath(``)).toBe(false);
        expect(isValidFilePath(`Invalid URL`)).toBe(false);
        expect(isValidFilePath(`more\nlines\nof\ncode`)).toBe(false);
        expect(isValidFilePath(`Just a simple sentence`)).toBe(false);
        expect(isValidFilePath(`aegfawsgsdasdg`)).toBe(false);
        expect(isValidFilePath(`wtf://collboard.com/`)).toBe(false);
        expect(isValidFilePath(`blob:nothing`)).toBe(false);
        expect(isValidFilePath(`blob:httpx://localhost:9977/fooo/add`)).toBe(false);
        expect(isValidFilePath(`https://promptbook.studio/foo/bar.book`)).toBe(false);
    });

    it('singleline knowledge source not confused with file path', () => {
        // Note: [🈷]
        expect(
            isValidFilePath(
                `Uranium Glass Garden Gnomes are the newest product in the eshop. They are made of glass with a fluorescent uranium oxide added to the glass mixture. The gnomes are equipped with a UV LED light that makes them glow in the dark. They are great for scaring away birds and snakes.`,
            ),
        ).toBe(false);
    });

    it('multiline knowledge source not confused with file path', () => {
        expect(
            isValidFilePath(
                spaceTrim(`
                    I'm Pavol, a developer who is passionate about using new tools and technologies.

                    I specialise in creating fully functional user applications using the latest artificial intelligence models.

                    I am a member of the Ainautes consulting group, which supports with the deployment of generative AI around the world.

                    I develop the WebGPT web page generation service.

                    Before the massive emergence of generative AI, I have created the first Czech virtual whiteboard, Collboard, and electronic textbooks, H-edu, which were used by tens of thousands of children.

                    I have also worked on many scientific projects for the Czech Ornithological Society.
                    I regularly give lectures at conferences, sit on juries, and act as a mentor in many Czech and international competitions.
                    I have a special heart for this, and I love open source – you can find many of my things on my GitHub.
              `),
            ),
        ).toBe(false);
    });
});
