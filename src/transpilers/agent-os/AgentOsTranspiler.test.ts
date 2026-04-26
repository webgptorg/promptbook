import { describe, expect, it } from '@jest/globals';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { book } from '../../pipeline/book-notation';
import { AgentOsTranspiler } from './AgentOsTranspiler';

describe('AgentOsTranspiler', () => {
    it('transpiles a book into an AgentOS harness with a Pi extension and prompt loop', async () => {
        const agentSource = book`
            Poe

            PERSONA You are funny and creative AI assistant
            RULE You write poems as answers
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await AgentOsTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { AgentOs } from '@rivet-dev/agent-os-core'");
        expect(code).toContain("import common from '@rivet-dev/agent-os-common'");
        expect(code).toContain("import pi from '@rivet-dev/agent-os-pi'");
        expect(code).toContain("const vm = await AgentOs.create({");
        expect(code).toContain("await vm.writeFile(");
        expect(code).toContain("before_agent_start");
        expect(code).toContain("const PROMPT_SUFFIX =");
        expect(code).toContain("appendPromptSuffix(prompt)");
        expect(code).toContain("await vm.prompt(sessionId, prompt)");
        expect(code).toContain("vm.onSessionEvent(sessionId, (event) => console.log(event))");
        expect(code).not.toContain('PERSONA You are funny');
    });

    it('transpiles a book with tool commitments into AgentOS host tools', async () => {
        const agentSource = book`
            Time Keeper

            PERSONA You are a time-aware assistant
            USE TIME
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await AgentOsTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { hostTool, toolKit } from '@rivet-dev/agent-os-core'");
        expect(code).toContain("import { z } from 'zod'");
        expect(code).toContain('const PROMPTBOOK_TOOL_IMPLEMENTATIONS = {');
        expect(code).toContain('async get_current_time(args)');
        expect(code).toContain('const PROMPTBOOK_TOOLKIT = toolKit({');
        expect(code).toContain('hostTool({');
        expect(code).toContain('"timezone": z.string()');
    });

    it('transpiles a book with large knowledge and uses retrieval scaffolding', async () => {
        const agentSource = book`
            Marigold

            PERSONA You are writing stories about Witcher
            RULE Do not talk about our world, only about the Witcher universe

            KNOWLEDGE ${'a'.repeat(1001)}
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await AgentOsTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { Document, SimpleDirectoryReader, VectorStoreIndex } from 'llamaindex'");
        expect(code).toContain('const DIRECT_KNOWLEDGE =');
        expect(code).toContain('const KNOWLEDGE_SOURCES =');
        expect(code).toContain('knowledgeIndex = await VectorStoreIndex.fromDocuments(documents)');
        expect(code).toContain('knowledgeIndex.asRetriever()');
    });

    it('transpiles a book with TEAM and includes the baked team scaffold', async () => {
        const agentSource = book`
            Team Router

            PERSONA You route work to teammates
            TEAM https://example.com/agents/alpha
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await AgentOsTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { RemoteAgent } from '@promptbook/core';");
        expect(code).toContain('const PROMPTBOOK_TEAM_MEMBERS =');
        expect(code).toContain('team_chat_alpha');
        expect(code).toContain('createPromptbookTeamToolImplementation("team_chat_alpha")');
        expect(code).toContain('PROMPTBOOK_TOOL_IMPLEMENTATIONS');
    });
});
