import { BehaviorSubject } from 'rxjs';
import { AgentLlmExecutionTools, getSingleLlmExecutionTools, parseAgentSource } from '../../_packages/core.index';
import {
    AgentBasicInformation,
    BookParameter,
    LlmExecutionTools,
    string_agent_name,
    string_book,
    string_url_image,
} from '../../_packages/types.index';
import { asUpdatableSubject } from '../../types/Updatable';
import { AgentOptions } from './AgentOptions';

/**
 * Note: !!!! `Agent` vs `LlmExecutionTools`
 *
 *
 * @public exported from `@promptbook/core`
 */
export class Agent implements AgentBasicInformation {
    /**
     * Name of the agent
     */
    public agentName: string_agent_name | null = null;

    /**
     * Description of the agent
     */
    public personaDescription: string | null = null;

    /**
     * Metadata like image or color
     */
    public meta: {
        image?: string_url_image;
        link?: string;
        title?: string;
        description?: string;
        [key: string]: string | undefined;
    } = {};

    /**
     * Not used in Agent, always returns empty array
     */
    get parameters(): BookParameter[] {
        return [
            /* [😰] */
        ];
    }

    public readonly agentSource: BehaviorSubject<string_book>;

    constructor(private readonly options: AgentOptions) {
        this.agentSource = asUpdatableSubject(options.agentSource);
        this.agentSource.subscribe((source) => {
            const { agentName, personaDescription, meta } = parseAgentSource(source);
            this.agentName = agentName;
            this.personaDescription = personaDescription;
            this.meta = { ...this.meta, ...meta };
        });
    }

    /**
     * Creates LlmExecutionTools which exposes the agent as a model
     */
    getLlmExecutionTools(): LlmExecutionTools {
        const llmTools = new AgentLlmExecutionTools(
            getSingleLlmExecutionTools(this.options.executionTools.llm),
            this.agentSource.value, // <- TODO: !!!! Allow to pass BehaviorSubject<string_book> OR refresh llmExecutionTools.callChat on agentSource change
        );

        // TODO: !!!! Add `Agent` simple "mocked" learning by appending to agent source
        // TODO: !!!! Add `Agent` learning by promptbookAgent

        return llmTools;
    }
}

/**
 * TODO: [🧠][😰]Agent is not working with the parameters, should it be?
 * TODO: !!! Agent on remote server
 */
