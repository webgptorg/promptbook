import type { ChatMessage } from '../../types/ChatMessage';
import type { ChatParticipant } from '../../types/ChatParticipant';
import { createCitationFootnoteRenderModel } from '../../utils/createCitationFootnoteRenderModel';
import type { ParsedCitation } from '../../utils/parseCitationsFromContent';

/**
 * Fallback accent colors used when a participant does not define a custom color.
 *
 * @private internal utility of chat save format definitions
 */
const ROLE_COLOR_FALLBACKS: Record<string, string> = {
    USER: '#0ea5e9',
    ASSISTANT: '#2563eb',
    SYSTEM: '#64748b',
};

/**
 * Pattern matching inline citation references already prepared for export rendering.
 *
 * @private internal utility of chat save format definitions
 */
const CHAT_EXPORT_CITATION_REFERENCE_REGEX = /<sup data-citation-footnote="(\d+)">\d+<\/sup>/g;

/**
 * Minimal participant visuals needed by chat exports.
 *
 * @private internal utility of chat save format definitions
 */
export type ChatExportParticipantVisuals = {
    readonly displayName: string;
    readonly accentColor: string;
};

/**
 * One numbered source collected from rendered chat message citations.
 *
 * @private internal utility of chat save format definitions
 */
export type ChatExportCitationFootnote = {
    readonly number: number;
    readonly citation: ParsedCitation;
};

/**
 * Document-wide citation footnotes collected while rendering chat exports.
 *
 * @private internal utility of chat save format definitions
 */
export type ChatExportCitationFootnoteRegistry = {
    readonly footnotes: Array<ChatExportCitationFootnote>;
    readonly footnoteBySourceKey: Map<string, ChatExportCitationFootnote>;
};

/**
 * Render-ready chat message citation payload using document-wide footnote numbers.
 *
 * @private internal utility of chat save format definitions
 */
export type ChatExportCitationRenderModel = {
    readonly content: ChatMessage['content'];
    readonly footnotes: ReadonlyArray<ChatExportCitationFootnote>;
};

/**
 * Formats exported timestamps into a compact human-readable label.
 *
 * @private internal utility of chat save format definitions
 */
export function formatChatExportTimestamp(value?: string | Date): string {
    if (!value) {
        return '';
    }

    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

/**
 * Builds a participant lookup indexed by both raw and upper-cased names.
 *
 * @private internal utility of chat save format definitions
 */
export function buildChatExportParticipantMap(
    participants: ReadonlyArray<ChatParticipant>,
): ReadonlyMap<string, ChatParticipant> {
    const participantMap = new Map<string, ChatParticipant>();

    for (const participant of participants) {
        const participantName = String(participant.name);
        participantMap.set(participantName, participant);
        participantMap.set(participantName.toUpperCase(), participant);
    }

    return participantMap;
}

/**
 * Resolves the display label and accent color for one message sender.
 *
 * @private internal utility of chat save format definitions
 */
export function resolveChatExportParticipantVisuals(
    participants: ReadonlyMap<string, ChatParticipant>,
    sender: string,
): ChatExportParticipantVisuals {
    const normalizedSender = String(sender || 'SYSTEM');
    const participant = participants.get(normalizedSender) ?? participants.get(normalizedSender.toUpperCase());
    const upperSender = normalizedSender.toUpperCase();

    return {
        displayName: participant?.fullname?.trim() || normalizedSender,
        accentColor: normalizeParticipantColor(participant?.color) ?? ROLE_COLOR_FALLBACKS[upperSender] ?? '#64748b',
    };
}

/**
 * Creates an empty document-wide citation footnote registry.
 *
 * @private internal utility of chat save format definitions
 */
export function createChatExportCitationFootnoteRegistry(): ChatExportCitationFootnoteRegistry {
    return {
        footnotes: [],
        footnoteBySourceKey: new Map(),
    };
}

/**
 * Converts one message to markdown content with document-wide numbered citation references.
 *
 * @private internal utility of chat save format definitions
 */
export function createChatExportCitationRenderModel(
    citationFootnotes: ChatExportCitationFootnoteRegistry,
    message: Pick<ChatMessage, 'content' | 'citations'>,
): ChatExportCitationRenderModel {
    const localRenderModel = createCitationFootnoteRenderModel(message);
    const localToDocumentFootnoteNumber = new Map<number, number>();

    for (const localFootnote of localRenderModel.footnotes) {
        const documentFootnote = getOrCreateChatExportCitationFootnote(citationFootnotes, localFootnote.citation);
        localToDocumentFootnoteNumber.set(localFootnote.number, documentFootnote.number);
    }

    const content = localRenderModel.content.replace(
        CHAT_EXPORT_CITATION_REFERENCE_REGEX,
        (rawMarkup: string, localFootnoteNumber: string): string => {
            const documentFootnoteNumber = localToDocumentFootnoteNumber.get(Number(localFootnoteNumber));

            if (!documentFootnoteNumber) {
                return rawMarkup;
            }

            return `<sup data-citation-footnote="${documentFootnoteNumber}">${documentFootnoteNumber}</sup>`;
        },
    ) as ChatMessage['content'];

    return {
        content,
        footnotes: localRenderModel.footnotes.map((localFootnote) =>
            getOrCreateChatExportCitationFootnote(citationFootnotes, localFootnote.citation),
        ),
    };
}

/**
 * Creates a readable source label for one citation footnote.
 *
 * @private internal utility of chat save format definitions
 */
export function formatChatExportCitationFootnoteLabel(footnote: ChatExportCitationFootnote, href?: string): string {
    const source = footnote.citation.source.trim() || footnote.citation.id;
    const sourceWithLink = href && href !== source ? `${source} - ${href}` : source;
    const sourceWithExcerpt = footnote.citation.excerpt
        ? `${sourceWithLink} - ${footnote.citation.excerpt}`
        : sourceWithLink;

    return `[${footnote.number}] ${sourceWithExcerpt}`;
}

/**
 * Resolves or appends one document-wide citation footnote.
 *
 * @private internal utility of chat save format definitions
 */
function getOrCreateChatExportCitationFootnote(
    citationFootnotes: ChatExportCitationFootnoteRegistry,
    citation: ParsedCitation,
): ChatExportCitationFootnote {
    const sourceKey = normalizeCitationSourceKey(citation.source || citation.id);
    const existingFootnote = citationFootnotes.footnoteBySourceKey.get(sourceKey);

    if (existingFootnote) {
        return existingFootnote;
    }

    const footnote = {
        number: citationFootnotes.footnotes.length + 1,
        citation,
    } satisfies ChatExportCitationFootnote;

    citationFootnotes.footnotes.push(footnote);
    citationFootnotes.footnoteBySourceKey.set(sourceKey, footnote);

    return footnote;
}

/**
 * Normalizes one citation source for document-wide source de-duplication.
 *
 * @private internal utility of chat save format definitions
 */
function normalizeCitationSourceKey(source: string): string {
    return source.trim().toLowerCase();
}

/**
 * Normalizes participant colors so exported output can rely on a CSS-friendly string value.
 *
 * @private internal utility of chat save format definitions
 */
function normalizeParticipantColor(color: ChatParticipant['color']): string | undefined {
    if (!color) {
        return undefined;
    }

    if (typeof color === 'string') {
        return color;
    }

    const colorHelper = color as { toString?: () => string };
    if (typeof colorHelper.toString === 'function') {
        return colorHelper.toString();
    }

    return undefined;
}

// Note: [💞] Ignore a discrepancy between file name and entity name
