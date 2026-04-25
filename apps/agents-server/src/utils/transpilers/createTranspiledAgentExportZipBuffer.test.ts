import { describe, expect, it } from '@jest/globals';
import JSZip from 'jszip';
import { validateBook } from '../../../../../src/book-2.0/agent-source/string_book';
import { createTranspiledAgentExportZipBuffer } from './createTranspiledAgentExportZipBuffer';

describe('createTranspiledAgentExportZipBuffer', () => {
    it('packages the stored book, transpiled harness, and manifest into one ZIP archive', async () => {
        const { filename, buffer } = await createTranspiledAgentExportZipBuffer({
            agentName: 'Support Router',
            agentSource: validateBook('Support Router\nGOAL Route support tickets'),
            transpiledCode: '#!/usr/bin/env node\nconsole.log("hello");',
            transpilerName: 'openai-sdk',
            transpilerTitle: 'OpenAI SDK',
        });

        const zip = await JSZip.loadAsync(buffer);
        const archiveRoot = filename.replace(/\.zip$/, '');
        const manifest = JSON.parse(await zip.file(`${archiveRoot}/manifest.json`)!.async('string')) as {
            agentName: string;
            transpilerName: string;
            transpilerTitle: string;
            files: string[];
        };

        expect(filename).toBe('promptbook-agent-export-Support Router-openai-sdk.zip');
        expect(await zip.file(`${archiveRoot}/agent.book`)!.async('string')).toBe('Support Router\nGOAL Route support tickets');
        expect(await zip.file(`${archiveRoot}/agent-harness.mjs`)!.async('string')).toContain('console.log("hello");');
        expect(manifest).toEqual({
            agentName: 'Support Router',
            transpilerName: 'openai-sdk',
            transpilerTitle: 'OpenAI SDK',
            files: ['agent.book', 'agent-harness.mjs'],
        });
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

        expect(filename).toBe('promptbook-agent-export-___-custom_transpiler.zip');
        expect(await zip.file(`${archiveRoot}/agent-harness.txt`)!.async('string')).toBe('echo hello');
    });
});
