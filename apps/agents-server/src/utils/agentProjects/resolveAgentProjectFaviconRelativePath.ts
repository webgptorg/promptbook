import { stat } from 'fs/promises';
import { join } from 'path';
import { AGENT_PROJECT_CONVENTIONAL_FAVICON_RELATIVE_PATHS } from './agentProjectFileNames';
import { isSafeAgentProjectPathSegment } from './agentProjectsPaths';
import { isMissingPathError } from './isMissingPathError';
import { resolveAgentProjectFileContentType } from './resolveAgentProjectFileContentType';

/**
 * Matches an icon reference which is not served from the project folder itself,
 * for example `https://example.com/favicon.ico`, `//example.com/favicon.ico` or a `data:` URI.
 */
const EXTERNAL_ICON_HREF_REGEX = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Content type prefix every usable project icon file must have.
 */
const ICON_CONTENT_TYPE_PREFIX = 'image/';

/**
 * Resolves the icon of one project as a path relative to the project root.
 *
 * The icon linked by the project `index.html` wins, the conventional favicon locations are searched
 * afterwards. Only files which really exist inside the project folder are returned, so the resolved
 * path can always be served through the project file route.
 *
 * @param options - Project directory and the icon href linked by its `index.html`.
 * @returns Project-relative icon path using `/` separators, or `null` when the project has no icon.
 */
export async function resolveAgentProjectFaviconRelativePath(options: {
    readonly projectPath: string;
    readonly indexHtmlFaviconHref: string | null;
}): Promise<string | null> {
    const linkedFaviconRelativePath = resolveLocalIconRelativePath(options.indexHtmlFaviconHref);
    const faviconRelativePathCandidates = [
        ...(linkedFaviconRelativePath === null ? [] : [linkedFaviconRelativePath]),
        ...AGENT_PROJECT_CONVENTIONAL_FAVICON_RELATIVE_PATHS,
    ];

    for (const faviconRelativePathCandidate of faviconRelativePathCandidates) {
        if (await isExistingProjectIconFile(options.projectPath, faviconRelativePathCandidate)) {
            return faviconRelativePathCandidate;
        }
    }

    return null;
}

/**
 * Normalizes one icon href written in a project `index.html` into a project-relative path.
 *
 * The href is written by the agent and therefore untrusted — an icon hosted outside of the project
 * folder and any path escaping the project root are refused instead of being reported as an error.
 *
 * @param iconHref - Icon href exactly as written in the document.
 * @returns Project-relative icon path using `/` separators, or `null` when the href is not usable.
 */
function resolveLocalIconRelativePath(iconHref: string | null): string | null {
    const trimmedIconHref = (iconHref || '').trim();

    if (!trimmedIconHref || EXTERNAL_ICON_HREF_REGEX.test(trimmedIconHref)) {
        return null;
    }

    const iconPath = trimmedIconHref.split(/[?#]/u)[0] || '';
    let iconPathSegments: ReadonlyArray<string>;

    try {
        iconPathSegments = iconPath
            .split('/')
            .filter((iconPathSegment) => iconPathSegment !== '' && iconPathSegment !== '.')
            .map((iconPathSegment) => decodeURIComponent(iconPathSegment));
    } catch {
        return null;
    }

    if (iconPathSegments.length === 0 || !iconPathSegments.every(isSafeAgentProjectPathSegment)) {
        return null;
    }

    return iconPathSegments.join('/');
}

/**
 * Returns whether one project-relative path points to an image file inside the project.
 *
 * @param projectPath - Absolute path of the project directory.
 * @param iconRelativePath - Project-relative icon path using `/` separators.
 * @returns `true` when the path is an existing image file.
 */
async function isExistingProjectIconFile(projectPath: string, iconRelativePath: string): Promise<boolean> {
    const iconPathSegments = iconRelativePath.split('/');
    const iconFileName = iconPathSegments[iconPathSegments.length - 1] || '';

    if (!resolveAgentProjectFileContentType(iconFileName).startsWith(ICON_CONTENT_TYPE_PREFIX)) {
        return false;
    }

    try {
        const iconStats = await stat(join(projectPath, ...iconPathSegments));
        return iconStats.isFile();
    } catch (error) {
        if (isMissingPathError(error)) {
            return false;
        }

        throw error;
    }
}
