'use client';

import { ErrorPage } from '../ErrorPage/ErrorPage';
import { LoginForm } from '../LoginForm/LoginForm';

/**
 * Renders a forbidden page with a login form.
 */
export function ForbiddenPage() {
    return (
        <ErrorPage title="403 Forbidden" message="You do not have permission to access this page.">
            <LoginForm />
        </ErrorPage>
    );
}
