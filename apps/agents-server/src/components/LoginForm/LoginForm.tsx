'use client';

import { loginAction } from '@/src/app/actions';
import { KeyRound, Loader2, Lock, User } from 'lucide-react';
import { SecretInput } from '@/src/components/SecretInput/SecretInput';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ForgottenPasswordDialog } from '../ForgottenPasswordDialog/ForgottenPasswordDialog';
import { RegisterUserDialog } from '../RegisterUserDialog/RegisterUserDialog';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';

/**
 * Props for the LoginForm component.
 */
type LoginFormProps = {
    /**
     * Optional callback invoked after a successful login.
     */
    onSuccess?: () => void | Promise<void>;

    /**
     * Optional classes applied to the form root.
     */
    className?: string;

    /**
     * When true, refreshes the current route after a successful login.
     *
     * @default true
     */
    refreshAfterSuccess?: boolean;
    /**
     * Optional callback invoked whenever local form dirty-state changes.
     */
    onDirtyChange?: (hasUnsavedChanges: boolean) => void;
};

/**
 * Authentication-method payload returned by `/api/auth/methods`.
 */
type AuthenticationMethodsResponse = {
    /**
     * Enabled authentication methods.
     */
    readonly methods?: ReadonlyArray<string>;
    /**
     * Shibboleth login metadata.
     */
    readonly shibboleth?: {
        readonly isEnabled?: boolean;
        readonly providerLabel?: string;
        readonly loginUrl?: string;
    };
};

/**
 * Client-side state describing visible login methods.
 */
type LoginMethodState = {
    /**
     * Whether password login should be shown.
     */
    readonly isPasswordEnabled: boolean;
    /**
     * Whether Shibboleth login should be shown.
     */
    readonly isShibbolethEnabled: boolean;
    /**
     * User-facing Shibboleth provider label.
     */
    readonly shibbolethProviderLabel: string;
    /**
     * Route that starts Shibboleth authentication.
     */
    readonly shibbolethLoginUrl: string;
};

/**
 * Renders the login form and handles authentication.
 */
export function LoginForm(props: LoginFormProps) {
    const { onSuccess, className, refreshAfterSuccess = true, onDirtyChange } = props;
    const { t } = useServerLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [adminEmail, setAdminEmail] = useState<string>('support@ptbk.io');
    const [isForgottenPasswordOpen, setIsForgottenPasswordOpen] = useState(false);
    const [isRegisterUserOpen, setIsRegisterUserOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginMethods, setLoginMethods] = useState<LoginMethodState>({
        isPasswordEnabled: true,
        isShibbolethEnabled: false,
        shibbolethProviderLabel: 'Shibboleth',
        shibbolethLoginUrl: '/api/auth/shibboleth/login',
    });
    const hasUnsavedChanges = username.length > 0 || password.length > 0;
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const search = searchParams?.toString();
    const redirectTo = `${pathname || '/'}${search ? `?${search}` : ''}`;
    const shibbolethLoginHref = `${loginMethods.shibbolethLoginUrl}?redirectTo=${encodeURIComponent(redirectTo)}`;

    useEffect(() => {
        // Fetch admin email on component mount
        fetch('/api/admin-email')
            .then((response) => response.json())
            .then((data) => {
                if (data.adminEmail) {
                    setAdminEmail(data.adminEmail);
                }
            })
            .catch((error) => {
                console.error('Failed to fetch admin email:', error);
                // Keep default value
            });
    }, []);

    useEffect(() => {
        fetch('/api/auth/methods')
            .then((response) => response.json())
            .then((data: AuthenticationMethodsResponse) => {
                const methods = data.methods || ['PASSWORD'];

                setLoginMethods({
                    isPasswordEnabled: methods.includes('PASSWORD'),
                    isShibbolethEnabled: Boolean(data.shibboleth?.isEnabled),
                    shibbolethProviderLabel: data.shibboleth?.providerLabel || 'Shibboleth',
                    shibbolethLoginUrl: data.shibboleth?.loginUrl || '/api/auth/shibboleth/login',
                });
            })
            .catch((error) => {
                console.error('Failed to fetch authentication methods:', error);
            });
    }, []);

    useEffect(() => {
        onDirtyChange?.(hasUnsavedChanges);
    }, [hasUnsavedChanges, onDirtyChange]);

    useEffect(() => {
        return () => {
            onDirtyChange?.(false);
        };
    }, [onDirtyChange]);

    /**
     * Handles login form submissions and refreshes data on success.
     *
     * @param event - Form submission event.
     */
    const handleSubmit = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setIsLoading(true);
            setError(null);

            try {
                const formData = new FormData(event.currentTarget);
                const result = await loginAction(formData);

                if (result.success) {
                    if (onSuccess) {
                        await onSuccess();
                    }
                    if (refreshAfterSuccess) {
                        router.refresh();
                    }
                } else {
                    setError(result.message || t('login.errorOccurred'));
                }
            } catch (error) {
                setError(t('login.unexpectedError'));
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        },
        [onSuccess, refreshAfterSuccess, router, t],
    );

    return (
        <form onSubmit={handleSubmit} className={`space-y-4 ${className || ''}`}>
            {loginMethods.isShibbolethEnabled && (
                <a
                    href={shibbolethLoginHref}
                    className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:ring-offset-2 transition-colors"
                >
                    <KeyRound className="mr-2 w-4 h-4" />
                    {t('login.shibbolethAction', { provider: loginMethods.shibbolethProviderLabel })}
                </a>
            )}

            {loginMethods.isPasswordEnabled && loginMethods.isShibbolethEnabled && (
                <div className="flex items-center gap-3 text-xs font-semibold uppercase text-gray-400">
                    <span className="h-px flex-1 bg-gray-200" />
                    <span>{t('login.methodDivider')}</span>
                    <span className="h-px flex-1 bg-gray-200" />
                </div>
            )}

            {loginMethods.isPasswordEnabled && (
                <>
                    <div className="space-y-2">
                        <label htmlFor="username" className="text-sm font-medium text-gray-700 block">
                            {t('login.usernameLabel')}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <User className="w-4 h-4" />
                            </div>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                required
                                className="block w-full pl-10 h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:border-transparent disabled:opacity-50"
                                placeholder={t('login.usernamePlaceholder')}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <SecretInput
                            id="password"
                            name="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            label={t('login.passwordLabel')}
                            placeholder={t('login.passwordPlaceholder')}
                            required
                            startIcon={<Lock className="w-4 h-4" />}
                        />
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
                                {t('login.loggingIn')}
                            </>
                        ) : (
                            t('login.loginAction')
                        )}
                    </button>

                    <div className="flex justify-between text-sm">
                        <button
                            type="button"
                            onClick={() => setIsForgottenPasswordOpen(true)}
                            className="text-promptbook-blue hover:text-promptbook-blue-dark underline focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:ring-offset-2 rounded-sm"
                        >
                            {t('login.forgottenPassword')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsRegisterUserOpen(true)}
                            className="text-promptbook-blue hover:text-promptbook-blue-dark underline focus:outline-none focus:ring-2 focus:ring-promptbook-blue focus:ring-offset-2 rounded-sm"
                        >
                            {t('login.registerNewUser')}
                        </button>
                    </div>
                </>
            )}

            {!loginMethods.isPasswordEnabled && error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">{error}</div>
            )}

            {isForgottenPasswordOpen && (
                <ForgottenPasswordDialog onClose={() => setIsForgottenPasswordOpen(false)} adminEmail={adminEmail} />
            )}

            {isRegisterUserOpen && (
                <RegisterUserDialog onClose={() => setIsRegisterUserOpen(false)} adminEmail={adminEmail} />
            )}
        </form>
    );
}
