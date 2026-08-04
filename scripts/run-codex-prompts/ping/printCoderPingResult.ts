import colors from 'colors';
import { formatCodexLoginMethod } from '../../../src/book-3.0/codexLoginMethod';
import type { UncertainNumber } from '../../../src/execution/UncertainNumber';
import type { Usage } from '../../../src/execution/Usage';
import { formatUsagePrice } from '../../../src/execution/utils/formatUsagePrice';
import { formatRunnerSignature } from '../prompts/formatRunnerSignature';
import { CODER_PING_EXPECTED_ANSWER } from './buildCoderPingPrompt';
import type { CoderPingResult } from './CoderPingResult';

/**
 * Prints the compact summary of one finished `ptbk coder ping`.
 */
export function printCoderPingResult(result: CoderPingResult): void {
    const runnerSignature = formatRunnerSignature(result.runnerName, result.modelName, result.thinkingLevel);
    const loginMethodLabel = formatCodexLoginMethod(result.loginMethod);
    const loginMethodSuffix = loginMethodLabel === undefined ? '' : ` (${loginMethodLabel})`;

    console.info(
        colors.green(
            `🏓 ${runnerSignature}${loginMethodSuffix} answered in ${formatCoderPingResponseTime(result.durationMs)}`,
        ),
    );
    console.info(colors.gray(`   Answer: ${formatCoderPingAnswer(result)}`));
    console.info(colors.gray(`   Usage:  ${formatCoderPingUsage(result.usage)}`));
}

/**
 * Formats the measured round-trip time, keeping the sub-second precision a response time needs.
 */
function formatCoderPingResponseTime(durationMs: number): string {
    return `${(durationMs / 1000).toFixed(2)}s`;
}

/**
 * Formats the answer of the pinged harness together with what was expected from it.
 */
function formatCoderPingAnswer(result: CoderPingResult): string {
    if (result.answer === null) {
        return `Reached, but the answer line was missing from the output (expected \`${CODER_PING_EXPECTED_ANSWER}\`)`;
    }

    if (result.isAnswerCorrect) {
        return result.answer;
    }

    return `${result.answer} (expected \`${CODER_PING_EXPECTED_ANSWER}\`)`;
}

/**
 * Formats the resources the pinged harness reported for the dummy work.
 */
function formatCoderPingUsage(usage: Usage): string {
    return [
        formatUsagePrice(usage),
        `${formatUncertainCount(usage.input.tokensCount)} input tokens`,
        `${formatUncertainCount(usage.output.tokensCount)} output tokens`,
    ].join(', ');
}

/**
 * Formats one counted usage value, marking an estimated count with a leading `~`.
 */
function formatUncertainCount(count: UncertainNumber): string {
    return `${count.isUncertain === true ? '~' : ''}${Math.round(count.value)}`;
}
