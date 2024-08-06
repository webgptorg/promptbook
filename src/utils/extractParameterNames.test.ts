import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { extractParameterNames } from './extractParameterNames';

describe('extractParameterNames', () => {
    it('should work in supersimple case without any parameters', () => {
        expect([...extractParameterNames('')]).toEqual([]);
        expect([...extractParameterNames('Hello')]).toEqual([]);
        expect([...extractParameterNames('Hello World')]).toEqual([]);
    });

    it('should parse one parameter', () => {
        expect([...extractParameterNames('Hello {name}')]).toEqual(['name']);
        expect([...extractParameterNames('Hello {name}, how are you?')]).toEqual(['name']);
        expect([...extractParameterNames('{name}, how are you?')]).toEqual(['name']);
    });

    it('should parse multiple parameters', () => {
        expect([...extractParameterNames('{greeting} {name}, how are you?')]).toEqual(['greeting', 'name']);
    });

    it('should not be confused by JSON', () => {
        expect([...extractParameterNames('{greeting} {name}, this is how JSON look like {"key": 1}.')]).toEqual([
            'greeting',
            'name',
        ]);
        expect([...extractParameterNames('{greeting} {name}, this is how JSON look like {}.')]).toEqual([
            'greeting',
            'name',
        ]);
        expect([
            ...extractParameterNames(
                '{greeting} {name}, this is how JSON look like {"greeting": "{greeting}", "name": "{name}"}.',
            ),
        ]).toEqual(['greeting', 'name']);
        expect([
            ...extractParameterNames(
                '{greeting} {name}, this is how JSON look like {"params": {"greeting": "{greeting}", "name": "{name}"}}.',
            ),
        ]).toEqual(['greeting', 'name']);
        expect([
            ...extractParameterNames(
                '{greeting} {name}, this is how invalid JSON look like {"params": {"greeting": "{greeting}", "name": "{name}"}.',
            ),
        ]).toEqual(['greeting', 'name']);
    });

    it('should parse parameter included multiple times', () => {
        expect([...extractParameterNames('{greeting} {name}, how are you? {greeting} {name}')]).toEqual([
            'greeting',
            'name',
        ]);
    });

    it('should parse multi-line templates', () => {
        expect([
            ...extractParameterNames(
                spaceTrim(`
        Hello {name}, how are you?
        I am {greeting}
      `),
            ),
        ]).toEqual(['name', 'greeting']);
    });

    it('should not be confused by some NON-JSON structure containing chars {}', () => {
        expect([...extractParameterNames('{greeting {name}}, how are you?')]).toEqual(['name']);
        expect([...extractParameterNames('<greeting {name}>')]).toEqual(['name']);
        expect([...extractParameterNames('<{greeting {name}}>')]).toEqual(['name']);
        expect([...extractParameterNames('<{{{greeting {name}}}}>')]).toEqual(['name']);
        expect([...extractParameterNames('{greeting} }{}{}{')]).toEqual(['greeting']);
    });

    /*
  TODO: [🧠][💫] Should be this done in extractParameterNames OR only in replaceParams?
  it('should throw error when parameter is not closed', () => {
    expect(() => extractParameterNames('Hello {name')).toThrowError(/Parameter is not closed/i);
  });

  it('should throw error when parameter is not opened', () => {
    expect(() => extractParameterNames('greeting} {name}, how are you?')).toThrowError(/Parameter is not opened/i);
  });
  */
});
