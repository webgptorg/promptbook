'use client';

import { ResizablePanelsAuto } from '@common/components/ResizablePanelsAuto/ResizablePanelsAuto';
import type { ChatMessage } from '@promptbook-local/components';
import { Chat } from '@promptbook-local/components';
import { useMemo, useState } from 'react';

export default function TextareaToChatPage() {
    const [textareaContent, setTextareaContent] = useState<string>('Hello, this is a test message!');

    const messages: ChatMessage[] = useMemo(() => {
        if (!textareaContent.trim()) {
            return [];
        }
        return [
            {
                // channel: 'PROMPTBOOK_CHAT',
                id: 'textarea-message',
                sender: 'USER',
                content: textareaContent,
                createdAt: new Date(),
                isComplete: true,
            },
        ];
    }, [textareaContent]);

    return (
        <div className="min-h-screen">
            <ResizablePanelsAuto name="textarea-to-chat">
                {/* Left side: Textarea */}
                <div className="flex flex-col h-full p-4">
                    <h2 className="text-lg font-semibold mb-2">Input Message</h2>
                    <textarea
                        className="flex-1 w-full p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        value={textareaContent}
                        onChange={(e) => setTextareaContent(e.target.value)}
                        placeholder="Type your message here..."
                    />
                </div>

                {/* Right side: Chat */}
                <div className="h-full">
                    <Chat
                        title="Chat Preview"
                        participants={[
                            {
                                name: 'USER',
                                fullname: 'User',
                                isMe: true,
                                color: '#0066cc',
                            },
                        ]}
                        messages={messages}
                        isSaveButtonEnabled={false}
                        isCopyButtonEnabled={false}
                        className="h-full"
                    />
                </div>
            </ResizablePanelsAuto>
        </div>
    );
}
