import spaceTrim from 'spacetrim';
import type { PartialDeep } from 'type-fest';
import { string_agent_name } from '../../types/typeAliases';
import { TODO_USE } from '../organization/TODO_USE';
import { $randomToken } from './$randomToken';
import type { AgentBasicInformation } from '../../book-2.0/agent-source/AgentBasicInformation';
import { string_book, validateBook } from '../../book-2.0/agent-source/string_book';

type GenerateBookBoilerplateOptions = PartialDeep<Omit<AgentBasicInformation, 'parameters'>> & {
    /**
     * Name of the parent agent to inherit from
     *
     * @default 'Adam'
     */
    parentAgentName?: string_agent_name;
};

/**
 * Generates boilerplate for a new agent book
 *
 * Note: `$` is used to indicate that this function is not a pure function - it is not deterministic
 * Note: This function is using cryptographically secure components internally
 *
 * @public exported from `@promptbook/core`
 */
export function $generateBookBoilerplate(options?: GenerateBookBoilerplateOptions): string_book {
    // eslint-disable-next-line prefer-const
    let { agentName, parentAgentName = 'Adam', personaDescription, meta } = options || {};
    // eslint-disable-next-line prefer-const
    let { image, color, ...restMeta } = meta || {};

    if (!agentName) {
        agentName = 'Agent ' + $randomToken(20);
        // <- TODO: !!! Supercool random name generator
    }

    if (!personaDescription) {
        personaDescription = 'Friendly and helpful AI agent.';
    }

    TODO_USE(parentAgentName);
    TODO_USE(image);
    TODO_USE(color);
    TODO_USE(restMeta);

    const agentSource = validateBook(
        spaceTrim(
            (block) => `
                ${agentName}
    
                PERSONA ${block(personaDescription)}
            `,
        ),
    );

    return agentSource;
}
