import { describe, expect, it } from '@jest/globals';
import { normalizeImportedTypescriptModule } from './getTypescriptModule';

/**
 * Minimal subset of the TypeScript runtime used by coder JSON parsing.
 */
type TypescriptModuleStub = Pick<typeof import('typescript'), 'flattenDiagnosticMessageText' | 'parseConfigFileTextToJson'>;

describe('getTypescriptModule', () => {
    const typescriptModuleStub = {
        flattenDiagnosticMessageText: () => '',
        parseConfigFileTextToJson: () => ({ config: {} }),
    } as TypescriptModuleStub as typeof import('typescript');

    it('accepts direct TypeScript module namespaces', () => {
        expect(normalizeImportedTypescriptModule(typescriptModuleStub)).toBe(typescriptModuleStub);
    });

    it('accepts TypeScript modules wrapped under default', () => {
        expect(normalizeImportedTypescriptModule({ default: typescriptModuleStub })).toBe(typescriptModuleStub);
    });
});
