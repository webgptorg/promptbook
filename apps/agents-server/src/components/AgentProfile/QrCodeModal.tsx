'use client';

import { AgentBasicInformation } from '@promptbook-local/types';
import { XIcon } from 'lucide-react';
import { useEffect } from 'react';
import { AgentQrCode } from './AgentQrCode';

type QrCodeModalProps = {
    isOpen: boolean;
    onClose: () => void;
    agentName: string;
    meta: AgentBasicInformation['meta'];
    personaDescription: string;
    agentUrl: string;
    agentEmail: string;
    brandColorHex: string;
};

export function QrCodeModal({
    isOpen,
    onClose,
    agentName,
    meta,
    personaDescription,
    agentUrl,
    agentEmail,
}: QrCodeModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Close"
                >
                    <XIcon className="w-5 h-5 text-gray-500" />
                </button>

                <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Scan to Chat</h3>

                <div className="flex justify-center">
                    <AgentQrCode
                        agentName={agentName}
                        meta={meta}
                        personaDescription={personaDescription}
                        agentUrl={agentUrl}
                        agentEmail={agentEmail}
                    />
                </div>

                <p className="mt-6 text-sm text-gray-500 text-center">
                    Scan this QR code to start chatting with {(meta.fullname as string) || agentName}
                </p>
            </div>
        </div>
    );
}
