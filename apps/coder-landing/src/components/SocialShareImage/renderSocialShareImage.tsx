import { INSTALL_COMMAND, RUN_COMMAND } from '@/data/commands';
import {
    SITE_DOMAIN,
    SITE_LOGO_ON_DARK_PATH,
    SITE_NAME_ACCENT,
    SITE_NAME_LEAD,
    SITE_SOCIAL_DESCRIPTION,
    SITE_TAGLINE_ACCENT,
    SITE_TAGLINE_LEAD,
    SITE_TITLE,
} from '@/data/siteMetadata';
import { assertsError } from '@promptbook-source/errors/assertsError';
import { UnexpectedError } from '@promptbook-source/errors/UnexpectedError';
import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spaceTrim } from 'spacetrim';

/**
 * Alternative text of the sharing image, read instead of the image by screen readers.
 */
export const SOCIAL_SHARE_IMAGE_ALT = SITE_TITLE;

/**
 * Size of the sharing image in pixels, which is the 1.91:1 ratio expected by Open Graph and Twitter cards.
 */
export const SOCIAL_SHARE_IMAGE_SIZE = {
    width: 1200,
    height: 630,
} as const;

/**
 * Format of the sharing image.
 */
export const SOCIAL_SHARE_IMAGE_CONTENT_TYPE = 'image/png';

/**
 * Colors of the sharing image.
 *
 * Note: The palette is the one of the page itself, see [`specs/design.md`](../../../specs/design.md)
 */
const SOCIAL_SHARE_IMAGE_COLORS = {
    background: 'linear-gradient(135deg, #0F172A 0%, #111827 55%, #0B1120 100%)',
    glow: 'linear-gradient(180deg, rgba(48, 168, 189, 0.28) 0%, rgba(17, 24, 39, 0) 100%)',
    accentBar: 'linear-gradient(90deg, #7AEBFF 0%, #7AFFEB 100%)',
    brandBlue: '#7AEBFF',
    brandBlueDark: '#30A8BD',
    brandGreen: '#7AFFEB',
    heading: '#FFFFFF',
    text: '#9CA3AF',
    terminalBackground: '#0D1117',
    terminalTitleBarBackground: '#161B22',
    terminalBorder: '#1F2937',
    terminalText: '#D1D5DB',
    terminalPrompt: '#6B7280',
    terminalDotRed: '#FF5F57',
    terminalDotYellow: '#FEBC2E',
    terminalDotGreen: '#28C840',
} as const;

/**
 * Reads the brand logo from the `public` folder and returns it as a data URL.
 *
 * Note: The image is inlined because the sharing image is rendered without a running server,
 *       so it cannot load the logo over HTTP.
 *
 * @throws {UnexpectedError} When the logo is missing in the `public` folder
 */
function readBrandLogoAsDataUrl(): string {
    const logoFilePath = join(process.cwd(), 'public', SITE_LOGO_ON_DARK_PATH);

    try {
        return `data:image/png;base64,${readFileSync(logoFilePath).toString('base64')}`;
    } catch (error) {
        assertsError(error);

        throw new UnexpectedError(
            spaceTrim(`
                Brand logo \`${SITE_LOGO_ON_DARK_PATH}\` of the sharing image was not found.

                It was looked up in \`${logoFilePath}\`, the original error was:

                > ${error.message}
            `),
        );
    }
}

/**
 * Splits one shell sample into the name of the command and the rest of its arguments.
 */
function splitCommandName(command: string): { commandName: string; commandArguments: string } {
    const [commandName = command, ...commandArgumentTokens] = command.split(' ');

    return { commandName, commandArguments: commandArgumentTokens.join(' ') };
}

/**
 * Renders one shell sample of the terminal window of the sharing image.
 *
 * Note: The syntax highlighting of the page cannot be reused here because it uses Tailwind class names,
 *       which are not available while rendering an image
 */
function SocialShareImageCommandLine({ command }: { readonly command: string }) {
    const { commandName, commandArguments } = splitCommandName(command);

    return (
        <div style={{ display: 'flex', fontSize: 24, letterSpacing: '0.01em' }}>
            <span style={{ marginRight: 14, color: SOCIAL_SHARE_IMAGE_COLORS.terminalPrompt }}>$</span>
            <span style={{ marginRight: 10, color: SOCIAL_SHARE_IMAGE_COLORS.brandGreen }}>{commandName}</span>
            <span style={{ color: SOCIAL_SHARE_IMAGE_COLORS.terminalText }}>{commandArguments}</span>
        </div>
    );
}

/**
 * Renders the terminal window of the sharing image, showing how the product is installed and started.
 */
function SocialShareImageTerminal() {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 16,
                border: `1px solid ${SOCIAL_SHARE_IMAGE_COLORS.terminalBorder}`,
                backgroundColor: SOCIAL_SHARE_IMAGE_COLORS.terminalBackground,
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 20px',
                    backgroundColor: SOCIAL_SHARE_IMAGE_COLORS.terminalTitleBarBackground,
                    borderBottom: `1px solid ${SOCIAL_SHARE_IMAGE_COLORS.terminalBorder}`,
                }}
            >
                <div
                    style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: SOCIAL_SHARE_IMAGE_COLORS.terminalDotRed,
                    }}
                />
                <div
                    style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: SOCIAL_SHARE_IMAGE_COLORS.terminalDotYellow,
                    }}
                />
                <div
                    style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: SOCIAL_SHARE_IMAGE_COLORS.terminalDotGreen,
                    }}
                />
                <div style={{ marginLeft: 8, fontSize: 18, color: SOCIAL_SHARE_IMAGE_COLORS.terminalPrompt }}>bash</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 20px' }}>
                <SocialShareImageCommandLine command={INSTALL_COMMAND} />
                <SocialShareImageCommandLine command={RUN_COMMAND} />
            </div>
        </div>
    );
}

/**
 * Renders the whole sharing image of the landing page.
 */
function SocialShareImage() {
    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                padding: '48px 56px 56px 56px',
                backgroundImage: SOCIAL_SHARE_IMAGE_COLORS.background,
                fontFamily: 'sans-serif',
            }}
        >
            {/* Note: Decorative glow matching the gradient behind the hero of the page */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: SOCIAL_SHARE_IMAGE_SIZE.width,
                    height: 320,
                    backgroundImage: SOCIAL_SHARE_IMAGE_COLORS.glow,
                }}
            />

            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                {/* Note: `next/image` is not working properly with `next/og` */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={readBrandLogoAsDataUrl()} width={64} height={64} alt="" />
                <div style={{ display: 'flex', gap: 12, marginLeft: 20, fontSize: 40, fontWeight: 700 }}>
                    <span style={{ color: SOCIAL_SHARE_IMAGE_COLORS.heading }}>{SITE_NAME_LEAD}</span>
                    <span style={{ color: SOCIAL_SHARE_IMAGE_COLORS.brandBlue }}>{SITE_NAME_ACCENT}</span>
                </div>
                <div
                    style={{
                        display: 'flex',
                        marginLeft: 'auto',
                        padding: '8px 18px',
                        borderRadius: 999,
                        border: `1px solid ${SOCIAL_SHARE_IMAGE_COLORS.brandBlueDark}`,
                        fontSize: 22,
                        color: SOCIAL_SHARE_IMAGE_COLORS.brandBlue,
                    }}
                >
                    {SITE_DOMAIN}
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: 44,
                    fontSize: 66,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                }}
            >
                <span style={{ color: SOCIAL_SHARE_IMAGE_COLORS.heading }}>{SITE_TAGLINE_LEAD}</span>
                <span style={{ color: SOCIAL_SHARE_IMAGE_COLORS.brandBlue }}>{SITE_TAGLINE_ACCENT}.</span>
            </div>

            <div
                style={{
                    display: 'flex',
                    marginTop: 20,
                    maxWidth: 980,
                    fontSize: 25,
                    lineHeight: 1.4,
                    color: SOCIAL_SHARE_IMAGE_COLORS.text,
                }}
            >
                {SITE_SOCIAL_DESCRIPTION}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
                <SocialShareImageTerminal />
            </div>

            {/* Note: Brand accent bar closing the image at its bottom edge */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: SOCIAL_SHARE_IMAGE_SIZE.width,
                    height: 10,
                    backgroundImage: SOCIAL_SHARE_IMAGE_COLORS.accentBar,
                }}
            />
        </div>
    );
}

/**
 * Renders the image shown whenever the landing page is shared on a social network or in a chat app.
 *
 * Note: The very same image is used for Open Graph and for Twitter cards,
 *       specified in [`specs/metadata.md`](../../../specs/metadata.md)
 */
export function renderSocialShareImage(): ImageResponse {
    return new ImageResponse(<SocialShareImage />, { ...SOCIAL_SHARE_IMAGE_SIZE });
}
