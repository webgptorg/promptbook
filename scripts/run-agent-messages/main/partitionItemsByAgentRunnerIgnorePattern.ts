/**
 * Splits repository-like items into watched and ignored groups for one `ptbk agent run-multiple` session.
 */
export function partitionItemsByAgentRunnerIgnorePattern<TItem>(
    items: ReadonlyArray<TItem>,
    getRepositoryName: (item: TItem) => string,
    ignorePattern: string | undefined,
): {
    readonly includedItems: ReadonlyArray<TItem>;
    readonly ignoredItems: ReadonlyArray<TItem>;
} {
    if (!ignorePattern) {
        return {
            includedItems: items,
            ignoredItems: [],
        };
    }

    const ignorePatternRegularExpression = createAgentRunnerIgnorePatternRegularExpression(ignorePattern);
    const includedItems: TItem[] = [];
    const ignoredItems: TItem[] = [];

    for (const item of items) {
        if (ignorePatternRegularExpression.test(getRepositoryName(item))) {
            ignoredItems.push(item);
        } else {
            includedItems.push(item);
        }
    }

    return {
        includedItems,
        ignoredItems,
    };
}

/**
 * Converts one user-supplied `--ignore` wildcard pattern into a repository-name matcher.
 */
function createAgentRunnerIgnorePatternRegularExpression(ignorePattern: string): RegExp {
    const escapedPattern = ignorePattern.replace(/[|\\{}()[\]^$+?.]/gu, '\\$&');
    const regularExpressionPattern = escapedPattern.replace(/\*/gu, '.*');

    return new RegExp(`^${regularExpressionPattern}$`, 'iu');
}

