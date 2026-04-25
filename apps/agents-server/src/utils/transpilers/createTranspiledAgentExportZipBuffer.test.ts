import { describe, expect, it } from '@jest/globals';
import JSZip from 'jszip';
import { validateBook } from '../../../../../src/book-2.0/agent-source/string_book';
import { createTranspiledAgentExportZipBuffer } from './createTranspiledAgentExportZipBuffer';

describe('createTranspiledAgentExportZipBuffer', () => {
    it('packages the stored book, transpiled harness, and manifest into one ZIP archive', async () => {
        const { filename, buffer } = await createTranspiledAgentExportZipBuffer({
            agentName: 'Support Router',
            agentSource: validateBook('Support Router\nGOAL Route support tickets'),
            transpiledCode: `#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { spaceTrim } from '@promptbook/utils';
import OpenAI from 'openai';
import readline from 'readline';

dotenv.config({ path: '.env' });

console.log(process.env.OPENAI_API_KEY);
console.log(spaceTrim('hello'));
console.log(OpenAI);
console.log(readline);`,
            transpilerName: 'openai-sdk',
            transpilerTitle: 'OpenAI SDK',
        });

        const zip = await JSZip.loadAsync(buffer);
        const archiveRoot = filename.replace(/\.zip$/, '');
        const manifest = JSON.parse(await zip.file(`${archiveRoot}/manifest.json`)!.async('string')) as {
            agentName: string;
            transpilerName: string;
            transpilerTitle: string;
            runtime: {
                kind: string;
                entryFile: string;
                installCommand: string | null;
                startCommand: string | null;
                environmentVariables: string[];
                dependencies?: Record<string, string>;
                packageName?: string;
            };
            files: string[];
        };
        const packageJson = JSON.parse(await zip.file(`${archiveRoot}/package.json`)!.async('string')) as {
            scripts: Record<string, string>;
            dependencies: Record<string, string>;
        };
        const mockEnvironmentFile = await zip.file(`${archiveRoot}/.env`)!.async('string');
        const gitignore = await zip.file(`${archiveRoot}/.gitignore`)!.async('string');
        const readme = await zip.file(`${archiveRoot}/README.md`)!.async('string');

        expect(filename).toBe('promptbook-agent-export-Support Router-openai-sdk.zip');
        expect(await zip.file(`${archiveRoot}/agent.book`)!.async('string')).toBe('Support Router\nGOAL Route support tickets');
        expect(await zip.file(`${archiveRoot}/agent-harness.mjs`)!.async('string')).toContain("import OpenAI from 'openai';");
        expect(packageJson.scripts.start).toBe('node ./agent-harness.mjs');
        expect(Object.keys(packageJson.dependencies)).toEqual(['@promptbook/utils', 'dotenv', 'openai']);
        expect(mockEnvironmentFile).toContain('OPENAI_API_KEY');
        expect(mockEnvironmentFile).toContain('TODO_REPLACE_WITH_OPENAI_API_KEY');
        expect(gitignore).toContain('node_modules/');
        expect(gitignore).toContain('.env');
        expect(readme).toContain('npm install');
        expect(readme).toContain('npm start');
        expect(readme).toContain('agent-harness.mjs');
        expect(manifest.agentName).toBe('Support Router');
        expect(manifest.transpilerName).toBe('openai-sdk');
        expect(manifest.transpilerTitle).toBe('OpenAI SDK');
        expect(manifest.runtime.kind).toBe('nodejs');
        expect(manifest.runtime.entryFile).toBe('agent-harness.mjs');
        expect(manifest.runtime.installCommand).toBe('npm install');
        expect(manifest.runtime.startCommand).toBe('npm start');
        expect(manifest.runtime.environmentVariables).toEqual(['OPENAI_API_KEY']);
        expect(Object.keys(manifest.runtime.dependencies || {})).toEqual(['@promptbook/utils', 'dotenv', 'openai']);
        expect(manifest.files).toEqual([
            'agent.book',
            'agent-harness.mjs',
            '.env',
            '.gitignore',
            'package.json',
            'README.md',
            'manifest.json',
        ]);
    });

    it('falls back to a plaintext harness filename for unknown transpilers', async () => {
        const { filename, buffer } = await createTranspiledAgentExportZipBuffer({
            agentName: '???',
            agentSource: validateBook('Mystery Agent\nGOAL Unknown exporter'),
            transpiledCode: 'echo hello',
            transpilerName: 'custom/transpiler',
            transpilerTitle: 'Custom',
        });

        const zip = await JSZip.loadAsync(buffer);
        const archiveRoot = filename.replace(/\.zip$/, '');
        const manifest = JSON.parse(await zip.file(`${archiveRoot}/manifest.json`)!.async('string')) as {
            runtime: {
                kind: string;
                entryFile: string;
                installCommand: string | null;
                startCommand: string | null;
                environmentVariables: string[];
            };
            files: string[];
        };

        expect(filename).toBe('promptbook-agent-export-___-custom_transpiler.zip');
        expect(await zip.file(`${archiveRoot}/agent-harness.txt`)!.async('string')).toBe('echo hello');
        expect(zip.file(`${archiveRoot}/package.json`)).toBeNull();
        expect(await zip.file(`${archiveRoot}/README.md`)!.async('string')).toContain(
            'No automatic `npm install` / `npm start` runtime scaffold could be inferred',
        );
        expect(await zip.file(`${archiveRoot}/.env`)!.async('string')).toContain(
            'No required `process.env` variables were detected',
        );
        expect(manifest.runtime.kind).toBe('manual');
        expect(manifest.runtime.entryFile).toBe('agent-harness.txt');
        expect(manifest.runtime.installCommand).toBeNull();
        expect(manifest.runtime.startCommand).toBeNull();
        expect(manifest.files).toEqual([
            'agent.book',
            'agent-harness.txt',
            '.env',
            '.gitignore',
            'README.md',
            'manifest.json',
        ]);
    });
});
