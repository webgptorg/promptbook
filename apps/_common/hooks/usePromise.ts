import type { DependencyList } from 'react';
import { useEffect, useState } from 'react';
import type { Promisable } from 'type-fest';

export type IUsePromiseResult<TValue> =
    | { isComplete: false; value: undefined; error: undefined }
    | { isComplete: true; value: null; error: Error }
    | { isComplete: true; value: TValue; error: null };

/**
 * React hook that returns result of Promise or its pending / error state.
 */
export function usePromise<TValue>(
    valuePromisable: Promisable<TValue>,
    deps?: DependencyList,
): IUsePromiseResult<TValue> {
    const initialResult: IUsePromiseResult<TValue> =
        valuePromisable instanceof Promise
            ? {
                  value: undefined,
                  error: undefined,
                  isComplete: false,
              }
            : {
                  value: valuePromisable as TValue,
                  error: null,
                  isComplete: true,
              };

    const [result, setResult] = useState<IUsePromiseResult<TValue>>(initialResult);

    useEffect(
        () => {
            if (initialResult.isComplete === true) {
                return;
            }

            (async () => {
                try {
                    const value = await valuePromisable;
                    setResult({
                        value,
                        error: null,
                        isComplete: true,
                    });
                } catch (error) {
                    if (error instanceof Error) {
                        setResult({
                            value: null,
                            error,
                            isComplete: true,
                        });
                    } else {
                        console.error(`Called usePromise with reject which not rejected Error `, {
                            thrown: error,
                        });
                    }
                }
            })();

            return () => {
                /* TODO: Probably add some destroy logic */
            };
        },
        // Note: Passing correct deps is up to usePromise caller.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        deps || [valuePromisable],
    );

    return result;
}

/**
 * TODO: [🧠] Should be exported from `@promptbook/components`
 */
