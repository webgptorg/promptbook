/** Actual check execution outcome, kept separate from local/remote persistence. */
export type CoderCheckOutcome =
    | { readonly kind: 'passed'; readonly output: string }
    | { readonly kind: 'failed' | 'execution-error' | 'interrupted'; readonly output: string; readonly error: unknown };
