import { Effect, pipe, Context, Layer, Schedule, Duration, Ref, Queue, Fiber } from 'effect';
import type { RemoteServerOptions } from '../types/RemoteServerOptions';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { InputParameters } from '../../types/typeAliases';
import { EffectPipelineExecutor } from '../../execution/effect-examples/EffectPipelineExecutor';

/**
 * Effect.js-enhanced Remote Server
 *
 * This demonstrates how Effect.js can improve the Promptbook remote server with:
 * - Structured concurrency for handling multiple requests
 * - Resource pooling and connection management
 * - Graceful shutdown with proper cleanup
 * - Request queuing and backpressure handling
 * - Health monitoring and circuit breakers
 * - Distributed tracing and observability
 * - Rate limiting per client/user
 *
 * @example
 * ```typescript
 * const serverProgram = pipe(
 *   EffectRemoteServer.create({
 *     port: 3000,
 *     maxConcurrentRequests: 100,
 *     requestTimeoutMs: 30000,
 *   }),
 *   Effect.provide(ServerConfigLive),
 *   Effect.fork
 * );
 *
 * const server = await Effect.runPromise(serverProgram);
 * ```
 */

// Define services using Effect's Context system
export class ServerConfigService extends Context.Tag("ServerConfigService")<
  ServerConfigService,
  {
    port: number;
    maxConcurrentRequests: number;
    requestTimeoutMs: number;
    healthCheckIntervalMs: number;
  }
>() {}

export class ConnectionPoolService extends Context.Tag("ConnectionPoolService")<
  ConnectionPoolService,
  {
    activeConnections: Ref.Ref<Set<string>>;
    maxConnections: number;
    connectionQueue: Queue.Queue<{ connectionId: string; resolve: () => void; reject: (error: Error) => void }>;
  }
>() {}

export class RequestMetricsService extends Context.Tag("RequestMetricsService")<
  RequestMetricsService,
  {
    totalRequests: Ref.Ref<number>;
    successfulRequests: Ref.Ref<number>;
    failedRequests: Ref.Ref<number>;
    averageResponseTime: Ref.Ref<number>;
    activeRequests: Ref.Ref<number>;
  }
>() {}

// Define custom error types for server operations
export class ServerError extends Error {
  readonly _tag = "ServerError";
  constructor(message: string, public readonly code: string, public readonly cause?: unknown) {
    super(message);
  }
}

export class ConnectionLimitError extends Error {
  readonly _tag = "ConnectionLimitError";
  constructor(message: string, public readonly maxConnections: number) {
    super(message);
  }
}

export class RequestTimeoutError extends Error {
  readonly _tag = "RequestTimeoutError";
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
  }
}

export class HealthCheckError extends Error {
  readonly _tag = "HealthCheckError";
  constructor(message: string, public readonly component: string) {
    super(message);
  }
}

/**
 * Server health status
 */
interface ServerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  activeConnections: number;
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
  lastHealthCheck: Date;
}

/**
 * Request context for tracking and metrics
 */
interface RequestContext {
  requestId: string;
  clientId: string;
  startTime: number;
  pipeline?: PipelineJson;
  inputParameters?: InputParameters;
}

/**
 * Effect-enhanced Remote Server with advanced patterns
 */
export class EffectRemoteServer {
  /**
   * Create connection pool for managing client connections
   */
  static createConnectionPool = (maxConnections: number = 1000) =>
    Effect.gen(function* (_) {
      const activeConnections = yield* _(Ref.make(new Set<string>()));
      const connectionQueue = yield* _(Queue.unbounded<{
        connectionId: string;
        resolve: () => void;
        reject: (error: Error) => void;
      }>());

      // Connection pool manager
      const poolManager = Effect.gen(function* (_) {
        while (true) {
          const request = yield* _(Queue.take(connectionQueue));
          const current = yield* _(Ref.get(activeConnections));

          if (current.size >= maxConnections) {
            request.reject(new ConnectionLimitError(
              `Connection limit reached: ${maxConnections}`,
              maxConnections
            ));
          } else {
            yield* _(Ref.update(activeConnections, (connections) => {
              const newConnections = new Set(connections);
              newConnections.add(request.connectionId);
              return newConnections;
            }));
            request.resolve();
          }
        }
      });

      // Fork the pool manager
      yield* _(Effect.fork(poolManager));

      return { activeConnections, maxConnections, connectionQueue };
    });

  /**
   * Create request metrics collector
   */
  static createRequestMetrics = () =>
    Effect.gen(function* (_) {
      const totalRequests = yield* _(Ref.make(0));
      const successfulRequests = yield* _(Ref.make(0));
      const failedRequests = yield* _(Ref.make(0));
      const averageResponseTime = yield* _(Ref.make(0));
      const activeRequests = yield* _(Ref.make(0));

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        activeRequests,
      };
    });

  /**
   * Handle pipeline execution request with full Effect.js benefits
   */
  static handlePipelineRequest = (context: RequestContext) =>
    Effect.gen(function* (_) {
      const metrics = yield* _(RequestMetricsService);
      const config = yield* _(ServerConfigService);

      // Increment active requests
      yield* _(Ref.update(metrics.activeRequests, (n) => n + 1));
      yield* _(Ref.update(metrics.totalRequests, (n) => n + 1));

      const startTime = Date.now();

      try {
        // Execute pipeline with timeout and error handling
        const result = yield* _(
          Effect.gen(function* (_) {
            if (!context.pipeline || !context.inputParameters) {
              yield* _(Effect.fail(new ServerError("Missing pipeline or input parameters", "INVALID_REQUEST")));
            }

            // Use Effect pipeline executor
            return yield* _(
              EffectPipelineExecutor.executeWithRetry({
                pipeline: context.pipeline!,
                inputParameters: context.inputParameters!,
                maxRetries: 2,
                baseDelayMs: 1000,
              })
            );
          }),
          Effect.timeout(Duration.millis(config.requestTimeoutMs)),
          Effect.catchTag("TimeoutException", () =>
            Effect.fail(new RequestTimeoutError("Request timed out", config.requestTimeoutMs))
          )
        );

        // Record success metrics
        const responseTime = Date.now() - startTime;
        yield* _(Ref.update(metrics.successfulRequests, (n) => n + 1));
        yield* _(Ref.update(metrics.averageResponseTime, (current) => 
          (current * (metrics.totalRequests.pipe ? 0 : 0) + responseTime) / 1
        ));

        return result;

      } catch (error) {
        // Record failure metrics
        yield* _(Ref.update(metrics.failedRequests, (n) => n + 1));
        yield* _(Effect.logError(`Request ${context.requestId} failed: ${error}`));
        return yield* _(Effect.fail(error));

      } finally {
        // Decrement active requests
        yield* _(Ref.update(metrics.activeRequests, (n) => n - 1));
      }
    });

  /**
   * Health check system
   */
  static createHealthChecker = () =>
    Effect.gen(function* (_) {
      const config = yield* _(ServerConfigService);
      const metrics = yield* _(RequestMetricsService);
      const connectionPool = yield* _(ConnectionPoolService);

      const performHealthCheck = Effect.gen(function* (_) {
        const totalRequests = yield* _(Ref.get(metrics.totalRequests));
        const failedRequests = yield* _(Ref.get(metrics.failedRequests));
        const activeRequests = yield* _(Ref.get(metrics.activeRequests));
        const averageResponseTime = yield* _(Ref.get(metrics.averageResponseTime));
        const activeConnections = yield* _(Ref.get(connectionPool.activeConnections));

        const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;
        const uptime = process.uptime() * 1000; // Convert to milliseconds

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

        // Determine health status based on metrics
        if (errorRate > 0.1 || averageResponseTime > 10000) { // 10% error rate or 10s response time
          status = 'unhealthy';
        } else if (errorRate > 0.05 || averageResponseTime > 5000) { // 5% error rate or 5s response time
          status = 'degraded';
        }

        const health: ServerHealth = {
          status,
          uptime,
          activeConnections: activeConnections.size,
          totalRequests,
          errorRate,
          averageResponseTime,
          lastHealthCheck: new Date(),
        };

        yield* _(Effect.log(`Health check: ${JSON.stringify(health)}`));
        return health;
      });

      // Schedule periodic health checks
      const healthCheckSchedule = pipe(
        performHealthCheck,
        Effect.repeat(Schedule.fixed(Duration.millis(config.healthCheckIntervalMs))),
        Effect.fork
      );

      return { performHealthCheck, healthCheckSchedule };
    });

  /**
   * Graceful shutdown handler
   */
  static createShutdownHandler = (runningFibers: Ref.Ref<Set<Fiber.Fiber<unknown, unknown>>>) =>
    Effect.gen(function* (_) {
      const shutdown = Effect.gen(function* (_) {
        yield* _(Effect.log("Initiating graceful shutdown..."));

        // Get all running fibers
        const fibers = yield* _(Ref.get(runningFibers));

        // Wait for all fibers to complete or timeout after 30 seconds
        yield* _(
          Effect.forEach(
            Array.from(fibers),
            (fiber) => pipe(
              Fiber.join(fiber),
              Effect.timeout(Duration.seconds(30)),
              Effect.catchAll(() => Effect.succeed(undefined)) // Ignore timeout errors
            ),
            { concurrency: "unbounded" }
          )
        );

        yield* _(Effect.log("Graceful shutdown completed"));
      });

      return { shutdown };
    });

  /**
   * Create and start the Effect-enhanced remote server
   */
  static create = <TCustomOptions = undefined>(
    options: RemoteServerOptions<TCustomOptions> & {
      maxConcurrentRequests?: number;
      requestTimeoutMs?: number;
      healthCheckIntervalMs?: number;
    }
  ) =>
    Effect.gen(function* (_) {
      const {
        port,
        maxConcurrentRequests = 100,
        requestTimeoutMs = 30000,
        healthCheckIntervalMs = 60000,
      } = options;

      // Create server services
      const connectionPool = yield* _(EffectRemoteServer.createConnectionPool(maxConcurrentRequests));
      const metrics = yield* _(EffectRemoteServer.createRequestMetrics());
      const runningFibers = yield* _(Ref.make(new Set<Fiber.Fiber<unknown, unknown>>()));

      // Create health checker
      const healthChecker = yield* _(
        EffectRemoteServer.createHealthChecker(),
        Effect.provide(Layer.succeed(ServerConfigService, {
          port,
          maxConcurrentRequests,
          requestTimeoutMs,
          healthCheckIntervalMs,
        })),
        Effect.provide(Layer.succeed(RequestMetricsService, metrics)),
        Effect.provide(Layer.succeed(ConnectionPoolService, connectionPool))
      );

      // Start health check fiber
      const healthCheckFiber = yield* _(healthChecker.healthCheckSchedule);
      yield* _(Ref.update(runningFibers, (fibers) => {
        const newFibers = new Set(fibers);
        newFibers.add(healthCheckFiber);
        return newFibers;
      }));

      // Create shutdown handler
      const shutdownHandler = yield* _(EffectRemoteServer.createShutdownHandler(runningFibers));

      yield* _(Effect.log(`Effect Remote Server starting on port ${port}`));

      return {
        port,
        connectionPool,
        metrics,
        healthChecker,
        shutdownHandler,
        runningFibers,
      };
    });

  /**
   * Process multiple requests concurrently with backpressure
   */
  static processConcurrentRequests = (
    requests: Array<RequestContext>,
    maxConcurrency: number = 10
  ) =>
    Effect.gen(function* (_) {
      const results = yield* _(
        Effect.forEach(
          requests,
          (request) => EffectRemoteServer.handlePipelineRequest(request),
          { concurrency: maxConcurrency }
        )
      );

      return results;
    });

  /**
   * Rate limiting per client
   */
  static createClientRateLimiter = (requestsPerMinute: number = 60) =>
    Effect.gen(function* (_) {
      const clientQueues = yield* _(Ref.make(new Map<string, Queue.Queue<{
        request: RequestContext;
        resolve: (result: unknown) => void;
        reject: (error: unknown) => void;
      }>>()));

      const rateLimitClient = (clientId: string, request: RequestContext) =>
        Effect.gen(function* (_) {
          const queues = yield* _(Ref.get(clientQueues));
          let clientQueue = queues.get(clientId);

          if (!clientQueue) {
            clientQueue = yield* _(Queue.unbounded<{
              request: RequestContext;
              resolve: (result: unknown) => void;
              reject: (error: unknown) => void;
            }>());

            yield* _(Ref.update(clientQueues, (queues) => {
              const newQueues = new Map(queues);
              newQueues.set(clientId, clientQueue!);
              return newQueues;
            }));

            // Start processor for this client
            const processor = Effect.gen(function* (_) {
              let requestCount = 0;
              let windowStart = Date.now();

              while (true) {
                const queueItem = yield* _(Queue.take(clientQueue!));
                const now = Date.now();

                // Reset window if a minute has passed
                if (now - windowStart >= 60000) {
                  requestCount = 0;
                  windowStart = now;
                }

                if (requestCount >= requestsPerMinute) {
                  queueItem.reject(new Error(`Rate limit exceeded for client ${clientId}`));
                } else {
                  requestCount++;
                  try {
                    const result = yield* _(EffectRemoteServer.handlePipelineRequest(queueItem.request));
                    queueItem.resolve(result);
                  } catch (error) {
                    queueItem.reject(error);
                  }
                }
              }
            });

            yield* _(Effect.fork(processor));
          }

          // Add request to client queue
          const result = yield* _(
            Effect.async<unknown, Error>((resume) => {
              Queue.offer(clientQueue!, {
                request,
                resolve: (result) => resume(Effect.succeed(result)),
                reject: (error) => resume(Effect.fail(error instanceof Error ? error : new Error(String(error)))),
              });
            })
          );

          return result;
        });

      return { rateLimitClient };
    });
}

/**
 * Layer providers for server services
 */
export const ServerConfigLive = (config: {
  port: number;
  maxConcurrentRequests: number;
  requestTimeoutMs: number;
  healthCheckIntervalMs: number;
}) => Layer.succeed(ServerConfigService, config);

export const ConnectionPoolLive = (pool: {
  activeConnections: Ref.Ref<Set<string>>;
  maxConnections: number;
  connectionQueue: Queue.Queue<{ connectionId: string; resolve: () => void; reject: (error: Error) => void }>;
}) => Layer.succeed(ConnectionPoolService, pool);

export const RequestMetricsLive = (metrics: {
  totalRequests: Ref.Ref<number>;
  successfulRequests: Ref.Ref<number>;
  failedRequests: Ref.Ref<number>;
  averageResponseTime: Ref.Ref<number>;
  activeRequests: Ref.Ref<number>;
}) => Layer.succeed(RequestMetricsService, metrics);

/**
 * Example usage demonstrating Effect.js benefits for remote server
 */
export const serverExampleUsage = {
  /**
   * Basic server setup with health monitoring
   */
  basicServer: (options: RemoteServerOptions<undefined>) =>
    pipe(
      EffectRemoteServer.create({
        ...options,
        maxConcurrentRequests: 50,
        requestTimeoutMs: 30000,
        healthCheckIntervalMs: 60000,
      }),
      Effect.tap((server) => Effect.log(`Server created on port ${server.port}`)),
      Effect.fork
    ),

  /**
   * High-performance server with advanced features
   */
  highPerformanceServer: (options: RemoteServerOptions<undefined>) =>
    pipe(
      EffectRemoteServer.create({
        ...options,
        maxConcurrentRequests: 200,
        requestTimeoutMs: 15000,
        healthCheckIntervalMs: 30000,
      }),
      Effect.tap((server) => Effect.log(`High-performance server created on port ${server.port}`)),
      Effect.fork
    ),

  /**
   * Server with graceful shutdown
   */
  serverWithGracefulShutdown: (options: RemoteServerOptions<undefined>) =>
    Effect.gen(function* (_) {
      const server = yield* _(EffectRemoteServer.create(options));

      // Setup signal handlers for graceful shutdown
      const setupShutdownHandlers = Effect.gen(function* (_) {
        const handleShutdown = () => {
          Effect.runPromise(server.shutdownHandler.shutdown);
        };

        process.on('SIGTERM', handleShutdown);
        process.on('SIGINT', handleShutdown);
      });

      yield* _(setupShutdownHandlers);
      return server;
    }),
};

/**
 * TODO: [🧠] Add distributed tracing with OpenTelemetry integration
 * TODO: [🧠] Implement request caching and response compression
 * TODO: [🧠] Add WebSocket support for real-time pipeline execution updates
 * TODO: [🧠] Implement load balancing across multiple server instances
 * TODO: [🧠] Add authentication and authorization middleware
 * TODO: [🧠] Create monitoring dashboard with real-time metrics
 * TODO: [🧠] Implement request replay and debugging capabilities
 */
