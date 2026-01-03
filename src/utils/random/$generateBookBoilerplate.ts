import spaceTrim from 'spacetrim';
import type { PartialDeep } from 'type-fest';
import type { AgentBasicInformation } from '../../book-2.0/agent-source/AgentBasicInformation';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { validateBook } from '../../book-2.0/agent-source/string_book';
import { PROMPTBOOK_COLOR } from '../../config';
import type { string_agent_name_in_book } from '../../types/typeAliases';
import { TODO_USE } from '../organization/TODO_USE';
import { $randomAgentPersona } from './$randomAgentPersona';
import { $randomAgentRule } from './$randomAgentRule';
import { getNamePool } from './getNamePool';

type GenerateBookBoilerplateOptions = PartialDeep<Omit<AgentBasicInformation, 'parameters'>> & {
    /**
     * Name of the parent agent to inherit from
     *
     * @default 'Adam'
     */
    parentAgentName?: string_agent_name_in_book;

    /**
     * Name pool to use for generating agent name
     *
     * @default 'ENGLISH'
     */
    namePool?: string;

    /**
     * Initial rules for the agent
     */
    initialRules?: Array<string>;
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
    const { parentAgentName = 'Adam', initialRules = [], meta, namePool = 'ENGLISH' } = options || {};
    let { agentName, personaDescription } = options || {};
    const { image, ...restMeta } = meta || {};
    let { color } = meta || {};

    if (!agentName) {
        const namePoolInstance = getNamePool(namePool);
        const randomFullnameWithColor = namePoolInstance.generateName();
        agentName = randomFullnameWithColor.fullname as string_agent_name_in_book;
        color = color || randomFullnameWithColor.color;
    }

    if (!personaDescription) {
        personaDescription = $randomAgentPersona(namePool);
    }

    if (initialRules.length === 0) {
        initialRules.push($randomAgentRule(namePool));
    }

    TODO_USE(parentAgentName);
    TODO_USE(image);
    TODO_USE(color);
    TODO_USE(restMeta);

    const agentSource = validateBook(
        spaceTrim(
            (block) => `
                ${agentName}
    
                META COLOR ${color || PROMPTBOOK_COLOR.toHex()}
                PERSONA ${block(personaDescription!)}
                ${block(initialRules.map((rule) => `RULE ${rule}`).join('\n'))}
            `,
        ),
        // <- TODO: [🧠] [🐱‍🚀] Also add `META IMAGE` with some cool AI-generated avatar image
    );
    // Note: `META FONT Playfair Display, sans-serif` was removed for now
    // <- TODO: [🈲] Simple and object-constructive way how to create new books

    return agentSource;
}

/**
 * TODO: [🤶] Maybe export through `@promptbook/utils` or `@promptbook/random` package
 */
