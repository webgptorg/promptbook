import { useEffect, useMemo } from 'react';
import spaceTrim from 'spacetrim';
import { useStateWithDeps } from 'use-state-with-deps';
import { $isRunningInBrowser } from '../../../src/_packages/utils.index';

export type SetStateOptions = {
    /**
     * Is the state persisted in the browser storage
     */
    isSaved?: boolean;

    /**
     * Should the state be broadcasted to other tabs/components
     */
    isBroadcasted?: boolean;
};

export function useStateInLocalStorage<T extends string>(
    key: string,
    getInitialState: () => T,
): readonly [state: T, setState: (newState: T | ((currentState: T) => T), options?: SetStateOptions) => void] {
    if (
        !$isRunningInBrowser()
        /* < Note: We are NOT using here useSsrDetection because
                   useSsrDetection always starts with true and then turns off when detects CSR
                   BUT in this case it will just crash and does not even start the app.
        */
    ) {
        throw new Error(
            spaceTrim(`
                Hook useStateInLocalStorage can not be used on the server side,
                please wrap the component with <NoSsr>...</NoSsr>

                Note: We can not return just simple getInitialState because that will cause an hydration mismatch error
                      in case that user has something saved in the local storage.
            `),
        );
    }

    const [state, setState] = useStateWithDeps<T>(() => {
        const stateFromLocalStorage = window.localStorage.getItem(key);

        if (stateFromLocalStorage) {
            return stateFromLocalStorage as T;
        } else {
            return getInitialState();
        }
    }, [key]);

    // Note: [🍣] Syncing state between tabs and parts of the app which are using the same key indipendently
    const broadcastChannel = useMemo(() => getChannelForStateInLocalStorage(key), [key]);

    const sender = useMemo(() => /* TODO: $randomUuid() */ Math.random(), []);

    useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            // console.log('Received message', event.data, sender);
            if (sender === event.data.sender) {
                // Note: Sender is the same, skipping
                // Note: This mechanism is maybe not needed because we are listening to literally same channel as we are broadcasting
                return;
            }

            setState(event.data.state);
        };
        broadcastChannel.addEventListener('message', messageHandler);

        return () => {
            broadcastChannel.removeEventListener('message', messageHandler);
        };
    }, [setState, key, broadcastChannel, sender]);

    const persistState = (newStateOrFunction: T | ((currentState: T) => T), options?: SetStateOptions) => {
        const valueToSet =
            typeof newStateOrFunction === 'function'
                ? (newStateOrFunction as (currentState: T) => T)(
                      (localStorage.getItem(key) as T) || getInitialState(), // <- Note: Getting the current state from local storage, not from the state variable
                  )
                : newStateOrFunction;

        if (typeof valueToSet !== 'string') {
            throw new Error(`Can not change state to non-string value in useStateInLocalStorage "${key}"`);
        }

        const { isSaved = true, isBroadcasted = true } = options || {};
        // console.log('persistState', key, valueToSet);

        if (isSaved) {
            window.localStorage.setItem(key, valueToSet);
        }

        if (isBroadcasted) {
            broadcastChannel.postMessage({ sender, state: valueToSet }); // <- TODO: [🐁] !!! Make here some debounce
        }
        setState(valueToSet);
    };

    return [state, persistState];
}

const channels = new Map<string, BroadcastChannel>();

export function getChannelForStateInLocalStorage(key: string): BroadcastChannel {
    let channel = channels.get('sync-for-useStateInLocalStorage-' + key);
    if (!channel) {
        channel = new BroadcastChannel(key);
        channels.set(key, channel);
    }
    return channel;
}

/**
 * TODO: [🧠] Maybe leverage PromptbookStorage here `getLocalStorage`
 * TODO: [🧠] Maybe use some library for storage - ask + [🧠] which one and which to use to sync with backend
 */
