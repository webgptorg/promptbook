'use client';

import { Loader2, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SecretInput } from '@/src/components/SecretInput/SecretInput';

type ChangePasswordFormProps = {
    onSuccess?: () => void;
    className?: string;
    onDirtyChange?: (hasUnsavedChanges: boolean) => void;
};

export function ChangePasswordForm(props: ChangePasswordFormProps) {
    const { onSuccess, className, onDirtyChange } = props;
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const hasUnsavedChanges = currentPassword.length > 0 || newPassword.length > 0 || confirmNewPassword.length > 0;

    useEffect(() => {
        onDirtyChange?.(hasUnsavedChanges);
    }, [hasUnsavedChanges, onDirtyChange]);

    useEffect(() => {
        return () => {
            onDirtyChange?.(false);
        };
    }, [onDirtyChange]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

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
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
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
            <SecretInput
                id="currentPassword"
                name="currentPassword"
                label="Current Password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                startIcon={<Lock className="w-4 h-4" />}
            />

            <SecretInput
                id="newPassword"
                name="newPassword"
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                startIcon={<Lock className="w-4 h-4" />}
            />

            <SecretInput
                id="confirmNewPassword"
                name="confirmNewPassword"
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                required
                startIcon={<Lock className="w-4 h-4" />}
            />

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
