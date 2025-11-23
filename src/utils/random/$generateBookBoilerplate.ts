import spaceTrim from 'spacetrim';
import type { PartialDeep } from 'type-fest';
import type { AgentBasicInformation } from '../../book-2.0/agent-source/AgentBasicInformation';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { validateBook } from '../../book-2.0/agent-source/string_book';
import type { string_agent_name_in_book } from '../../types/typeAliases';
import { TODO_USE } from '../organization/TODO_USE';
import { $randomAgentPersona } from './$randomAgentPersona';
import { $randomFullnameWithColor } from './$randomFullnameWithColor';

type GenerateBookBoilerplateOptions = PartialDeep<Omit<AgentBasicInformation, 'parameters'>> & {
    /**
     * Name of the parent agent to inherit from
     *
     * @default 'Adam'
     */
    parentAgentName?: string_agent_name_in_book;
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
        const randomFullnameWithColor = $randomFullnameWithColor();
        agentName = randomFullnameWithColor.fullname as string_agent_name_in_book;
        color = color || randomFullnameWithColor.color;
    }

    if (!personaDescription) {
        personaDescription = $randomAgentPersona();
    }

    TODO_USE(parentAgentName);
    TODO_USE(image);
    TODO_USE(color);
    TODO_USE(restMeta);

    const agentSource = validateBook(
        spaceTrim(
            (block) => `
                ${agentName}
    
                META COLOR ${color || '#3498db' /* <- TODO: [🧠] !!!! Best default color */}
                PERSONA ${block(personaDescription!)}
            `,
        ),
        // <- TODO: [🧠] !!!! Also add `META IMAGE` with some cool AI-generated avatar image
    );

    return agentSource;
}

/**
 * TODO: [🤶] Maybe export through `@promptbook/utils` or `@promptbook/random` package
 */
