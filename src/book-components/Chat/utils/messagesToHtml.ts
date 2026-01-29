import spaceTrim from 'spacetrim';
import { PROMPTBOOK_LOGO_URL } from '../../../config';
import { escapeHtml } from '../../_common/react-utils/escapeHtml';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { getPromptbookBranding } from './getPromptbookBranding';

/**
 * Converts chat messages to HTML format
 *
 * @private utility of `<Chat/>` component
 */
export function messagesToHtml(
    messages: ChatMessage[],
    shareUrl: string,
    qrDataUrl?: string | null,
    headerMarkdown?: string,
    participants?: ReadonlyArray<ChatParticipant>,
): string {
    const branding = getPromptbookBranding(shareUrl);
    const customHeaderHtml = headerMarkdown ? `<div class="customHeader">${escapeHtml(headerMarkdown)}</div>` : '';
    const content = messages
        .map((message) => {
            const participant = (participants || []).find((participant) => participant.name === message.sender);
            const isUser = participant?.isMe || false;
            const senderClass = isUser ? 'user' : 'assistant';
            const name = participant?.fullname || message.sender;
            const avatarSrc = participant?.avatarSrc;
            const messageContent = message.content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>');

            return spaceTrim(`
                <div class="message ${senderClass}">
                    <div class="senderRow">
                        ${
                            avatarSrc
                                ? `<img class="avatar" src="${avatarSrc}" alt="${escapeHtml(name.toString())}"/>`
                                : ''
                        }
                        <div class="sender">${escapeHtml(name.toString())}:</div>
                    </div>
                    <div class="content">${messageContent}</div>
                </div>
            `);
        })
        .join('');

    return spaceTrim(
        (block) => `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Chat History - Promptbook Studio</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6;
                        max-width: 900px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f8f9fa;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 24px;
                        padding: 16px;
                        background: linear-gradient(135deg, #0084ff 0%, #0066cc 100%);
                        color: white;
                        border-radius: 12px;
                    }
                    .brand {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 16px;
                        margin-bottom: 8px;
                    }
                    .brand-logo {
                        height: 48px;
                        width: auto;
                        border-radius: 8px;
                        background: rgba(255,255,255,0.9);
                        padding: 6px;
                    }
                    .share {
                        text-align: center;
                        margin: 8px 0;
                        font-size: 14px;
                    }
                    .share a {
                        color: #0b6cff;
                        text-decoration: underline;
                        word-break: break-all;
                    }
                    .qr {
                        text-align: center;
                        margin: 8px 0 16px 0;
                    }
                    .qr img {
                        width: 160px;
                        height: 160px;
                        image-rendering: pixelated;
                        background: white;
                        padding: 8px;
                        border-radius: 8px;
                        border: 1px solid #e1e5e9;
                    }
                    .customHeader {
                        white-space: pre-wrap;
                        margin: 8px auto 0 auto;
                        max-width: 800px;
                        background: rgba(255, 255, 255, 0.95);
                        color: #222;
                        padding: 12px;
                        border-radius: 8px;
                        border: 1px solid #e1e5e9;
                    }
                    .branding {
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 20px;
                        text-align: center;
                        white-space: pre-line;
                    }
                    .message {
                        margin-bottom: 20px;
                        padding: 16px;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    .message.user {
                        background: linear-gradient(135deg, #0084ff 0%, #0066cc 100%);
                        color: white;
                        margin-left: 20%;
                    }
                    .message.assistant {
                        background: white;
                        border: 1px solid #e1e5e9;
                        margin-right: 20%;
                    }
                    .senderRow {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 8px;
                    }
                    .avatar {
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        object-fit: cover;
                        border: 1px solid #e1e5e9;
                        background: white;
                    }
                    .sender {
                        font-weight: 600;
                    }
                    .content {
                        line-height: 1.5;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="brand">
                        <a href="${shareUrl}" target="_blank" rel="noopener">
                            <img class="brand-logo" src="${PROMPTBOOK_LOGO_URL}" alt="Promptbook logo"/>
                        </a>
                    </div>
                    <div class="share">
                        <a href="${shareUrl}" target="_blank" rel="noopener">${shareUrl}</a>
                    </div>
                    ${qrDataUrl ? `<div class="qr"><img src="${qrDataUrl}" alt="Chat QR code"/></div>` : ''}
                    ${block(customHeaderHtml)}
                    <h1>Chat History</h1>
                    <p>Exported from Promptbook Studio</p>
                </div>
                <div class="branding">${branding}</div>
                <div class="messages">
                    ${block(content)}
                </div>
            </body>
            </html>
            `,
    );
}
