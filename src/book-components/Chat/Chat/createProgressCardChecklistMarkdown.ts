import type { ChatMessage } from '../types/ChatMessage';

/**
 * HTML marker injected ahead of one pending progress item.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const PENDING_PROGRESS_MARKER_HTML = '<span data-chat-progress-marker="pending" aria-hidden="true"></span>';

/**
 * HTML marker injected ahead of one completed progress item.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const COMPLETED_PROGRESS_MARKER_HTML = '<span data-chat-progress-marker="completed" aria-hidden="true"></span>';

/**
 * Human-facing label shown for "now" progress updates.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const PROGRESS_NOW_LABEL = "What I'm Doing Now";

/**
 * Human-facing label shown for "next" progress updates.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
const PROGRESS_NEXT_LABEL = "What I'll Do Next";

/**
 * One structured progress entry rendered as a list item inside the chat bubble.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
type ProgressListEntry = {
    readonly text: string;
    readonly status: 'pending' | 'completed';
};

/**
 * Converts one structured progress card payload into markdown content.
 *
 * @param progressCard Structured progress card payload.
 * @returns Markdown rendered through the normal message markdown pipeline.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export function createProgressCardChecklistMarkdown(progressCard: NonNullable<ChatMessage['progressCard']>): string {
    const markdownSections = createProgressCardMarkdownSections(progressCard);
    if (markdownSections.length === 0) {
        return '';
    }

    return markdownSections.join('\n\n');
}

/**
 * Returns true when one progress card should currently be rendered.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export function isProgressCardVisible(
    progressCard: ChatMessage['progressCard'],
): progressCard is NonNullable<ChatMessage['progressCard']> {
    return Boolean(progressCard && progressCard.isVisible !== false);
}

/**
 * Maps one structured progress-card payload to ordered markdown sections.
 *
 * @param progressCard Structured progress card payload.
 * @returns Ordered markdown sections ready for rendering.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function createProgressCardMarkdownSections(progressCard: NonNullable<ChatMessage['progressCard']>): Array<string> {
    const markdownSections: Array<string> = [];
    const normalizedTitle = progressCard.title?.trim();
    const normalizedNow = progressCard.now?.trim();
    const normalizedNext = progressCard.next?.trim();

    if (normalizedTitle) {
        markdownSections.push(`**${normalizedTitle}**`);
    }

    if (normalizedNow) {
        markdownSections.push(`**${PROGRESS_NOW_LABEL}:** ${normalizedNow}`);
    }

    const itemLines: Array<string> = [];

    for (const item of progressCard.items || []) {
        const normalizedItemText = item.text?.trim();
        if (!normalizedItemText) {
            continue;
        }

        itemLines.push(
            createProgressListMarkdownItem({
                text: normalizedItemText,
                status: item.status === 'completed' ? 'completed' : 'pending',
            }),
        );
    }

    if (itemLines.length > 0) {
        markdownSections.push(itemLines.join('\n'));
    }

    if (normalizedNext) {
        markdownSections.push(`**${PROGRESS_NEXT_LABEL}:** ${normalizedNext}`);
    }

    return markdownSections;
}

/**
 * Converts one structured progress entry to markdown list syntax with an explicit status marker.
 *
 * @param entry Structured progress entry.
 * @returns Markdown list item including multiline continuations.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function createProgressListMarkdownItem(entry: ProgressListEntry): string {
    const markerHtml = entry.status === 'completed' ? COMPLETED_PROGRESS_MARKER_HTML : PENDING_PROGRESS_MARKER_HTML;
    const lines = entry.text.split(/\r?\n/);
    const firstLine = lines[0] || '';
    const continuationLines = lines.slice(1).map((line) => `  ${line}`);

    if (continuationLines.length === 0) {
        return `- ${markerHtml} ${firstLine}`;
    }

    return `- ${markerHtml} ${firstLine}\n${continuationLines.join('\n')}`;
}
