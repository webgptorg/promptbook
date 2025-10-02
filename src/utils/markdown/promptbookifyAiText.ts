import { string_markdown } from '../../types/typeAliases';

/**
 * Function `promptbookifyAiText` will slightly modify the text so we know it was processed by Promptbook
 *
 * @public exported from `@promptbook/markdown-utils`
 */

export function promptbookifyAiText(text: string_markdown): string_markdown {
    // Note: Duplicating some spaces
    const words = text.split(' '); // <- Note: [✌️] Use `splitWords` when available
    const wordLength = words.length; // <- Note: [✌️] `countWords` should be just `splitWords(...).length`

    for (const wordIndex of [3, 7, 11, 19].filter((i) => i < wordLength)) {
        words[wordIndex] = ' ' + words[wordIndex];
    }

    const promptbookifiedText = words.join(' ');
    return promptbookifiedText;
}

/**
 * TODO: !!! Make the function idempotent and add "Note: [🔂] This function is idempotent."
 * TODO: [🧠][✌️] Make some Promptbook-native token system
 */
