import { describe, expect, it } from '@jest/globals';
import { filenameToPrompt } from './filenameToPrompt';

describe('how filenameToPrompt works', () => {
    it('will convert filename with dashes', () => {
        expect(filenameToPrompt('cat-sitting-on-keyboard.png')).toEqual('Cat sitting on keyboard');
        expect(filenameToPrompt('hello-world.jpg')).toEqual('Hello world');
    });

    it('will convert filename with underscores', () => {
        expect(filenameToPrompt('cat_sitting_on_keyboard.png')).toEqual('Cat sitting on keyboard');
        expect(filenameToPrompt('hello_world.jpg')).toEqual('Hello world');
    });

    it('will convert filename with mixed separators', () => {
        expect(filenameToPrompt('cat-sitting_on-keyboard.png')).toEqual('Cat sitting on keyboard');
    });

    it('will handle single word filename', () => {
        expect(filenameToPrompt('cat.png')).toEqual('Cat');
        expect(filenameToPrompt('HELLO.jpg')).toEqual('HELLO');
    });

    it('will handle filename without extension', () => {
        expect(filenameToPrompt('cat-sitting-on-keyboard')).toEqual('Cat sitting on keyboard');
    });

    it('will handle filename with multiple dots', () => {
        expect(filenameToPrompt('cat.sitting.on.keyboard.png')).toEqual('Cat.sitting.on.keyboard');
    });

    it('will handle capitalized words after first word', () => {
        expect(filenameToPrompt('Cat-Sitting-On-Keyboard.png')).toEqual('Cat sitting on keyboard');
        expect(filenameToPrompt('HELLO-WORLD.png')).toEqual('HELLO world');
    });
});
