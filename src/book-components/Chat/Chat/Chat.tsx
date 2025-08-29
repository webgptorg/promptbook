import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { classNames } from '../../_common/react-utils/classNames';
import type { ChatMessage } from '../interfaces/ChatMessage';
import styles from './Chat.module.css';

// Local utility functions
function countLines(text: string): number {
    return text.split('\n').length;
}

function spaceTrim(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
}

type Promisable<T> = T | Promise<T>;

/**
 * @deprecated use `isComplete` instead
 */
export const LOADING_INTERACTIVE_IMAGE = 'Loading...';

// Note: These would need to be implemented within this project
// const ArrowIcon = dynamic(() => import('../../icons/ArrowIcon/ArrowIcon').then((mod) => mod.ArrowIcon), { ssr: false });
// const SendIcon = dynamic(() => import('../../icons/SendIcon/SendIcon').then((mod) => mod.SendIcon), { ssr: false });

interface ChatProps {
    /**
     * Optional callback to create a new agent from the template.
     * If provided, renders the [Use this template] button.
     */
    onUseTemplate?: () => void;
    /**
     * Messages to render - they are rendered as they are
     */
    readonly messages: Array<ChatMessage>;

    /**
     * Called every time the user types or dictated a message
     */
    onChange?(messageContent: string /* <- TODO: [🍗] Pass here the message object NOT just text */): void;

    /**
     * Called when user sends a message
     *
     * Note: You must handle the message yourself and add it to the `messages` array
     */
    onMessage(messageContent: string /* <- TODO: [🍗] Pass here the message object NOT just text */): Promisable<void>;

    /**
     * Optional callback, when set, button for resetting chat will be shown
     */
    onReset?(): Promisable<void>;

    /**
     * Determines whether the voice recognition button is rendered
     */
    readonly isVoiceRecognitionButtonShown?: boolean;

    /**
     * The language code to use for voice recognition
     */
    readonly voiceLanguage?: string;

    /**
     * Avatars for each user
     */
    readonly avatars?: Partial<Record<ChatMessage['from'], string>>;

    /**
     * Optional placeholder message for the textarea
     *
     * @default "Write a message"
     */
    readonly placeholderMessageContent?: string;

    /**
     * Optional preset message in chat
     */
    readonly defaultMessage?: string;

    /**
     * List of tasks that are currently in progress that should be displayed
     */
    readonly tasksProgress?: Array<{ id: string; name: string; progress?: number }>; // Simplified task progress type

    /**
     * Content to be shown inside the chat bar in head
     * If not provided, the chat bar will not be rendered
     */
    readonly children?: ReactNode;

    /**
     * Optional CSS class name which will be added to root <div/> element
     */
    readonly className?: string;

    /**
     * Optional CSS style which will be added to root <div/> element
     */
    readonly style?: CSSProperties;

    /**
     * Voice call props - when provided, voice call button will be shown
     */
    readonly voiceCallProps?: {
        selectedModel: string;
        providerClients: Map<string, unknown>;
        currentPersonaContent?: string;
        onVoiceMessage?: (content: string, isVoiceCall: boolean) => void;
        onAssistantVoiceResponse?: (content: string, isVoiceCall: boolean) => void;
        onVoiceCallStateChange?: (isVoiceCalling: boolean) => void;
    };

    /**
     * Indicates whether a voice call is currently active
     */
    readonly isVoiceCalling?: boolean;

    /**
     * Whether experimental features are enabled (required for voice calling)
     */
    readonly isExperimental?: boolean;

    /**
     * Whether the save button is enabled and shown
     */
    readonly isSaveButtonEnabled?: boolean;

    /**
     * Optional markdown header to include at the top of exported files.
     * Example: "## Discussion Topic\n\nSome topic here"
     */
    readonly exportHeaderMarkdown?: string;

    /**
     * Optional mapping of participant IDs (message.from) to display metadata for exports.
     * Keys should match ChatMessage.from values (e.g., 'USER', 'AGENT_{id}', etc.)
     */
    readonly participants?: Record<string, { name: string; avatarUrl?: string }>;
}

// Simple placeholder components for missing dependencies
const ArrowIcon = ({ direction, size }: { direction: string; size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d={direction === 'DOWN' ? "M7 10l5 5 5-5z" : "M7 14l5-5 5 5z"} />
    </svg>
);

const SendIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>
);

const ResetIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4c-4.42,0 -7.99,3.58 -7.99,8s3.57,8 7.99,8c3.73,0 6.84,-2.55 7.73,-6h-2.08c-0.82,2.33 -3.04,4 -5.65,4 -3.31,0 -6,-2.69 -6,-6s2.69,-6 6,-6c1.66,0 3.14,0.69 4.22,1.78L13,11h7V4L17.65,6.35z"/>
    </svg>
);

const TemplateIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
    </svg>
);

/**
 * Renders a chat with messages and input for new messages
 *
 * Note: 🔇 This component does NOT have speak functionality, it just allows to trigger voice recognition
 *
 * Note: There are multiple chat components:
 * - <Chat/> renders chat as it is without any logic
 * - <SimpleChat/> with callback function after each message 🔵->🟢->🔵->🟢->🔵->🟢->...
 * - <WorkerChat/> with continuously running worker function on background which binds on dialogues queue  🔵->🟢->🔵->🟢->🔵->🟢->...
 * - <SignalChat/> fully controlled by signal that is passed in 🔵->🟢->🟢->🟢->🔵->🟢->...
 * - <LlmChat/> connected to LLM Execution Tools of Promptbook
 * - <AgentChat/> direct OpenAI API integration with streaming responses and model selection
 * - <ChatbotMiniapp/> Fully working chatbot miniapp created from book
 * - <AssistantChatPage/> page for assistant chat with welcome message and avatar
 * - <ModelAwareChat/> wrapper around <Chat/> that provides model-aware avatars
 *
 * Use <WorkerChat/> or <SignalChat/> in most cases.
 */
export function Chat(props: ChatProps) {
    const {
        messages,
        onChange,
        onMessage,
        onReset,
        // isVoiceRecognitionButtonShown,
        // voiceLanguage = 'en-US',
        avatars = {
            PROMPTBOOK_PERSONA:
                'https://gravatar.com/avatar/10bceb8965947164502b4e7b3314733d?size=256&cache=1726149227450',
            // <- TODO: [🕚] Unhardcode
        },
        placeholderMessageContent,
        defaultMessage,
        // tasksProgress,
        children,
        className,
        style,
        // voiceCallProps,
        isVoiceCalling = false,
        // isExperimental = false,
        // isSaveButtonEnabled = false,
        // exportHeaderMarkdown,
        // participants,
    } = props;

    const { onUseTemplate } = props;

    const [isAutoScrolling, setAutoScrolling] = useState(true);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const chatMessagesRef = useRef<HTMLDivElement | null>(null);
    const buttonSendRef = useRef<HTMLButtonElement | null>(null);
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
    const [messageRatings, setMessageRatings] = useState<Map<string, number>>(new Map());
    const [textRating, setTextRating] = useState('');
    const [hoveredRating, setHoveredRating] = useState(0);
    const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
    // const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    // const [isTyping, setIsTyping] = useState(false);
    // const [inputValue, setInputValue] = useState('');
    const [mode] = useState<'LIGHT' | 'DARK'>('LIGHT'); // Simplified light/dark mode
    const [ratingConfirmation, setRatingConfirmation] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice =
                window.innerWidth <= 768 ||
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(isMobileDevice);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(
        (/* Focus textarea on page load */) => {
            if (!textareaRef.current) {
                return;
            }

            // Only auto-focus on desktop to prevent mobile keyboard from popping up
            if (!isMobile) {
                textareaRef.current.focus();
            }
        },
        [textareaRef, isMobile],
    );

    const handleSend = async () => {
        const textareaElement = textareaRef.current;
        const buttonSendElement = buttonSendRef.current;

        if (!textareaElement) {
            throw new Error(`Can not find textarea`);
        }
        if (!buttonSendElement) {
            throw new Error(`Can not find textarea`);
        }

        // Check if textarea was focused before sending to preserve focus only in that case
        const wasTextareaFocused = document.activeElement === textareaElement;

        textareaElement.disabled = true;
        buttonSendElement.disabled = true;

        try {
            if (spaceTrim(textareaElement.value) === '') {
                throw new Error(`You need to write some text`);
            }

            await onMessage(textareaElement.value);

            textareaElement.value = '';

            // Only restore focus if the textarea was focused when sending the message
            if (wasTextareaFocused) {
                textareaElement.focus();
            }
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            console.error(error);
            alert(error.message);
        } finally {
            textareaElement.disabled = false;
            buttonSendElement.disabled = false;

            // Only restore focus if the textarea was focused when sending the message
            if (wasTextareaFocused) {
                textareaElement.focus();
            }
        }
    };


    const useChatCssClassName = (suffix: string) => `chat-${suffix}`;

    const userClassName = useChatCssClassName('user');
    const promptbookPersonaClassName = useChatCssClassName('promptbookPersona');

    const chatBarCssClassName = useChatCssClassName('chatBar');
    const scrollToBottomCssClassName = useChatCssClassName('scrollToBottom');

    const handleRating = async (message: ChatMessage, newRating: number) => {
        setSelectedMessage(message);
        setMessageRatings(new Map(messageRatings.set(message.id, newRating)));
        setRatingModalOpen(true);
    };

    const submitRating = async () => {
        if (!selectedMessage) return;
        const currentRating = messageRatings.get(selectedMessage.id);
        if (!currentRating) return;

        // Build chatThread: all messages separated by \n\n---\n\n
        const chatThread = messages.map((msg) => `${msg.content}`).join('\n\n---\n\n');

        console.info('Rating submitted:', {
            rating: '⭐'.repeat(currentRating),
            textRating: textRating,
            chatThread,
            expectedAnswer: selectedMessage.expectedAnswer || selectedMessage.content || null,
            url: window.location.href,
        });

        setRatingModalOpen(false);
        setTextRating('');
        setSelectedMessage(null);
        setRatingConfirmation('Thank you for your feedback!');
        setTimeout(() => setRatingConfirmation(null), 3000);
    };

    // Prevent body scroll when modal is open (mobile)
    useEffect(() => {
        if (ratingModalOpen && isMobile) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [ratingModalOpen, isMobile]);

    // Determine alignment for actions (Reset button) based on the first message
    const firstMessageFromUser = messages[0]?.from === 'USER';
    const actionsAlignmentClass = firstMessageFromUser
        ? styles.actions + ' ' + styles.left
        : styles.actions + ' ' + styles.right;

    return (
        <>
            {ratingConfirmation && <div className={styles.ratingConfirmation}>{ratingConfirmation}</div>}

            <div className={classNames(className, styles.Chat, useChatCssClassName('Chat'))} {...{ style }}>
                <div className={classNames(className, styles.chatMainFlow, useChatCssClassName('chatMainFlow'))}>
                    {children && <div className={classNames(styles.chatBar, chatBarCssClassName)}>{children}</div>}

                    {isVoiceCalling && (
                        <div className={styles.voiceCallIndicatorBar}>
                            <div className={styles.voiceCallIndicator}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                </svg>
                                <span>Voice call active</span>
                                <div className={styles.voiceCallPulse}></div>
                            </div>
                        </div>
                    )}

                    <div className={classNames(actionsAlignmentClass)}>
                        {onReset && messages.length !== 0 && (
                            <button
                                className={classNames(styles.resetButton)}
                                onClick={() => {
                                    if (!confirm(`Do you really want to reset the chat?`)) {
                                        return;
                                    }

                                    onReset();
                                }}
                            >
                                <ResetIcon />
                                <span className={styles.resetButtonText}>New chat</span>
                            </button>
                        )}

                        {onUseTemplate && (
                            <button className={classNames(styles.useTemplateButton)} onClick={onUseTemplate}>
                                <span className={styles.resetButtonText}>Use this template</span>
                                <TemplateIcon size={16} />
                            </button>
                        )}
                    </div>

                    <div
                        className={classNames(styles.chatMessages, useChatCssClassName('chatMessages'))}
                        ref={(chatMessagesElement) => {
                            chatMessagesRef.current = chatMessagesElement;

                            if (chatMessagesElement === null) {
                                return;
                            }

                            if (!isAutoScrolling) {
                                return;
                            }

                            // Mobile-optimized scrolling
                            if (isMobile) {
                                // Delay scroll slightly on mobile for better performance
                                requestAnimationFrame(() => {
                                    chatMessagesElement.scrollTo({
                                        top: chatMessagesElement.scrollHeight,
                                        behavior: 'smooth',
                                    });
                                });
                            } else {
                                // Desktop smooth scrolling
                                chatMessagesElement.style.scrollBehavior = 'smooth';
                                chatMessagesElement.scrollBy(0, 1000);
                                chatMessagesElement.style.scrollBehavior = 'auto';
                            }
                        }}
                        onScroll={(event) => {
                            const element = event.target;

                            if (!(element instanceof HTMLDivElement)) {
                                return;
                            }

                            setAutoScrolling(element.scrollTop + element.clientHeight > element.scrollHeight - 100);
                        }}
                    >
                        {messages.map((message, i) => (
                            <div
                                key={i}
                                className={classNames(
                                    styles.chatMessage,
                                    !message.isComplete && styles.isPending,
                                    message.from === 'USER' && styles.user,
                                    message.from === 'PROMPTBOOK_PERSONA' && styles.promptbookPersona,
                                    message.from === 'USER' && userClassName,
                                    message.from === 'PROMPTBOOK_PERSONA' && promptbookPersonaClassName,
                                )}
                                onClick={() => {
                                    console.group(message);
                                    console.info('message.content', message.content);
                                    console.info('message', message);
                                    console.groupEnd();
                                }}
                            >
                                {avatars[message.from] && (
                                    <div className={styles.avatar}>
                                        <img
                                            width={256}
                                            height={256}
                                            src={avatars[message.from]!}
                                            alt={`Avatar of ${message.from.toLocaleLowerCase()}`}
                                        />
                                    </div>
                                )}

                                <div className={styles.messageText}>
                                    {message.isVoiceCall && (
                                        <div className={styles.voiceCallIndicator}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                            </svg>
                                        </div>
                                    )}

                                    {message.content === LOADING_INTERACTIVE_IMAGE ? (
                                        <>
                                            {/* Loading Case: B */}
                                            {/* <LoadingInteractiveImage width={50} height={50} isLoading /> */}
                                        </>
                                    ) : (
                                        <div dangerouslySetInnerHTML={{ __html: message.content }} />
                                    )}

                                    {message.from.includes('PROMPTBOOK_PERSONA') && message.isComplete && (
                                        <div
                                            className={styles.rating}
                                            onMouseEnter={() => setExpandedMessageId(message.id)}
                                            onMouseLeave={() => {
                                                setExpandedMessageId(null);
                                                setHoveredRating(0);
                                            }}
                                        >
                                            {expandedMessageId === message.id ? (
                                                [1, 2, 3, 4, 5].map((star) => (
                                                    <span
                                                        key={star}
                                                        onClick={() => handleRating(message, star)}
                                                        onMouseEnter={() => setHoveredRating(star)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            fontSize: '20px',
                                                            color:
                                                                star <=
                                                                (hoveredRating || messageRatings.get(message.id) || 0)
                                                                    ? '#FFD700'
                                                                    : mode === 'LIGHT'
                                                                    ? '#ccc'
                                                                    : '#555',
                                                            transition: 'color 0.2s',
                                                        }}
                                                    >
                                                        ⭐
                                                    </span>
                                                ))
                                            ) : (
                                                <span
                                                    onClick={() =>
                                                        handleRating(message, messageRatings.get(message.id) || 1)
                                                    }
                                                    style={{
                                                        cursor: 'pointer',
                                                        fontSize: '20px',
                                                        color: messageRatings.get(message.id)
                                                            ? '#FFD700'
                                                            : mode === 'LIGHT'
                                                            ? '#888'
                                                            : '#666',
                                                        transition: 'color 0.2s',
                                                    }}
                                                >
                                                    ⭐
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={classNames(styles.chatInput, useChatCssClassName('chatInput'))}>
                        <textarea
                            ref={(element) => {
                                textareaRef.current = element;
                            }}
                            style={{
                                height:
                                    Math.max(
                                        countLines(textareaRef.current?.value || defaultMessage || ''),
                                        (textareaRef.current?.value || defaultMessage || '').split('\n').length,
                                        3,
                                    ) *
                                        25 +
                                    10,
                            }}
                            defaultValue={defaultMessage}
                            placeholder={placeholderMessageContent || 'Write a message'}
                            onKeyDown={(event) => {
                                if (event.shiftKey) {
                                    return;
                                }
                                if (event.key !== 'Enter') {
                                    return;
                                }

                                event.preventDefault();
                                /* not await */ handleSend();
                            }}
                            onKeyUp={() => {
                                if (!onChange) {
                                    return;
                                }

                                onChange(textareaRef.current?.value || '');
                            }}
                        />
                        <button
                            data-button-type="call-to-action"
                            ref={buttonSendRef}
                            onClick={/* not await */ handleSend}
                        >
                            <SendIcon size={25} />
                        </button>
                    </div>
                </div>

                {!isAutoScrolling && (
                    <button
                        data-button-type="custom"
                        className={classNames(styles.scrollToBottom, scrollToBottomCssClassName)}
                        onClick={() => {
                            const chatMessagesElement = chatMessagesRef.current;

                            if (chatMessagesElement === null) {
                                return;
                            }

                            // Mobile-optimized scroll to bottom
                            if (isMobile) {
                                chatMessagesElement.scrollTo({
                                    top: chatMessagesElement.scrollHeight,
                                    behavior: 'smooth',
                                });
                            } else {
                                chatMessagesElement.style.scrollBehavior = 'smooth';
                                chatMessagesElement.scrollBy(0, 10000);
                                chatMessagesElement.style.scrollBehavior = 'auto';
                            }
                        }}
                    >
                        <ArrowIcon direction="DOWN" size={20} />
                    </button>
                )}
            </div>

            {ratingModalOpen && selectedMessage && (
                <div
                    className={styles.ratingModal}
                    onClick={(e) => {
                        // Close modal when clicking backdrop on mobile
                        if (e.target === e.currentTarget && isMobile) {
                            setRatingModalOpen(false);
                        }
                    }}
                >
                    <div className={styles.ratingModalContent}>
                        <h3>Rate this response</h3>
                        <div className={styles.stars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                    key={star}
                                    onClick={() =>
                                        setMessageRatings(new Map(messageRatings.set(selectedMessage.id, star)))
                                    }
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    style={{
                                        cursor: 'pointer',
                                        fontSize: '24px',
                                        color:
                                            star <= (hoveredRating || messageRatings.get(selectedMessage.id) || 0)
                                                ? '#FFD700'
                                                : mode === 'LIGHT'
                                                ? '#ccc'
                                                : '#555',
                                        transition: 'color 0.2s',
                                    }}
                                >
                                    ⭐
                                </span>
                            ))}
                        </div>
                        Your question:
                        <textarea
                            readOnly
                            value={(() => {
                                // Try to find the user's message before the selectedMessage
                                const idx = messages.findIndex((m) => m.id === selectedMessage.id);
                                if (idx > 0) {
                                    const prev = messages[idx - 1];

                                    if (prev!.from === 'USER') {
                                        return prev!.content;
                                    }
                                }
                                // fallback: find last USER message before selectedMessage
                                for (let i = messages.findIndex((m) => m.id === selectedMessage.id) - 1; i >= 0; i--) {
                                    if (messages![i]!.from === 'USER') {
                                        return messages![i]!.content;
                                    }
                                }
                                return '';
                            })()}
                            className={styles.ratingInput}
                        />
                        Expected answer:
                        <textarea
                            placeholder={selectedMessage.content || 'Expected answer (optional)'}
                            defaultValue={selectedMessage.expectedAnswer || selectedMessage.content}
                            onChange={(e) => {
                                if (selectedMessage) {
                                    setSelectedMessage({ ...selectedMessage, expectedAnswer: e.target.value });
                                }
                            }}
                            className={styles.ratingInput}
                        />
                        Note:
                        <textarea
                            // Note: This is correctly mapped to `textRating` not a `note` which is universal column in lot of other tables and means the internal note
                            placeholder="Add a note (optional)"
                            defaultValue={textRating}
                            onChange={(e) => setTextRating(e.target.value)}
                            className={styles.ratingInput}
                        />
                        <div className={styles.ratingActions}>
                            <button onClick={() => setRatingModalOpen(false)}>Cancel</button>
                            <button onClick={submitRating}>Submit</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
