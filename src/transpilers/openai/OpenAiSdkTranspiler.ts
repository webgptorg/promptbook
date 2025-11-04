import { createAgentModelRequirements, parseAgentSource } from '../../_packages/core.index';
import {
    BookTranspiler,
    BookTranspilerOptions,
    ExecutionTools,
    string_book,
    string_script,
} from '../../_packages/types.index';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import chatTemplate from './templates/chat.ts.txt';

/**
 * Transpiler to Javascript code using OpenAI SDK.
 *
 * @public exported from `@promptbook/core`
 */
export const OpenAiSdkTranspiler = {
    name: 'openai-sdk',
    title: 'OpenAI SDK',
    packageName: '@promptbook/core',
    className: 'OpenAiSdkTranspiler',
    async transpileBook(
        book: string_book,
        tools: ExecutionTools,
        options?: BookTranspilerOptions,
    ): Promise<string_script> {
        const { agentName, personaDescription } = await parseAgentSource(book);
        const modelRequirements = await createAgentModelRequirements(book);

        TODO_USE(tools);
        TODO_USE(options);
        TODO_USE(personaDescription);

        const source = chatTemplate
            .split('AGENT_NAME')
            .join(agentName)
            .split('SYSTEM_MESSAGE')
            .join(modelRequirements.systemMessage)
            .split('TEMPERATURE')
            .join(modelRequirements.temperature);

        return source;
    },
} as const satisfies BookTranspiler;
