/**
 * Normalizes raw console output so the terminal UI can render it safely:
 * it removes ANSI escape sequences, strips non-printable control characters,
 * and converts carriage returns to line feeds.
 */
const ANSI_ESCAPE_CHARACTER_CODE = 27;

/**
 * Beginning of the generic ASCII control-character range that should be skipped.
 */
const ASCII_CONTROL_CHARACTER_MIN = 32;

/**
 * Delete control character code.
 */
const ASCII_DELETE_CHARACTER_CODE = 127;

/**
 * Lower bound of ANSI escape-sequence terminating characters.
 */
const ANSI_SEQUENCE_TERMINATOR_MIN = 64;

/**
 * Upper bound of ANSI escape-sequence terminating characters.
 */
const ANSI_SEQUENCE_TERMINATOR_MAX = 126;

/**
 * Normalizes raw console output so the terminal UI can render it safely:
 * it removes ANSI escape sequences, strips non-printable control characters,
 * and converts carriage returns to line feeds.
 */
export function normalizeCoderRunConsoleText(rawMessage: string): string {
    let normalizedMessage = '';

    for (let index = 0; index < rawMessage.length; index++) {
        const currentCharacter = rawMessage[index];
        const currentCharacterCode = rawMessage.charCodeAt(index);

        if (currentCharacterCode === ANSI_ESCAPE_CHARACTER_CODE && rawMessage[index + 1] === '[') {
            index = skipAnsiEscapeSequence(rawMessage, index + 2);
            continue;
        }

        if (currentCharacter === '\r') {
            normalizedMessage += '\n';
            continue;
        }

        if (currentCharacter === '\n' || currentCharacter === '\t') {
            normalizedMessage += currentCharacter;
            continue;
        }

        if (
            currentCharacterCode < ASCII_CONTROL_CHARACTER_MIN ||
            currentCharacterCode === ASCII_DELETE_CHARACTER_CODE
        ) {
            continue;
        }

        normalizedMessage += currentCharacter;
    }

    return normalizedMessage;
}

/**
 * Skips one ANSI escape sequence and returns the index of its terminating character.
 */
function skipAnsiEscapeSequence(text: string, startIndex: number): number {
    for (let index = startIndex; index < text.length; index++) {
        const currentCharacterCode = text.charCodeAt(index);
        if (
            currentCharacterCode >= ANSI_SEQUENCE_TERMINATOR_MIN &&
            currentCharacterCode <= ANSI_SEQUENCE_TERMINATOR_MAX
        ) {
            return index;
        }
    }

    return text.length;
}
