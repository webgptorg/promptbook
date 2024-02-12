import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { extractParameters } from './extractParameters';

describe('extractParameters', () => {
    it('should work in supersimple case without any parameters', () => {
        expect(extractParameters('')).toEqual([]);
        expect(extractParameters('Hello')).toEqual([]);
        expect(extractParameters('Hello World')).toEqual([]);
    });

    it('should parse one parameter', () => {
        expect(extractParameters('Hello {name}')).toEqual([{ parameterName: 'name' }]);
        expect(extractParameters('Hello {name}, how are you?')).toEqual([{ parameterName: 'name' }]);
        expect(extractParameters('{name}, how are you?')).toEqual([{ parameterName: 'name' }]);
    });

    it('should parse multiple parameters', () => {
        expect(extractParameters('{greeting} {name}, how are you?')).toEqual([
            { parameterName: 'greeting' },
            { parameterName: 'name' },
        ]);
    });

    it('should parse parameters with index', () => {
        expect(extractParameters('{greeting[i]} {name[j]}, how are you?')).toEqual([
            { parameterName: 'greeting', indexName: 'i' },
            { parameterName: 'name', indexName: 'j' },
        ]);
    });

    it('should two same parameters with different indexes', () => {
        expect(extractParameters('{name[i]} {name[j]}, how are you?')).toEqual([
            { parameterName: 'name', indexName: 'i' },
            { parameterName: 'name', indexName: 'j' },
        ]);
    });

    it('should not be confused by JSON', () => {
        expect(extractParameters('{greeting} {name}, this is how JSON look like {"key": 1}.')).toEqual([
            { parameterName: 'greeting' },
            { parameterName: 'name' },
        ]);
        expect(extractParameters('{greeting} {name}, this is how JSON look like {}.')).toEqual([
            { parameterName: 'greeting' },
            { parameterName: 'name' },
        ]);
        expect(
            extractParameters(
                '{greeting} {name}, this is how JSON look like {"greeting": "{greeting}", "name": "{name}"}.',
            ),
        ).toEqual([
            { parameterName: 'greeting' },
            { parameterName: 'name' },
            { parameterName: 'greeting' },
            { parameterName: 'name' },
        ]);
        expect(
            extractParameters(
                '{greeting} {name}, this is how JSON look like {"params": {"greeting": "{greeting}", "name": "{name}"}}.',
            ),
        ).toEqual([
            { parameterName: 'greeting' },
            { parameterName: 'name' },
            { parameterName: 'greeting' },
            { parameterName: 'name' },
        ]);
        expect(
            extractParameters(
                '{greeting} {name}, this is how invalid JSON look like {"params": {"greeting": "{greeting}", "name": "{name}"}.',
            ),
        ).toEqual([
            { parameterName: 'greeting' },
            { parameterName: 'name' },
            { parameterName: 'greeting' },
            { parameterName: 'name' },
        ]);
    });

    it('should parse parameter included multiple times', () => {
        expect(extractParameters('{greeting} {name}, how are you? {greeting} {name}')).toEqual([
            { parameterName: 'greeting' },
            { parameterName: 'name' },
            { parameterName: 'greeting' },
            { parameterName: 'name' },
        ]);
    });

    it('should parse multiline templates', () => {
        expect(
            extractParameters(
                spaceTrim(`
          Hello {name}, how are you?
          I am {greeting}
        `),
            ),
        ).toEqual([{ parameterName: 'name' }, { parameterName: 'greeting' }]);
    });

    it('should not be confused by some NON-JSON structure containing chars {}', () => {
        expect(extractParameters('{greeting {name}}, how are you?')).toEqual([{ parameterName: 'name' }]);
        expect(extractParameters('<greeting {name}>')).toEqual([{ parameterName: 'name' }]);
        expect(extractParameters('<{greeting {name}}>')).toEqual([{ parameterName: 'name' }]);
        expect(extractParameters('<{{{greeting {name}}}}>')).toEqual([{ parameterName: 'name' }]);
        expect(extractParameters('{greeting} }{}{}{')).toEqual([{ parameterName: 'greeting' }]);
    });

    /*
  TODO: [🧠][💫] Should be this done in extractParameters OR only in replaceParams?
  it('should throw error when parameter is not closed', () => {
    expect(() => extractParameters('Hello {name')).toThrowError(/Parameter is not closed/i);
  });

  it('should throw error when parameter is not opened', () => {
    expect(() => extractParameters('greeting} {name}, how are you?')).toThrowError(/Parameter is not opened/i);
  });
  */
});
