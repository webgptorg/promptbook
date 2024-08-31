import { COMMANDS } from '../../index';

/**
 * Command is one piece of the template which adds some logic to the template or the whole pipeline.
 * It is parsed from the markdown from ul/ol items - one command per one item.
 */
export type Command = ReturnType<typeof COMMANDS[number]['parse']>;
