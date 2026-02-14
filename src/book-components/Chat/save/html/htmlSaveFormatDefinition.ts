import spaceTrim from 'spacetrim';
import type { ChatMessage } from '../../types/ChatMessage';
import type { ChatParticipant } from '../../types/ChatParticipant';
import type { ChatSaveFormatDefinition } from '../_common/ChatSaveFormatDefinition';

/**
 * Creates an inline data URL for an SVG illustration so the ex-port stays self-contained.
 *
 * @private Internal helper used by `htmlSaveFormatDefinition`.
 */
function createSvgDataUrl(svg: string): string {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Utility to compute readable text color based on background
 *
 * @private Internal helper of the HTML export renderer.
 */
function getTextColor(bgColor: string): string {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 186 ? '#0f172a' : '#f8fafc';
}

const HERO_ILLUSTRATION_SVG = spaceTrim(
    () => `
    <svg width="320" height="220" viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="heroGradient" x1="0" y1="0" x2="320" y2="220">
                <stop offset="0%" stop-color="#2563eb" stop-opacity="0.9" />
                <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.45" />
            </linearGradient>
        </defs>
        <rect width="320" height="220" rx="28" fill="#0f172a" />
        <rect x="20" y="24" width="280" height="128" rx="18" fill="url(#heroGradient)" />
        <rect x="36" y="52" width="248" height="16" rx="8" fill="rgba(255,255,255,0.75)" />
        <rect x="36" y="84" width="212" height="12" rx="6" fill="rgba(255,255,255,0.55)" />
        <rect x="36" y="104" width="260" height="10" rx="5" fill="rgba(255,255,255,0.35)" />
        <circle cx="78" cy="168" r="42" fill="#22d3ee" opacity="0.85" />
        <circle cx="222" cy="178" r="32" fill="#facc15" opacity="0.8" />
        <rect x="62" y="130" width="196" height="20" rx="10" fill="rgba(255,255,255,0.15)" />
    </svg>
`,
);

const BRAND_MARK_SVG = spaceTrim(
    () => `
    <svg width="92" height="92" viewBox="0 0 92 92" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="badgeGradient" x1="0" y1="0" x2="92" y2="92">
                <stop offset="0%" stop-color="#38bdf8" />
                <stop offset="100%" stop-color="#0ea5e9" />
            </linearGradient>
        </defs>
        <rect width="92" height="92" rx="22" fill="url(#badgeGradient)" />
        <path
            d="M58 66H42V26H58C67.388 26 74 32.658 74 42C74 51.342 67.388 58 58 58H48V66Z"
            fill="white"
        />
        <path
            d="M42 66H34V26H42V66Z"
            fill="#0f172a"
            fill-opacity="0.6"
        />
    </svg>
`,
);

const HERO_ILLUSTRATION_URL = createSvgDataUrl(HERO_ILLUSTRATION_SVG);
const BRAND_MARK_URL = createSvgDataUrl(BRAND_MARK_SVG);

const ROLE_COLOR_FALLBACKS: Record<string, string> = {
    USER: '#0ea5e9',
    ASSISTANT: '#2563eb',
    SYSTEM: '#475569',
};

type ParticipantVisuals = {
    readonly displayName: string;
    readonly avatarLabel: string;
    readonly accentColor: string;
    readonly avatarSrc?: string;
};

/**
 * Escapes HTML-special characters so user-provided content stays safe.
 *
 * @private Internal helper of the HTML export renderer.
 */
function escapeHtml(value: string | number): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Splits a message body into paragraphs while preserving line breaks.
 *
 * @private Internal helper of the HTML export renderer.
 */
function formatMessageContent(content: string): string {
    if (!content.trim()) {
        return '<p class="message-empty">No text provided.</p>';
    }

    const paragraphs = content.split(/\n{2,}/).map((paragraph) => paragraph.trim());
    const rendered = paragraphs
        .filter(Boolean)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
        .join('');

    if (rendered) {
        return rendered;
    }

    return '<p class="message-empty">No text provided.</p>';
}

/**
 * Formats arbitrary date values into a consistent human-friendly label.
 *
 * @private Internal helper of the HTML export renderer.
 */
function formatTimestamp(value?: string | Date): string {
    if (!value) {
        return '';
    }

    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

/**
 * Builds a lookup map keyed by participant name to quickly resolve visuals.
 *
 * @private Internal helper of the HTML export renderer.
 */
function buildParticipantMap(participants: ReadonlyArray<ChatParticipant>): Map<string, ChatParticipant> {
    const map = new Map<string, ChatParticipant>();
    for (const participant of participants) {
        const normalized = String(participant.name);
        map.set(normalized, participant);
        map.set(normalized.toUpperCase(), participant);
    }
    return map;
}

/**
 * Normalizes participant colors (either raw strings or Color instances) into hex strings.
 *
 * @private Internal helper of the HTML export renderer.
 */
function normalizeParticipantColor(color: ChatParticipant['color']): string | undefined {
    if (!color) {
        return undefined;
    }

    if (typeof color === 'string') {
        return color;
    }

    const asHelper = color as { toString?: () => string };
    if (typeof asHelper?.toString === 'function') {
        return asHelper.toString();
    }

    return undefined;
}

/**
 * Resolves the visuals (name, avatar, accent color) for a message sender.
 *
 * @private Internal helper of the HTML export renderer.
 */
function resolveParticipantVisuals(participants: Map<string, ChatParticipant>, sender: string): ParticipantVisuals {
    const normalized = String(sender || 'SYSTEM');
    const upper = normalized.toUpperCase();
    const participant = participants.get(normalized) ?? participants.get(upper);
    const accentColor = normalizeParticipantColor(participant?.color) ?? ROLE_COLOR_FALLBACKS[upper] ?? '#2563eb';
    const displayName = participant?.fullname?.trim() || normalized;
    const avatarLabel = displayName.charAt(0).toUpperCase() || '?';

    return {
        displayName,
        avatarLabel,
        accentColor,
        avatarSrc: participant?.avatarSrc,
    };
}

/**
 * Builds markup for attachments inside a message bubble.
 *
 * @private Internal helper of the HTML export renderer.
 */
function buildAttachmentsMarkup(message: ChatMessage): string {
    const attachments = message.attachments;
    if (!attachments || attachments.length === 0) {
        return '';
    }

    const chips = attachments.map((attachment) => {
        const hasUrl = Boolean(attachment.url);
        const tag = hasUrl ? 'a' : 'span';
        const href = hasUrl ? ` href="${escapeHtml(attachment.url ?? '#')}" target="_blank" rel="noopener"` : '';
        const name = escapeHtml(attachment.name || 'Attachment');
        const meta = escapeHtml(attachment.type || 'file');

        return spaceTrim(`
            <${tag} class="attachment-chip"${href}>
                <span class="attachment-icon">📎</span>
                <span class="attachment-name">${name}</span>
                <span class="attachment-meta">${meta}</span>
            </${tag}>
        `);
    });

    return `<div class="message-attachments">${chips.join('')}</div>`;
}

/**
 * Builds markup for citations within a message bubble.
 *
 * @private Internal helper of the HTML export renderer.
 */
function buildCitationsMarkup(message: ChatMessage): string {
    const citations = message.citations;
    if (!citations || citations.length === 0) {
        return '';
    }

    const chips = citations.map((citation) => {
        const excerpt = citation.excerpt ? `<p class="citation-excerpt">${escapeHtml(citation.excerpt)}</p>` : '';
        const urlLink = citation.url
            ? `<a class="citation-link" href="${escapeHtml(
                  citation.url,
              )}" target="_blank" rel="noopener">Open source</a>`
            : '';

        return spaceTrim(`
            <article class="citation-chip">
                <div class="citation-header">
                    <span class="citation-badge">${escapeHtml(citation.id)}</span>
                    <span class="citation-source">${escapeHtml(citation.source)}</span>
                </div>
                ${excerpt}
                ${urlLink}
            </article>
        `);
    });

    return `<div class="message-citations">${chips.join('')}</div>`;
}

/**
 * Renders a single message block enriched with avatar, metadata, attachments, and citations.
 *
 * @private Internal helper of the HTML export renderer.
 */
function renderMessageBlock(message: ChatMessage, participants: Map<string, ChatParticipant>): string {
    const sender = String(message.sender ?? 'SYSTEM');
    const upperSender = sender.toUpperCase();
    const visuals = resolveParticipantVisuals(participants, sender);
    const bubbleTextColor = getTextColor(visuals.accentColor);
    const timestamp = formatTimestamp(message.createdAt);
    const durationLabel =
        typeof message.generationDurationMs === 'number' ? `${(message.generationDurationMs / 1000).toFixed(1)}s` : '';
    const attachments = buildAttachmentsMarkup(message);
    const citations = buildCitationsMarkup(message);
    const alignmentClass = upperSender === 'USER' ? 'message-user' : 'message-assistant';

    const avatarMarkup = visuals.avatarSrc
        ? `<img class="message-avatar-img" src="${escapeHtml(visuals.avatarSrc)}" alt="${escapeHtml(
              visuals.displayName,
          )}" />`
        : `<span class="message-avatar-fallback" style="background:${
              visuals.accentColor
          };color:${bubbleTextColor};">${escapeHtml(visuals.avatarLabel)}</span>`;

    return spaceTrim(`
        <article class="message-block ${alignmentClass}">
            <div class="message-avatar">${avatarMarkup}</div>
            <div class="message-card" style="--bubble-color:${visuals.accentColor};--bubble-text:${bubbleTextColor};">
                <div class="message-card-inner">
                    <header class="message-card-header">
                        <div>
                            <strong class="message-name">${escapeHtml(visuals.displayName)}</strong>
                            <span class="message-role">${escapeHtml(upperSender)}</span>
                        </div>
                        ${timestamp ? `<time class="message-time">${escapeHtml(timestamp)}</time>` : ''}
                    </header>
                    <div class="message-content">${formatMessageContent(message.content)}</div>
                    ${
                        durationLabel
                            ? `<div class="message-duration">Responded in ${escapeHtml(durationLabel)}</div>`
                            : ''
                    }
                    ${attachments}
                    ${citations}
                </div>
            </div>
        </article>
    `);
}

/**
 * HTML export plugin
 *
 * @public exported from `@promptbook/components`
 */
export const htmlSaveFormatDefinition = {
    formatName: 'html',
    label: 'Html',
    getContent: ({ title, messages, participants }) => {
        const safeTitle = escapeHtml(title || 'Chat');
        const participantLookup = buildParticipantMap(participants);
        const exportedAt = new Date();
        const exportedLabel = formatTimestamp(exportedAt);
        const uniqueParticipants = Array.from(
            new Set(
                participants
                    .map((participant) => (participant.fullname ?? String(participant.name)).trim())
                    .filter(Boolean),
            ),
        );
        const heroSubtitle =
            uniqueParticipants.length > 0
                ? `Featuring ${uniqueParticipants.slice(0, 3).join(', ')}${
                      uniqueParticipants.length > 3 ? ' and more' : ''
                  }`
                : 'Featuring your conversation';
        const participantCount = new Set(participants.map((participant) => String(participant.name).trim())).size;
        const statCards = [
            { label: 'Messages', value: messages.length.toString() },
            { label: 'Participants', value: participantCount.toString() },
            { label: 'Exported on', value: exportedLabel },
        ];
        const messageMarkup =
            messages.length > 0
                ? messages.map((message) => renderMessageBlock(message, participantLookup)).join('')
                : '<div class="empty-state">No messages yet. Send a note to capture this chat.</div>';

        return spaceTrim(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>${safeTitle} · Promptbook</title>
                <style>
                    :root {
                        color-scheme: dark;
                    }

                    * {
                        box-sizing: border-box;
                    }

                    body {
                        margin: 0;
                        background: radial-gradient(circle at top, rgba(14, 165, 233, 0.18), transparent 55%),
                            #030617;
                        font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
                        color: #f8fafc;
                    }

                    a {
                        color: inherit;
                        text-decoration: none;
                    }

                    .export-shell {
                        max-width: 1040px;
                        margin: 0 auto;
                        padding: 40px 24px 64px;
                        display: flex;
                        flex-direction: column;
                        gap: 32px;
                    }

                    .hero {
                        background: rgba(15, 23, 42, 0.85);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 32px;
                        padding: 32px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 32px;
                        backdrop-filter: blur(18px);
                        box-shadow: 0 30px 60px rgba(15, 23, 42, 0.65);
                    }

                    .hero-content h1 {
                        margin: 8px 0;
                        font-size: 32px;
                        line-height: 1.2;
                        font-weight: 600;
                    }

                    .hero-edge {
                        color: rgba(255, 255, 255, 0.7);
                    }

                    .hero-kicker {
                        letter-spacing: 0.18em;
                        text-transform: uppercase;
                        font-size: 12px;
                        color: rgba(248, 250, 252, 0.7);
                        margin: 0;
                    }

                    .hero-subtitle {
                        margin: 0;
                        font-size: 16px;
                        color: rgba(248, 250, 252, 0.65);
                    }

                    .stat-grid {
                        margin-top: 18px;
                        display: flex;
                        gap: 16px;
                        flex-wrap: wrap;
                    }

                    .stat-card {
                        background: rgba(15, 23, 42, 0.6);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        border-radius: 18px;
                        padding: 12px 18px;
                        min-width: 120px;
                    }

                    .stat-value {
                        display: block;
                        font-size: 20px;
                        font-weight: 600;
                    }

                    .stat-label {
                        font-size: 12px;
                        color: rgba(248, 250, 252, 0.55);
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                    }

                    .hero-visual {
                        display: grid;
                        place-items: center;
                        gap: 12px;
                    }

                    .hero-illustration {
                        width: 280px;
                        border-radius: 20px;
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        box-shadow: 0 18px 36px rgba(2, 6, 23, 0.8);
                    }

                    .hero-badge {
                        width: 70px;
                        height: 70px;
                    }

                    .chat-panel {
                        background: rgba(15, 23, 42, 0.95);
                        border-radius: 28px;
                        padding: 32px;
                        border: 1px solid rgba(255, 255, 255, 0.06);
                        box-shadow: 0 30px 50px rgba(2, 6, 23, 0.7);
                    }

                    .chat-panel-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 16px;
                        margin-bottom: 18px;
                    }

                    .chat-panel-subhead {
                        margin: 0;
                        font-size: 14px;
                        color: rgba(248, 250, 252, 0.75);
                    }

                    .chat-panel-meta {
                        display: flex;
                        gap: 12px;
                        font-size: 13px;
                        color: rgba(248, 250, 252, 0.55);
                    }

                    .chat-messages {
                        display: flex;
                        flex-direction: column;
                        gap: 24px;
                    }

                    .message-block {
                        display: flex;
                        gap: 16px;
                        align-items: flex-start;
                    }

                    .message-block.message-user {
                        flex-direction: row-reverse;
                    }

                    .message-card {
                        flex: 1;
                    }

                    .message-card-inner {
                        background: radial-gradient(circle at top, rgba(255, 255, 255, 0.08), transparent),
                            var(--bubble-color, #2563eb);
                        border-radius: 24px;
                        padding: 20px;
                        box-shadow: 0 16px 32px rgba(3, 7, 18, 0.6);
                        color: var(--bubble-text, #f8fafc);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                    }

                    .message-card-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: baseline;
                        margin-bottom: 12px;
                        gap: 12px;
                    }

                    .message-name {
                        font-size: 14px;
                        margin: 0;
                    }

                    .message-role {
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.14em;
                        margin-left: 8px;
                        opacity: 0.75;
                    }

                    .message-time {
                        font-size: 11px;
                        opacity: 0.7;
                    }

                    .message-content {
                        font-size: 16px;
                        line-height: 1.7;
                    }

                    .message-duration {
                        margin-top: 10px;
                        font-size: 12px;
                        opacity: 0.65;
                    }

                    .message-avatar {
                        width: 52px;
                        height: 52px;
                        flex-shrink: 0;
                        border-radius: 12px;
                        background: rgba(255, 255, 255, 0.04);
                        display: grid;
                        place-items: center;
                        position: relative;
                    }

                    .message-avatar-img {
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        object-fit: cover;
                    }

                    .message-avatar-fallback {
                        width: 44px;
                        height: 44px;
                        border-radius: 50%;
                        display: grid;
                        place-items: center;
                        font-weight: 600;
                        font-size: 18px;
                        border: 2px solid rgba(255, 255, 255, 0.2);
                    }

                    .message-attachments {
                        margin-top: 14px;
                        display: flex;
                        gap: 10px;
                        flex-wrap: wrap;
                    }

                    .attachment-chip {
                        padding: 8px 12px;
                        background: rgba(15, 23, 42, 0.55);
                        border-radius: 14px;
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-size: 13px;
                    }

                    .attachment-icon {
                        font-size: 14px;
                    }

                    .attachment-name {
                        font-weight: 500;
                    }

                    .attachment-meta {
                        font-size: 11px;
                        opacity: 0.6;
                    }

                    .message-citations {
                        margin-top: 18px;
                        display: grid;
                        gap: 10px;
                    }

                    .citation-chip {
                        border-radius: 16px;
                        background: rgba(255, 255, 255, 0.03);
                        padding: 12px 16px;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                    }

                    .citation-header {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.2em;
                    }

                    .citation-badge {
                        background: rgba(15, 23, 42, 0.4);
                        padding: 2px 8px;
                        border-radius: 999px;
                        font-weight: 600;
                    }

                    .citation-source {
                        opacity: 0.65;
                    }

                    .citation-excerpt {
                        margin: 8px 0 0;
                        font-size: 14px;
                        line-height: 1.6;
                    }

                    .citation-link {
                        margin-top: 6px;
                        display: inline-flex;
                        font-size: 12px;
                        color: #38bdf8;
                    }

                    .empty-state {
                        text-align: center;
                        color: rgba(248, 250, 252, 0.6);
                        padding: 40px;
                        border-radius: 20px;
                        background: rgba(15, 23, 42, 0.6);
                        border: 1px dashed rgba(255, 255, 255, 0.2);
                    }

                    .export-footer {
                        border-radius: 26px;
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        padding: 24px 32px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.4));
                        box-shadow: 0 24px 40px rgba(2, 6, 23, 0.7);
                    }

                    .footer-meta {
                        margin: 4px 0 0;
                        opacity: 0.7;
                        font-size: 13px;
                    }

                    .footer-brand {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }

                    .footer-brand img {
                        width: 46px;
                        height: 46px;
                    }

                    .footer-brand span {
                        opacity: 0.65;
                        font-size: 13px;
                    }

                    @media (max-width: 960px) {
                        .hero {
                            flex-direction: column;
                            text-align: center;
                        }

                        .hero-visual {
                            order: -1;
                        }

                        .message-block {
                            flex-direction: column;
                        }

                        .message-block.message-user {
                            flex-direction: column;
                        }
                    }

                    @media (max-width: 640px) {
                        .chat-panel {
                            padding: 24px;
                        }

                        .export-shell {
                            padding: 28px 16px 48px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="export-shell">
                    <header class="hero">
                        <div class="hero-content">
                            <p class="hero-kicker">Chat export</p>
                            <h1>Conversation with ${safeTitle}</h1>
                            <p class="hero-subtitle">${escapeHtml(heroSubtitle)}</p>
                            <div class="stat-grid">
                                ${statCards
                                    .map((stat) =>
                                        spaceTrim(`
                                                <div class="stat-card">
                                                    <span class="stat-value">${escapeHtml(stat.value)}</span>
                                                    <span class="stat-label">${escapeHtml(stat.label)}</span>
                                                </div>
                                            `),
                                    )
                                    .join('')}
                            </div>
                        </div>
                        <div class="hero-visual">
                            <img class="hero-illustration" src="${HERO_ILLUSTRATION_URL}" alt="" aria-hidden="true" />
                            <img class="hero-badge" src="${BRAND_MARK_URL}" alt="Promptbook badge" width="72" height="72" />
                        </div>
                    </header>
                    <section class="chat-panel">
                        <div class="chat-panel-header">
                            <div>
                                <p class="chat-panel-subhead">Captured messages, ready to share</p>
                            </div>
                            <div class="chat-panel-meta">
                                <span>${escapeHtml(`${messages.length} messages`)}</span>
                                <span>${escapeHtml(`${participantCount} participants`)}</span>
                            </div>
                        </div>
                        <div class="chat-messages">
                            ${messageMarkup}
                        </div>
                    </section>
                    <footer class="export-footer">
                        <div>
                            <p>Generated by Promptbook</p>
                            <p class="footer-meta">Exported ${escapeHtml(exportedLabel)}</p>
                        </div>
                        <div class="footer-brand">
                            <img src="${BRAND_MARK_URL}" alt="" aria-hidden="true" />
                            <div>
                                <strong>ptbk.io</strong>
                                <span>Share with your team</span>
                            </div>
                        </div>
                    </footer>
                </div>
            </body>
            </html>
        `);
    },
    mimeType: 'text/html',
    fileExtension: 'html',
} as const satisfies ChatSaveFormatDefinition;

/**
 * TODO: Enhance branding
 */
