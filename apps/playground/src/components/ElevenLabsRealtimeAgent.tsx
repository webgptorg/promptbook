'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback } from 'react';

type ElevenLabsRealtimeAgentProps = {
    systemMessage?: string;
};

export const ElevenLabsRealtimeAgent = ({ systemMessage }: ElevenLabsRealtimeAgentProps) => {
    const { status, startSession, endSession, isSpeaking } = useConversation({
        onConnect: () => console.log('Connected'),
        onDisconnect: () => console.log('Disconnected'),
        onMessage: (message) => console.log('Message:', message),
        onError: (error) => console.error('Error:', error),
    });

    const handleStart = useCallback(async () => {
        try {
            // 1. Get signed URL
            const response = await fetch('/api/elevenlabs-realtime/signed-url');
            const data = await response.json();

            if (data.error) {
                console.error('Failed to get signed URL:', data.error);
                return;
            }

            const { signedUrl } = data;

            // 2. Start conversation
            await startSession({
                signedUrl: signedUrl,
                // Pass overrides if systemMessage is provided
                ...(systemMessage && {
                    overrides: {
                        agent: {
                            prompt: {
                                prompt: systemMessage,
                            },
                        },
                    }
                }),
            });

        } catch (error) {
            console.error('Failed to start conversation:', error);
        }
    }, [startSession, systemMessage]);

    const handleStop = useCallback(() => {
        endSession();
    }, [endSession]);

    const isConnected = status === 'connected';
    const isConnecting = status === 'connecting';

    return (
        <div className="flex flex-col items-center justify-center gap-8 p-8">
            {/* Abstract Circle Agent */}
            <div 
                className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 relative ${
                    isConnected ? 'bg-blue-500/20' : 'bg-gray-200'
                }`}
            >
                <div 
                    className={`w-32 h-32 rounded-full transition-all duration-300 ${
                        isConnected ? 'bg-blue-500' : 'bg-gray-400'
                    } ${isSpeaking ? 'scale-110' : 'scale-100'}`} 
                    style={{
                        boxShadow: isSpeaking ? '0 0 40px rgba(59, 130, 246, 0.6)' : 'none'
                    }}
                />
                
                {/* Pulse animation when connected but not speaking */}
                {isConnected && !isSpeaking && (
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-pulse" />
                )}
            </div>

            {/* Controls */}
            <button
                onClick={isConnected ? handleStop : handleStart}
                disabled={isConnecting}
                className={`px-8 py-3 rounded-full font-bold text-white text-lg transition-all transform hover:scale-105 active:scale-95 ${
                    isConnected 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : isConnecting 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
                {isConnected ? 'End Call' : isConnecting ? 'Connecting...' : 'Start Call'}
            </button>
            
            <div className="text-sm text-gray-500">
                Status: {status}
            </div>
        </div>
    );
};
