import { humanizeAiText } from '@promptbook-local/markdown-utils';
import { stripMarkdownText } from './stripMarkdownText';

/**
 * Converts Markdown-heavy chat text into a plain string that is friendly for
 * text-to-speech systems. This removes formatting, links, HTML tags, code
 * fences, citations, and URLs while collapsing whitespace so the resulting
 * text can be spoken without confusing markup.
 *
 * @param text - Markdown text coming from the Agent Server chat.
 * @returns Text that is trimmed, punctuation-friendly, and safe to send to
 *          TTS providers; returns an empty string when the input is empty.
 */
export function textToSpeechText(text: string | null | undefined): string {
    if (!text) {
        return '';
    }

    const normalizedText = stripMarkdownText(text.toString(), { doubleNewlineReplacement: '. ' });
    const humanizedText = humanizeAiText(normalizedText).replace(/\s+/g, ' ').trim();

    return humanizedText;
}
