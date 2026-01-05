'use client';

import { AgentBasicInformation } from '@promptbook-local/types';
import { XIcon } from 'lucide-react';
import { Dialog } from '../Portal/Dialog';
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
    if (!isOpen) return null;

    return (
        <Dialog isOpen={isOpen} onClose={onClose} className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
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
        </Dialog>
    );
}
