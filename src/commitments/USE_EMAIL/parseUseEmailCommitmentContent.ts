import { spaceTrim } from 'spacetrim';
import { isValidEmail } from '../../_packages/utils.index';

/**
 * Lightweight email token matcher used for `USE EMAIL` first-line parsing.
 *
 * @private internal USE EMAIL constant
 */
const EMAIL_TOKEN_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/**
 * Parsed payload of one `USE EMAIL` commitment.
 *
 * @private internal USE EMAIL type
 */
export type ParsedUseEmailCommitmentContent = {
    senderEmail: string | null;
    senderEmailRaw: string | null;
    instructions: string;
};

/**
 * Parses `USE EMAIL` commitment content into optional sender email + additional instructions.
 *
 * Examples:
 * - `agent@example.com`
 * - `agent@example.com Keep emails concise`
 * - `Keep emails concise`
 *
 * @private internal utility of USE EMAIL commitment
 */
export function parseUseEmailCommitmentContent(content: string): ParsedUseEmailCommitmentContent {
    const trimmedContent = spaceTrim(content);
    if (!trimmedContent) {
        return {
            senderEmail: null,
            senderEmailRaw: null,
            instructions: '',
        };
    }

    const lines = trimmedContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length === 0) {
        return {
            senderEmail: null,
            senderEmailRaw: null,
            instructions: '',
        };
    }

    const firstLine = lines[0] || '';
    const senderMatch = firstLine.match(EMAIL_TOKEN_PATTERN);
    const senderEmailRaw = senderMatch?.[0] || null;
    const senderEmail = senderEmailRaw && isValidEmail(senderEmailRaw) ? senderEmailRaw : null;

    let firstLineWithoutSender = firstLine;
    if (senderEmailRaw) {
        const matchIndex = firstLine.indexOf(senderEmailRaw);
        const prefix = firstLine.slice(0, matchIndex).trim();
        const suffix = firstLine.slice(matchIndex + senderEmailRaw.length).trim();
        firstLineWithoutSender = [prefix, suffix].filter(Boolean).join(' ').trim();
    }

    const instructionLines = [firstLineWithoutSender, ...lines.slice(1)].filter(Boolean);
    const instructions = instructionLines.join('\n').trim();

    return {
        senderEmail,
        senderEmailRaw,
        instructions,
    };
}
