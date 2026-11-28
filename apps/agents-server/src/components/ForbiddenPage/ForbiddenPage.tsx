'use client';

import { ErrorPage } from '../ErrorPage/ErrorPage';
import { LoginForm } from '../LoginForm/LoginForm';
import { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';

/**
 * Renders a forbidden page with a login form.
 */
export function ForbiddenPage() {
    const { t } = useServerLanguage();

    return (
        <ErrorPage title={t('forbidden.title')} message={t('forbidden.message')}>
            <LoginForm />
        </ErrorPage>
    );
}
