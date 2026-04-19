/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useState } from 'react';

const routerPushMock = jest.fn<(href: string) => void>();
const dispatchNavigationProgressStartMock = jest.fn<(payload: { href: string; source: string }) => void>();
let searchParamsMock = new URLSearchParams();

jest.mock('next/link', () => ({
    __esModule: true,
    default: function MockNextLink({
        children,
        href,
        ...props
    }: {
        readonly children: ReactNode;
        readonly href: string;
    }) {
        return (
            <a href={href} {...props}>
                {children}
            </a>
        );
    },
}));

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: routerPushMock,
    }),
    useSearchParams: () => searchParamsMock,
}));

jest.mock('../NavigationProgress/navigationProgressEvents', () => ({
    dispatchNavigationProgressStart: (payload: { href: string; source: string }) =>
        dispatchNavigationProgressStartMock(payload),
}));

import { HeadlessLink } from './headlessParam';

/**
 * Renders one shared link that removes itself during its own click handler.
 */
function SelfClosingHeadlessLink({ href }: { readonly href: string }) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) {
        return <span>Link closed</span>;
    }

    return (
        <HeadlessLink href={href} onClick={() => setIsVisible(false)}>
            Navigate
        </HeadlessLink>
    );
}

describe('HeadlessLink', () => {
    beforeEach(() => {
        searchParamsMock = new URLSearchParams();
        routerPushMock.mockClear();
        dispatchNavigationProgressStartMock.mockClear();
    });

    afterEach(() => {
        window.history.replaceState(null, '', 'http://localhost/');
    });

    it('navigates even when the click handler unmounts the link immediately', () => {
        render(<SelfClosingHeadlessLink href="/docs" />);

        fireEvent.click(screen.getByRole('link', { name: 'Navigate' }));

        expect(routerPushMock).toHaveBeenCalledWith('/docs');
        expect(dispatchNavigationProgressStartMock).toHaveBeenCalledWith({ href: '/docs', source: 'link' });
        expect(screen.getByText('Link closed')).not.toBeNull();
    });

    it('preserves the headless query parameter for programmatic client navigation', () => {
        searchParamsMock = new URLSearchParams('headless');

        render(<SelfClosingHeadlessLink href="/docs" />);

        fireEvent.click(screen.getByRole('link', { name: 'Navigate' }));

        expect(routerPushMock).toHaveBeenCalledWith('/docs?headless');
        expect(dispatchNavigationProgressStartMock).toHaveBeenCalledWith({
            href: '/docs?headless',
            source: 'link',
        });
    });

    it('leaves cross-origin links to the browser instead of routing them through Next.js', () => {
        render(<HeadlessLink href="https://example.com/docs">External docs</HeadlessLink>);

        fireEvent.click(screen.getByRole('link', { name: 'External docs' }));

        expect(routerPushMock).not.toHaveBeenCalled();
        expect(dispatchNavigationProgressStartMock).not.toHaveBeenCalled();
    });
});
