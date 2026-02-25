import colors from 'colors';
import spaceTrim from 'spacetrim';
import { forTime } from 'waitasecond';
import { linguisticHash, unwrapResult } from '../../../_packages/utils.index';
import { extractOpenTeacherInstructions } from '../../../book-2.0/agent-source/extractOpenTeacherInstructions';
import { padBook } from '../../../book-2.0/agent-source/padBook';
import { parseAgentSource } from '../../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { validateBook } from '../../../book-2.0/agent-source/string_book';
import type { ChatPromptResult } from '../../../execution/PromptResult';
import type { Prompt } from '../../../types/Prompt';
import type { SelfLearningCommitmentTypeCounts, SelfLearningTeacherSummary } from '../../../types/ToolCall';
import type { string_prompt } from '../../../types/typeAliases';
import { just } from '../../../utils/organization/just';

/**
 * Mutable commitment breakdown used while building self-learning summaries.
 *
 * @private type of Agent
 */
type MutableSelfLearningCommitmentTypeCounts = {
    total: number;
    knowledge: number;
    rule: number;
    persona: number;
    other: number;
};

/**
 * Agent interface used for teacher-based self-learning calls.
 *
 * @private type of Agent
 */
type SelfLearningTeacherAgent = {
    callChatModel(prompt: Prompt): Promise<ChatPromptResult>;
};

/**
 * Options required to drive the self-learning workflow.
 *
 * @private type of Agent
 */
type SelfLearningManagerOptions = {
    teacherAgent: SelfLearningTeacherAgent | null;
    getAgentSource: () => string_book;
    updateAgentSource: (source: string_book) => void;
};

/**
 * Narrow shape used to read OpenAI-compatible `response_format` from prompt requirements.
 *
 * @private type of Agent
 */
type JsonModeResponseFormat = {
    type?: string;
    json_schema?: { schema?: unknown; name?: string };
};

/**
 * Coordinates the Agent self-learning workflow that was extracted from the main class.
 *
 * @private helper for Agent
 */
export class SelfLearningManager {
    private readonly teacherAgent: SelfLearningTeacherAgent | null;

    public constructor(private readonly options: SelfLearningManagerOptions) {
        this.teacherAgent = options.teacherAgent;
    }

    /**
     * Runs nonce, sampling, and teacher steps for every interaction that should learn.
     *
     * @param prompt Received prompt for the interaction
     * @param result Response produced by the agent
     * @returns Teacher summary or null when no teacher is configured
     * @private helper of Agent
     */
    public async runSelfLearning(prompt: Prompt, result: ChatPromptResult): Promise<SelfLearningTeacherSummary | null> {
        if (just(false)) {
            await this.appendNonce();
        }

        this.appendSample(prompt, result);

        if (this.teacherAgent === null) {
            return null;
        }

        try {
            return await this.callTeacher(prompt, result);
        } catch (error) {
            console.error(colors.bgCyan('[Self-learning]') + colors.red(' Failed to learn from teacher agent'));
            console.error(error);
            return buildTeacherSummary('', true);
        }
    }

    /**
     * Appends the nonce section to the agent source with slight delay to avoid thundering herd lookups.
     *
     * @private helper of Agent
     */
    private async appendNonce(): Promise<void> {
        await forTime(Math.random() * 5000);
        console.info(colors.bgCyan('[Self-learning]') + colors.cyan(' Nonce'));

        const nonce = `NONCE ${await linguisticHash(Math.random().toString())}`;
        this.appendToAgentSource('\n\n---\n\n' + nonce);
    }

    /**
     * Appends the recent user/agent exchange as a new sample.
     *
     * @private helper of Agent
     */
    private appendSample(prompt: Prompt, result: ChatPromptResult): void {
        console.info(colors.bgCyan('[Self-learning]') + colors.cyan(' Sampling'));

        // Extract response format info if available (for JSON schema)
        // Note: responseFormat is only available on ChatModelRequirements and similar, not on CompletionModelRequirements
        const modelRequirements = prompt.modelRequirements as {
            responseFormat?: JsonModeResponseFormat;
        };
        const responseFormat = modelRequirements.responseFormat;
        const hasJsonSchema = isJsonSchemaResponseFormat(responseFormat);

        let userMessageContent = prompt.content;

        // If response_format with json_schema was requested, include that info in the sample
        if (isJsonSchemaResponseFormat(responseFormat)) {
            const jsonSchema = responseFormat.json_schema;
            const schemaJson = JSON.stringify(jsonSchema, null, 4);

            userMessageContent = spaceTrim(
                (block) => `
                    ${block(prompt.content)}

                    NOTE Request was made through OpenAI Compatible API with \`response_format\` of type \`json_schema\` with the following schema:
                    \`\`\`json
                    ${block(schemaJson)}
                    \`\`\`
                `,
            );
        }

        const learningExample = spaceTrim(
            (block) => `

                USER MESSAGE
                ${block(userMessageContent)}

                AGENT MESSAGE
                ${block(formatAgentMessageForJsonMode(result.content, hasJsonSchema))}

            `,
        );

        this.appendToAgentSource('\n\n' + learningExample);
    }

    /**
     * Calls the teacher agent, appends its commitments, and summarizes the results.
     *
     * @private helper of Agent
     */
    private async callTeacher(prompt: Prompt, result: ChatPromptResult): Promise<SelfLearningTeacherSummary> {
        console.info(colors.bgCyan('[Self-learning]') + colors.cyan(' Teacher'));

        const agentSource = this.options.getAgentSource();
        const { initialMessage } = parseAgentSource(agentSource);
        const isInitialMessageMissing = initialMessage === null;

        const modelRequirements = prompt.modelRequirements as {
            responseFormat?: JsonModeResponseFormat;
        };
        const usesJsonSchemaMode = isJsonSchemaResponseFormat(modelRequirements.responseFormat);
        const formattedAgentMessage = formatAgentMessageForJsonMode(result.content, usesJsonSchemaMode);

        const teacherInstructions = extractOpenTeacherInstructions(agentSource);
        const teacherInstructionsSection = teacherInstructions
            ? spaceTrim(
                  (block) => `
                      **Teacher instructions:**
                      ${block(teacherInstructions)}
                  `,
              )
            : '';

        const teacherPromptContent = spaceTrim(
            (block) => `

                You are a teacher agent helping another agent to learn from its interactions.

                Here is your current client which you are teaching:

                \`\`\`book
                ${block(agentSource)}
                \`\`\`

                **And here is the latest interaction:**

                **User:**
                ${block(prompt.content)}

                **Agent:**
                ${block(formattedAgentMessage)}

                ${teacherInstructionsSection ? `\n${teacherInstructionsSection}` : ''}

                **Rules:**

                - Decide what the agent should learn from this interaction.
                - Append new commitments at the end of the agent source.
                - Do not modify the current agent source, just return new commitments (KNOWLEDGE, RULE, etc.).
                - If there is nothing new to learn, return empty book code block
                - Wrap the commitments in a book code block.
                - Do not explain anything, just return the commitments wrapped in a book code block.
                - Write the learned commitments in the same style and language as in the original agent source.
                ${
                    usesJsonSchemaMode
                        ? '- This interaction used JSON mode, so the agent answer should stay as a formatted JSON code block.'
                        : ''
                }
                ${
                    isInitialMessageMissing
                        ? spaceTrim(`
                - The agent source does not have an INITIAL MESSAGE defined, generate one.
                - The INITIAL MESSAGE should be welcoming, informative about the agent capabilities and also should give some quick options to start the conversation with the agent.
                `)
                        : ''
                }


                This is how book code block looks like:

                \`\`\`book
                KNOWLEDGE The sky is blue.
                RULE Always be polite.
                \`\`\`
            `,
        ) as string_prompt;

        const teacherResult = await this.teacherAgent!.callChatModel({
            title: 'Self-learning',
            modelRequirements: {
                modelVariant: 'CHAT',
            },
            content: teacherPromptContent,
            parameters: {},
        });

        console.log('!!!! teacherResult', teacherResult);

        const teacherCommitments = unwrapResult(teacherResult.content);

        if (teacherCommitments === '') {
            console.info(
                colors.bgCyan('[Self-learning]') +
                    colors.cyan(' Teacher agent did not provide new commitments to learn'),
            );
            return buildTeacherSummary('', true);
        }

        this.appendToAgentSource('\n\n' + teacherCommitments);

        return buildTeacherSummary(teacherCommitments, true);
    }

    /**
     * Appends a new fragment to the agent source and triggers normalization.
     *
     * @param section Fragment that should be appended
     * @private helper of Agent
     */
    private appendToAgentSource(section: string): void {
        const currentSource = this.options.getAgentSource();
        const newSource = padBook(validateBook(spaceTrim(currentSource) + section));
        this.options.updateAgentSource(newSource as string_book);
    }
}

/**
 * Determines whether the interaction runs in OpenAI-compatible JSON schema mode.
 *
 * @param responseFormat Prompt response format requirements
 * @returns True when JSON schema mode is active
 * @private function of Agent
 */
function isJsonSchemaResponseFormat(
    responseFormat: JsonModeResponseFormat | undefined,
): responseFormat is JsonModeResponseFormat & { type: 'json_schema' } {
    return responseFormat !== undefined && typeof responseFormat === 'object' && responseFormat.type === 'json_schema';
}

/**
 * Formats the agent answer for self-learning snapshots in JSON mode.
 *
 * @param content Original agent answer content
 * @param isJsonMode Whether the interaction requested JSON schema output
 * @returns Agent answer, wrapped in a formatted JSON code block when possible
 * @private function of Agent
 */
function formatAgentMessageForJsonMode(content: string, isJsonMode: boolean): string {
    if (!isJsonMode) {
        return content;
    }

    const parsedJson = tryParseJson(content);
    if (parsedJson === null) {
        return spaceTrim(
            (block) => `
                \`\`\`json
                ${block(content)}
                \`\`\`
            `,
        );
    }

    return spaceTrim(
        (block) => `
            \`\`\`json
            ${block(JSON.stringify(parsedJson, null, 4))}
            \`\`\`
        `,
    );
}

/**
 * Tries to parse JSON content and returns null when invalid.
 *
 * @param content Text to parse as JSON
 * @returns Parsed JSON value or null when parsing fails
 * @private function of Agent
 */
function tryParseJson(content: string): unknown | null {
    try {
        return JSON.parse(content);
    } catch {
        return null;
    }
}

/**
 * Creates an empty commitment breakdown for self-learning summaries.
 *
 * @private function of Agent
 */
function createEmptySelfLearningCommitmentCounts(): MutableSelfLearningCommitmentTypeCounts {
    return {
        total: 0,
        knowledge: 0,
        rule: 0,
        persona: 0,
        other: 0,
    };
}

/**
 * Normalizes teacher commitments into trimmed, display-ready lines.
 *
 * @param commitments Raw teacher output
 * @private function of Agent
 */
function getTeacherCommitmentLines(commitments: string): Array<string> {
    return commitments
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line !== '---' && !line.startsWith('```'));
}

/**
 * Summarizes teacher commitment lines into user-friendly counts for self-learning.
 *
 * @param lines Parsed teacher commitment lines
 * @private function of Agent
 */
function summarizeTeacherCommitmentLines(lines: ReadonlyArray<string>): SelfLearningCommitmentTypeCounts {
    const counts = createEmptySelfLearningCommitmentCounts();

    for (const line of lines) {
        const keyword = line.split(/\s+/)[0]?.toUpperCase() ?? '';
        if (!/^[A-Z][A-Z_-]*$/.test(keyword)) {
            continue;
        }

        counts.total += 1;

        if (keyword === 'KNOWLEDGE') {
            counts.knowledge += 1;
        } else if (keyword === 'RULE') {
            counts.rule += 1;
        } else if (keyword === 'PERSONA') {
            counts.persona += 1;
        } else {
            counts.other += 1;
        }
    }

    return counts;
}

/**
 * Builds the teacher summary payload for the self-learning tool call.
 *
 * @param commitments Raw teacher commitments
 * @param used Whether the teacher was invoked
 * @returns Summary of learned commitments
 * @private function of Agent
 */
function buildTeacherSummary(commitments: string, used: boolean): SelfLearningTeacherSummary {
    const commitmentLines = getTeacherCommitmentLines(commitments);

    return {
        used,
        commitmentTypes: summarizeTeacherCommitmentLines(commitmentLines),
        commitments: commitmentLines.length > 0 ? commitmentLines : undefined,
    };
}
