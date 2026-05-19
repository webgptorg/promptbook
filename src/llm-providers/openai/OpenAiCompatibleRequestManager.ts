import Bottleneck from 'bottleneck';
import colors from 'colors';
import type { ClientOptions } from 'openai';
import OpenAI from 'openai';
import { API_REQUEST_TIMEOUT, CONNECTION_RETRIES_LIMIT, DEFAULT_MAX_REQUESTS_PER_MINUTE } from '../../config';
import { assertsError } from '../../errors/assertsError';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from './OpenAiCompatibleExecutionToolsOptions';

/**
 * Manages OpenAI-compatible client creation plus shared retry and rate-limit behavior.
 *
 * @private helper of `OpenAiCompatibleExecutionTools`
 */
export class OpenAiCompatibleRequestManager {
    private client: OpenAI | null = null;
    private readonly limiter: Bottleneck;

    public constructor(private readonly options: OpenAiCompatibleExecutionToolsNonProxiedOptions) {
        this.limiter = new Bottleneck({
            minTime: 60_000 / (this.options.maxRequestsPerMinute || DEFAULT_MAX_REQUESTS_PER_MINUTE),
        });
    }

    /**
     * Returns the lazily initialized OpenAI client configured from execution-tool options.
     */
    public async getClient(): Promise<OpenAI> {
        if (this.client === null) {
            const openAiOptions = { ...this.options };
            delete openAiOptions.isVerbose;
            delete openAiOptions.userId;

            const enhancedOptions: ClientOptions = {
                ...openAiOptions,
                timeout: API_REQUEST_TIMEOUT,
                maxRetries: CONNECTION_RETRIES_LIMIT,
            } as ClientOptions;

            this.client = new OpenAI(enhancedOptions);
        }

        return this.client;
    }

    /**
     * Schedules one request through the shared limiter and retry policy.
     */
    public async executeRateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
        return this.limiter.schedule(() => this.makeRequestWithNetworkRetry(requestFn)).catch((error: Error) => {
            assertsError(error);
            if (this.options.isVerbose) {
                console.info(colors.bgRed('error'), error);
            }
            throw error;
        });
    }

    /**
     * Retries transient transport errors with exponential backoff.
     */
    private async makeRequestWithNetworkRetry<T>(requestFn: () => Promise<T>): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= CONNECTION_RETRIES_LIMIT; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                assertsError(error);
                lastError = error;

                const isRetryableError = this.isRetryableNetworkError(error);

                if (!isRetryableError || attempt === CONNECTION_RETRIES_LIMIT) {
                    if (this.options.isVerbose && this.isRetryableNetworkError(error)) {
                        console.info(
                            colors.bgRed('Final network error after retries'),
                            `Attempt ${attempt}/${CONNECTION_RETRIES_LIMIT}:`,
                            error,
                        );
                    }
                    throw error;
                }

                const baseDelay = 1000;
                const backoffDelay = baseDelay * Math.pow(2, attempt - 1);
                const jitterDelay = Math.random() * 500;
                const totalDelay = backoffDelay + jitterDelay;

                if (this.options.isVerbose) {
                    console.info(
                        colors.bgYellow('Retrying network request'),
                        `Attempt ${attempt}/${CONNECTION_RETRIES_LIMIT}, waiting ${Math.round(totalDelay)}ms:`,
                        error.message,
                    );
                }

                await new Promise((resolve) => setTimeout(resolve, totalDelay));
            }
        }

        throw lastError!;
    }

    /**
     * Determines whether the thrown error should be retried as a transient network failure.
     */
    private isRetryableNetworkError(error: Error): boolean {
        const errorMessage = error.message.toLowerCase();
        const errorCode = (error as Error & { code?: string }).code;
        const retryableErrors = [
            'econnreset',
            'enotfound',
            'econnrefused',
            'etimedout',
            'socket hang up',
            'network error',
            'fetch failed',
            'connection reset',
            'connection refused',
            'timeout',
        ];

        if (retryableErrors.some((retryableError) => errorMessage.includes(retryableError))) {
            return true;
        }

        if (errorCode && retryableErrors.includes(errorCode.toLowerCase())) {
            return true;
        }

        const errorWithStatus = error as Error & { status?: number; statusCode?: number };
        const httpStatus = errorWithStatus.status || errorWithStatus.statusCode;

        if (httpStatus && [429, 500, 502, 503, 504].includes(httpStatus)) {
            return true;
        }

        return false;
    }
}
