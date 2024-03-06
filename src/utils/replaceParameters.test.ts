import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { just } from './just';
import { replaceParameters } from './replaceParameters';

describe('replaceParameters', () => {
    it('should work in supersimple case', () => {
        expect(replaceParameters('', {})).toBe('');
    });

    it('should keep template without parameters as it is', () => {
        expect(replaceParameters('Hello', {})).toBe('Hello');
        expect(replaceParameters('Hello World', {})).toBe('Hello World');
    });

    it('should replace parameter at the end', () => {
        expect(replaceParameters('Hello {name}', { name: 'World' })).toBe('Hello World');
    });

    it('should replace parameter in the middle', () => {
        expect(replaceParameters('Hello {name}, how are you?', { name: 'World' })).toBe('Hello World, how are you?');
    });

    it('should replace parameter at the beginning', () => {
        expect(replaceParameters('{name}, how are you?', { name: 'World' })).toBe('World, how are you?');
    });

    it('should replace multiple parameters', () => {
        expect(replaceParameters('{greeting} {name}, how are you?', { greeting: 'Hello', name: 'World' })).toBe(
            'Hello World, how are you?',
        );
    });

    it('should not be confused by JSON', () => {
        expect(
            replaceParameters('{greeting} {name}, this is how JSON look like {"key": 1}.', {
                greeting: 'Hi',
                name: 'Pavol',
            }),
        ).toBe('Hi Pavol, this is how JSON look like {"key": 1}.');
        expect(
            replaceParameters('{greeting} {name}, this is how JSON look like {}.', {
                greeting: 'Hi',
                name: 'Pavol',
            }),
        ).toBe('Hi Pavol, this is how JSON look like {}.');
        expect(
            replaceParameters(
                '{greeting} {name}, this is how JSON look like {"greeting": "{greeting}", "name": "{name}"}.',
                {
                    greeting: 'Hi',
                    name: 'Pavol',
                },
            ),
        ).toBe('Hi Pavol, this is how JSON look like {"greeting": "Hi", "name": "Pavol"}.');
        expect(
            replaceParameters(
                '{greeting} {name}, this is how JSON look like {"params": {"greeting": "{greeting}", "name": "{name}"}}.',
                {
                    greeting: 'Hi',
                    name: 'Pavol',
                },
            ),
        ).toBe('Hi Pavol, this is how JSON look like {"params": {"greeting": "Hi", "name": "Pavol"}}.');
        expect(
            replaceParameters(
                '{greeting} {name}, this is how invalid JSON look like {"params": {"greeting": "{greeting}", "name": "{name}"}.',
                {
                    greeting: 'Hi',
                    name: 'Pavol',
                },
            ),
        ).toBe('Hi Pavol, this is how invalid JSON look like {"params": {"greeting": "Hi", "name": "Pavol"}.');
    });

    it('should replace same parameter multiple times', () => {
        expect(
            replaceParameters('{greeting} {name}, how are you? {greeting} {name}', {
                greeting: 'Hello',
                name: 'World',
            }),
        ).toBe('Hello World, how are you? Hello World');
    });

    it('should replace multiline templates', () => {
        expect(
            replaceParameters(
                spaceTrim(`
                    Hello {name}, how are you?
                    I am {greeting}
                `),
                { greeting: 'fine', name: 'World' },
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Hello World, how are you?
                    I am fine
                `),
            ),
        );
    });

    it('should not be confused by some NON-JSON structure containing chars {}', () => {
        expect(replaceParameters('{greeting {name}}, how are you?', { greeting: 'Hello', name: 'world' })).toBe(
            '{greeting world}, how are you?',
        );
        expect(replaceParameters('<greeting {name}>', { greeting: 'Hello', name: 'world' })).toBe('<greeting world>');

        expect(replaceParameters('<{greeting {name}}>', { greeting: 'Hello', name: 'world' })).toBe(
            '<{greeting world}>',
        );
        expect(replaceParameters('<{{{greeting {name}}}}>', { greeting: 'Hello', name: 'world' })).toBe(
            '<{{{greeting world}}}>',
        );

        expect(replaceParameters('{greeting} }{}{}{', { greeting: 'Hello', name: 'world' })).toBe('Hello }{}{}{');
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
            replaceParameters('greeting} {name}, how are you?', { greeting: 'Hello', name: 'World' }),
        ).toThrowError(/Parameter is not opened/i);
    });
});
