import { type ReactElement } from 'react';
import type { AgentMessageProjectChange } from '../../../utils/agent-message-runtime/AgentMessageProjectChange';
import { classNames } from '../../_common/react-utils/classNames';
import type { AgentProjectToolCallResult } from '../utils/agentProjectToolCall';
import { resolveAgentProjectToolCallLabel } from '../utils/agentProjectToolCall';
import styles from './Chat.module.css';
import { renderAgentProjectDiff } from './renderAgentProjectDiff';

/**
 * Length of the commit hash shown in the change summary.
 */
const AGENT_PROJECT_COMMIT_HASH_DISPLAY_LENGTH = 7;

/**
 * Renders the detail view of one project the answer worked with.
 *
 * The card answers the two questions a project chip raises: what this project is right now — its
 * runtime state and where to open it — and what this very message did to it.
 *
 * @param options - Parsed project chip payload.
 * @returns Project details section for the tool modal.
 *
 * @private function of ChatToolCallModal
 */
export function renderAgentProjectToolCallDetails(options: {
    readonly project: AgentProjectToolCallResult;
}): ReactElement {
    const { project } = options;

    return (
        <>
            <header className={styles.toolCallHeader}>
                <span className={styles.toolCallIcon} aria-hidden="true">
                    📁
                </span>
                <div className={styles.toolCallHeaderMeta}>
                    <p className={styles.toolCallModalLabel}>Project</p>
                    <h3 className={styles.toolCallTitle}>{resolveAgentProjectToolCallLabel(project)}</h3>
                    <p className={styles.toolCallSubtitle}>
                        {project.description || 'Here is what the agent worked with.'}
                    </p>
                </div>
            </header>

            <div className={styles.toolCallGrid}>
                {renderAgentProjectStatusPanel(project)}
                {renderAgentProjectFactsPanel(project)}
            </div>

            {renderAgentProjectChangeSection(project.change)}
        </>
    );
}

/**
 * Renders the runtime state of the project together with the ways to open it.
 *
 * @param project - Parsed project chip payload.
 * @returns Status panel.
 *
 * @private function of ChatToolCallModal
 */
function renderAgentProjectStatusPanel(project: AgentProjectToolCallResult): ReactElement {
    const isRunning = project.isRunning === true;
    // Note: A chip written before projects reported their state knows nothing, which must not be
    //       shown as a project that is stopped
    const isRuntimeStateKnown = project.isRunning !== undefined || project.runtimeStatusLabel !== undefined;

    return (
        <section className={styles.toolCallPanel}>
            <p className={styles.toolCallPanelTitle}>Status</p>
            {isRuntimeStateKnown && (
                <p
                    className={classNames(
                        styles.agentProjectStatus,
                        isRunning ? styles.agentProjectStatusRunning : styles.agentProjectStatusStopped,
                    )}
                >
                    <span className={styles.agentProjectStatusDot} aria-hidden="true" />
                    {project.runtimeStatusLabel || (isRunning ? 'Running' : 'Not running')}
                </p>
            )}
            <div className={styles.agentProjectLinks}>
                {project.projectUrl && (
                    <a
                        className={styles.agentProjectLink}
                        href={project.projectUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={
                            isRunning
                                ? 'Open the project in a new tab'
                                : 'The project must run before it can be opened.'
                        }
                    >
                        Open the project ↗
                    </a>
                )}
                {project.projectHref && (
                    <a className={styles.agentProjectLink} href={project.projectHref} target="_blank" rel="noreferrer">
                        Open the project page ↗
                    </a>
                )}
            </div>
        </section>
    );
}

/**
 * Renders the project facts shown in the header of the project page.
 *
 * @param project - Parsed project chip payload.
 * @returns Facts panel.
 *
 * @private function of ChatToolCallModal
 */
function renderAgentProjectFactsPanel(project: AgentProjectToolCallResult): ReactElement {
    return (
        <section className={styles.toolCallPanel}>
            <p className={styles.toolCallPanelTitle}>Project</p>
            <ul className={styles.toolCallList}>
                <li className={styles.toolCallItem}>
                    <span className={styles.toolCallItemLabel}>Folder</span>
                    <span className={styles.toolCallItemValue}>{project.projectName}</span>
                </li>
                {project.sizeLabel && (
                    <li className={styles.toolCallItem}>
                        <span className={styles.toolCallItemLabel}>Size</span>
                        <span className={styles.toolCallItemValue}>
                            {project.sizeLabel}
                            {typeof project.fileCount === 'number' &&
                                ` in ${project.fileCount} ${project.fileCount === 1 ? 'file' : 'files'}`}
                        </span>
                    </li>
                )}
                {project.isGitRepository !== undefined && (
                    <li className={styles.toolCallItem}>
                        <span className={styles.toolCallItemLabel}>Version control</span>
                        <span className={styles.toolCallItemValue}>
                            {project.isGitRepository ? 'Git repository' : 'Not a git repository'}
                        </span>
                    </li>
                )}
            </ul>
        </section>
    );
}

/**
 * Renders what this very message changed in the project.
 *
 * @param change - Commit the answered message created, when it changed anything.
 * @returns Change section.
 *
 * @private function of ChatToolCallModal
 */
function renderAgentProjectChangeSection(change: AgentMessageProjectChange | undefined): ReactElement {
    if (!change) {
        return (
            <div className={styles.agentProjectChange}>
                <p className={styles.toolCallPanelTitle}>Changes in this message</p>
                <p className={styles.toolCallEmpty}>This message did not change anything in the project.</p>
            </div>
        );
    }

    return (
        <div className={styles.agentProjectChange}>
            <p className={styles.toolCallPanelTitle}>Changes in this message</p>
            <div className={styles.agentProjectChangeSummary}>
                <span className={styles.toolCallSummaryMetaBadge}>
                    {change.changedFiles.length} {change.changedFiles.length === 1 ? 'file' : 'files'}
                </span>
                <span className={classNames(styles.agentProjectChangeCount, styles.agentProjectChangeCountAdded)}>
                    +{change.insertionCount}
                </span>
                <span className={classNames(styles.agentProjectChangeCount, styles.agentProjectChangeCountRemoved)}>
                    −{change.deletionCount}
                </span>
                <span className={styles.agentProjectCommit}>
                    commit {change.commitHash.slice(0, AGENT_PROJECT_COMMIT_HASH_DISPLAY_LENGTH)} ·{' '}
                    {new Date(change.committedAt).toLocaleString()}
                </span>
            </div>
            {change.changedFiles.length > 0 && (
                <ul className={styles.agentProjectChangedFiles}>
                    {change.changedFiles.map((changedFile) => (
                        <li key={changedFile.path} className={styles.agentProjectChangedFile}>
                            <span className={styles.agentProjectChangedFilePath}>{changedFile.path}</span>
                            <span className={styles.agentProjectChangedFileCounts}>
                                <span className={styles.agentProjectChangeCountAdded}>
                                    +{changedFile.insertionCount}
                                </span>{' '}
                                <span className={styles.agentProjectChangeCountRemoved}>
                                    −{changedFile.deletionCount}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {change.diff.trim().length > 0 &&
                renderAgentProjectDiff({ diff: change.diff, isDiffTruncated: change.isDiffTruncated })}
        </div>
    );
}
