import { describe, expect, it } from '@jest/globals';
import { extractVariables } from './extractVariables';
//import { extractVariables } from './extractVariables';

describe('extractVariables', () => {
    it('should work in supersimple case without any variables', () => {
        expect([...extractVariables('')]).toEqual([]);
        expect([...extractVariables('"Hello"')]).toEqual([]);
        expect([...extractVariables('const a = 1;')]).toEqual([]);
    });

    it('should parse one variable', () => {
        expect([...extractVariables('const a = name;')]).toEqual(['name']);
        expect([...extractVariables('console.log(name);')]).toEqual(['name']);
        expect([...extractVariables('const a = name; const b = name;')]).toEqual(['name']);
        expect([...extractVariables('const a = 1; const b = name; const c = name;')]).toEqual(['name']);
    });

    it('should NOT parse custom function', () => {
        expect([...extractVariables('foo();')]).toEqual([]);
        expect([...extractVariables('foo(name);')]).toEqual(['name']);
        expect([...extractVariables('console.log(name);')]).toEqual(['name']);
    });

    it('should parse multiple variables', () => {
        expect([...extractVariables('console.log(`${greeting} ${name}`);')]).toEqual(['greeting', 'name']);
    });
});
