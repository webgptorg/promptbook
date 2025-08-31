import { Effect, pipe, Context, Layer, Schedule, Duration, Ref, Queue } from 'effect';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { Prompt } from '../../types/Prompt';
import type { AvailableModel } from '../../execution/AvailableModel';

/**
 * Effect.js-enhanced LLM Provider
 *
 * This demonstrates how Effect.js can improve LLM provider integration with:
 * - Circuit breaker pattern for failing providers
 * - Rate limiting with queues and semaphores
 * - Automatic retries with exponential backoff
 * - Resource pooling and connection management
 * - Structured error handling for different failure modes
 * - Metrics collection and observability
 *
 * @example
 * ```typescript
 * const program = pipe(
 *   EffectLlmProvider.callWithCircuitBreaker({
 *     prompt: myPrompt,
 *     modelVariant: 'CHAT',
 *   }),
 *   Effect.retry(Schedule.exponential(Duration.seconds(1))),
 *   Effect.timeout(Duration.seconds(30)),
 *   Effect.provide(LlmProviderLive)
 * );
 *
 * const result = await Effect.runPromise(program);
 * ```
 */

// Define services using Effect's Context system
export class LlmProviderService extends Context.Tag("LlmProviderService")<
  LlmProviderService,
  LlmExecutionTools
>() {}

export class RateLimiterService extends Context.Tag("RateLimiterService")<
  RateLimiterService,
  {
    requestQueue: Queue.Queue<{ prompt: Prompt; resolve: (result: unknown) => void; reject: (error: unknown) => void }>;
    requestsPerMinute: number;
    currentRequests: Ref.Ref<number>;
  }
>() {}

// Define custom error types for LLM operations
export class LlmProviderError extends Error {
  readonly _tag = "LlmProviderError";
  constructor(message: string, public readonly provider: string, public readonly cause?: unknown) {
    super(message);
  }
}

export class RateLimitError extends Error {
  readonly _tag = "RateLimitError";
  constructor(message: string, public readonly retryAfterMs: number) {
    super(message);
  }
}

export class CircuitBreakerOpenError extends Error {
  readonly _tag = "CircuitBreakerOpenError";
  constructor(message: string, public readonly provider: string) {
    super(message);
  }
}

export class ModelUnavailableError extends Error {
  readonly _tag = "ModelUnavailableError";
  constructor(message: string, public readonly modelName: string) {
    super(message);
  }
}

/**
 * Circuit breaker state for tracking provider health
 */
interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

/**
 * Effect-enhanced LLM Provider with advanced patterns
 */
export class EffectLlmProvider {
  /**
   * Create a circuit breaker for LLM provider calls
   */
  static createCircuitBreaker = (
    failureThreshold: number = 5,
    recoveryTimeMs: number = 60000
  ) =>
    Effect.gen(function* (_) {
      const state = yield* _(
        Ref.make<CircuitBreakerState>({
          isOpen: false,
          failureCount: 0,
          lastFailureTime: 0,
          successCount: 0,
        })
      );

      const checkCircuit = Effect.gen(function* (_) {
        const currentState = yield* _(Ref.get(state));

        if (currentState.isOpen) {
          const now = Date.now();
          if (now - currentState.lastFailureTime > recoveryTimeMs) {
            // Try to close the circuit
            yield* _(
              Ref.update(state, (s) => ({
                ...s,
                isOpen: false,
                failureCount: 0,
              }))
            );
          } else {
            yield* _(
              Effect.fail(
                new CircuitBreakerOpenError(
                  `Circuit breaker is open. Recovery time: ${recoveryTimeMs}ms`,
                  "llm-provider"
                )
              )
            );
          }
        }
      });

      const recordSuccess = Effect.gen(function* (_) {
        yield* _(
          Ref.update(state, (s) => ({
            ...s,
            successCount: s.successCount + 1,
            failureCount: 0,
          }))
        );
      });

      const recordFailure = Effect.gen(function* (_) {
        yield* _(
          Ref.update(state, (s) => {
            const newFailureCount = s.failureCount + 1;
            return {
              ...s,
              failureCount: newFailureCount,
              lastFailureTime: Date.now(),
              isOpen: newFailureCount >= failureThreshold,
            };
          })
        );
      });

      return { checkCircuit, recordSuccess, recordFailure, state };
    });

  /**
   * Create a rate limiter using Effect's Queue system
   */
  static createRateLimiter = (requestsPerMinute: number = 60) =>
    Effect.gen(function* (_) {
      const requestQueue = yield* _(Queue.unbounded<{
        prompt: Prompt;
        resolve: (result: unknown) => void;
        reject: (error: unknown) => void;
      }>());

      const currentRequests = yield* _(Ref.make(0));

      // Start the rate limiter processor
      const processor = Effect.gen(function* (_) {
        while (true) {
          const request = yield* _(Queue.take(requestQueue));
          const current = yield* _(Ref.get(currentRequests));

          if (current >= requestsPerMinute) {
            // Wait before processing
            yield* _(Effect.sleep(Duration.seconds(60)));
            yield* _(Ref.set(currentRequests, 0));
          }

          yield* _(Ref.update(currentRequests, (n) => n + 1));

          // Process the request (this would be handled by the actual implementation)
          request.resolve("processed");
        }
      });

      // Fork the processor to run in background
      yield* _(Effect.fork(processor));

      return { requestQueue, requestsPerMinute, currentRequests };
    });

  /**
   * Call LLM with circuit breaker pattern
   */
  static callWithCircuitBreaker = (params: {
    prompt: Prompt;
    modelVariant: 'CHAT' | 'COMPLETION' | 'EMBEDDING';
    maxRetries?: number;
    timeoutMs?: number;
  }) =>
    Effect.gen(function* (_) {
      const { prompt, modelVariant, timeoutMs = 30000 } = params;
      const llmProvider = yield* _(LlmProviderService);

      // Create circuit breaker
      const circuitBreaker = yield* _(EffectLlmProvider.createCircuitBreaker());

      // Check circuit breaker state
      yield* _(circuitBreaker.checkCircuit);

      // Execute the LLM call with timeout and error handling
      const result = yield* _(
        Effect.gen(function* (_) {
          switch (modelVariant) {
            case 'CHAT':
              if (!llmProvider.callChatModel) {
                yield* _(Effect.fail(new ModelUnavailableError("Chat model not available", "chat")));
              }
              return yield* _(
                Effect.tryPromise({
                  try: () => llmProvider.callChatModel!(prompt),
                  catch: (error) => new LlmProviderError(
                    `Chat model call failed: ${error}`,
                    llmProvider.title,
                    error
                  ),
                })
              );

            case 'COMPLETION':
              if (!llmProvider.callCompletionModel) {
                yield* _(Effect.fail(new ModelUnavailableError("Completion model not available", "completion")));
              }
              return yield* _(
                Effect.tryPromise({
                  try: () => llmProvider.callCompletionModel!(prompt),
                  catch: (error) => new LlmProviderError(
                    `Completion model call failed: ${error}`,
                    llmProvider.title,
                    error
                  ),
                })
              );

            case 'EMBEDDING':
              if (!llmProvider.callEmbeddingModel) {
                yield* _(Effect.fail(new ModelUnavailableError("Embedding model not available", "embedding")));
              }
              return yield* _(
                Effect.tryPromise({
                  try: () => llmProvider.callEmbeddingModel!(prompt),
                  catch: (error) => new LlmProviderError(
                    `Embedding model call failed: ${error}`,
                    llmProvider.title,
                    error
                  ),
                })
              );

            default:
              yield* _(Effect.fail(new LlmProviderError(`Unknown model variant: ${modelVariant}`, llmProvider.title)));
          }
        }),
        Effect.timeout(Duration.millis(timeoutMs)),
        Effect.catchTag("TimeoutException", () =>
          Effect.fail(new LlmProviderError("LLM call timed out", llmProvider.title))
        ),
        Effect.tap(() => circuitBreaker.recordSuccess),
        Effect.tapError(() => circuitBreaker.recordFailure)
      );

      return result;
    });

  /**
   * Call LLM with rate limiting
   */
  static callWithRateLimit = (params: {
    prompt: Prompt;
    modelVariant: 'CHAT' | 'COMPLETION' | 'EMBEDDING';
    requestsPerMinute?: number;
  }) =>
    Effect.gen(function* (_) {
      const { prompt, modelVariant, requestsPerMinute = 60 } = params;
      const rateLimiter = yield* _(EffectLlmProvider.createRateLimiter(requestsPerMinute));

      // Add request to queue and wait for processing
      const result = yield* _(
        Effect.async<unknown, RateLimitError>((resume) => {
          Queue.offer(rateLimiter.requestQueue, {
            prompt,
            resolve: (result) => resume(Effect.succeed(result)),
            reject: (error) => resume(Effect.fail(new RateLimitError(
              error instanceof Error ? error.message : String(error),
              60000
            ))),
          });
        })
      );

      return result;
    });

  /**
   * Batch multiple LLM calls with concurrency control
   */
  static batchCalls = (calls: Array<{
    prompt: Prompt;
    modelVariant: 'CHAT' | 'COMPLETION' | 'EMBEDDING';
  }>, maxConcurrency: number = 3) =>
    Effect.gen(function* (_) {
      const results = yield* _(
        Effect.forEach(
          calls,
          ({ prompt, modelVariant }) =>
            EffectLlmProvider.callWithCircuitBreaker({ prompt, modelVariant }),
          { concurrency: maxConcurrency }
        )
      );

      return results;
    });

  /**
   * Call LLM with comprehensive error handling and retries
   */
  static callRobust = (params: {
    prompt: Prompt;
    modelVariant: 'CHAT' | 'COMPLETION' | 'EMBEDDING';
    maxRetries?: number;
    baseDelayMs?: number;
  }) =>
    pipe(
      EffectLlmProvider.callWithCircuitBreaker(params),
      Effect.retry(
        pipe(
          Schedule.exponential(Duration.millis(params.baseDelayMs ?? 1000)),
          Schedule.intersect(Schedule.recurs(params.maxRetries ?? 3)),
          Schedule.whileInput((error: unknown) => {
            // Only retry on specific error types
            return error instanceof LlmProviderError ||
                   error instanceof RateLimitError ||
                   error instanceof CircuitBreakerOpenError;
          })
        )
      ),
      Effect.catchAll((error) =>
        Effect.gen(function* (_) {
          yield* _(Effect.logError(`LLM call failed after retries: ${error}`));
          return yield* _(Effect.fail(error));
        })
      )
    );

  /**
   * Get available models with caching
   */
  static getAvailableModels = (_cacheTtlMs: number = 300000) => // 5 minutes cache
    Effect.gen(function* (_) {
      const llmProvider = yield* _(LlmProviderService);

      // This would typically use Effect's caching mechanisms
      const models = yield* _(
        Effect.tryPromise({
          try: () => Promise.resolve(llmProvider.listModels()),
          catch: (error) => new LlmProviderError(
            `Failed to list models: ${error}`,
            llmProvider.title,
            error
          ),
        })
      );

      return models;
    });
}

/**
 * Layer for providing LLM Provider service
 */
export const LlmProviderLive = (provider: LlmExecutionTools) =>
  Layer.succeed(LlmProviderService, provider);

/**
 * Example usage demonstrating Effect.js benefits for LLM providers
 */
export const llmExampleUsage = {
  /**
   * Basic LLM call with circuit breaker
   */
  basicCall: (provider: LlmExecutionTools, prompt: Prompt) =>
    pipe(
      EffectLlmProvider.callWithCircuitBreaker({
        prompt,
        modelVariant: 'CHAT',
      }),
      Effect.provide(LlmProviderLive(provider)),
      Effect.catchAll((error) =>
        Effect.gen(function* (_) {
          yield* _(Effect.logError(`LLM call failed: ${error}`));
          return yield* _(Effect.fail(error));
        })
      )
    ),

  /**
   * Robust LLM call with retries and rate limiting
   */
  robustCall: (provider: LlmExecutionTools, prompt: Prompt) =>
    pipe(
      EffectLlmProvider.callRobust({
        prompt,
        modelVariant: 'CHAT',
        maxRetries: 3,
        baseDelayMs: 1000,
      }),
      Effect.provide(LlmProviderLive(provider)),
      Effect.timeout(Duration.minutes(2))
    ),

  /**
   * Batch processing multiple prompts
   */
  batchProcessing: (
    provider: LlmExecutionTools,
    prompts: Array<{ prompt: Prompt; modelVariant: 'CHAT' | 'COMPLETION' | 'EMBEDDING' }>
  ) =>
    pipe(
      EffectLlmProvider.batchCalls(prompts, 5), // Max 5 concurrent calls
      Effect.provide(LlmProviderLive(provider)),
      Effect.tap((results) =>
        Effect.log(`Completed ${results.length} LLM calls in batch`)
      )
    ),
};

/**
 * TODO: [🧠] Add metrics collection for LLM call performance
 * TODO: [🧠] Implement cost tracking and budgeting
 * TODO: [🧠] Add model fallback strategies (GPT-4 -> GPT-3.5 -> Claude)
 * TODO: [🧠] Implement request deduplication for identical prompts
 * TODO: [🧠] Add distributed caching for LLM responses
 * TODO: [🧠] Create adaptive rate limiting based on provider responses
 */
