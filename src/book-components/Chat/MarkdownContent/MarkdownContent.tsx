'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { string_markdown } from '../../../types/string_markdown';
import { classNames } from '../../_common/react-utils/classNames';
import { CodeBlock } from '../CodeBlock/CodeBlock';
import { renderMarkdown } from '../utils/renderMarkdown';
import styles from './MarkdownContent.module.css';

/**
 * Selector used by the delegated summary click handler.
 *
 * @private utility of `MarkdownContent` component
 */
const DETAILS_SUMMARY_SELECTOR = 'summary';

/**
 * Props for markdown content.
 */
type MarkdownContentProps = {
    content: string_markdown;

    className?: string;
    onCreateAgent?: (bookContent: string) => void;
    theme?: 'LIGHT' | 'DARK';
};

/**
 * Visual theme consumed by nested code-block renderers.
 *
 * @private utility of `MarkdownContent` component
 */
type MarkdownContentTheme = NonNullable<MarkdownContentProps['theme']>;

/**
 * Resolves the active document theme when a host application does not pass an explicit theme.
 *
 * @private utility of `MarkdownContent` component
 */
function resolveMarkdownContentTheme(explicitTheme?: MarkdownContentTheme): MarkdownContentTheme {
    if (explicitTheme) {
        return explicitTheme;
    }

    if (typeof document !== 'undefined') {
        const resolvedTheme = document.documentElement.dataset.themeResolved;

        if (resolvedTheme === 'dark' || document.documentElement.classList.contains('dark')) {
            return 'DARK';
        }
    }

    return 'LIGHT';
}

/**
 * Returns a stable key for a `<details>` element based on its `<summary>` text.
 * Used to identify and restore open state across re-renders.
 *
 * @private utility of `MarkdownContent` component
 */
function getDetailsKey(details: HTMLDetailsElement): string {
    const summary = details.querySelector('summary');
    return summary?.textContent?.trim() ?? '';
}

/**
 * Synchronizes the stored open-state registry with the current state of one `<details>` element.
 *
 * @param details - The `<details>` element whose open state should be tracked.
 * @param openDetailsKeys - Mutable registry of currently open details keys.
 *
 * @private utility of `MarkdownContent` component
 */
function syncTrackedDetailsOpenState(details: HTMLDetailsElement, openDetailsKeys: Set<string>): void {
    const key = getDetailsKey(details);

    if (details.open) {
        openDetailsKeys.add(key);
    } else {
        openDetailsKeys.delete(key);
    }
}

/**
 * Resolves the `<details>` element that owns the clicked `<summary>`, if any.
 *
 * @param target - Event target received from the delegated click listener.
 * @param container - Markdown container that owns the rendered HTML.
 * @returns Matching `<details>` element or `null` when the click happened elsewhere.
 *
 * @private utility of `MarkdownContent` component
 */
function resolveClickedDetailsElement(target: EventTarget | null, container: HTMLElement): HTMLDetailsElement | null {
    const targetElement = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;

    if (!(targetElement instanceof Element)) {
        return null;
    }

    const summary = targetElement.closest(DETAILS_SUMMARY_SELECTOR);
    if (!(summary instanceof HTMLElement) || !container.contains(summary)) {
        return null;
    }

    const details = summary.closest('details');
    return details instanceof HTMLDetailsElement ? details : null;
}

/**
 * Renders markdown content with support for code highlighting, math, and tables.
 *
 * @public exported from `@promptbook/components`
 */
export const MarkdownContent = memo(function MarkdownContent(props: MarkdownContentProps) {
    const { content, className, onCreateAgent, theme } = props;
    const htmlContent = useMemo(
        () =>
            renderMarkdown(content, {
                citationReferenceClassName: styles.citationRef,
            }),
        [content],
    );
    const [resolvedTheme, setResolvedTheme] = useState<MarkdownContentTheme>(() => resolveMarkdownContentTheme(theme));
    const containerRef = useRef<HTMLDivElement>(null);
    const rootsRef = useRef<Root[]>([]);
    /** Tracks which `<details>` elements (by summary key) are currently open */
    const openDetailsKeysRef = useRef<Set<string>>(new Set());
    const onCreateAgentRef = useRef(onCreateAgent);
    onCreateAgentRef.current = onCreateAgent;

    useEffect(() => {
        if (theme) {
            setResolvedTheme(theme);
            return;
        }

        const updateTheme = () => setResolvedTheme(resolveMarkdownContentTheme());
        updateTheme();

        if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
            return;
        }

        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme-resolved'],
        });

        return () => observer.disconnect();
    }, [theme]);

    useEffect(() => {
        // Cleanup previous roots
        rootsRef.current.forEach((root) => root.unmount());
        rootsRef.current = [];

        const containerElement = containerRef.current;

        if (!containerElement) {
            return;
        }

        // Restore previously open <details> elements that may have been closed by a
        // streaming innerHTML update (dangerouslySetInnerHTML resets the DOM on every
        // content change, which collapses any open <details> back to closed).
        const detailsElements = containerElement.querySelectorAll<HTMLDetailsElement>('details');
        detailsElements.forEach((details) => {
            if (openDetailsKeysRef.current.has(getDetailsKey(details))) {
                details.open = true;
            }
        });

        // Keep openDetailsKeysRef in sync when the user toggles a <details> element.
        const handleToggle = (event: Event) => {
            const details = event.target;
            if (!(details instanceof HTMLDetailsElement) || !containerElement.contains(details)) {
                return;
            }

            syncTrackedDetailsOpenState(details, openDetailsKeysRef.current);
        };

        const pendingToggleFallbackTimeoutIds = new Set<number>();

        // Let the browser perform the native `<details>` toggle, but stop the click from bubbling
        // into surrounding chat-level handlers. When the environment does not implement native
        // `<summary>` toggling (for example JSDOM tests), a short fallback keeps behavior covered.
        const handleSummaryClick = (event: MouseEvent) => {
            const details = resolveClickedDetailsElement(event.target, containerElement);
            if (!details) {
                return;
            }

            event.stopPropagation();

            const previousOpenState = details.open;
            const fallbackTimeoutId = window.setTimeout(() => {
                pendingToggleFallbackTimeoutIds.delete(fallbackTimeoutId);

                if (!details.isConnected || details.open !== previousOpenState) {
                    return;
                }

                details.open = !previousOpenState;
                syncTrackedDetailsOpenState(details, openDetailsKeysRef.current);
            }, 0);

            pendingToggleFallbackTimeoutIds.add(fallbackTimeoutId);
        };

        containerElement.addEventListener('toggle', handleToggle, true);
        containerElement.addEventListener('click', handleSummaryClick);

        const preElements = containerElement.querySelectorAll('pre');

        preElements.forEach((pre) => {
            // Check if it is a code block (has code element)
            const codeElement = pre.querySelector('code');
            if (!codeElement) {
                return;
            }

            // Get language and code
            const className = codeElement.className; // e.g. language-python
            const match = className.match(/language-([^\s]+)/);
            const language = match ? match[1] : undefined;
            const code = codeElement.textContent || '';

            // Clear the pre element content
            pre.innerHTML = '';
            pre.className = ''; // remove existing classes if any
            pre.style.background = 'none'; // reset styles
            pre.style.padding = '0';
            pre.style.margin = '0';
            pre.style.overflow = 'visible';

            // Create a container for the CodeBlock
            const mountPoint = document.createElement('div');
            pre.appendChild(mountPoint);

            // Render CodeBlock
            const root = createRoot(mountPoint);
            root.render(
                <CodeBlock
                    code={code}
                    language={language}
                    onCreateAgent={onCreateAgentRef.current}
                    theme={resolvedTheme}
                />,
            );
            rootsRef.current.push(root);
        });

        return () => {
            containerElement.removeEventListener('toggle', handleToggle, true);
            containerElement.removeEventListener('click', handleSummaryClick);
            pendingToggleFallbackTimeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
            pendingToggleFallbackTimeoutIds.clear();
            rootsRef.current.forEach((root) => root.unmount());
            rootsRef.current = [];
        };
    }, [htmlContent, resolvedTheme]);

    return (
        <div
            ref={containerRef}
            className={classNames(styles.MarkdownContent, className)}
            dangerouslySetInnerHTML={{
                __html: htmlContent,
            }}
        />
    );
});

// TODO: !!! Split into multiple files
