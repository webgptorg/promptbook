'use client';

import { useRef, useState } from 'react';

type OpenAIRealtimeAgentProps = {
    systemMessage?: string;
};

export const OpenAIRealtimeAgent = ({ systemMessage }: OpenAIRealtimeAgentProps) => {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);

    const startCall = async () => {
        setStatus('connecting');
        try {
            // Get ephemeral token
            const tokenResponse = await fetch('/api/openai-realtime/session', {
                method: 'POST',
            });
            const data = await tokenResponse.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            const EPHEMERAL_KEY = data.client_secret.value;

            // Create PeerConnection
            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            // Setup audio playback
            const audioEl = document.createElement('audio');
            audioEl.autoplay = true;
            pc.ontrack = (e) => {
                audioEl.srcObject = e.streams[0];
            };
            audioRef.current = audioEl;

            // Add local audio
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            pc.addTrack(stream.getTracks()[0]);

            // Data Channel
            const dc = pc.createDataChannel('oai-events');
            dcRef.current = dc;
            dc.addEventListener('open', () => {
                 if (systemMessage) {
                     const event = {
                         type: 'session.update',
                         session: {
                             instructions: systemMessage,
                         },
                     };
                     dc.send(JSON.stringify(event));
                 }
            });

            // Offer/Answer exchange
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const baseUrl = 'https://api.openai.com/v1/realtime';
            const model = 'gpt-4o-realtime-preview-2024-12-17';
            const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                method: 'POST',
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${EPHEMERAL_KEY}`,
                    'Content-Type': 'application/sdp',
                },
            });

            const answer = {
                type: 'answer',
                sdp: await sdpResponse.text(),
            };
            await pc.setRemoteDescription(answer as RTCSessionDescriptionInit);

            setStatus('connected');

        } catch (error) {
            console.error('Failed to start call:', error);
            setStatus('disconnected');
            // Clean up
            stopCall();
        }
    };

    const stopCall = () => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.srcObject = null;
            audioRef.current = null;
        }
        setStatus('disconnected');
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4 p-4">
            <div 
                className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                    status === 'connected' ? 'bg-green-500 animate-pulse' : 
                    status === 'connecting' ? 'bg-yellow-500' : 'bg-gray-400'
                }`}
            >
                <div className="w-24 h-24 bg-white rounded-full opacity-20" />
            </div>
            
            <button
                onClick={status === 'disconnected' ? startCall : stopCall}
                disabled={status === 'connecting'}
                className={`px-6 py-2 rounded-full font-bold text-white transition-colors ${
                    status === 'disconnected' ? 'bg-blue-600 hover:bg-blue-700' : 
                    status === 'connecting' ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'
                }`}
            >
                {status === 'disconnected' ? 'Start Call' : 
                 status === 'connecting' ? 'Connecting...' : 'Stop Call'}
            </button>
        </div>
    );
};
