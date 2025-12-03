'use client';

import { X } from 'lucide-react';
import { LoginForm } from '../LoginForm/LoginForm';
import { Portal } from '../Portal/Portal';

type LoginDialogProps = {
    isOpen: boolean;
    onClose: () => void;
};

export function LoginDialog(props: LoginDialogProps) {
    const { isOpen, onClose } = props;

    if (!isOpen) {
        return null;
    }

    return (
        <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="relative w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-6 animate-in zoom-in-95 duration-200">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                        <span className="sr-only">Close</span>
                    </button>

                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Log in</h2>
                        <p className="text-sm text-gray-500 mt-1">Enter your credentials to access the admin area</p>
                    </div>

                    <LoginForm onSuccess={onClose} />
                </div>
            </div>
        </Portal>
    );
}

/**
 * TODO: !!!! Always on top
 */
