import { describe, expect, it } from '@jest/globals';
import { rollup } from 'rollup';
import { createPackageExternalPredicate, getPackagesMetadataForRollup } from '../../rollup.config';

describe('getPackagesMetadataForRollup', () => {
    it('marks the CLI package with explicit TypeScript runtime dependencies', () => {
        const cliPackageMetadata = getPackagesMetadataForRollup().find(
            ({ packageBasename }) => packageBasename === 'cli',
        );

        expect(cliPackageMetadata?.additionalDependencies).toContain('typescript');
        expect(cliPackageMetadata?.additionalDependencies).toContain('ts-node');
        expect(cliPackageMetadata?.additionalDependencies).toContain('next');
        expect(cliPackageMetadata?.additionalDependencies).toContain('lucide-react');
        expect(cliPackageMetadata?.additionalDependencies).toContain('@tailwindcss/typography');
    });
});

describe('generated package external dependencies', () => {
    it('preserves declared dependencies, package subpaths, and Node built-ins as runtime imports', () => {
        const external = createPackageExternalPredicate(['typescript']);

        for (const moduleId of [
            'zod',
            'zod/v4',
            '@openai/agents',
            '@openai/agents/realtime',
            'react/jsx-runtime',
            'react-dom/server',
            'typescript',
            'readline',
            'fs/promises',
            'node:fs/promises',
        ]) {
            expect(external(moduleId)).toBe(true);
        }

        for (const moduleId of [
            './zod',
            '../src/zod',
            '/tmp/zod',
            'zod-like',
            '@openai/agents-other',
            'undeclared-package',
        ]) {
            expect(external(moduleId)).toBe(false);
        }
    });

    it('bundles code importing Zod without loading its declaration files as JavaScript', async () => {
        const bundle = await rollup({
            input: 'prerelease-regression',
            external: createPackageExternalPredicate(),
            plugins: [
                {
                    name: 'prerelease-regression',
                    resolveId: (moduleId) => (moduleId === 'prerelease-regression' ? moduleId : null),
                    load: (moduleId) =>
                        moduleId === 'prerelease-regression'
                            ? "import { z } from 'zod'; export const parseName = (value) => z.string().parse(value);"
                            : null,
                },
            ],
        });

        try {
            const { output } = await bundle.generate({ format: 'cjs' });
            const code = output[0]!.type === 'chunk' ? output[0]!.code : '';
            const exports: { parseName?: (value: unknown) => string } = {};

            new Function('require', 'exports', code)(require, exports);

            expect(exports.parseName?.('Promptbook')).toBe('Promptbook');
            expect(() => exports.parseName?.(123)).toThrow();
        } finally {
            await bundle.close();
        }
    });
});
