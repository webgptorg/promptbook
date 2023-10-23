import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { just } from '../../../../../../utils/just';
import { replaceParameters } from './replaceParameters';

describe('replaceParameters', () => {
    it('should work in supersimple case', () => {
        expect(replaceParameters('', {})).toBe('');
    });

    it('should keep template without parameters as it is', () => {
        expect(replaceParameters('Hello', {})).toBe('Hello');
        expect(replaceParameters('Hello world', {})).toBe('Hello world');
    });

    it('should replace parameter at the end', () => {
        expect(replaceParameters('Hello {name}', { name: 'world' })).toBe('Hello world');
    });

    it('should replace parameter in the middle', () => {
        expect(replaceParameters('Hello {name}, how are you?', { name: 'world' })).toBe('Hello world, how are you?');
    });

    it('should replace parameter at the beginning', () => {
        expect(replaceParameters('{name}, how are you?', { name: 'world' })).toBe('world, how are you?');
    });

    it('should replace multiple parameters', () => {
        expect(replaceParameters('{greeting} {name}, how are you?', { greeting: 'Hello', name: 'world' })).toBe(
            'Hello world, how are you?',
        );
    });

    it('should replace same parameter multiple times', () => {
        expect(
            replaceParameters('{greeting} {name}, how are you? {greeting} {name}', {
                greeting: 'Hello',
                name: 'world',
            }),
        ).toBe('Hello world, how are you? Hello world');
    });

    it('should replace multiline templates', () => {
        expect(
            replaceParameters(
                spaceTrim(`
                    Hello {name}, how are you?
                    I am {greeting}
                `),
                { greeting: 'fine', name: 'world' },
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Hello world, how are you?
                    I am fine
                `),
            ),
        );
    });

    it('should throw error when parameter is not defined', () => {
        expect(() => replaceParameters('{greeting} {name}, how are you?', { greeting: 'Hello' })).toThrowError(
            /Parameter \{name\} is not defined/i,
        );
    });

    it('should throw error when parameter is not closed', () => {
        expect(() => replaceParameters('Hello {name', { name: 'world' })).toThrowError(/Parameter is not closed/i);
    });

    it('should throw error when parameter is not opened', () => {
        expect(() =>
            replaceParameters('greeting} {name}, how are you?', { greeting: 'Hello', name: 'world' }),
        ).toThrowError(/Parameter is not opened/i);
    });

    it('should throw error when parameter is embeded in another parameter', () => {
        expect(() =>
            replaceParameters('{greeting {name}}, how are you?', { greeting: 'Hello', name: 'world' }),
        ).toThrowError(/Parameter is already opened/);
    });
});
