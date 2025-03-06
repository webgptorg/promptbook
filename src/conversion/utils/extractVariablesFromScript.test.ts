import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { extractVariablesFromScript } from './extractVariablesFromScript';
//import { extractVariablesFromScript } from './extractVariablesFromScript';

describe('extractVariablesFromScript', () => {
    it('should work in supersimple case without any variables', () => {
        expect([...extractVariablesFromScript('')]).toEqual([]);
        expect([...extractVariablesFromScript('"Hello"')]).toEqual([]);
        expect([...extractVariablesFromScript('const a = 1;')]).toEqual([]);
    });

    it('should extract one variable', () => {
        expect([...extractVariablesFromScript('const a = name;')]).toEqual(['name']);
        expect([...extractVariablesFromScript('console.log(name);')]).toEqual(['name']);
        expect([...extractVariablesFromScript('const a = name; const b = name;')]).toEqual(['name']);
        expect([...extractVariablesFromScript('const a = 1; const b = name; const c = name;')]).toEqual(['name']);
    });

    it('should work with typescript', () => {
        expect([...extractVariablesFromScript('const a: string = name;')]).toEqual(['name']);
        expect([...extractVariablesFromScript('const a: string = name; const b: number = name;')]).toEqual(['name']);
        expect([
            ...extractVariablesFromScript('const a: string = name; const b: number = name; const c: boolean = name;'),
        ]).toEqual(['name']);
    });

    it('should extract variable used in functions', () => {
        expect([...extractVariablesFromScript('foo(name);')]).toEqual(['name']);
        expect([...extractVariablesFromScript('JSON.parse(name);')]).toEqual(['name']);
        expect([...extractVariablesFromScript('JSON.stringify(name);')]).toEqual(['name']);
        expect([...extractVariablesFromScript('console.log(name);')]).toEqual(['name']);
    });

    it('should NOT extract custom function', () => {
        expect([...extractVariablesFromScript('foo();')]).toEqual([]);
        expect([...extractVariablesFromScript('foo(name);')]).toEqual(['name']);
        expect([...extractVariablesFromScript('console.log(name);')]).toEqual(['name']);
    });

    it('should NOT extract insides of regex', () => {
        expect([...extractVariablesFromScript('if(/^Apple/gi.test(foo))')]).toEqual(['foo']);
    });

    it('should extract multiple variables', () => {
        expect([...extractVariablesFromScript('console.log(`${greeting} ${name}`);')]).toEqual(['greeting', 'name']);
    });

    it('should extract variables from script throwing error', () => {
        expect([
            ...extractVariablesFromScript(
                spaceTrim(`
                    if (wordSynonym === word) {
                        throw new Error('Synonym returned from LLM is same as original word ' + word);
                    }
                `),
            ),
        ]).toEqual(['wordSynonym', 'word']);
    });
});
