import { describe, expect, it } from '@jest/globals';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { book } from '../../pipeline/book-notation';
import { OpenAiAgentsTranspiler } from './OpenAiAgentsTranspiler';

describe('OpenAiAgentsTranspiler', () => {
    it('transpiles a book into an OpenAI Agents SDK harness', async () => {
        const agentSource = book`
            Poe

            PERSONA You are funny and creative AI assistant
            RULE You write poems as answers
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await OpenAiAgentsTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { Agent, run } from '@openai/agents'");
        expect(code).toContain('const MODEL_SETTINGS =');
        expect(code).toContain('const PROMPTBOOK_FUNCTION_TOOLS = []');
        expect(code).toContain('const agent = createAgent();');
        expect(code).toContain('previousResponseId');
        expect(code).toContain('run(agent, promptText, {');
        expect(code).toContain('formatFinalOutput(result.finalOutput)');
        expect(code).not.toContain('llamaindex');
    });

    it('transpiles a book with large knowledge and uses the native OpenAI vector store', async () => {
        const agentSource = book`
            Marigold

            PERSONA You are writing stories about Witcher
            RULE Do not talk about our world, only about the Witcher universe

            KNOWLEDGE ${'a'.repeat(1001)}
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await OpenAiAgentsTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { Agent, run, fileSearchTool } from '@openai/agents'");
        expect(code).toContain("import OpenAI from 'openai';");
        expect(code).toContain('const KNOWLEDGE_SOURCES =');
        expect(code).toContain('a'.repeat(1001));
        expect(code).toContain('const client = new OpenAI({');
        expect(code).toContain('client.vectorStores.create({');
        expect(code).toContain('client.vectorStores.fileBatches.uploadAndPoll(');
        expect(code).toContain('new File([');
        expect(code).toContain('fileSearchTool(VECTOR_STORE_ID)');
        expect(code).not.toContain('llamaindex');
    });

    it('transpiles a book with USE TIME and includes tool definitions and implementation', async () => {
        const agentSource = book`
            Time Keeper

            PERSONA You are a time-aware assistant
            USE TIME
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await OpenAiAgentsTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain('const PROMPTBOOK_TOOL_IMPLEMENTATIONS = {');
        expect(code).toContain('async get_current_time(args)');
        expect(code).toContain('const PROMPTBOOK_FUNCTION_TOOLS = [');
        expect(code).toContain('tool({');
        expect(code).toContain('strict: false');
        expect(code).toContain('return stringifyResult(result);');
        expect(code).toContain("run(agent, promptText, {");
    });
});
