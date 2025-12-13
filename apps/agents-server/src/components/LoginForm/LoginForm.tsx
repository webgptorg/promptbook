'use client';

import { loginAction } from '@/src/app/actions';
import { ForgottenPasswordDialog } from '../ForgottenPasswordDialog/ForgottenPasswordDialog';
import { RegisterUserDialog } from '../RegisterUserDialog/RegisterUserDialog';
import { Loader2, Lock, User } from 'lucide-react';
import { useEffect, useState } from 'react';

type LoginFormProps = {
    onSuccess?: () => void;
    className?: string;
};

export function LoginForm(props: LoginFormProps) {
    const { onSuccess, className } = props;
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [adminEmail, setAdminEmail] = useState<string>('support@ptbk.io');
    const [isForgottenPasswordOpen, setIsForgottenPasswordOpen] = useState(false);
    const [isRegisterUserOpen, setIsRegisterUserOpen] = useState(false);

    useEffect(() => {
        // Fetch admin email on component mount
        fetch('/api/admin-email')
            .then(response => response.json())
            .then(data => {
                if (data.adminEmail) {
                    setAdminEmail(data.adminEmail);
                }
            })
            .catch(error => {
                console.error('Failed to fetch admin email:', error);
                // Keep default value
            });
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const formData = new FormData(event.currentTarget);
            const result = await loginAction(formData);

            if (result.success) {
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                setError(result.message || 'An error occurred');
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
                    htmlFor="username"
                    className="text-sm font-medium text-gray-700 block"
                >
                    Username
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <User className="w-4 h-4" />
                    </div>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        className="block w-full pl-10 h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:border-transparent disabled:opacity-50"
                        placeholder="Enter your username"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700 block"
                >
                    Password
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Lock className="w-4 h-4" />
                    </div>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="block w-full pl-10 h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:border-transparent disabled:opacity-50"
                        placeholder="Enter your password"
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                    {error}
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
                        Logging in...
                    </>
                ) : (
                    'Log in'
                )}
            </button>

            <div className="flex justify-between text-sm">
                <button
                    type="button"
                    onClick={() => setIsForgottenPasswordOpen(true)}
                    className="text-promptbook-blue hover:text-promptbook-blue-dark underline focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:ring-offset-2 rounded-sm"
                >
                    Forgotten password?
                </button>
                <button
                    type="button"
                    onClick={() => setIsRegisterUserOpen(true)}
                    className="text-promptbook-blue hover:text-promptbook-blue-dark underline focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:ring-offset-2 rounded-sm"
                >
                    Register new user
                </button>
            </div>

            <ForgottenPasswordDialog
                isOpen={isForgottenPasswordOpen}
                onClose={() => setIsForgottenPasswordOpen(false)}
                adminEmail={adminEmail}
            />

            <RegisterUserDialog
                isOpen={isRegisterUserOpen}
                onClose={() => setIsRegisterUserOpen(false)}
                adminEmail={adminEmail}
            />
        </form>
    );
}
