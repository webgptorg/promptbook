
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { FC, PropsWithChildren, Suspense, useEffect, useState } from 'react';
import { LoadingIndicator } from '../LoadingIndicator';

/**
 * Renders a provider for NProgress.
 * @returns {JSX.Element} The rendered provider.
 */
export const NprogressProvider: FC<PropsWithChildren> = ({ children }) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        setIsFinished(true);
    }, [pathname, searchParams]);

    useEffect(() => {
        const handleAnchorClick = (event: MouseEvent) => {
            const targetUrl = (event.currentTarget as HTMLAnchorElement).href;
            const currentUrl = new URL(location.href);

            if (targetUrl !== currentUrl.href) {
                setIsFinished(false);
            }
        };

        const handleMutation: MutationCallback = () => {
            const anchorElements = document.querySelectorAll('a');
            anchorElements.forEach((anchor) => anchor.addEventListener('click', handleAnchorClick));
        };

        const mutationObserver = new MutationObserver(handleMutation);
        mutationObserver.observe(document, { childList: true, subtree: true });
    }, []);

    return (
        <Suspense>
            <LoadingIndicator isFinished={isFinished} />
            {children}
        </Suspense>
    );
};
