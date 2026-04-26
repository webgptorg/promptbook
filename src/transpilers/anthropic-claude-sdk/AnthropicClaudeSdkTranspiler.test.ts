import { describe, expect, it } from '@jest/globals';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { book } from '../../pipeline/book-notation';
import { AnthropicClaudeSdkTranspiler } from './AnthropicClaudeSdkTranspiler';

describe('AnthropicClaudeSdkTranspiler', () => {
    it('transpiles a book and includes Anthropic SDK setup and Claude defaults', async () => {
        const agentSource = book`
            Poe

            PERSONA You are funny and creative AI assistant
            RULE You write poems as answers
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await AnthropicClaudeSdkTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain('const client = new Anthropic');
        expect(code).toContain('process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_CLAUDE_API_KEY');
        expect(code).toContain("model: 'claude-sonnet-4-20250514'");
        expect(code).toContain('temperature: 0.7');
        expect(code).not.toContain('PERSONA You are funny');
    });

    it('falls back to a Claude model when the source Book targets another provider', async () => {
        const agentSource = book`
            Cross Provider Agent

            MODEL gpt-4o
            PERSONA You are a cross-provider assistant
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await AnthropicClaudeSdkTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("model: 'claude-sonnet-4-20250514'");
        expect(code).not.toContain("model: 'gpt-4o'");
    });

    it('transpiles a book with large knowledge and uses RAG', async () => {
        const agentSource = book`
            Marigold

            PERSONA You are writing stories about Witcher
            RULE Do not talk about our world, only about the Witcher universe

            KNOWLEDGE ${'a'.repeat(1001)}
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await AnthropicClaudeSdkTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { Document, VectorStoreIndex, SimpleDirectoryReader } from 'llamaindex'");
        expect(code).toContain('const knowledge =');
        expect(code).toContain('a'.repeat(1001));
        expect(code).toContain('index = await VectorStoreIndex.fromDocuments(documents)');
    });

    it('transpiles a book with knowledge from a URL and uses RAG', async () => {
        const agentSource = book`
            Marigold

            PERSONA You are writing stories about Witcher
            RULE Do not talk about our world, only about the Witcher universe

            KNOWLEDGE https://example.com/witcher-lore.txt
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await AnthropicClaudeSdkTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { Document, VectorStoreIndex, SimpleDirectoryReader } from 'llamaindex'");
        expect(code).toContain('const knowledgeSources =');
        expect(code).toContain('https://example.com/witcher-lore.txt');
        expect(code).toContain('index = await VectorStoreIndex.fromDocuments(documents)');
    });

    it('transpiles a book with USE TIME and includes Anthropic tool handling', async () => {
        const agentSource = book`
            Time Keeper

            PERSONA You are a time-aware assistant
            USE TIME
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await AnthropicClaudeSdkTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain('const toolImplementations = {');
        expect(code).toContain('async get_current_time(args) {');
        expect(code).not.toContain('get_current_time: async get_current_time(args)');
        expect(code).toContain('const anthropicTools = toolDefinitions.map((toolDefinition) => ({');
        expect(code).toContain('"name": "get_current_time"');
        expect(code).toContain('input_schema: toolDefinition.parameters');
        expect(code).toContain("contentBlock.type === 'tool_use'");
        expect(code).toContain("type: 'tool_result'");
        expect(code).toContain('tool_use_id: toolUseBlock.id');
    });
});
