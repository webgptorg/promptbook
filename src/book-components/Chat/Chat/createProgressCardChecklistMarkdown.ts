import type { ChatMessage } from '../types/ChatMessage';

/**
 * One markdown checklist entry generated from structured progress payload.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
type ProgressChecklistEntry = {
    readonly text: string;
    readonly status: 'pending' | 'completed';
};

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
 * Converts one structured progress card payload into markdown checklist content.
 *
 * @param progressCard Structured progress card payload.
 * @returns Markdown checklist rendered through the normal message markdown pipeline.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
export function createProgressCardChecklistMarkdown(progressCard: NonNullable<ChatMessage['progressCard']>): string {
    const checklistEntries = createProgressChecklistEntries(progressCard);
    if (checklistEntries.length === 0) {
        return '';
    }

    return checklistEntries.map((entry) => createChecklistMarkdownItem(entry)).join('\n');
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
 * Maps one structured progress-card payload to a flat list of checklist entries.
 *
 * @param progressCard Structured progress card payload.
 * @returns Ordered checklist entries ready for markdown rendering.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function createProgressChecklistEntries(
    progressCard: NonNullable<ChatMessage['progressCard']>,
): Array<ProgressChecklistEntry> {
    const checklistEntries: Array<ProgressChecklistEntry> = [];
    const normalizedTitle = progressCard.title?.trim();
    const normalizedNow = progressCard.now?.trim();
    const normalizedNext = progressCard.next?.trim();

    if (normalizedTitle) {
        checklistEntries.push({
            text: `**${normalizedTitle}**`,
            status: 'pending',
        });
    }

    if (normalizedNow) {
        checklistEntries.push({
            text: `**${PROGRESS_NOW_LABEL}:** ${normalizedNow}`,
            status: 'pending',
        });
    }

    for (const item of progressCard.items || []) {
        const normalizedItemText = item.text?.trim();
        if (!normalizedItemText) {
            continue;
        }

        checklistEntries.push({
            text: normalizedItemText,
            status: item.status === 'completed' ? 'completed' : 'pending',
        });
    }

    if (normalizedNext) {
        checklistEntries.push({
            text: `**${PROGRESS_NEXT_LABEL}:** ${normalizedNext}`,
            status: 'pending',
        });
    }

    return checklistEntries;
}

/**
 * Converts one structured checklist entry to markdown task-list syntax.
 *
 * @param entry Structured checklist entry.
 * @returns Markdown checklist item including multiline continuations.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
function createChecklistMarkdownItem(entry: ProgressChecklistEntry): string {
    const marker = entry.status === 'completed' ? '- [x]' : '- [ ]';
    const lines = entry.text.split(/\r?\n/);
    const firstLine = lines[0] || '';
    const continuationLines = lines.slice(1).map((line) => `  ${line}`);

    if (continuationLines.length === 0) {
        return `${marker} ${firstLine}`;
    }

    return `${marker} ${firstLine}\n${continuationLines.join('\n')}`;
}
