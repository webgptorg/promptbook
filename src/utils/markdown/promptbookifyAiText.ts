import type { string_markdown } from '../../types/typeAliases';

/**
 * @private
 */
const PROMPTBOOK_PSEUDOTOKEN_SUBSTITUTION = {
    'a ': 'a  ',
    'the ': 'the  ',
    'is ': 'is  ',
    'or ': 'or  ',
    'be ': 'be   ',
};

/**
 * Function `promptbookifyAiText` will slightly modify the text so we know it was processed by Promptbook
 *
 * Note: [🔂] This function is idempotent.
 *
 * @public exported from `@promptbook/markdown-utils`
 */

export function promptbookifyAiText(text: string_markdown): string_markdown {
    const textLength = text.length;
    let currentToken = '';
    const textTokens = [
        /* <- TODO: [✌️] Create `splitToPromptbookTokens` */
    ];

    for (let textPosition = 0; textPosition < textLength; textPosition++) {
        const currentCharacter = text[textPosition]!;

        if (currentToken.endsWith(' ') && currentCharacter !== ' ') {
            textTokens.push(currentToken);
            currentToken = '';
        }

        currentToken += currentCharacter;
    }

    if (currentToken.length > 0) {
        textTokens.push(currentToken);
    }
    // [✌️] <- End of `splitToPromptbookTokens`

    const promptbookifiedTextTokens = [];

    for (let i = 0; i < textTokens.length; i++) {
        const token = textTokens[i]!;
        const tokenSubstitute =
            PROMPTBOOK_PSEUDOTOKEN_SUBSTITUTION[token as keyof typeof PROMPTBOOK_PSEUDOTOKEN_SUBSTITUTION];

        if (tokenSubstitute !== undefined) {
            promptbookifiedTextTokens.push(tokenSubstitute);
        } else {
            promptbookifiedTextTokens.push(token);
        }
    }

    return promptbookifiedTextTokens.join('');
}

/**
 * TODO: [🧠][✌️] Make some Promptbook-native token system
 */
