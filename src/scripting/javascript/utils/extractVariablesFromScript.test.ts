import { describe, expect, it } from '@jest/globals';
import { extractVariablesFromJavascript } from './extractVariablesFromJavascript';
//import { extractVariablesFromJavascript } from './extractVariablesFromJavascript';

describe('extractVariablesFromJavascript', () => {
    it('should work in supersimple case without any variables', () => {
        expect([...extractVariablesFromJavascript('')]).toEqual([]);
        expect([...extractVariablesFromJavascript('"Hello"')]).toEqual([]);
        expect([...extractVariablesFromJavascript('const a = 1;')]).toEqual([]);
    });

    it('should parse one variable', () => {
        expect([...extractVariablesFromJavascript('const a = name;')]).toEqual(['name']);
        expect([...extractVariablesFromJavascript('console.log(name);')]).toEqual(['name']);
        expect([...extractVariablesFromJavascript('const a = name; const b = name;')]).toEqual(['name']);
        expect([...extractVariablesFromJavascript('const a = 1; const b = name; const c = name;')]).toEqual(['name']);
    });

    it('should NOT parse custom function', () => {
        expect([...extractVariablesFromJavascript('foo();')]).toEqual([]);
        expect([...extractVariablesFromJavascript('foo(name);')]).toEqual(['name']);
        expect([...extractVariablesFromJavascript('console.log(name);')]).toEqual(['name']);
    });

    it('should parse multiple variables', () => {
        expect([...extractVariablesFromJavascript('console.log(`${greeting} ${name}`);')]).toEqual([
            'greeting',
            'name',
        ]);
    });
});
