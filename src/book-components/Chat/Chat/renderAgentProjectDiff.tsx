import { type ReactElement } from 'react';
import { classNames } from '../../_common/react-utils/classNames';
import styles from './Chat.module.css';

/**
 * Line prefixes of unified-diff metadata, which is shown dimmed instead of as a change.
 */
const AGENT_PROJECT_DIFF_META_LINE_PREFIXES = [
    'diff ',
    'index ',
    '--- ',
    '+++ ',
    'new file',
    'deleted file',
    'old mode',
    'new mode',
    'similarity index',
    'rename from',
    'rename to',
    'Binary files',
    '\\ No newline',
];

/**
 * Renders one unified diff with added, removed and context lines told apart.
 *
 * @param options - Diff text and whether it holds only the beginning of the real diff.
 * @returns Readable diff block.
 *
 * @private function of ChatToolCallModal
 */
export function renderAgentProjectDiff(options: {
    readonly diff: string;
    readonly isDiffTruncated: boolean;
}): ReactElement {
    const diffLines = options.diff.split(/\r?\n/u);

    return (
        <div className={styles.agentProjectDiff}>
            <pre className={styles.agentProjectDiffCode}>
                {diffLines.map((diffLine, diffLineIndex) => (
                    <span
                        key={`${diffLineIndex}-${diffLine}`}
                        className={classNames(styles.agentProjectDiffLine, resolveAgentProjectDiffLineStyle(diffLine))}
                    >
                        {diffLine === '' ? ' ' : diffLine}
                    </span>
                ))}
            </pre>
            {options.isDiffTruncated && (
                <p className={styles.agentProjectDiffTruncated}>
                    The change is too large to show in full — open the project to see the rest.
                </p>
            )}
        </div>
    );
}

/**
 * Resolves the style of one diff line from its unified-diff prefix.
 *
 * @param diffLine - One raw diff line.
 * @returns Class name of the line, or `undefined` for plain context lines.
 *
 * @private function of ChatToolCallModal
 */
function resolveAgentProjectDiffLineStyle(diffLine: string): string | undefined {
    if (AGENT_PROJECT_DIFF_META_LINE_PREFIXES.some((metaLinePrefix) => diffLine.startsWith(metaLinePrefix))) {
        return styles.agentProjectDiffLineMeta;
    }

    if (diffLine.startsWith('@@')) {
        return styles.agentProjectDiffLineHunk;
    }

    if (diffLine.startsWith('+')) {
        return styles.agentProjectDiffLineAdded;
    }

    if (diffLine.startsWith('-')) {
        return styles.agentProjectDiffLineRemoved;
    }

    return undefined;
}
