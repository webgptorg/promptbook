'use client';

import { useEffect, useRef, useState } from 'react';
import 'swagger-ui-dist/swagger-ui.css';
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
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadError, setHasLoadError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const container = containerRef.current;

        void (async () => {
            try {
                // Import the browser bundle directly; the package entry point also imports Node.js helpers.
                const { default: SwaggerUIBundle } = await import('swagger-ui-dist/swagger-ui-bundle.js');

                if (!isMounted || !container) {
                    return;
                }

                SwaggerUIBundle({
                    domNode: container,
                    url: '/openapi.json',
                    persistAuthorization: true,
                    defaultModelsExpandDepth: -1,
                    docExpansion: 'list',
                });
                setIsLoading(false);
            } catch (error) {
                if (isMounted) {
                    console.error('Failed to load Swagger UI:', error);
                    setHasLoadError(true);
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            isMounted = false;
            container?.replaceChildren();
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="mx-auto max-w-7xl px-4 py-6">
                <SwaggerApiKeysPanel isAdmin={isAdmin} />
            </div>
            <div className="swagger-container bg-white min-h-screen">
                {isLoading && (
                    <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-slate-500">Loading Swagger UI...</div>
                )}
                {hasLoadError && (
                    <div role="alert" className="mx-auto max-w-7xl px-4 py-10 text-sm text-red-600">
                        Failed to load Swagger UI. Please reload the page.
                    </div>
                )}
                <div ref={containerRef} />
            </div>
        </div>
    );
}
