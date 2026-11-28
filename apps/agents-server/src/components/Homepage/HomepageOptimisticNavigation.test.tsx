/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { act, render, screen } from '@testing-library/react';
import { NAVIGATION_PROGRESS_START_EVENT_NAME } from '../NavigationProgress/navigationProgressEvents';
import { HomepageOptimisticNavigation } from './HomepageOptimisticNavigation';

/**
 * Renders the homepage optimistic-navigation shell for regression coverage.
 *
 * @param pathname - Current pathname reported by the persistent layout shell.
 * @param content - Rendered child content.
 * @returns Render result for the optimistic-navigation shell.
 */
function renderHomepageOptimisticNavigation(pathname: string, content: string) {
    return render(
        <HomepageOptimisticNavigation pathname={pathname}>
            <div>{content}</div>
        </HomepageOptimisticNavigation>,
    );
}

describe('HomepageOptimisticNavigation', () => {
    beforeEach(() => {
        window.history.replaceState(null, '', 'http://localhost/agents/test-agent');
    });

    afterEach(() => {
        window.history.replaceState(null, '', 'http://localhost/');
    });

    it('renders the homepage loading skeleton immediately while home is still loading', () => {
        const { rerender } = renderHomepageOptimisticNavigation('/agents/test-agent', 'Agent page content');

        expect(screen.getByText('Agent page content')).not.toBeNull();

        act(() => {
            window.dispatchEvent(
                new CustomEvent(NAVIGATION_PROGRESS_START_EVENT_NAME, {
                    detail: {
                        href: '/?headless',
                        source: 'link',
                    },
                }),
            );
        });

        expect(screen.getByRole('status', { name: 'Loading home' })).not.toBeNull();
        expect(screen.queryByText('Agent page content')).toBeNull();

        rerender(
            <HomepageOptimisticNavigation pathname="/">
                <div>Homepage content</div>
            </HomepageOptimisticNavigation>,
        );

        expect(screen.getByText('Homepage content')).not.toBeNull();
        expect(screen.queryByRole('status', { name: 'Loading home' })).toBeNull();
    });
});
