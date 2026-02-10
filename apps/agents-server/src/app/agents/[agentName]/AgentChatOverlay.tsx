'use client';

import { AgentChatWrapper } from './AgentChatWrapper';
import { BackToAgentButton } from '../../../components/BackToAgentButton/BackToAgentButton';

/**
 * Props that control the chat overlay experience rendered on top of the profile scene.
 *
 * @private @@@
 */
export type AgentChatOverlayProps = {
    /**
     * The encoded agent name used for navigation.
     */
    readonly agentName: string;

    /**
     * The public URL that resolves to the agent.
     */
    readonly agentUrl: string;

    /**
     * Hex value used to color interactive chrome.
     */
    readonly brandColor: string;

    /**
     * Optional message that should be executed as soon as the chat loads.
     */
    readonly autoExecuteMessage?: string;

    /**
     * Thinking message overrides used by the chat component.
     */
    readonly thinkingMessages?: ReadonlyArray<string>;

    /**
     * Language hint for speech recognition.
     */
    readonly speechRecognitionLanguage?: string;
};

/**
 * Client-side chat overlay that keeps the profile visible in the background.
 *
 * @param props - Overlay configuration.
 * @returns A floating chat shell.
 * @private @@@
 */
export function AgentChatOverlay(props: AgentChatOverlayProps) {
    const { agentName, agentUrl, autoExecuteMessage, brandColor, thinkingMessages, speechRecognitionLanguage } = props;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
            <div className="relative w-full max-w-[1200px] h-[calc(100vh-48px)] pointer-events-auto rounded-3xl bg-white shadow-2xl border border-white/50 overflow-hidden flex flex-col">
                <div className="absolute top-4 left-4 z-10">
                    <BackToAgentButton agentName={agentName} />
                </div>
                <div className="flex-1 min-h-0">
                    <AgentChatWrapper
                        agentUrl={agentUrl}
                        autoExecuteMessage={autoExecuteMessage}
                        brandColor={brandColor}
                        thinkingMessages={thinkingMessages}
                        speechRecognitionLanguage={speechRecognitionLanguage}
                    />
                </div>
            </div>
        </div>
    );
}
