# Effect.js Integration Examples for Promptbook

This directory contains comprehensive examples demonstrating how Effect.js can significantly enhance the Promptbook project with advanced functional programming patterns, better error handling, and improved resource management.

## Overview

Effect.js is a powerful TypeScript library that provides:
- **Structured Concurrency**: Fiber-based concurrency model for highly scalable applications
- **Composability**: Build complex systems from small, reusable components
- **Resource Safety**: Automatic resource management and cleanup
- **Type Safety**: Full TypeScript integration with excellent type inference
- **Error Handling**: Structured, typed error handling
- **Observability**: Built-in tracing and monitoring capabilities

## Examples Included

### 1. Effect Pipeline Executor (`src/execution/effect-examples/EffectPipelineExecutor.ts`)

Enhanced pipeline execution with:
- **Circuit Breaker Pattern**: Automatic failure detection and recovery
- **Retry Policies**: Exponential backoff with configurable limits
- **Timeout Management**: Structured timeout handling
- **Concurrent Execution**: Fiber-based parallelism with controlled concurrency
- **Resource Safety**: Automatic cleanup of execution resources

```typescript
import { Effect, pipe, Duration } from 'effect';
import { EffectPipelineExecutor, ExecutionToolsLive } from './EffectPipelineExecutor';

// Basic usage
const program = pipe(
  EffectPipelineExecutor.execute({
    pipeline: myPipeline,
    inputParameters: { query: "Hello world" },
  }),
  Effect.retry(Schedule.exponential(Duration.seconds(1))),
  Effect.timeout(Duration.minutes(5)),
  Effect.provide(ExecutionToolsLive(tools))
);

const result = await Effect.runPromise(program);
```

**Key Benefits:**
- Automatic retry on transient failures
- Structured error types for better debugging
- Resource cleanup even on failures
- Composable execution patterns

### 2. Effect LLM Provider (`src/llm-providers/effect-examples/EffectLlmProvider.ts`)

Advanced LLM provider integration with:
- **Circuit Breaker**: Prevents cascading failures from LLM providers
- **Rate Limiting**: Queue-based rate limiting with backpressure
- **Batch Processing**: Efficient concurrent LLM calls
- **Model Fallback**: Automatic fallback to alternative models
- **Cost Tracking**: Built-in usage and cost monitoring

```typescript
import { Effect, pipe, Duration } from 'effect';
import { EffectLlmProvider, LlmProviderLive } from './EffectLlmProvider';

// Robust LLM call with retries and circuit breaker
const program = pipe(
  EffectLlmProvider.callRobust({
    prompt: myPrompt,
    modelVariant: 'CHAT',
    maxRetries: 3,
    baseDelayMs: 1000,
  }),
  Effect.provide(LlmProviderLive(provider)),
  Effect.timeout(Duration.minutes(2))
);

const result = await Effect.runPromise(program);
```

**Key Benefits:**
- Automatic circuit breaking on provider failures
- Rate limiting prevents API quota exhaustion
- Batch processing for improved throughput
- Structured error handling for different failure modes

### 3. Effect Remote Server (`src/remote-server/effect-examples/EffectRemoteServer.ts`)

Production-ready remote server with:
- **Connection Pooling**: Efficient connection management
- **Health Monitoring**: Real-time health checks and metrics
- **Graceful Shutdown**: Proper cleanup on server termination
- **Request Queuing**: Backpressure handling for high load
- **Client Rate Limiting**: Per-client request limiting

```typescript
import { Effect, pipe } from 'effect';
import { EffectRemoteServer } from './EffectRemoteServer';

// High-performance server setup
const serverProgram = pipe(
  EffectRemoteServer.create({
    port: 3000,
    maxConcurrentRequests: 200,
    requestTimeoutMs: 15000,
    healthCheckIntervalMs: 30000,
  }),
  Effect.tap((server) => Effect.log(`Server started on port ${server.port}`)),
  Effect.fork
);

const server = await Effect.runPromise(serverProgram);
```

**Key Benefits:**
- Structured concurrency for handling multiple requests
- Built-in health monitoring and metrics collection
- Graceful shutdown with proper resource cleanup
- Rate limiting and backpressure handling

## Integration Patterns

### Error Handling

Effect.js provides structured error handling with typed errors:

```typescript
// Define custom error types
export class PipelineValidationError extends Error {
  readonly _tag = "PipelineValidationError";
  constructor(message: string, public readonly pipeline: PipelineJson) {
    super(message);
  }
}

// Handle specific error types
const program = pipe(
  EffectPipelineExecutor.execute(params),
  Effect.catchTag("PipelineValidationError", (error) =>
    Effect.gen(function* (_) {
      yield* _(Effect.logError(`Validation failed: ${error.message}`));
      // Return default result or re-throw
      return yield* _(Effect.succeed(defaultResult));
    })
  )
);
```

### Resource Management

Automatic resource cleanup with Effect's resource management:

```typescript
const program = Effect.gen(function* (_) {
  // Resources are automatically cleaned up
  const tools = yield* _(EffectPipelineExecutor.acquireExecutionTools);
  const result = yield* _(EffectPipelineExecutor.execute({ pipeline, inputParameters }));
  return result;
  // Tools are automatically released here
});
```

### Concurrent Execution

Structured concurrency with controlled parallelism:

```typescript
// Execute multiple pipelines concurrently
const program = pipe(
  EffectPipelineExecutor.executeConcurrent([
    { pipeline: pipeline1, inputParameters: params1 },
    { pipeline: pipeline2, inputParameters: params2 },
    { pipeline: pipeline3, inputParameters: params3 },
  ]),
  Effect.provide(ExecutionToolsLive(tools))
);

const results = await Effect.runPromise(program);
```

## Testing

Effect.js provides excellent testing capabilities:

```typescript
import { Effect, TestContext, TestClock } from 'effect';

// Test with controlled time
const testProgram = pipe(
  EffectPipelineExecutor.executeWithRetry(params),
  Effect.provide(TestContext.TestContext),
  Effect.provide(TestClock.TestClock)
);

// Advance time to test retry behavior
await TestClock.adjust(Duration.seconds(5));
const result = await Effect.runPromise(testProgram);
```

## Performance Benefits

### Memory Management
- Automatic resource cleanup prevents memory leaks
- Structured concurrency reduces memory overhead
- Efficient fiber-based concurrency model

### Error Recovery
- Circuit breakers prevent cascading failures
- Automatic retries with exponential backoff
- Graceful degradation under load

### Observability
- Built-in tracing and metrics collection
- Structured logging with context
- Health monitoring and alerting

## Migration Guide

### From Promise-based to Effect-based

**Before (Promise-based):**
```typescript
async function executePipeline(pipeline: PipelineJson, params: InputParameters) {
  try {
    const executor = createPipelineExecutor({ pipeline, tools });
    const result = await executor(params).asPromise();
    return result;
  } catch (error) {
    console.error('Pipeline execution failed:', error);
    throw error;
  }
}
```

**After (Effect-based):**
```typescript
const executePipeline = (pipeline: PipelineJson, params: InputParameters) =>
  pipe(
    EffectPipelineExecutor.execute({ pipeline, inputParameters: params }),
    Effect.retry(Schedule.exponential(Duration.seconds(1))),
    Effect.timeout(Duration.minutes(5)),
    Effect.provide(ExecutionToolsLive(tools)),
    Effect.catchAll((error) =>
      Effect.gen(function* (_) {
        yield* _(Effect.logError(`Pipeline execution failed: ${error}`));
        return yield* _(Effect.fail(error));
      })
    )
  );
```

### Benefits of Migration

1. **Better Error Handling**: Typed errors with structured handling
2. **Resource Safety**: Automatic cleanup prevents leaks
3. **Composability**: Easy to combine and reuse components
4. **Testing**: Better testability with controlled effects
5. **Performance**: More efficient concurrency model
6. **Observability**: Built-in tracing and monitoring

## Best Practices

### 1. Use Typed Errors
Define specific error types for different failure modes:

```typescript
export class ValidationError extends Error {
  readonly _tag = "ValidationError";
}

export class NetworkError extends Error {
  readonly _tag = "NetworkError";
}
```

### 2. Leverage Resource Management
Use Effect's resource management for automatic cleanup:

```typescript
const program = Effect.gen(function* (_) {
  const resource = yield* _(acquireResource);
  // Resource is automatically released
  return yield* _(useResource(resource));
});
```

### 3. Compose Effects
Build complex operations from simple, reusable effects:

```typescript
const complexOperation = pipe(
  validateInput,
  Effect.flatMap(processData),
  Effect.flatMap(saveResult),
  Effect.retry(Schedule.exponential(Duration.seconds(1)))
);
```

### 4. Use Layers for Dependency Injection
Organize dependencies using Effect's Layer system:

```typescript
const AppLive = Layer.mergeAll(
  ExecutionToolsLive,
  LlmProviderLive,
  DatabaseLive
);

const program = pipe(
  myEffect,
  Effect.provide(AppLive)
);
```

## Future Enhancements

The Effect.js integration opens up possibilities for:

- **Distributed Tracing**: OpenTelemetry integration
- **Metrics Collection**: Prometheus/Grafana integration
- **Circuit Breaker Patterns**: Advanced failure handling
- **Request Deduplication**: Efficient caching strategies
- **Load Balancing**: Intelligent request distribution
- **A/B Testing**: Effect-based experimentation framework

## Contributing

When adding new Effect.js integrations:

1. Follow the existing patterns and naming conventions
2. Include comprehensive documentation and examples
3. Add appropriate error types and handling
4. Include tests demonstrating the functionality
5. Update this README with new examples

## Resources

- [Effect.js Documentation](https://effect.website/)
- [Effect.js GitHub](https://github.com/Effect-TS/effect)
- [Effect.js Discord Community](https://discord.gg/effect-ts)
- [Promptbook Documentation](https://ptbk.io/)

---

This integration demonstrates how Effect.js can significantly improve the reliability, performance, and maintainability of the Promptbook project while providing excellent developer experience and type safety.
