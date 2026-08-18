/**
 * Collapses cron whitespace without changing any field value.
 *
 * @param expression - Raw cron expression.
 * @returns Whitespace-normalized expression, which is empty when the input holds no field at all.
 *
 * @private function of `cronExpression`
 */
export function normalizeCronExpressionWhitespace(expression: string): string {
    return expression.trim().replace(/\s+/gu, ' ');
}
