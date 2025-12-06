'use client';

import { Loader2, Lock } from 'lucide-react';
import { useState } from 'react';

type ChangePasswordFormProps = {
    onSuccess?: () => void;
    className?: string;
};

export function ChangePasswordForm(props: ChangePasswordFormProps) {
    const { onSuccess, className } = props;
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        const formData = new FormData(event.currentTarget);
        const currentPassword = formData.get('currentPassword') as string;
        const newPassword = formData.get('newPassword') as string;
        const confirmNewPassword = formData.get('confirmNewPassword') as string;

        if (newPassword !== confirmNewPassword) {
            setError('New passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const result = await response.json();

            if (response.ok) {
                setSuccessMessage('Password changed successfully');
                // Reset form
                event.currentTarget.reset();
                if (onSuccess) {
                    setTimeout(onSuccess, 1500);
                }
            } else {
                setError(result.error || 'An error occurred');
            }
        } catch (error) {
            setError('An unexpected error occurred');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`space-y-4 ${className || ''}`}>
            <div className="space-y-2">
                <label
                    htmlFor="currentPassword"
                    className="text-sm font-medium text-gray-700 block"
                >
                    Current Password
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Lock className="w-4 h-4" />
                    </div>
                    <input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        required
                        className="block w-full pl-10 h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:border-transparent disabled:opacity-50"
                        placeholder="Enter current password"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label
                    htmlFor="newPassword"
                    className="text-sm font-medium text-gray-700 block"
                >
                    New Password
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Lock className="w-4 h-4" />
                    </div>
                    <input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        required
                        className="block w-full pl-10 h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:border-transparent disabled:opacity-50"
                        placeholder="Enter new password"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label
                    htmlFor="confirmNewPassword"
                    className="text-sm font-medium text-gray-700 block"
                >
                    Confirm New Password
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Lock className="w-4 h-4" />
                    </div>
                    <input
                        id="confirmNewPassword"
                        name="confirmNewPassword"
                        type="password"
                        required
                        className="block w-full pl-10 h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:border-transparent disabled:opacity-50"
                        placeholder="Confirm new password"
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="p-3 text-sm text-green-500 bg-green-50 border border-green-200 rounded-md">
                    {successMessage}
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-promptbook-blue-dark text-white hover:bg-promptbook-blue-dark/90 focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                        Changing Password...
                    </>
                ) : (
                    'Change Password'
                )}
            </button>
        </form>
    );
}
