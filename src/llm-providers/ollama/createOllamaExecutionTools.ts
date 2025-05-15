import Bottleneck from 'bottleneck';
import fetch from 'node-fetch';
import { DEFAULT_MAX_REQUESTS_PER_MINUTE } from '../../config';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { Usage } from '../../execution/Usage';
import { $getCurrentDate } from '../../utils/$getCurrentDate';
import { exportJson } from '../../utils/serialization/exportJson';
import type { OllamaExecutionToolsOptions } from './OllamaExecutionToolsOptions';

/**
 * Execution Tools for calling a local Ollama model via HTTP API
 *
 * @public exported from `@promptbook/ollama`
 */
export class OllamaExecutionTools implements LlmExecutionTools {
    private limiter: Bottleneck;

    public constructor(protected readonly options: OllamaExecutionToolsOptions) {
        this.limiter = new Bottleneck({
            minTime: 60000 / (options.maxRequestsPerMinute || DEFAULT_MAX_REQUESTS_PER_MINUTE),
        });
    }

    public get title(): string {
        return 'Ollama';
    }

    public get description(): string {
        return 'Local Ollama LLM via HTTP';
    }

    public async checkConfiguration(): Promise<void> {
        const res = await fetch(`${this.options.baseUrl}/models`);
        if (!res.ok) throw new UnexpectedError(`Failed to reach Ollama API at ${this.options.baseUrl}`);
    }

    public async listModels(): Promise<ReadonlyArray<AvailableModel>> {
        const res = await fetch(`${this.options.baseUrl}/models`);
        if (!res.ok) throw new UnexpectedError(`Error listing Ollama models: ${res.statusText}`);
        const data = (await res.json()) as Array<{ name: string }>;
        return data.map((m) => ({ modelName: m.name, modelVariant: 'CHAT' }));
    }

    public async callChatModel(
        prompt: Pick<import('../../types/Prompt').Prompt, 'content' | 'parameters' | 'modelRequirements'>,
    ): Promise<ChatPromptResult> {
        const { content, parameters, modelRequirements } = prompt;
        if (modelRequirements.modelVariant !== 'CHAT') {
            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
        }
        const modelName = modelRequirements.modelName || this.options.model;
        const body = {
            model: modelName,
            messages: [
                ...(modelRequirements.systemMessage
                    ? [{ role: 'system', content: modelRequirements.systemMessage }]
                    : []),
                { role: 'user', content: content },
            ],
            parameters: parameters,
        };
        const start = $getCurrentDate();
        const res = await this.limiter.schedule(() =>
            fetch(`${this.options.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }),
        );
        if (!res.ok) throw new PipelineExecutionError(`Ollama API error: ${res.statusText}`);
        const json = await res.json();
        const complete = $getCurrentDate();
        if (!json.choices || !json.choices[0]) {
            throw new PipelineExecutionError('No choices from Ollama');
        }
        const resultContent = json.choices[0].message.content;
        const usage: Usage = { price: { value: 0, isUncertain: true }, input: {}, output: {} };
        return exportJson({
            name: 'promptResult',
            message: 'Result of Ollama',
            order: [],
            value: {
                content: resultContent,
                modelName,
                timing: { start, complete },
                usage,
                rawPromptContent: content,
                rawRequest: body,
                rawResponse: json,
            },
        });
    }
}
