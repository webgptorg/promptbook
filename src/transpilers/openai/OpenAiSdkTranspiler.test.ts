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
        expect(code).toContain('🧠 Poe:');
        expect(code).toContain("model: 'gpt-4o'");
        expect(code).toContain('temperature: 0.7');
        expect(code).not.toContain('PERSONA You are funny');

        // Note: Test that assertions in async function really checks something:
        // expect(true).toBe(false);
    });
});
