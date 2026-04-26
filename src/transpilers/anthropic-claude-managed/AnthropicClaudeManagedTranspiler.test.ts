import { describe, expect, it } from '@jest/globals';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { book } from '../../pipeline/book-notation';
import { AnthropicClaudeManagedTranspiler } from './AnthropicClaudeManagedTranspiler';

describe('AnthropicClaudeManagedTranspiler', () => {
    it('transpiles a book into a managed Claude Agent SDK harness with session and system prompt setup', async () => {
        const agentSource = book`
            Poe

            PERSONA You are funny and creative AI assistant
            RULE You write poems as answers
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await AnthropicClaudeManagedTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk'");
        expect(code).toContain("systemPrompt: {");
        expect(code).toContain("type: 'preset'");
        expect(code).toContain("preset: 'claude_code'");
        expect(code).toContain("append: SYSTEM_MESSAGE");
        expect(code).toContain("const PROMPTBOOK_TOOL_OPTIONS = {}");
        expect(code).toContain("const response = query({");
        expect(code).toContain('model: MODEL_NAME');
        expect(code).toContain('queryOptions.resume = sessionId');
        expect(code).toContain("message.type === 'system' && message.subtype === 'init'");
        expect(code).toContain("message.type === 'result'");
        expect(code).toContain("message.subtype === 'success'");
        expect(code).toContain("async function* createPromptMessages(promptText)");
        expect(code).not.toContain('PERSONA You are funny');
    });

    it('transpiles a book with tool commitments into Claude Agent SDK MCP tools', async () => {
        const agentSource = book`
            Time Keeper

            PERSONA You are a time-aware assistant
            USE TIME
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await AnthropicClaudeManagedTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("const PROMPTBOOK_TOOL_IMPLEMENTATIONS = {");
        expect(code).toContain("createSdkMcpServer({");
        expect(code).toContain('promptbook: PROMPTBOOK_MCP_SERVER');
        expect(code).toContain('const PROMPTBOOK_ALLOWED_TOOLS = [');
        expect(code).toContain('"mcp__promptbook__get_current_time"');
        expect(code).toContain('tool(');
        expect(code).toContain('"timezone": z.string()');
        expect(code).toContain('normalizeToolResponse(await toolImplementation(input))');
        expect(code).toContain('createToolErrorResponse(error)');
    });

    it('transpiles a book with large knowledge and uses retrieval scaffolding', async () => {
        const agentSource = book`
            Marigold

            PERSONA You are writing stories about Witcher
            RULE Do not talk about our world, only about the Witcher universe

            KNOWLEDGE ${'a'.repeat(1001)}
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await AnthropicClaudeManagedTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { Document, SimpleDirectoryReader, VectorStoreIndex } from 'llamaindex'");
        expect(code).toContain('const DIRECT_KNOWLEDGE =');
        expect(code).toContain('const KNOWLEDGE_SOURCES =');
        expect(code).toContain('knowledgeIndex = await VectorStoreIndex.fromDocuments(documents)');
        expect(code).toContain('appendKnowledgeContext(promptText)');
    });

    it('transpiles a book with TEAM and includes the baked team scaffold', async () => {
        const agentSource = book`
            Team Router

            PERSONA You route work to teammates
            TEAM https://example.com/agents/alpha
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await AnthropicClaudeManagedTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { RemoteAgent } from '@promptbook/core';");
        expect(code).toContain('const PROMPTBOOK_TEAM_MEMBERS =');
        expect(code).toContain('team_chat_alpha');
        expect(code).toContain('createPromptbookTeamToolImplementation("team_chat_alpha")');
        expect(code).toContain('PROMPTBOOK_TOOL_IMPLEMENTATIONS');
    });
});
