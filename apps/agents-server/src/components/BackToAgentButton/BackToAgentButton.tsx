'use client';

import { useMenuHoisting } from '@/../../src/book-components/_common/MenuHoisting/MenuHoistingContext';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FC, useCallback, useEffect } from 'react';
import { useAgentNaming } from '../AgentNaming/AgentNamingContext';

/**
 * Properties for the BackToAgentButton component
 */
type BackToAgentButtonProps = {
    /**
     * The unique name or ID of the agent
     */
    readonly agentName: string;
};

/**
 * A reusable button component that links back to the agent's main page.
 *
 * @param {BackToAgentButtonProps} props - The component props
 * @returns {JSX.Element} The rendered button component
 */
export const BackToAgentButton: FC<BackToAgentButtonProps> = ({ agentName }) => {
    const router = useRouter();
    const menuHoisting = useMenuHoisting();
    const setHoistedMenu = menuHoisting?.setMenu;
    const { formatText } = useAgentNaming();

    /**
     * Navigates back to the current agent page.
     */
    const handleBackToAgent = useCallback(() => {
        router.push(`/agents/${encodeURIComponent(agentName)}`);
    }, [agentName, router]);

    useEffect(() => {
        if (!setHoistedMenu) {
            return;
        }

        setHoistedMenu([
            {
                key: 'back-to-agent',
                name: formatText('Back to Agent'),
                icon: <ArrowLeftIcon />,
                onClick: handleBackToAgent,
            },
        ]);

        return () => {
            setHoistedMenu([]);
        };
    }, [handleBackToAgent, setHoistedMenu, formatText]);

    if (menuHoisting) {
        return null;
    }

    return (
        <Link
            href={`/agents/${encodeURIComponent(agentName)}`}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title={formatText('Back to Agent')}
        >
            <ArrowLeftIcon className="w-6 h-6" />
        </Link>
    );
};
