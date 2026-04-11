'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { StopIcon } from '../../icons/StopIcon';
import { Chat } from '../Chat/Chat';
import chatStyles from '../Chat/Chat.module.css';
import type { LlmChatProps } from './LlmChatProps';
import { useLlmChatState } from './useLlmChatState';

/**
 * LlmChat component that provides chat functionality with LLM integration
 *
 * This component internally manages messages, participants, and task progress,
 * and uses the provided LLM tools to generate responses via `LlmExecutionTools.callChatModel`.
 *
 * Note: There are multiple chat components:
 * - `<Chat/>` renders chat as it is without any logic
 * - `<LlmChat/>` connected to LLM Execution Tools of Promptbook
 *
 * @public exported from `@promptbook/components`
 */
export function LlmChat(props: LlmChatProps) {
    const { onInputTextChange, resetMode = 'reset-current' } = props;
    const {
        handleMessage,
        handleReset,
        handleStopStreaming,
        isStreaming,
        isVoiceCalling,
        messages,
        participants,
        tasksProgress,
        teammates,
    } = useLlmChatState(props);

    const streamingStopAction = isStreaming ? (
        <button
            type="button"
            className={`${chatStyles.chatButton} ${chatStyles.stopButton}`}
            onClick={handleStopStreaming}
            aria-label="Stop streaming response"
            title="Stop streaming response"
        >
            <StopIcon size={16} />
            <span className={chatStyles.chatButtonText}>Stop</span>
        </button>
    ) : undefined;

    return (
        <Chat
            {...props}
            messages={messages}
            onMessage={handleMessage}
            onChange={onInputTextChange}
            onReset={handleReset}
            tasksProgress={tasksProgress}
            participants={participants}
            teammates={teammates}
            resetRequiresConfirmation={resetMode !== 'delegate'}
            extraActions={streamingStopAction}
            isVoiceCalling={isVoiceCalling}
        />
    );
}
