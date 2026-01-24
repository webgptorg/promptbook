'use client';

import { ArrowLeftIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    HoistedMenuItem,
    useMenuHoisting,
} from '../../../../../src/book-components/_common/MenuHoisting/MenuHoistingContext';
import { BackToAgentButton, getBackToAgentHref } from './BackToAgentButton';

type BackToAgentMenuHoistProps = {
    /**
     * The unique name or ID of the agent.
     */
    readonly agentName: string;
};

/**
 * Hoists the back button into the top menu bar when possible.
 *
 * @param {BackToAgentMenuHoistProps} props - The component props.
 * @returns {JSX.Element | null} The rendered component or null when hoisted.
 */
export function BackToAgentMenuHoist({ agentName }: BackToAgentMenuHoistProps) {
    const router = useRouter();
    const menuHoisting = useMenuHoisting();
    const menuRef = useRef<HoistedMenuItem[]>([]);
    const backItemKey = 'back-to-agent';
    const menu = useMemo<HoistedMenuItem[]>(() => menuHoisting?.menu ?? [], [menuHoisting?.menu]);

    /**
     * Navigate back to the agent profile page.
     */
    const handleBack = useCallback(() => {
        router.push(getBackToAgentHref(agentName));
    }, [agentName, router]);

    /**
     * Build the menu items for the hoisted back button.
     */
    const backMenuItem = useMemo<HoistedMenuItem>(() => {
        return {
            key: backItemKey,
            icon: <ArrowLeftIcon className="w-5 h-5" />,
            name: 'Back to Agent',
            onClick: handleBack,
        };
    }, [backItemKey, handleBack]);

    /**
     * Sync the back button with the menu hoisting context.
     */
    useEffect(() => {
        if (!menuHoisting) {
            return;
        }

        const menuWithoutBack = menu.filter((item) => item.key !== backItemKey);
        const hasBackItem = menuWithoutBack.length !== menu.length;

        if (!hasBackItem) {
            menuHoisting.setMenu([backMenuItem, ...menuWithoutBack]);
        }
    }, [backItemKey, backMenuItem, menu, menuHoisting]);

    /**
     * Track the latest menu for cleanup when the component unmounts.
     */
    useEffect(() => {
        menuRef.current = menu;
    }, [menu]);

    /**
     * Remove the back button from the hoisted menu on unmount.
     */
    useEffect(() => {
        if (!menuHoisting) {
            return;
        }

        return () => {
            const menuWithoutBack = menuRef.current.filter((item) => item.key !== backItemKey);
            menuHoisting.setMenu(menuWithoutBack);
        };
    }, [backItemKey, menuHoisting]);

    if (!menuHoisting) {
        return (
            <div className="absolute top-5 right-10 z-50">
                <BackToAgentButton agentName={agentName} />
            </div>
        );
    }

    return null;
}
