import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Public asset used as the Promptbook mark in server-rendered exports.
 *
 * @private internal constant of `getPromptbookLogoDataUrl`
 */
const PROMPTBOOK_LOGO_ASSET_PATH = ['public', 'logo-blue-white-256.png'];

/**
 * Cached data URL, so repeated exports do not re-read the asset.
 *
 * @private internal state of `getPromptbookLogoDataUrl`
 */
let promptbookLogoDataUrl: string | null | undefined;

/**
 * Loads the Promptbook logo as an inline `data:` URL.
 *
 * The PDF renderer blocks every network request, therefore branding assets must
 * be embedded directly into the exported document.
 *
 * @returns Inline logo URL, or `null` when the asset is unavailable.
 */
export async function getPromptbookLogoDataUrl(): Promise<string | null> {
    if (promptbookLogoDataUrl !== undefined) {
        return promptbookLogoDataUrl;
    }

    try {
        const logo = await readFile(join(process.cwd(), ...PROMPTBOOK_LOGO_ASSET_PATH));
        promptbookLogoDataUrl = `data:image/png;base64,${logo.toString('base64')}`;
    } catch (error) {
        console.error('Failed to inline the Promptbook logo into a PDF export:', error);
        promptbookLogoDataUrl = null;
    }

    return promptbookLogoDataUrl;
}
