'use client';

import { ResizablePanelsAuto } from '@common/components/ResizablePanelsAuto/ResizablePanelsAuto';
import { string_agent_url, string_book } from '@promptbook-local/types';
import { Book, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AgentChatWrapper } from '../AgentChatWrapper';
import { BookEditorWrapper } from '../book/BookEditorWrapper';

type AgentBookAndChatProps = {
    agentName: string;
    initialAgentSource: string_book;
    agentUrl: string_agent_url;
    thinkingMessages?: ReadonlyArray<string>;
    speechRecognitionLanguage?: string;
    chatFailMessage?: string;
    areFileAttachmentsEnabled: boolean;
    isFeedbackEnabled: boolean;
    allowDocumentUploads?: boolean;
    allowCameraUploads?: boolean;
};

export function AgentBookAndChat(props: AgentBookAndChatProps) {
    const {
        agentName,
        initialAgentSource,
        agentUrl,
        thinkingMessages,
        speechRecognitionLanguage,
        chatFailMessage,
        areFileAttachmentsEnabled,
        isFeedbackEnabled,
        allowDocumentUploads,
        allowCameraUploads,
    } = props;
    const [isMobile, setIsMobile] = useState(false);
    const [activeTab, setActiveTab] = useState<'book' | 'chat'>('chat');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!isMounted) {
        return <div className="w-full h-full bg-white" />;
    }

    if (isMobile) {
        return (
            <div className="flex flex-col h-full w-full bg-white">
                <div className="flex-grow overflow-hidden relative">
                    <div className={`w-full h-full ${activeTab === 'book' ? 'block' : 'hidden'}`}>
                        <BookEditorWrapper
                            agentName={agentName}
                            initialAgentSource={initialAgentSource}
                            allowDocumentUploads={allowDocumentUploads}
                            allowCameraUploads={allowCameraUploads}
                        />
                    </div>
                    <div className={`w-full h-full ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
                        <AgentChatWrapper
                            agentName={agentName}
                            agentUrl={agentUrl}
                            thinkingMessages={thinkingMessages}
                            speechRecognitionLanguage={speechRecognitionLanguage}
                            areFileAttachmentsEnabled={areFileAttachmentsEnabled}
                            isFeedbackEnabled={isFeedbackEnabled}
                            chatFailMessage={chatFailMessage}
                        />
                    </div>
                </div>
                <div className="flex-shrink-0 h-16 bg-white border-t border-gray-200 flex shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                    <button
                        onClick={() => setActiveTab('book')}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                            activeTab === 'book' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <Book className="w-5 h-5" />
                        <span className="text-xs font-medium">Info</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                            activeTab === 'chat' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <MessageSquare className="w-5 h-5" />
                        <span className="text-xs font-medium">Chat</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <ResizablePanelsAuto name={`agent-book-and-chat-${agentName}`} className="w-full h-full">
            <BookEditorWrapper
                agentName={agentName}
                initialAgentSource={initialAgentSource}
                allowDocumentUploads={allowDocumentUploads}
                allowCameraUploads={allowCameraUploads}
            />
            <AgentChatWrapper
                agentName={agentName}
                agentUrl={agentUrl}
                thinkingMessages={thinkingMessages}
                speechRecognitionLanguage={speechRecognitionLanguage}
                areFileAttachmentsEnabled={areFileAttachmentsEnabled}
                isFeedbackEnabled={isFeedbackEnabled}
                chatFailMessage={chatFailMessage}
            />
        </ResizablePanelsAuto>
    );
}
