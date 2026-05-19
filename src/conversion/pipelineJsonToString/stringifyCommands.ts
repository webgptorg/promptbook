import type { string_markdown } from '../../types/string_markdown';

/**
 * Renders commands as markdown bullet items.
 *
 * @private internal utility of `pipelineJsonToString`
 */
export function stringifyCommands(commands: ReadonlyArray<string>): string_markdown {
    return commands.map((command) => `- ${command}`).join('\n');
}
