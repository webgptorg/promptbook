import { type ReactElement } from 'react';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import type { ChatMessage } from '../types/ChatMessage';
import { extractSearchResults } from '../utils/toolCallParsing';
import { resolveToolCallState } from '../utils/resolveToolCallState';
import { renderToolCallProgressPlaceholder } from './renderToolCallProgressPlaceholder';
import { resolveToolCallProgressMessage } from './resolveToolCallProgressMessage';
import styles from './Chat.module.css';

/**
 * Rendering options for search tool calls.
 *
 * @private function of ChatToolCallModal
 */
type RenderSearchToolCallDetailsOptions = {
    /**
     * Tool call being rendered.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Parsed tool call arguments.
     */
    args: Record<string, TODO_any>;
    /**
     * Parsed tool result payload.
     */
    resultRaw: TODO_any;
};

/**
 * Renders the search-specific tool call detail view.
 *
 * @param options - Search tool call data.
 * @returns Search results or pending state UI.
 * @private function of ChatToolCallModal
 */
export function renderSearchToolCallDetails(options: RenderSearchToolCallDetailsOptions): ReactElement {
    const { toolCall, args, resultRaw } = options;
    const toolCallState = resolveToolCallState(toolCall);
    const { results, rawText } = extractSearchResults(resultRaw);
    const hasResults = results.length > 0;
    const hasRawText = !hasResults && !!rawText && rawText.trim().length > 0;

    return (
        <>
            <div className={styles.searchModalHeader}>
                <span className={styles.searchModalIcon}>🔎</span>
                <h3 className={styles.searchModalQuery}>{args.query || args.searchText || 'Search Results'}</h3>
            </div>

            <div className={styles.searchModalContent}>
                {hasResults ? (
                    <div className={styles.searchResultsList}>
                        {(results as Array<TODO_any>).map((item, index) => (
                            <div key={index} className={styles.searchResultItem}>
                                <div className={styles.searchResultUrl}>
                                    {item.url && (
                                        <a href={item.url} target="_blank" rel="noreferrer">
                                            {item.url}
                                        </a>
                                    )}
                                </div>
                                <h4 className={styles.searchResultTitle}>
                                    {item.url ? (
                                        <a href={item.url} target="_blank" rel="noreferrer">
                                            {item.title || 'Untitled'}
                                        </a>
                                    ) : (
                                        item.title || 'Untitled'
                                    )}
                                </h4>
                                <p className={styles.searchResultSnippet}>{item.snippet || item.content || ''}</p>
                            </div>
                        ))}
                    </div>
                ) : hasRawText ? (
                    <MarkdownContent className={styles.searchResultsRaw} content={rawText!} />
                ) : toolCallState !== 'COMPLETE' ? (
                    <>
                        {renderToolCallProgressPlaceholder({
                            title: 'Search results pending',
                            message: resolveToolCallProgressMessage(toolCall),
                        })}
                        <div className={styles.toolCallDetailsCard}>
                            <div className={styles.toolCallDetailsCardRow}>
                                <strong>Query</strong>
                                <span>{String(args.query || args.searchText || 'Search query is being prepared.')}</span>
                            </div>
                            {args.location && (
                                <div className={styles.toolCallDetailsCardRow}>
                                    <strong>Location</strong>
                                    <span>{String(args.location)}</span>
                                </div>
                            )}
                            {args.engine && (
                                <div className={styles.toolCallDetailsCardRow}>
                                    <strong>Engine</strong>
                                    <span>{String(args.engine)}</span>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className={styles.noResults}>
                        {resultRaw ? 'No search results found.' : 'Search results are not available.'}
                    </div>
                )}
            </div>
        </>
    );
}
