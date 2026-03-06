'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    acceptMetaDisclaimer,
    fetchMetaDisclaimerStatus,
    type MetaDisclaimerStatus,
} from '../../../utils/metaDisclaimerClient';

/**
 * Result returned by the `useMetaDisclaimer` hook.
 *
 * @private type for AgentChatWrapper
 */
type UseMetaDisclaimerResult = {
    status: MetaDisclaimerStatus | null;
    isLoading: boolean;
    isAccepting: boolean;
    errorMessage: string | null;
    reload: () => Promise<void>;
    accept: () => Promise<void>;
};

/**
 * Manages loading and accepting meta disclaimers for an agent.
 *
 * @private hook of AgentChatWrapper
 */
export function useMetaDisclaimer(agentName: string): UseMetaDisclaimerResult {
    const [status, setStatus] = useState<MetaDisclaimerStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const fetchedStatus = await fetchMetaDisclaimerStatus(agentName);
            setStatus(fetchedStatus);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to load disclaimer.');
        } finally {
            setIsLoading(false);
        }
    }, [agentName]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const accept = useCallback(async () => {
        setIsAccepting(true);
        setErrorMessage(null);

        try {
            const acceptedStatus = await acceptMetaDisclaimer(agentName);
            setStatus(acceptedStatus);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to accept disclaimer.');
        } finally {
            setIsAccepting(false);
        }
    }, [agentName]);

    return {
        status,
        isLoading,
        isAccepting,
        errorMessage,
        reload,
        accept,
    };
}
