import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { BehaviorSubject } from 'rxjs';
import spaceTrim from 'spacetrim';
import { forTime } from 'waitasecond';
import { linguisticHash, unwrapResult } from '../../_packages/utils.index';
import type {
    AgentBasicInformation,
    AgentCapability,
    BookParameter,
} from '../../book-2.0/agent-source/AgentBasicInformation';
import { computeAgentHash } from '../../book-2.0/agent-source/computeAgentHash';
import { createDefaultAgentName } from '../../book-2.0/agent-source/createDefaultAgentName';
import { padBook } from '../../book-2.0/agent-source/padBook';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { validateBook } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentsToolTitles } from '../../commitments';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type {
    string_agent_hash,
    string_agent_name,
    string_agent_url,
    string_color,
    string_date_iso8601,
    string_fonts,
    string_markdown,
    string_prompt,
    string_url_image,
} from '../../types/typeAliases';
import { asUpdatableSubject } from '../../types/Updatable';
import { normalizeMessageText } from '../../utils/normalization/normalizeMessageText';
import { just } from '../../utils/organization/just';
import { getSingleLlmExecutionTools } from '../_multiple/getSingleLlmExecutionTools';
import { AgentLlmExecutionTools } from './AgentLlmExecutionTools';
import type { AgentOptions } from './AgentOptions';

/**
 * Represents one AI Agent
 *
 * Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities, recommended for usage in `Agent` or `AgentLlmExecutionTools`
 * - `RemoteAgent` - which is an `Agent` that connects to a Promptbook Agents Server
 *
 * @public exported from `@promptbook/core`
 */
export class Agent extends AgentLlmExecutionTools implements LlmExecutionTools, AgentBasicInformation {
    private _agentName: string_agent_name | undefined = undefined;

    /**
     * Name of the agent
     */
    public get agentName(): string_agent_name {
        return this._agentName || createDefaultAgentName(this.agentSource.value);
    }

    /**
     * Description of the agent
     */
    public personaDescription: string | null = null;

    /**
     * The initial message shown to the user when the chat starts
     */
    public initialMessage: string | null = null;

    /**
     * Links found in the agent source
     */
    public links: Array<string_agent_url> = [];

    /**
     * Capabilities of the agent
     * This is parsed from commitments like USE BROWSER, USE SEARCH ENGINE, KNOWLEDGE, etc.
     */
    public capabilities: Array<AgentCapability> = [];

    /**
     * List of sample conversations (question/answer pairs)
     */
    public samples: Array<{ question: string | null; answer: string }> = [];

    /**
     * Computed hash of the agent source for integrity verification
     */
    public get agentHash(): string_agent_hash {
        return computeAgentHash(this.agentSource.value);
    }

    /**
     * Metadata like image or color
     */
    public meta: {
        fullname?: string;
        image?: string_url_image;
        link?: string;
        font?: string_fonts;
        color?: string_color;
        title?: string;
        description?: string;
        [key: string]: string | undefined;
    } = {};

    /**
     * Human-readable titles for tool functions
     */
    public toolTitles: Record<string, string> = {};

    /**
     * Not used in Agent, always returns empty array
     */
    get parameters(): Array<BookParameter> {
        return [
            /* [😰] */
        ];
    }

    public readonly agentSource: BehaviorSubject<string_book>;
    private readonly teacherAgent: Agent | null;

    public constructor(options: AgentOptions) {
        const agentSource = asUpdatableSubject(options.agentSource);

        super({
            isVerbose: options.isVerbose,
            llmTools: getSingleLlmExecutionTools(options.executionTools.llm),
            agentSource: agentSource.value, // <- TODO: [🐱‍🚀] Allow to pass BehaviorSubject<string_book> OR refresh llmExecutionTools.callChat on agentSource change
        });
        // TODO: [🐱‍🚀] Add `Agent` simple "mocked" learning by appending to agent source
        // TODO: [🐱‍🚀] Add `Agent` learning by promptbookAgent

        this.teacherAgent = options.teacherAgent;
        this.agentSource = agentSource;
        this.agentSource.subscribe((source) => {
            this.updateAgentSource(source);

            const { agentName, personaDescription, initialMessage, links, meta, capabilities, samples } =
                parseAgentSource(source);
            this._agentName = agentName;
            this.personaDescription = personaDescription;
            this.initialMessage = initialMessage;
            this.links = links;
            this.capabilities = capabilities;
            this.samples = samples;
            this.meta = { ...this.meta, ...meta };
            this.toolTitles = getAllCommitmentsToolTitles();
        });
    }

    /**
     * Calls the chat model with agent-specific system prompt and requirements with streaming
     *
     * Note: This method also implements the learning mechanism
     */
    public async callChatModelStream(
        prompt: Prompt,
        onProgress: (chunk: ChatPromptResult) => void,
    ): Promise<ChatPromptResult> {
        // [1] Check if the user is asking the same thing as in the samples
        const modelRequirements = await this.getModelRequirements();
        if (modelRequirements.samples) {
            const normalizedPrompt = normalizeMessageText(prompt.content);
            const sample = modelRequirements.samples.find(
                (sample) => sample.question !== null && normalizeMessageText(sample.question) === normalizedPrompt,
            );

            if (sample) {
                const now = new Date().toISOString() as string_date_iso8601;
                const result: ChatPromptResult = {
                    content: sample.answer as string_markdown,
                    modelName: this.modelName,
                    timing: {
                        start: now,
                        complete: now,
                    },
                    usage: {
                        price: { value: 0, isUncertain: true },
                        input: {
                            tokensCount: { value: 0, isUncertain: true },
                            charactersCount: { value: 0, isUncertain: true },
                            wordsCount: { value: 0, isUncertain: true },
                            linesCount: { value: 0, isUncertain: true },
                            sentencesCount: { value: 0, isUncertain: true },
                            paragraphsCount: { value: 0, isUncertain: true },
                            pagesCount: { value: 0, isUncertain: true },
                        },
                        output: {
                            tokensCount: { value: 0, isUncertain: true },
                            charactersCount: { value: 0, isUncertain: true },
                            wordsCount: { value: 0, isUncertain: true },
                            linesCount: { value: 0, isUncertain: true },
                            sentencesCount: { value: 0, isUncertain: true },
                            paragraphsCount: { value: 0, isUncertain: true },
                            pagesCount: { value: 0, isUncertain: true },
                        },
                    },
                    rawPromptContent: prompt.content as string_prompt,
                    rawRequest: null,
                    rawResponse: { sample },
                };
                onProgress(result);
                return result;
            }
        }

        const result = await super.callChatModelStream(prompt, onProgress);

        if (result.rawResponse && 'sample' in result.rawResponse) {
            return result;
        }

        if (modelRequirements.metadata?.isClosed) {
            return result;
        }

        // TODO: !!!!! Return the answer and do the learning asynchronously

        // Note: [0] Asynchronously add nonce
        if (just(false)) {
            await this.#selfLearnNonce();
        }

        // Note: [1] Do the append of the samples
        await this.#selfLearnSamples(prompt, result);

        // Note: [2] Asynchronously call the teacher agent and invoke the silver link. When the teacher fails, keep just the samples
        await this.#selfLearnTeacher(prompt, result).catch((error) => {
            // !!!!! if (this.options.isVerbose) {
            console.error(colors.bgCyan('[Self-learning]') + colors.red(' Failed to learn from teacher agent'));
            console.error(error);
            // }
        });

        return result;
    }

    /**
     * Self-learning Step 0: Asynchronously with random timing add nonce to the agent source
     */
    async #selfLearnNonce(): Promise<void> {
        await forTime(Math.random() * 5000);
        // <- TODO: [🕓] `await forRandom(...)`

        console.info(colors.bgCyan('[Self-learning]') + colors.cyan(' Nonce'));

        const nonce = `NONCE ${await linguisticHash(Math.random().toString())}`;

        // Append to the current source
        const currentSource = this.agentSource.value;
        const newSource = padBook(validateBook(spaceTrim(currentSource) + '\n\n---\n\n' + nonce));
        // <- TODO: [🈲] Use some object-based way how to append on book (with sections `---`)

        // Update the source (which will trigger the subscription and update the underlying tools)
        this.agentSource.next(newSource as string_book);
    }

    /**
     * Self-learning Step 1: Appends the conversation sample to the agent source
     */
    #selfLearnSamples(prompt: Prompt, result: ChatPromptResult): void {
        console.info(colors.bgCyan('[Self-learning]') + colors.cyan(' Sampling'));

        const learningExample = spaceTrim(
            (block) => `

                USER MESSAGE
                ${block(prompt.content)}

                AGENT MESSAGE
                ${block(result.content)}

            `,
        );

        // Append to the current source
        const currentSource = this.agentSource.value;
        const newSource = padBook(validateBook(spaceTrim(currentSource) + '\n\n---\n\n' + learningExample));
        // <- TODO: [🈲] Use some object-based way how to append on book (with sections `---`)

        // Update the source (which will trigger the subscription and update the underlying tools)
        this.agentSource.next(newSource as string_book);
    }

    /**
     * Self-learning Step 2: Asynchronously call the teacher agent and invoke the silver link
     */
    async #selfLearnTeacher(prompt: Prompt, result: ChatPromptResult): Promise<void> {
        // [1] Call the teacher agent // <- !!!!! Emojis

        if (this.teacherAgent === null) {
            return;
        }

        console.info(colors.bgCyan('[Self-learning]') + colors.cyan(' Teacher'));

        const teacherResult = await this.teacherAgent.callChatModel({
            title: 'Self-learning',
            modelRequirements: {
                modelVariant: 'CHAT',
            },
            // TODO: !!!! Use prompt notation
            content: spaceTrim(
                (block) => `

                    You are a teacher agent helping another agent to learn from its interactions.

                    Here is your current client which you are teaching:

                    \`\`\`book
                    ${block(this.agentSource.value)}
                    \`\`\`

                    **And here is the latest interaction:**

                    **User:**
                    ${block(prompt.content)}

                    **Agent:**
                    ${block(result.content)}


                    **Rules:**

                    - Decide what the agent should learn from this interaction.
                    - Append new commitments at the end of the agent source.
                    - Do not modify the current agent source, just return new commitments (KNOWLEDGE, RULE, etc.).
                    - If there is nothing new to learn, return empty book code block
                    - Wrap the commitments in a book code block.
                    - Do not explain anything, just return the commitments wrapped in a book code block.
                    - Write the learned commitments in the same style and language as in the original agent source.


                    This is how book code block looks like:

                    \`\`\`book
                    KNOWLEDGE The sky is blue.
                    RULE Always be polite.
                    \`\`\`
                `,
            ) as string_prompt,
            // pipelineUrl: 'https://github.com/webgptorg/promptbook/blob/main/prompts/self-learning.ptbk.md',
            // <- TODO: !!!! Remove and `pipelineUrl` for agent purposes
            parameters: {},
        });

        console.log('!!!! teacherResult', teacherResult);

        const teacherCommitments = unwrapResult(teacherResult.content);

        if (teacherCommitments === '') {
            console.info(
                colors.bgCyan('[Self-learning]') +
                    colors.cyan(' Teacher agent did not provide new commitments to learn'),
            );
            return;
        }

        // [2] Append to the current source
        const currentSource = this.agentSource.value;
        const newSource = padBook(validateBook(spaceTrim(currentSource) + '\n\n' + teacherCommitments));
        // <- TODO: [🈲] Use some object-based way how to append on book (with sections `---`)

        // [3] Update the source
        this.agentSource.next(newSource as string_book);
    }
}

/**
 * TODO: [🧠][😰]Agent is not working with the parameters, should it be?
 */
