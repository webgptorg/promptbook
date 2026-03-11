'use client';

import { type ComponentType, useEffect, useState } from 'react';
import 'swagger-ui-react/swagger-ui.css';
import { SwaggerApiKeysPanel } from './SwaggerApiKeysPanel';

/**
 * Props for the interactive Swagger UI page.
 */
type SwaggerPageClientProps = {
    /**
     * Whether the current page viewer is an admin.
     */
    isAdmin: boolean;
};

/**
 * Renders the runtime-generated Swagger UI and the compact API-key helper panel.
 */
export function SwaggerPageClient({ isAdmin }: SwaggerPageClientProps) {
    const [SwaggerUI, setSwaggerUI] = useState<ComponentType<{
        url: string;
        persistAuthorization?: boolean;
        defaultModelsExpandDepth?: number;
        docExpansion?: 'list' | 'full' | 'none';
    }> | null>(null);

    useEffect(() => {
        let isMounted = true;

        void (async () => {
            const swaggerUiModule = await import('swagger-ui-react');

            if (isMounted) {
                setSwaggerUI(() => swaggerUiModule.default);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="mx-auto max-w-7xl px-4 py-6">
                <SwaggerApiKeysPanel isAdmin={isAdmin} />
            </div>
            <div className="swagger-container bg-white min-h-screen">
                {SwaggerUI ? (
                    <SwaggerUI
                        url="/openapi.json"
                        persistAuthorization
                        defaultModelsExpandDepth={-1}
                        docExpansion="list"
                    />
                ) : (
                    <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-slate-500">Loading Swagger UI...</div>
                )}
            </div>
        </div>
    );
}
