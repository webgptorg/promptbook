import spaceTrim from 'spacetrim';
import type { ChatSaveFormatDefinition } from '../_common/ChatSaveFormatDefinition';

/**
 * Utility to compute readable text color based on background
 */
function getTextColor(bgColor: string): string {
    // Simple luminance check for contrast
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 186 ? '#222' : '#fff';
}
/**
 * HTML export plugin
 *
 * @public exported from `@promptbook/components`
 */
export const htmlSaveFormatDefinition = {
    formatName: 'html',
    label: 'Html',
    getContent: ({ messages }) =>
        spaceTrim(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Chat Export - Promptbook</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: #f7f8fa;
                        margin: 0;
                        padding: 0;
                    }
                    .chat-container {
                        max-width: 600px;
                        margin: 40px auto 20px auto;
                        background: #fff;
                        border-radius: 12px;
                        box-shadow: 0 2px 16px rgba(0,0,0,0.07);
                        padding: 24px 18px 18px 18px;
                    }
                    .chat-message {
                        display: flex;
                        align-items: flex-start;
                        margin-bottom: 18px;
                        border-radius: 10px;
                        padding: 0;
                    }
                    .avatar {
                        width: 38px;
                        height: 38px;
                        border-radius: 50%;
                        background: #ccc;
                        margin-right: 14px;
                        flex-shrink: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 18px;
                        color: #fff;
                        box-shadow: 0 1px 4px rgba(0,0,0,0.04);
                    }
                    .bubble {
                        border-radius: 10px;
                        padding: 12px 16px;
                        min-width: 80px;
                        max-width: 100%;
                        word-break: break-word;
                        box-shadow: 0 1px 4px rgba(0,0,0,0.03);
                        font-size: 16px;
                        line-height: 1.6;
                        margin-top: 2px;
                    }
                    .from-label {
                        font-weight: bold;
                        font-size: 15px;
                        margin-bottom: 4px;
                        display: block;
                        opacity: 0.85;
                    }
                    .footer {
                        text-align: center;
                        margin: 32px 0 18px 0;
                        color: #888;
                        font-size: 15px;
                        opacity: 0.85;
                    }
                    .footer a {
                        color: #2b7cff;
                        text-decoration: none;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <div class="chat-container">
                    ${messages
                        .map((message) => {
                            // Fallback color map for common participants
                            const participantColors: Record<string, string> = {
                                USER: '#2b7cff',
                                ASSISTANT: '#ffb300',
                                SYSTEM: '#888',
                            };
                            const bgColor = participantColors[String(message.from)] || '#2b7cff';
                            const textColor = getTextColor(bgColor);
                            return spaceTrim(`
                            <div class="chat-message">
                                <div class="avatar" style="background:${bgColor};color:${getTextColor(bgColor)};">
                                    ${String(message.from)[0] || '?'}
                                </div>
                                <div class="bubble" style="background:${bgColor};color:${textColor};">
                                    <span class="from-label">${String(message.from)}:</span>
                                    ${message.content}
                                </div>
                            </div>
                        `);
                        })
                        .join('')}
                </div>
                <div class="footer">
                    Exported from <a href="https://ptbk.io" target="_blank" rel="noopener">Promptbook</a>
                </div>
            </body>
            </html>
        `),
    mimeType: 'text/html',
    fileExtension: 'html',
} as const satisfies ChatSaveFormatDefinition;


/**
 *  TODO: [😬] Take chat save to HTML from existing parallel implementation
 */
