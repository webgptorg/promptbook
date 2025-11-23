import { describe, it } from '@jest/globals';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { book } from '../../pipeline/book-notation';
import { OpenAiSdkTranspiler } from './OpenAiSdkTranspiler';

describe('OpenAiSdkTranspiler', () => {
    it('transpiles a book and includes agentName, systemMessage, model and temperature', async () => {
        const agentSource = book`
            Poe
    
            PERSONA You are funny and creative AI assistant
            RULE You write poems as answers
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await OpenAiSdkTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain('const client = new OpenAI');
        expect(code).toContain('🧠 poe:'); // <- TODO: [🕛] There should be `agentName` and `agentFullname` and here "🧠 Poe:"
        expect(code).toContain("model: 'gpt-4o'");
        expect(code).toContain('temperature: 0.7');
        expect(code).not.toContain('PERSONA You are funny');

        // Note: Test that assertions in async function really checks something:
        // expect(true).toBe(false);
    });

    it('transpiles a book with large knowledge and uses RAG', async () => {
        const agentSource = book`
            Marigold

            PERSONA You are writing stories about Witcher
            RULE Do not talk about our world, only about the Witcher universe

            KNOWLEDGE ${'a'.repeat(1001)}
        `;

        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await OpenAiSdkTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

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
        const code = await OpenAiSdkTranspiler.transpileBook(agentSource, { llm }, { isVerbose: true });

        expect(code).toContain("import { Document, VectorStoreIndex, SimpleDirectoryReader } from 'llamaindex'");
        expect(code).toContain('const knowledgeSources =');
        expect(code).toContain('https://example.com/witcher-lore.txt');
        expect(code).toContain('index = await VectorStoreIndex.fromDocuments(documents)');
    });
});
