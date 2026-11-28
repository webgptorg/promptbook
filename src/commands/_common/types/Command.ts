import { COMMANDS } from '../../index';

/**
 * Command is one piece of the book file section which adds some logic to the task or the whole pipeline.
 * It is parsed from the markdown from ul/ol items - one command per one item.
 */
export type Command = ReturnType<(typeof COMMANDS)[number]['parse']>;
