'use client';

import type { PromptbookComponentTheme } from '../../_common/PromptbookComponentTheme';
import { CodeBlock } from '../CodeBlock/CodeBlock';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatMessageContentSegment } from '../utils/splitMessageContentIntoSegments';
import { LOADING_INTERACTIVE_IMAGE } from './constants';
import { ChatMessageMap } from './ChatMessageMap';
import { ImagePromptRenderer } from './ImagePromptRenderer';
import { StreamingFeaturePlaceholder, type StreamingFeaturePlaceholderKind } from './StreamingFeaturePlaceholder';

/**
 * Props for rendering the rich message-body content area.
 *
 * @private internal component of `<ChatMessageItem/>`
 */
export type ChatMessageRichContentProps = {
    /**
     * Raw message content used for loading-state detection.
     */
    readonly content: ChatMessage['content'];
    /**
     * Pre-split message content segments in their render order.
     */
    readonly contentSegments: ReadonlyArray<ChatMessageContentSegment>;
    /**
     * Optional placeholder shown while a rich feature is still streaming.
     */
    readonly streamingFeaturePlaceholderKind: StreamingFeaturePlaceholderKind | null;
    /**
     * Optional callback for creating a new agent from a book code block.
     */
    readonly onCreateAgent?: (bookContent: string) => void;
    /**
     * Explicit light/dark theme inherited from the host chat.
     */
    readonly theme?: PromptbookComponentTheme;
};

/**
 * Renders markdown, code blocks, maps, and generated-image placeholders for one message.
 *
 * @private internal component of `<ChatMessageItem/>`
 */
export function ChatMessageRichContent(props: ChatMessageRichContentProps) {
    const { content, contentSegments, streamingFeaturePlaceholderKind, onCreateAgent, theme } = props;

    if (content === LOADING_INTERACTIVE_IMAGE) {
        return null;
    }

    return (
        <>
            {contentSegments.map((segment, segmentIndex) => {
                if (segment.type === 'text') {
                    return (
                        <MarkdownContent
                            key={`text-${segmentIndex}`}
                            content={segment.content}
                            onCreateAgent={onCreateAgent}
                            theme={theme}
                        />
                    );
                }

                if (segment.type === 'code') {
                    return (
                        <CodeBlock
                            key={`code-${segmentIndex}`}
                            code={segment.code}
                            language={segment.language}
                            onCreateAgent={onCreateAgent}
                            theme={theme}
                        />
                    );
                }

                if (segment.type === 'image') {
                    return (
                        <ImagePromptRenderer key={`image-${segmentIndex}`} alt={segment.alt} prompt={segment.prompt} />
                    );
                }

                if (segment.type === 'map') {
                    return <ChatMessageMap key={`map-${segmentIndex}`} data={segment.data} />;
                }

                return null;
            })}
            {streamingFeaturePlaceholderKind && <StreamingFeaturePlaceholder kind={streamingFeaturePlaceholderKind} />}
        </>
    );
}
