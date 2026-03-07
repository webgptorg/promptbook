import { mkdir } from 'fs/promises';
import { join, relative } from 'path';
import type { Page } from 'playwright';
import type { CaptureSnapshotArtifactOptions, NormalizedRunBrowserAction, RunBrowserArtifact } from './RunBrowserArgs';
import { getErrorMessage } from './runBrowserErrors';
import { runBrowserConstants } from './runBrowserConstants';

/**
 * Matches unsupported characters in snapshot file suffixes.
 */
const SNAPSHOT_FILE_SUFFIX_UNSAFE_CHARACTER_PATTERN = /[^a-z0-9-]/g;

/**
 * Returns a POSIX-compatible relative path.
 */
function toPosixPath(pathname: string): string {
    return pathname.split('\\').join('/');
}

/**
 * Creates one filesystem-safe optional filename suffix for a snapshot.
 */
function createSnapshotFileSuffix(rawSuffix?: string): string {
    if (!rawSuffix) {
        return '';
    }

    const normalized = rawSuffix
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(SNAPSHOT_FILE_SUFFIX_UNSAFE_CHARACTER_PATTERN, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return normalized;
}

/**
 * Resolves snapshot filename for one session and optional stage suffix.
 */
function resolveSnapshotFilename(sessionId: string, fileSuffix?: string): string {
    const safeSuffix = createSnapshotFileSuffix(fileSuffix);
    return safeSuffix ? `${sessionId}-${safeSuffix}.png` : `${sessionId}.png`;
}

/**
 * Creates one user-facing description for an executed browser action.
 */
function formatActionSummary(action: NormalizedRunBrowserAction): string {
    switch (action.type) {
        case 'navigate':
            return `Navigate to ${action.url}`;
        case 'click':
            return `Click ${action.selector}`;
        case 'type':
            return `Type into ${action.selector}`;
        case 'wait':
            return `Wait ${action.milliseconds}ms`;
        case 'scroll':
            return action.selector ? `Scroll ${action.pixels}px in ${action.selector}` : `Scroll ${action.pixels}px on page`;
    }
}

/**
 * Screenshot/artifact and page-cleanup helpers for `run_browser`.
 *
 * @private function of `run_browser`
 */
export const runBrowserArtifacts = {
    /**
     * Captures a screenshot artifact for the current page and returns relative path.
     */
    async captureSnapshot(page: Page, sessionId: string, fileSuffix?: string): Promise<string | null> {
        const snapshotDirectoryPath = join(process.cwd(), runBrowserConstants.snapshotDirectory);
        const snapshotPath = join(snapshotDirectoryPath, resolveSnapshotFilename(sessionId, fileSuffix));

        try {
            await mkdir(snapshotDirectoryPath, { recursive: true });
            await page.screenshot({ path: snapshotPath, fullPage: true });
            return toPosixPath(relative(process.cwd(), snapshotPath));
        } catch (error) {
            console.error('[run_browser] Failed to capture snapshot', {
                sessionId,
                error: getErrorMessage(error),
            });

            return null;
        }
    },

    /**
     * Safely retrieves page title from current browser page.
     */
    async getPageTitle(page: Page): Promise<string | null> {
        try {
            return await page.title();
        } catch {
            return null;
        }
    },

    /**
     * Closes browser page and logs non-fatal cleanup errors.
     */
    async cleanupPage(page: Page | null, sessionId: string): Promise<void> {
        if (!page) {
            return;
        }

        try {
            await page.close();
        } catch (error) {
            console.error('[run_browser] Failed to cleanup browser page', {
                sessionId,
                error: getErrorMessage(error),
            });
        }
    },

    /**
     * Captures one screenshot artifact and enriches it with page metadata.
     */
    async captureSnapshotArtifact(options: CaptureSnapshotArtifactOptions): Promise<RunBrowserArtifact | null> {
        const { page, sessionId, label, fileSuffix, actionIndex, action } = options;
        const path = await this.captureSnapshot(page, sessionId, fileSuffix);
        if (!path) {
            return null;
        }

        const actionSummary = action ? formatActionSummary(action) : undefined;

        return {
            kind: 'screenshot',
            label,
            path,
            capturedAt: new Date().toISOString(),
            url: page.url(),
            title: await this.getPageTitle(page),
            actionIndex,
            actionSummary,
        };
    },
};
