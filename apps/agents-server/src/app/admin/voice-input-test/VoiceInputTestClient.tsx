'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserSpeechRecognition } from '../../../../../src/speech-recognition/BrowserSpeechRecognition';
import { OpenAiSpeechRecognition } from '../../../../../src/speech-recognition/OpenAiSpeechRecognition';
import type { SpeechRecognition, SpeechRecognitionEvent } from '../../../../../src/types/SpeechRecognition';

export function VoiceInputTestClient() {
    const [transcribedText, setTranscribedText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [provider, setProvider] = useState<'browser' | 'openai'>('browser');
    const speechRecognitionRef = useRef<SpeechRecognition | null>(null);

    const handleToggleRecording = () => {
        if (isRecording) {
            speechRecognitionRef.current?.$stop();
            setIsRecording(false);
        } else {
            setError(null);
            if (provider === 'browser') {
                speechRecognitionRef.current = new BrowserSpeechRecognition();
            } else {
                speechRecognitionRef.current = new OpenAiSpeechRecognition();
            }

            speechRecognitionRef.current.subscribe((event: SpeechRecognitionEvent) => {
                if (event.type === 'RESULT') {
                    setTranscribedText(event.text);
                } else if (event.type === 'ERROR') {
                    setError(event.message);
                    setIsRecording(false);
                } else if (event.type === 'STOP') {
                    setIsRecording(false);
                }
            });

            speechRecognitionRef.current.$start({ language: 'en-US' });
            setIsRecording(true);
        }
    };

    useEffect(() => {
        return () => {
            speechRecognitionRef.current?.$stop();
        };
    }, []);

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Voice Input Test</h1>
            
            <div style={{ marginBottom: '20px' }}>
                <label style={{ marginRight: '10px' }}>
                    Provider:
                    <select value={provider} onChange={(e) => setProvider(e.target.value as any)} style={{ marginLeft: '5px' }}>
                        <option value="browser">Browser Web Speech API</option>
                        <option value="openai">OpenAI Whisper API</option>
                    </select>
                </label>
            </div>

            {provider === 'openai' && (
                <div style={{ marginBottom: '20px', color: '#666' }}>
                    Note: OpenAI Whisper is using server-side proxy. Make sure <code>OPENAI_API_KEY</code> is set in environment.
                </div>
            )}

            <div style={{ marginBottom: '20px' }}>
                <button 
                    onClick={handleToggleRecording}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        backgroundColor: isRecording ? '#ff4444' : '#44aa44',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
            </div>

            {error && (
                <div style={{ color: 'red', marginBottom: '20px', padding: '10px', border: '1px solid red', borderRadius: '4px' }}>
                    Error: {error}
                </div>
            )}

            <div>
                <h3>Transcribed Text:</h3>
                <textarea
                    value={transcribedText}
                    readOnly
                    style={{
                        width: '100%',
                        height: '200px',
                        padding: '10px',
                        fontSize: '16px',
                        borderRadius: '4px',
                        border: '1px solid #ccc'
                    }}
                    placeholder="Transcribed text will appear here..."
                />
            </div>
        </div>
    );
}
