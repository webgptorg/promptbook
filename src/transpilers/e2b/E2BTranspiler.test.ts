import { describe, expect, it } from '@jest/globals';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { book } from '../../pipeline/book-notation';
import { E2BTranspiler } from './E2BTranspiler';

describe('E2BTranspiler', () => {
    it('wraps the OpenAI SDK harness in an E2B sandbox launcher', async () => {
        const agentSource = book`
            Poe

            PERSONA You are funny and creative AI assistant
            RULE You write poems as answers
            USE TIME
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await E2BTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { Sandbox } from 'e2b'");
        expect(code).toContain("import * as dotenv from 'dotenv'");
        expect(code).toContain('const E2B_API_KEY = process.env.E2B_API_KEY;');
        expect(code).toContain('const SANDBOX_ENVIRONMENT_VARIABLES =');
        expect(code).toContain('await sandbox.files.write(SANDBOX_PACKAGE_JSON_PATH, packageJson);');
        expect(code).toContain("await sandbox.commands.run('npm install', {");
        expect(code).toContain("const command = await sandbox.commands.run('node ./agent-harness.mjs', {");
        expect(code).toContain('process.stdin.on(\'data\', (chunk) => {');
        expect(code).toContain('async get_current_time(args)');
        expect(code).toContain("import OpenAI from 'openai'");
    });

    it('preserves knowledge-retrieval scaffolding from the inner SDK harness', async () => {
        const agentSource = book`
            Marigold

            PERSONA You are writing stories about Witcher
            RULE Do not talk about our world, only about the Witcher universe

            KNOWLEDGE ${'a'.repeat(1001)}
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await E2BTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { Document, VectorStoreIndex, SimpleDirectoryReader } from 'llamaindex'");
        expect(code).toContain('const knowledge =');
        expect(code).toContain('a'.repeat(1001));
        expect(code).toContain('index = await VectorStoreIndex.fromDocuments(documents)');
        expect(code).toContain('Sandbox.create({');
    });
});
