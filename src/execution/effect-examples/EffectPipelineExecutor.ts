import { Effect, pipe, Context, Layer, Schedule, Duration } from 'effect';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { ExecutionTools } from '../ExecutionTools';
import type { InputParameters } from '../../types/typeAliases';
import type { PipelineExecutorResult } from '../PipelineExecutorResult';
import { createPipelineExecutor } from '../createPipelineExecutor/00-createPipelineExecutor';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';

/**
 * Effect.js-based Pipeline Executor
 *
 * This demonstrates how Effect.js can improve the Promptbook pipeline execution with:
 * - Structured error handling with typed errors
 * - Resource safety and automatic cleanup
 * - Retry policies with exponential backoff
 * - Composable and testable execution flows
 * - Better observability and tracing
 *
 * @example
 * ```typescript
 * const program = pipe(
 *   EffectPipelineExecutor.execute({
 *     pipeline: myPipeline,
 *     inputParameters: { query: "Hello world" },
 *   }),
 *   Effect.retry(Schedule.exponential(Duration.seconds(1))),
 *   Effect.timeout(Duration.minutes(5)),
 *   Effect.provide(ExecutionToolsLive)
 * );
 *
 * const result = await Effect.runPromise(program);
 * ```
 */

// Define services using Effect's Context system
export class ExecutionToolsService extends Context.Tag("ExecutionToolsService")<
  ExecutionToolsService,
  ExecutionTools
>() {}

export class PipelineService extends Context.Tag("PipelineService")<
  PipelineService,
  PipelineJson
>() {}

// Define custom error types for better error handling
export class PipelineValidationError extends Error {
  readonly _tag = "PipelineValidationError";
  constructor(message: string, public readonly pipeline: PipelineJson) {
    super(message);
  }
}

export class ExecutionTimeoutError extends Error {
  readonly _tag = "ExecutionTimeoutError";
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
  }
}

export class ResourceAcquisitionError extends Error {
  readonly _tag = "ResourceAcquisitionError";
  constructor(message: string, public readonly resource: string) {
    super(message);
  }
}

/**
 * Effect-based Pipeline Executor with enhanced error handling and resource management
 */
export class EffectPipelineExecutor {
  /**
   * Validate pipeline structure using Effect
   */
  static validatePipeline = (pipeline: PipelineJson) =>
    Effect.gen(function* (_) {
      if (!pipeline.tasks || pipeline.tasks.length === 0) {
        yield* _(Effect.fail(new PipelineValidationError("Pipeline must have at least one task", pipeline)));
      }

      if (!pipeline.title) {
        yield* _(Effect.fail(new PipelineValidationError("Pipeline must have a title", pipeline)));
      }

      // Additional validation logic can be added here
      return pipeline;
    });

  /**
   * Acquire execution tools with proper resource management
   */
  static acquireExecutionTools = Effect.gen(function* (_) {
    const tools = yield* _(ExecutionToolsService);

    // Verify tools are properly configured
    if (!tools.llm) {
      yield* _(Effect.fail(new ResourceAcquisitionError("LLM tools not available", "llm")));
    }

    // Check LLM configuration
    yield* _(
      Effect.tryPromise({
        try: () => tools.llm.checkConfiguration(),
        catch: (error) => new ResourceAcquisitionError(
          `LLM configuration check failed: ${error}`,
          "llm-config"
        ),
      })
    );

    return tools;
  });

  /**
   * Execute pipeline with Effect's structured concurrency and error handling
   */
  static execute = (params: {
    pipeline: PipelineJson;
    inputParameters: InputParameters;
    maxRetries?: number;
    timeoutMs?: number;
  }) =>
    Effect.gen(function* (_) {
      const { pipeline, inputParameters, timeoutMs = 300000 } = params; // 5 minutes default

      // Step 1: Validate pipeline
      const validatedPipeline = yield* _(EffectPipelineExecutor.validatePipeline(pipeline));

      // Step 2: Acquire execution tools with resource safety
      const tools = yield* _(EffectPipelineExecutor.acquireExecutionTools);

      // Step 3: Create and execute pipeline with timeout
      const result = yield* _(
        Effect.gen(function* (_) {
          const executor = createPipelineExecutor({
            pipeline: validatedPipeline,
            tools,
            isVerbose: true,
          });

          const executionTask = executor(inputParameters);

          return yield* _(
            Effect.tryPromise({
              try: () => executionTask.asPromise({ isCrashedOnError: false }),
              catch: (error) => new PipelineExecutionError(
                `Pipeline execution failed: ${error instanceof Error ? error.message : String(error)}`
              ),
            })
          );
        }),
        Effect.timeout(Duration.millis(timeoutMs)),
        Effect.catchTag("TimeoutException", () =>
          Effect.fail(new ExecutionTimeoutError("Pipeline execution timed out", timeoutMs))
        )
      );

      return result;
    });

  /**
   * Execute multiple pipelines concurrently with Effect's fiber-based concurrency
   */
  static executeConcurrent = (executions: Array<{
    pipeline: PipelineJson;
    inputParameters: InputParameters;
    maxConcurrency?: number;
  }>) =>
    Effect.gen(function* (_) {
      const maxConcurrency = executions[0]?.maxConcurrency ?? 3;

      // Execute pipelines with controlled concurrency
      const results = yield* _(
        Effect.forEach(
          executions,
          ({ pipeline, inputParameters }) =>
            EffectPipelineExecutor.execute({ pipeline, inputParameters }),
          { concurrency: maxConcurrency }
        )
      );

      return results;
    });

  /**
   * Execute pipeline with retry policy and circuit breaker pattern
   */
  static executeWithRetry = (params: {
    pipeline: PipelineJson;
    inputParameters: InputParameters;
    maxRetries?: number;
    baseDelayMs?: number;
  }) =>
    pipe(
      EffectPipelineExecutor.execute(params),
      Effect.retry(
        pipe(
          Schedule.exponential(Duration.millis(params.baseDelayMs ?? 1000)),
          Schedule.intersect(Schedule.recurs(params.maxRetries ?? 3))
        )
      ),
      Effect.catchAll((error) =>
        Effect.gen(function* (_) {
          // Log the final error after all retries
          yield* _(Effect.logError(`Pipeline execution failed after retries: ${error}`));
          return yield* _(Effect.fail(error));
        })
      )
    );
}

/**
 * Layer for providing ExecutionTools service
 */
export const ExecutionToolsLive = (tools: ExecutionTools) =>
  Layer.succeed(ExecutionToolsService, tools);

/**
 * Layer for providing Pipeline service
 */
export const PipelineLive = (pipeline: PipelineJson) =>
  Layer.succeed(PipelineService, pipeline);

/**
 * Example usage demonstrating Effect.js benefits in Promptbook
 */
export const exampleUsage = {
  /**
   * Basic pipeline execution with error handling
   */
  basicExecution: (pipeline: PipelineJson, tools: ExecutionTools, inputParameters: InputParameters) =>
    pipe(
      EffectPipelineExecutor.execute({ pipeline, inputParameters }),
      Effect.provide(ExecutionToolsLive(tools)),
      Effect.catchAll((error) =>
        Effect.gen(function* (_) {
          yield* _(Effect.logError(`Execution failed: ${error}`));
          // Return a default result or re-throw
          return yield* _(Effect.fail(error));
        })
      )
    ),

  /**
   * Robust execution with retries and timeout
   */
  robustExecution: (pipeline: PipelineJson, tools: ExecutionTools, inputParameters: InputParameters) =>
    pipe(
      EffectPipelineExecutor.executeWithRetry({
        pipeline,
        inputParameters,
        maxRetries: 3,
        baseDelayMs: 1000,
      }),
      Effect.timeout(Duration.minutes(10)),
      Effect.provide(ExecutionToolsLive(tools)),
      Effect.tapError((error) => Effect.logError(`Robust execution failed: ${error}`))
    ),

  /**
   * Concurrent execution of multiple pipelines
   */
  concurrentExecution: (
    executions: Array<{ pipeline: PipelineJson; inputParameters: InputParameters }>,
    tools: ExecutionTools
  ) =>
    pipe(
      EffectPipelineExecutor.executeConcurrent(executions),
      Effect.provide(ExecutionToolsLive(tools)),
      Effect.tap((results) =>
        Effect.log(`Completed ${results.length} pipeline executions concurrently`)
      )
    ),
};

/**
 * TODO: [🧠] Add metrics collection using Effect's built-in observability
 * TODO: [🧠] Implement circuit breaker pattern for LLM providers
 * TODO: [🧠] Add distributed tracing support
 * TODO: [🧠] Create Effect-based middleware for pipeline transformations
 * TODO: [🧠] Implement resource pooling for expensive operations
 */
